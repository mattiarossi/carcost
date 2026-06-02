# Car Cost Comparator

A personal, locally-run tool to compare the **real total cost of ownership** of ICE, LPG bi-fuel, Mild Hybrid, Full Hybrid, PHEV, and BEV cars — based on your actual usage pattern, not manufacturer marketing.

Paste (or drop a PDF) from any car configurator website, define how you drive, and see a consistent side-by-side breakdown: monthly cost, annual fuel/energy spend, and TCO over any horizon you choose.

Everything runs locally — SQLite database, Node backend, React frontend — with no cloud dependency and no data leaving the machine.

---

## Why this exists

### List prices lie

When comparing two cars, the obvious starting point is the sticker price — but it is almost never what you actually pay, and it rarely means the same thing across models.

Most buyers finance their car through a manufacturer's financial plan, which introduces three variables that the list price completely hides:

- **Deposit** — how much cash you put down on day one varies widely across offers and is sometimes partially covered by a trade-in or a brand incentive.
- **Guaranteed Future Value (GFV) / balloon payment** — many modern finance plans (PCP, "Easy Next", VFG, etc.) set a contractually guaranteed residual value at the end of the term. A higher GFV means lower monthly instalments, but it also means you are only *renting* the depreciation gap — and if you want to own the car outright at the end, you still owe that balloon. Two cars with similar list prices can have radically different monthly costs depending on how aggressively their brand supports the residual value.
- **Included mileage cap** — finance plans specify a maximum annual km. Exceed it and you pay a per-km penalty. A plan that looks cheaper on paper because the monthly instalment is lower may carry a 12 000 km/year cap when you actually drive 18 000. The real cost comparison has to use *your* mileage, not the plan's cap.

The only honest comparison metric is: **how much money leaves your pocket over the contract term**, normalised to a monthly figure — deposit amortised, instalments paid, balloon excluded if you plan to hand the car back at the end.

### Running costs compound the complexity

Even if you could compare acquisition costs perfectly, running costs add another layer that is deeply personal:

- A **full hybrid** regenerates braking energy and excels in city traffic. Exactly how much it saves depends on how much of your driving is urban stop-start versus open road.
- A **mild hybrid** only assists the ICE under acceleration load. Its efficiency gain is modest and varies with driving style. The name "hybrid" is often marketing as much as engineering.
- A **PHEV** is essentially free to run for the first 40–80 km if you charge at home overnight — but if your daily commute exceeds the electric range, or if you mostly charge on public DC fast chargers, it reverts to a heavy ICE with a battery it cannot use efficiently.
- A **BEV** has the lowest per-km energy cost *if* you charge at home at a flat overnight tariff. Public fast-charging at peak rates can make it more expensive per km than a petrol car.
- An **LPG bi-fuel** has lower fuel cost per km than petrol and a larger effective range, but LPG density is lower than petrol so you fill up more often, and the tank network is thinner in some regions.
- A **diesel** is efficient on long motorway runs but the efficiency advantage erodes in urban use, and ownership costs (AdBlue, DPF servicing, urban access restrictions) need to be factored in.

None of these trade-offs show up on a configurator page.

### Fuel and electricity prices shift the ranking

Even if you knew your exact driving mix, the *ranking* of technologies is not stable — it changes with energy prices. At €1.70/L petrol and €0.25/kWh home electricity, a BEV wins on running cost by a wide margin. At €0.60/kWh public charging and €1.50/L petrol, the advantage shrinks dramatically. An LPG car at €0.75/L LPG beats both over 20 000 km/year on motorways. The "right" technology choice is a function of prices you cannot fully control.

### How this tool helps

The cost comparator solves these problems by:

1. **Importing real financial data** — paste the financing summary from the configurator and the parser extracts deposit, monthly instalment, residual/GFV, duration, and mileage cap. The TCO uses actual contract cash flows, not list price.
2. **Applying your driving mix** — a usage profile encodes the urban/suburban/motorway split and annual km you actually drive. WLTP consumption figures are weighted by that mix to produce a realistic per-km energy cost for each powertrain.
3. **Normalising everything to the same unit** — monthly cost, annual energy spend, and total out-of-pocket over a chosen horizon, computed consistently across all cars in your shortlist regardless of fuel type.
4. **Letting you stress-test the ranking** — the **cost projection chart** lets you pick one variable (petrol price, electricity price, annual km, home charging fraction…) and sweep it across its realistic range. Every car in your comparison is redrawn on the same chart simultaneously. You can see not just which car wins today, but *at what petrol price* a hybrid overtakes a BEV, or *at what annual km* LPG becomes cheaper than petrol — and whether that crossover point falls inside the range of prices you might realistically face over a four-year contract.

The goal is to turn an opaque, marketing-driven purchasing decision into a transparent, quantitative one — without needing a spreadsheet.

---

## Quickstart

### Prerequisites

- Node.js 20+ and [yarn](https://yarnpkg.com/)

### Install & run

```bash
git clone https://github.com/mattiarossi/carcost carcost
cd carcost
yarn install
yarn db:migrate     # create data/cars.db and apply migrations
yarn dev            # starts the Vite dev server + tRPC backend
```

Open http://localhost:5173.

### First steps

1. **Add a car** — go to Cars → Add Car. Paste the specs text copied from the manufacturer's configurator page (or drag a PDF onto the text area). The parser auto-detects the brand and fills in fuel type, consumption, power, CO₂, etc.
2. **Add financing** — on the car detail page, paste the financing summary text from the configurator and let the parser extract deposit, monthly instalment, TAN/TAEG, residual value, and so on.
3. **Define a usage profile** — go to Profiles. A profile encodes your driving mix (% urban / suburban / motorway), annual km, fuel prices, and charging behaviour. You can have multiple profiles (e.g. "City 15k km/y", "Mixed 20k km/y").
4. **Compare** — go to Compare, select two or more cars. The table shows computed monthly cost, annual energy spend, and TCO. Switch to the **Chart** tab to sweep any variable (fuel price, annual km, charging mix) and see how the ranking changes.

### Other useful commands

```bash
yarn test           # run all Vitest tests
yarn db:generate    # regenerate SQL migration after editing src/server/db/schema.ts
yarn db:migrate     # apply pending migrations
```

---

## Architecture

```
carcost/
├── src/
│   ├── server/
│   │   ├── db/               # Drizzle ORM schema + SQLite client
│   │   ├── metrics/          # Pure computeMetrics() function
│   │   ├── parsers/          # Spec & finance text parsing (see below)
│   │   ├── trpc/             # tRPC router + procedure definitions
│   │   └── vite-trpc-plugin  # Vite plugin that mounts the tRPC server in dev
│   └── client/
│       ├── components/       # Shared UI components (PdfDropZone, KVTable…)
│       ├── i18n/             # English + Italian translations
│       ├── lib/              # tRPC client setup, KVTable helper
│       └── routes/           # TanStack Router file-based routes
├── data/                     # SQLite database (gitignored)
├── fixtures/                 # Sample configurator text for testing parsers
└── src/server/db/migrations/ # Drizzle-generated SQL migration files
```

**Stack:** React 19 · Vite 6 · TanStack Router + Query + Table + Form · tRPC (HTTP + WebSocket) · Drizzle ORM · SQLite · Tailwind CSS v4 · i18next · Recharts · Vitest

---

## Parse Plugins

The parser converts raw text (copy-pasted or PDF-extracted) from car configurator pages into structured `ParsedSpecs` and `ParsedFinance` objects. It is designed to handle multiple brands, multiple languages (primarily Italian and English), and varying formatting without requiring strict patterns.

### How it works

1. **Detection** — each plugin scores the input text (0–1) based on brand-specific markers. The highest-scoring plugin wins; the Generic plugin always returns 0.1 as a catch-all floor.
2. **Pre-processing** — the winning plugin can normalise brand-specific quirks (e.g. collapsing non-standard label formats) before the engine sees the text.
3. **Rule engine** — a keyword rule set (`SpecRule[]` / `FinanceRule[]`) is applied via Fuse.js fuzzy key-value matching. Brand-specific rules are prepended to the generic set; the first high-confidence match for each field wins.
4. **Validation** — the parsed output is validated and missing required fields are flagged in the UI.

### Plugin interface

```typescript
interface ParserPlugin {
  id: string            // stable identifier e.g. 'toyota-it', 'generic'
  displayName: string   // shown in the UI detection pill
  priority: number      // tie-break when scores are equal (generic = 0, brand = 10+)

  detectSpecs(normalisedText: string): number    // 0–1
  detectFinance(normalisedText: string): number  // 0–1

  specRules?: SpecRule[]       // brand-specific rules (prepended to generic)
  financeRules?: FinanceRule[]

  preprocessSpecs?(raw: string): string     // optional text normalisation hook
  preprocessFinance?(raw: string): string
}
```

### Built-in plugins

| Plugin ID | `displayName` | Detects |
|---|---|---|
| `toyota-it` | Toyota | "toyota", "configura", "toyota financial services" |
| `hyundai` | Hyundai | "hyundai", brand-specific finance labels |
| `renault-it` | Renault | "renault", brand-specific spec/finance markers |
| `generic` | Generic | Catch-all — always scores 0.1, uses shared keyword rules |

### Adding a new brand plugin

1. Create `src/server/parsers/plugins/<brand>/index.ts` exporting a `ParserPlugin` object.
2. Implement `detectSpecs()` and `detectFinance()` — fast string checks only, no async.
3. Optionally add brand-specific `specRules` / `financeRules` that shadow generic rules.
4. Register the plugin in `src/server/parsers/registry.ts`.

```typescript
// src/server/parsers/plugins/volkswagen/index.ts
import type { ParserPlugin } from '../../plugin.js'

export const volkswagenPlugin: ParserPlugin = {
  id: 'volkswagen-de',
  displayName: 'Volkswagen',
  priority: 10,

  detectSpecs(text) {
    const t = text.toLowerCase()
    let score = 0, total = 0
    const add = (w: number, hit: boolean) => { total += w; if (hit) score += w }
    add(0.5, t.includes('volkswagen') || t.includes(' vw '))
    add(0.3, t.includes('konfigurator') || t.includes('configurator'))
    add(0.2, t.includes('volkswagenbank'))
    return total > 0 ? score / total : 0
  },

  detectFinance(text) {
    // similar pattern…
    return text.toLowerCase().includes('volkswagen') ? 0.5 : 0
  },
}
```

Then in `src/server/parsers/registry.ts`:

```typescript
import { volkswagenPlugin } from './plugins/volkswagen/index.js'

export const registry: ParserPlugin[] = [
  toyotaPlugin,
  hyundaiPlugin,
  renaultPlugin,
  volkswagenPlugin,  // ← add here
  genericPlugin,     // always last
]
```

### UI detection pill

When you paste or drop a PDF, the UI debounces a `parse.detect` call (600 ms, min 50 chars) and shows a pill below the textarea:

- **Top match** name + confidence score
- A **dropdown** to manually override the detected plugin when multiple candidates exist
- A **reset** button to go back to auto-detection

---

## PDF Import

All paste sections (Add Car specs, Car Detail specs, Car Detail finance) accept PDFs:

- **Drag & drop** a `.pdf` file onto the textarea — a dashed overlay appears while dragging; text is extracted automatically on drop.
- **Click the `📎 PDF` button** (top-right of the textarea) to open a file picker.

Text extraction uses `pdfjs-dist` entirely in the browser — the PDF never leaves your machine.

---

## Computed Metrics

| Metric | Description |
|---|---|
| Monthly cost | Financing instalment + monthly fuel/energy cost at the given profile |
| Annual fuel/energy | Driven km × weighted consumption × fuel price (per fuel type) |
| TCO | `deposit + total_repayable` (if financed) or `list_price`, plus total energy cost over the horizon |

The driving mix (urban / suburban / motorway %) from the usage profile is applied to WLTP cycle consumption figures to derive a realistic real-world consumption estimate.

---

## i18n

The app ships with **English** and **Italian** translations (`src/client/i18n/en.json` / `it.json`). Language is toggled in Settings and persisted to `localStorage`. Italian is the default for the parser keyword dictionary since Italian configurator copy is the primary input source.

---

## License

Private / personal use.
