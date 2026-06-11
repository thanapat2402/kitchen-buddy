# Kitchen Buddy

LINE Mini App (LIFF): "คืนนี้ทำอะไรดี" — AI cook-tonight suggestions from your
household pantry, prioritizing soonest-to-expire ingredients.

See `CLAUDE.md` for the full product/stack decision record.

## Frontend — running locally

### Prerequisites

- Node.js 20+
- npm

### Install

```bash
npm install
```

### Dev mode (mock mode — default, no setup needed)

```bash
npm run dev
```

Opens at `http://localhost:5173`. With no `.env` file, the app runs in
**mock mode**:

- A fake user ("คุณกอล์ฟ") is signed in automatically — no LINE account or
  LIFF setup required.
- All pantry/catalog/recipe data comes from `MockPantryRepo`
  (`src/repo/MockPantryRepo.ts`), an in-memory store seeded with realistic
  Thai pantry data. State resets on page reload.
- A "MOCK MODE" badge appears in the header so it's obvious which mode
  is active.

This is the default and recommended way to develop the UI.

### Connecting to real LIFF

To run inside an actual LINE Mini App / LIFF browser, set the following
in a local `.env` file (not committed):

```
VITE_LIFF_ID=<your-liff-id>
```

When `VITE_LIFF_ID` is set, `AuthProvider` (`src/hooks/AuthProvider.tsx`)
calls `liff.init()`, requires login via LINE, and exposes the real
profile (`userId`, `displayName`, `pictureUrl`) and `id_token` through
`useAuth()`.

Obtaining a LIFF ID and configuring the LINE Developers Console is out of
scope for this document — see the backend setup guide (`SETUP.md`) for
that.

### Build

```bash
npm run build
```

Runs `tsc -b` (TypeScript strict mode) followed by `vite build`. Must
pass clean before merging.

### Lint

```bash
npm run lint
```

## Project structure

```
src/
  components/
    tabs/        # TonightTab, PantryTab, AddItemTab — one per bottom tab
    ui/          # Shared primitives: ExpiryBadge, QtyChip, Toast, AsyncState
    TabBar.tsx   # Bottom tab bar (3 tabs, no router)
  hooks/
    AuthProvider.tsx  # LIFF bootstrap + mock-mode auth
    useAuth.ts        # Access current auth state
    useRepo.ts        # Access the active PantryRepo
    useToasts.ts      # Toast queue management
  lib/
    authContext.ts    # Auth context + mock user constant
    repoContext.ts     # Repo context (currently always MockPantryRepo)
    date.ts            # Date helpers (Thai labels, expiry math)
    pantryUtils.ts      # Small pure helpers (qty state cycling)
  repo/
    PantryRepo.ts       # Repo interface — the data-layer contract
    MockPantryRepo.ts   # In-memory implementation (this leg)
    catalogSeed.ts       # ~30 Thai staple quick-pick items
    pantrySeed.ts         # ~12 seeded pantry items with varied expiry
    recipeSeed.ts          # 2 sets of mock recipe suggestions
  types/
    pantry.ts   # Domain types (PantryItem, CatalogItem, RecipeSuggestion, ...)
    auth.ts     # AuthState type
```

## Swapping in the real backend (future legs)

- `PantryRepo` (`src/repo/PantryRepo.ts`) is the data-access boundary.
  Components only depend on this interface via `useRepo()`. A future
  `SupabasePantryRepo` implementing the same interface can be swapped in
  via `src/lib/repoContext.ts` without touching any tab component.
- `useAuth()` already returns `idToken` (null in mock mode). Once the
  Supabase JWT bridge exists, the repo implementation can use this token
  for authenticated requests.
