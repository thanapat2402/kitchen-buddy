# Kitchen Buddy — Setup Guide (Supabase + LINE)

คู่มือตั้งค่าโปรเจกต์ตั้งแต่ศูนย์ สำหรับเจ้าของโปรเจกต์ (solo dev). ทำตามลำดับ
1 → 5 ครั้งเดียวตอนตั้งโปรเจกต์ใหม่ จากนั้นใช้คำสั่ง deploy ท้ายไฟล์ทุกครั้งที่แก้
`supabase/**`.

---

## 1. LINE Developers Console

ไปที่ https://developers.line.biz/console/

### 1.1 สร้าง Provider
- กด "Create" > ตั้งชื่อ provider เช่น `Kitchen Buddy` (ชื่ออะไรก็ได้ ใช้ภายใน)

### 1.2 สร้าง LINE Login channel + LIFF app
1. ภายใต้ provider ที่สร้าง กด "Create a new channel" > เลือก **LINE Login**
2. กรอกข้อมูล channel (ชื่อ, คำอธิบาย, ไอคอน — ใส่อะไรก็ได้)
3. หลังสร้างเสร็จ เข้าไปที่แท็บ **Basic settings**
   - จด **Channel ID** ไว้ → นี่คือค่า `LINE_CHANNEL_ID` (ใช้ฝั่ง edge function)
4. ไปที่แท็บ **LIFF** > "Add" เพื่อสร้าง LIFF app
   - **Size**: Full
   - **Endpoint URL**: URL ของเว็บแอป (ตอน dev local ใช้ ngrok/cloudflared
     เพราะ LIFF ต้องการ HTTPS; ตอน production ใส่ URL ที่ deploy จริง)
   - **Scope**: เลือก `profile`, `openid` (ต้องมี `openid` เพื่อให้ได้ id_token)
   - **Bot link feature**: Off (ไม่จำเป็น)
   - หลังสร้างเสร็จ จด **LIFF ID** (รูปแบบ `1234567890-AbCdEfGh`) ไว้ →
     นี่คือค่า `VITE_LIFF_ID` (ฝั่ง frontend)

> หมายเหตุ: ถ้ายังไม่อยาก deploy เว็บ สามารถข้ามขั้นตอนนี้ได้ก่อน — frontend
> รองรับ "mock mode" เมื่อ `VITE_LIFF_ID` ว่าง (ตาม CLAUDE.md) ทำให้ทดสอบ
> backend ได้โดยไม่ต้องมีบัญชี LINE

### 1.3 สร้าง Messaging API channel (สำหรับส่ง daily digest)
1. ภายใต้ provider เดิม กด "Create a new channel" > เลือก **Messaging API**
2. กรอกข้อมูล channel (ชื่อ, ไอคอน, หมวดหมู่)
3. หลังสร้างเสร็จ ไปที่แท็บ **Messaging API**
   - เลื่อนลงไปที่ **Channel access token** > กด "Issue" เพื่อสร้าง
     long-lived token → นี่คือค่า `LINE_MESSAGING_ACCESS_TOKEN`
   - ปิด **Auto-reply messages** และ **Greeting messages** (ไม่จำเป็นสำหรับแอปนี้)
4. **สำคัญ**: ผู้ใช้ทุกคน (รวมตัวเอง) ต้อง **เพิ่มเพื่อน (Add friend)** กับ
   Official Account ของ Messaging API channel นี้ ไม่งั้น push message จะส่งไม่ถึง
   - หา QR code/Bot ID ได้ในแท็บ Messaging API > QR code

> **LINE Notify ถูกยกเลิกไปแล้ว (มี.ค. 2025) — โปรเจกต์นี้ใช้ Messaging API
> เท่านั้น ตามที่ระบุใน CLAUDE.md**

---

## 2. Supabase Project

### 2.1 สร้างโปรเจกต์
1. ไปที่ https://supabase.com/dashboard > "New project"
2. ตั้งชื่อ, เลือก region (แนะนำ Singapore สำหรับ latency กับ LINE/ผู้ใช้ไทย),
   ตั้ง database password (เก็บไว้ดีๆ)
3. รอจนโปรเจกต์ provision เสร็จ (~2 นาที)

### 2.2 เก็บค่าที่ต้องใช้
ไปที่ **Project Settings > API**:
- **Project URL** → `VITE_SUPABASE_URL` (ฝั่ง frontend)
- **anon public key** → `VITE_SUPABASE_ANON_KEY` (ฝั่ง frontend)
- **service_role key** → ใช้ภายใน edge functions เท่านั้น (auto-injected,
  ไม่ต้องตั้งเอง — ดูหมายเหตุด้านล่าง)

ไปที่ **Project Settings > API > JWT Settings**:
- **JWT Secret** → จดไว้ → ใช้เป็นค่า `SB_JWT_SECRET` (ขั้นตอน 2.4)

### 2.3 Login + link CLI
```bash
supabase login
cd /path/to/kitchen-buddy
supabase link --project-ref YOUR_PROJECT_REF
```
`YOUR_PROJECT_REF` ดูได้จาก URL ของ dashboard
(`https://supabase.com/dashboard/project/<PROJECT_REF>`).

### 2.4 ตั้งค่า Edge Function secrets
```bash
supabase secrets set \
  LINE_CHANNEL_ID=xxxxxxxxxxxx \
  LINE_MESSAGING_ACCESS_TOKEN="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  SB_JWT_SECRET="your-jwt-secret-from-2.2" \
  GEMINI_API_KEY="..."
```

`GEMINI_API_KEY` ใช้โดยฟีเจอร์ "เย็นนี้กินอะไรดี" (`suggest` + nightly precompute ใน
`daily-digest`) — สร้าง key ฟรีได้ที่ aistudio.google.com/apikey ใช้ free tier ของ
Google Gemini จึงคุมงบ ฿0 ได้ (pantry-hash cache ทำให้ยิงจริงไม่กี่ครั้ง/วัน)
(ตั้ง `GEMINI_MODEL` override ได้ ค่า default คือ `gemini-2.5-flash`)

> **หมายเหตุสำคัญ**: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
> `SUPABASE_DB_URL` ถูก inject ให้ edge functions โดยอัตโนมัติ — **ห้าม** ตั้งเองด้วย
> `supabase secrets set` (CLI จะปฏิเสธชื่อที่ขึ้นต้นด้วย `SUPABASE_` อยู่แล้ว)
> นี่คือเหตุผลที่ JWT secret ใช้ชื่อ `SB_JWT_SECRET` แทน

### 2.5 Push migrations + seed
```bash
supabase db push          # applies everything in supabase/migrations/
```
Seed (`supabase/seed.sql`) จะรันอัตโนมัติเฉพาะตอน `supabase db reset` (local).
สำหรับ production project รัน seed ครั้งแรกด้วย:
```bash
psql "$(supabase db remote-commit-url 2>/dev/null || echo YOUR_DB_CONNECTION_STRING)" \
  -f supabase/seed.sql
```
หรือเปิด **SQL Editor** ในหน้า dashboard แล้ววาง content ของ
`supabase/seed.sql` รันครั้งเดียว (ปลอดภัยรันซ้ำได้ — script จะลบของเก่าที่
`is_seed = true` ก่อน insert ใหม่)

### 2.6 Deploy edge functions
```bash
supabase functions deploy line-auth --no-verify-jwt
supabase functions deploy daily-digest
supabase functions deploy suggest --no-verify-jwt
```

> **`line-auth` และ `suggest` ต้อง deploy ด้วย `--no-verify-jwt` เสมอ** มิฉะนั้น
> Supabase gateway จะเด้ง 401 (`UNAUTHORIZED_NO_AUTH_HEADER`) ตั้งแต่ก่อนถึงฟังก์ชัน
> และแอปจะขึ้น "เชื่อมต่อระบบไม่สำเร็จ":
> - `line-auth` ถูกเรียก**ก่อนมี session** (frontend ยังไม่มี JWT จะส่ง) — มัน verify
>   LINE id_token เองข้างใน
> - `suggest` รับ JWT ที่เรา mint เอง (เซ็นด้วย `SB_JWT_SECRET`) ไม่ใช่ token ของ
>   Supabase Auth — ตรวจลายเซ็นเองด้วย `verifySupabaseJwt`
>
> `daily-digest` ไม่ต้องใส่ เพราะ pg_cron เรียกด้วย service-role key อยู่แล้ว

### 2.7 เปิดใช้งาน pg_cron + pg_net และตั้ง schedule จริง
Migration `20260611120400_daily_digest_schedule.sql` จะ `create extension`
ให้ทั้งสองตัว และสร้าง cron job ด้วย URL/key แบบ placeholder
(`YOUR_PROJECT_REF` / `YOUR_SERVICE_ROLE_KEY`) เพื่อให้ `db push` ผ่านบน
โปรเจกต์ใหม่โดยไม่ error

หลัง push migration แล้ว ให้รันคำสั่งนี้ใน **SQL Editor** ของ dashboard
(แทนที่ `<PROJECT_REF>` และ `<SERVICE_ROLE_KEY>` ด้วยค่าจริงจากขั้นตอน 2.2)
เพื่อให้ cron job เรียก URL ที่ถูกต้อง:

```sql
select cron.alter_job(
  (select jobid from cron.job where jobname = 'kitchen-buddy-daily-digest'),
  command := $$
    select net.http_post(
      url := 'https://<PROJECT_REF>.supabase.co/functions/v1/daily-digest',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
      ),
      body := '{}'::jsonb
    );
  $$
);
```

ตรวจสอบว่า extensions เปิดอยู่ได้ที่ **Database > Extensions** ใน dashboard
(ค้นหา `pg_cron` และ `pg_net` ต้องเป็น "Enabled" — ถ้า migration รันไม่ผ่าน
เพราะ extension ไม่พร้อมใช้งานในโปรเจกต์ ให้เปิดที่หน้านี้ก่อนแล้ว push ใหม่)

ตรวจสอบว่า cron job รันสำเร็จได้ด้วย:
```sql
select * from cron.job_run_details order by start_time desc limit 5;
```

---

## 3. Frontend env

คัดลอก `.env.example` เป็น `.env.local` แล้วใส่ค่า:
```bash
cp .env.example .env.local
```
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` จากขั้นตอน 2.2
- `VITE_LIFF_ID` จากขั้นตอน 1.2 (เว้นว่างไว้ได้ถ้ายังไม่พร้อม → mock mode)

---

## 4. ทดสอบ local (ไม่บังคับ แต่แนะนำ)

ต้องมี Docker รันอยู่:
```bash
supabase start                        # สตาร์ท local Postgres + API + Studio
supabase db reset                     # apply migrations + seed ใหม่ทั้งหมด

# ทดสอบ edge functions แบบ local (ใช้ env แยกสำหรับ local เท่านั้น):
cat > supabase/.env.functions.local <<'EOF'
LINE_CHANNEL_ID=your-real-channel-id
LINE_MESSAGING_ACCESS_TOKEN=your-real-messaging-token
SB_JWT_SECRET=super-secret-jwt-token-with-at-least-32-characters-long  # ค่า default ของ local
EOF
supabase functions serve --env-file supabase/.env.functions.local --no-verify-jwt
```
(ไฟล์ `supabase/.env.functions.local` ไม่ถูก commit อยู่แล้ว — ครอบคลุมโดย
`supabase/.gitignore` pattern `.env.*.local`)

`supabase stop` เมื่อเลิกใช้งาน

---

## 5. ทางเลือกอื่นสำหรับ auth bridge (อ่านเฉยๆ ไม่ต้องทำตอนนี้)

`line-auth` ในโปรเจกต์นี้ mint Supabase access token แบบ HS256 ด้วยมือ
(เซ็นด้วย `SB_JWT_SECRET`) ซึ่งใช้ได้กับทุกโปรเจกต์ Supabase ตอนนี้

Supabase บางรุ่น/บาง region รองรับ **Third-Party Auth (Custom OIDC
provider)** ซึ่งให้ Supabase Auth เองตรวจสอบ token จาก issuer ภายนอกโดยตรง
โดยไม่ต้อง mint HS256 token เอง — สะอาดกว่าในระยะยาว แต่ต้องตั้งค่าผ่าน
dashboard (Authentication > Sign In / Providers > Third Party Auth) ซึ่ง
LINE ไม่ใช่ provider มาตรฐานที่ Supabase list ไว้ (ต้องใช้ "custom" OIDC และ
LINE ต้อง expose `.well-known/openid-configuration` ที่ Supabase ยอมรับ —
ยังไม่ได้ทดสอบว่าใช้ได้จริงกับ LINE Login ตอนเขียนเอกสารนี้)

ถ้าต้องการลองทางนี้ในอนาคต: เก็บ `line-auth` ปัจจุบันไว้เป็น fallback
แล้วค่อยทดลอง third-party provider แยกต่างหาก — อย่าลบ HS256 path จนกว่าจะ
ยืนยันว่า third-party path ใช้ได้จริงกับ LIFF id_token

---

## Deploy checklist สรุปสั้นๆ (หลังตั้งค่าครั้งแรกแล้ว)

ทุกครั้งที่แก้ไฟล์ใน `supabase/migrations/` หรือ `supabase/functions/`:
```bash
supabase db push
supabase functions deploy line-auth --no-verify-jwt
supabase functions deploy daily-digest
supabase functions deploy suggest --no-verify-jwt
```
