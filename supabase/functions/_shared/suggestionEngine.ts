// Kitchen Buddy: shared "คืนนี้ทำอะไรดี" suggestion engine.
//
// Used by both the `suggest` edge function (on-demand, user-triggered) and
// the nightly precompute step in `daily-digest` (so morning app-opens hit
// the ai_suggestions cache for free). Keeping this logic in one place avoids
// the two call sites drifting apart (CLAUDE.md: pantry-hash cache + nightly
// precompute, single Haiku-class call).

import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type QtyState = "full" | "half" | "out";
export type ExpiryBucket = "expired" | "d1" | "d3" | "d7" | "later";

export interface ActivePantryItem {
  id: string;
  name_th: string;
  qty_state: QtyState;
  expiry_date: string | null;
  bucket: ExpiryBucket;
  days_left: number | null;
}

export interface SuggestionUse {
  pantry_item_id: string;
  name_th: string;
  days_left: number;
}

export interface Suggestion {
  id: string;
  name_th: string;
  time_minutes: number;
  uses: SuggestionUse[];
  steps: string[];
}

export interface SuggestionResult {
  suggestions: Suggestion[];
  cached: boolean;
  generated_at: string; // ISO 8601
}

interface PantryItemRow {
  id: string;
  qty_state: QtyState;
  expiry_date: string | null;
  catalog_item_id: string | null;
  free_text_name: string | null;
  catalog_items: { name_th: string } | null;
}

interface AiSuggestionRow {
  suggestions: Suggestion[];
  generated_at: string;
}

const CACHE_FRESHNESS_MS = 24 * 60 * 60 * 1000; // 24h
const MAX_TOKENS = 1500;
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_API_VERSION = "2023-06-01";
const DEFAULT_MODEL = "claude-haiku-4-5-20251001";

// ---------------------------------------------------------------------------
// Pantry loading + hashing
// ---------------------------------------------------------------------------

/**
 * Load active pantry items for a household, joined with catalog_items for
 * display names, and bucket each by urgency (expiry date relative to
 * `today`).
 *
 * `today` should be a YYYY-MM-DD string (UTC date, matches pantry_items
 * .expiry_date which is a `date` column with no timezone).
 */
export async function loadActivePantryItems(
  admin: SupabaseClient,
  householdId: string,
  today: string,
): Promise<ActivePantryItem[]> {
  const { data, error } = await admin
    .from("pantry_items")
    .select(
      "id, qty_state, expiry_date, catalog_item_id, free_text_name, catalog_items(name_th)",
    )
    .eq("household_id", householdId)
    .eq("status", "active");

  if (error) {
    throw new Error(`failed to load pantry_items: ${error.message}`);
  }

  const rows = (data ?? []) as unknown as PantryItemRow[];

  return rows.map((row) => {
    const name = row.catalog_items?.name_th ?? row.free_text_name ?? "ไม่ทราบชื่อ";
    const daysLeft = row.expiry_date ? daysBetween(today, row.expiry_date) : null;
    return {
      id: row.id,
      name_th: name,
      qty_state: row.qty_state,
      expiry_date: row.expiry_date,
      bucket: expiryBucket(daysLeft),
      days_left: daysLeft,
    };
  });
}

function daysBetween(todayStr: string, expiryStr: string): number {
  return Math.round(
    (Date.parse(expiryStr) - Date.parse(todayStr)) / (1000 * 60 * 60 * 24),
  );
}

/**
 * Bucket an item's urgency. Buckets keep the pantry_hash (and therefore the
 * ai_suggestions cache) stable across same-day reloads, while invalidating
 * the cache when an item's urgency tier changes (e.g. d3 -> d1).
 */
export function expiryBucket(daysLeft: number | null): ExpiryBucket {
  if (daysLeft === null) return "later";
  if (daysLeft < 0) return "expired";
  if (daysLeft <= 1) return "d1";
  if (daysLeft <= 3) return "d3";
  if (daysLeft <= 7) return "d7";
  return "later";
}

/**
 * pantry_hash = SHA-256 of the sorted list of "name|qty_state|bucket"
 * strings. Sorting makes the hash independent of row order; bucketing
 * (rather than raw expiry_date) keeps the cache valid across same-day
 * reloads but invalidates it when urgency changes.
 */
export async function computePantryHash(items: ActivePantryItem[]): Promise<string> {
  const lines = items
    .map((item) => `${item.name_th}|${item.qty_state}|${item.bucket}`)
    .sort();

  const data = new TextEncoder().encode(lines.join("\n"));
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ---------------------------------------------------------------------------
// Cache lookup
// ---------------------------------------------------------------------------

/**
 * Look up a fresh (< 24h old) cached suggestion set for this
 * (household_id, pantry_hash). Returns null if there is no row, or the row
 * is stale.
 */
export async function getFreshCachedSuggestions(
  admin: SupabaseClient,
  householdId: string,
  pantryHash: string,
): Promise<SuggestionResult | null> {
  const { data, error } = await admin
    .from("ai_suggestions")
    .select("suggestions, generated_at")
    .eq("household_id", householdId)
    .eq("pantry_hash", pantryHash)
    .maybeSingle();

  if (error) {
    throw new Error(`failed to read ai_suggestions cache: ${error.message}`);
  }

  if (!data) return null;

  const row = data as unknown as AiSuggestionRow;
  const ageMs = Date.now() - Date.parse(row.generated_at);
  if (ageMs > CACHE_FRESHNESS_MS) return null;

  return {
    suggestions: row.suggestions,
    cached: true,
    generated_at: row.generated_at,
  };
}

// ---------------------------------------------------------------------------
// Anthropic call
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `คุณคือแม่ครัว/พ่อครัวประจำบ้านคนไทย หน้าที่ของคุณคือเสนอเมนูอาหาร 2-3
เมนูที่ทำได้จริงจากวัตถุดิบที่มีอยู่ในบ้านเท่านั้น

กฎสำคัญ:
- ให้ความสำคัญกับเมนูที่ใช้วัตถุดิบที่ใกล้หมดอายุที่สุดเป็นอันดับแรก
  (เรียงเมนูจากวัตถุดิบที่ใกล้หมดอายุมากไปน้อย)
- ห้ามใช้วัตถุดิบที่มีสถานะ qty_state = "out" (ของหมดแล้ว) ในเมนูใดๆ
- เสนอเฉพาะเมนูที่ทำได้จริงด้วยวัตถุดิบที่ให้มา (อนุโลมเครื่องปรุงพื้นฐาน
  เช่น น้ำมัน เกลือ น้ำตาล พริกไทย ได้แม้ไม่อยู่ในรายการ)
- steps ต้องสั้น กระชับ เป็นภาษาไทย แต่ละขั้นตอนไม่เกิน 1 ประโยค
- time_minutes ต้องสมจริง (เวลาทำอาหารจริงโดยประมาณ เป็นนาที)

ตอบกลับเป็น JSON เท่านั้น ห้ามมีข้อความอื่นนอกเหนือจาก JSON ห้ามใช้ markdown
code fence รูปแบบ JSON ต้องเป็น:

{
  "suggestions": [
    {
      "id": "string (slug สั้นๆ ภาษาอังกฤษ เช่น \\"pad-kra-pao-moo\\")",
      "name_th": "string (ชื่อเมนูภาษาไทย)",
      "time_minutes": number,
      "uses": [
        { "pantry_item_id": "string (ใช้ id ที่ให้มาตรงๆ)", "name_th": "string", "days_left": number }
      ],
      "steps": ["string", "..."]
    }
  ]
}`;

interface AnthropicMessageContent {
  type: string;
  text?: string;
}

interface AnthropicResponse {
  content?: AnthropicMessageContent[];
  error?: { message?: string };
}

interface LlmSuggestionsPayload {
  suggestions: Suggestion[];
}

/** Context for a corrective retry after malformed JSON. */
interface CorrectionNote {
  /** The model's previous (malformed) raw text response. */
  previousRaw: string;
  /** The corrective instruction to send back to the model. */
  message: string;
}

/**
 * Build the user-message prompt describing the current pantry state.
 */
function buildUserPrompt(items: ActivePantryItem[]): string {
  const usable = items.filter((item) => item.qty_state !== "out");

  const lines = usable.map((item) => {
    const days = item.days_left === null
      ? "ไม่ระบุวันหมดอายุ"
      : item.days_left < 0
      ? `หมดอายุแล้ว ${Math.abs(item.days_left)} วัน`
      : `เหลืออีก ${item.days_left} วัน`;
    return `- id: ${item.id}, ชื่อ: ${item.name_th}, ปริมาณ: ${qtyLabel(item.qty_state)}, อายุ: ${days}`;
  });

  return `วัตถุดิบที่มีอยู่ในบ้านตอนนี้:\n${lines.join("\n")}\n\nกรุณาเสนอเมนู 2-3 เมนูตามกฎที่กำหนด`;
}

function qtyLabel(qty: QtyState): string {
  switch (qty) {
    case "full":
      return "เหลือเยอะ";
    case "half":
      return "เหลือครึ่ง";
    case "out":
      return "หมดแล้ว";
  }
}

/**
 * Call the Anthropic Messages API once, parse the JSON response strictly.
 * Throws on transport/HTTP errors; returns `null` if the response body is
 * not valid JSON matching the expected shape (caller decides whether to
 * retry).
 */
async function callAnthropic(
  apiKey: string,
  model: string,
  userPrompt: string,
  correctionNote?: CorrectionNote,
): Promise<{ raw: string; parsed: LlmSuggestionsPayload | null }> {
  const messages: { role: "user" | "assistant"; content: string }[] = [
    { role: "user", content: userPrompt },
  ];

  if (correctionNote) {
    messages.push({ role: "assistant", content: correctionNote.previousRaw });
    messages.push({ role: "user", content: correctionNote.message });
  }

  const resp = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_API_VERSION,
    },
    body: JSON.stringify({
      model,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages,
    }),
  });

  if (!resp.ok) {
    const errBody = await resp.text();
    throw new Error(`Anthropic API ${resp.status}: ${errBody.slice(0, 500)}`);
  }

  const json = (await resp.json()) as AnthropicResponse;
  const text = json.content?.find((c) => c.type === "text")?.text ?? "";

  return { raw: text, parsed: tryParseSuggestions(text) };
}

function tryParseSuggestions(raw: string): LlmSuggestionsPayload | null {
  let text = raw.trim();
  // Defensive: strip a markdown code fence if the model added one despite
  // instructions not to.
  const fenceMatch = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fenceMatch) text = fenceMatch[1];

  try {
    const parsed = JSON.parse(text);
    if (!parsed || !Array.isArray(parsed.suggestions)) return null;

    for (const s of parsed.suggestions) {
      if (
        typeof s.id !== "string" ||
        typeof s.name_th !== "string" ||
        typeof s.time_minutes !== "number" ||
        !Array.isArray(s.uses) ||
        !Array.isArray(s.steps)
      ) {
        return null;
      }
      for (const u of s.uses) {
        if (
          typeof u.pantry_item_id !== "string" ||
          typeof u.name_th !== "string" ||
          typeof u.days_left !== "number"
        ) {
          return null;
        }
      }
      for (const step of s.steps) {
        if (typeof step !== "string") return null;
      }
    }

    return parsed as LlmSuggestionsPayload;
  } catch {
    return null;
  }
}

interface AnthropicConfig {
  apiKey: string;
  model: string;
}

/**
 * One call to the Anthropic Messages API, with one corrective retry on
 * malformed JSON. Returns parsed suggestions, or throws if both attempts
 * fail (caller maps this to a 502).
 */
async function generateSuggestions(
  config: AnthropicConfig,
  items: ActivePantryItem[],
): Promise<Suggestion[]> {
  const userPrompt = buildUserPrompt(items);

  const first = await callAnthropic(config.apiKey, config.model, userPrompt);
  if (first.parsed) return first.parsed.suggestions;

  console.error("suggestionEngine: malformed JSON from Anthropic, retrying once", first.raw.slice(0, 300));

  const second = await callAnthropic(config.apiKey, config.model, userPrompt, {
    previousRaw: first.raw,
    message:
      "คำตอบก่อนหน้าไม่ใช่ JSON ที่ถูกต้องตาม schema กรุณาตอบกลับเป็น JSON ล้วนๆ ตาม schema ที่กำหนดเท่านั้น ห้ามมีข้อความอื่นหรือ markdown code fence",
  });

  if (second.parsed) return second.parsed.suggestions;

  throw new Error("Anthropic returned malformed JSON twice");
}

// ---------------------------------------------------------------------------
// Top-level: get-or-generate
// ---------------------------------------------------------------------------

export class SuggestionEngineError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "SuggestionEngineError";
  }
}

/**
 * Get suggestions for a household: cache hit if a fresh row exists for the
 * current pantry_hash and !forceRefresh, otherwise call the LLM and upsert
 * the result.
 *
 * `today` is a YYYY-MM-DD string used for expiry bucketing (pass the same
 * value consistently within one invocation/cron run).
 */
export async function getOrGenerateSuggestions(
  admin: SupabaseClient,
  householdId: string,
  today: string,
  options: { forceRefresh?: boolean; anthropic: AnthropicConfig | null },
): Promise<SuggestionResult> {
  const items = await loadActivePantryItems(admin, householdId, today);

  if (items.length === 0) {
    return { suggestions: [], cached: false, generated_at: new Date().toISOString() };
  }

  const pantryHash = await computePantryHash(items);

  if (!options.forceRefresh) {
    const cached = await getFreshCachedSuggestions(admin, householdId, pantryHash);
    if (cached) return cached;
  }

  if (!options.anthropic) {
    throw new SuggestionEngineError("Anthropic API not configured");
  }

  const usableItems = items.filter((item) => item.qty_state !== "out");
  if (usableItems.length === 0) {
    return { suggestions: [], cached: false, generated_at: new Date().toISOString() };
  }

  let suggestions: Suggestion[];
  try {
    suggestions = await generateSuggestions(options.anthropic, items);
  } catch (err) {
    throw new SuggestionEngineError("Failed to generate suggestions from Anthropic", err);
  }

  const generatedAt = new Date().toISOString();

  const { error: upsertError } = await admin
    .from("ai_suggestions")
    .upsert(
      {
        household_id: householdId,
        pantry_hash: pantryHash,
        suggestions,
        model: options.anthropic.model,
        generated_at: generatedAt,
      },
      { onConflict: "household_id,pantry_hash" },
    );

  if (upsertError) {
    // Non-fatal: we still have a freshly generated result to return even if
    // the cache write failed.
    console.error("suggestionEngine: failed to upsert ai_suggestions cache", upsertError);
  }

  return { suggestions, cached: false, generated_at: generatedAt };
}

/**
 * Read Anthropic config from env. Returns null if not configured (e.g. local
 * dev without a key) so callers can degrade gracefully.
 */
export function getAnthropicConfig(): AnthropicConfig | null {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return null;
  const model = Deno.env.get("ANTHROPIC_MODEL") || DEFAULT_MODEL;
  return { apiKey, model };
}

export function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}
