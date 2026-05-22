---
paths:
  - "src/components/**"
  - "src/hooks/**"
  - "**/*.module.css"
---

# UI & Styling

## Included Components

- **`Button`** — Full reference implementation with variants (solid/soft/outline/ghost/surface), colors, sizes, loading state
- **`Flex`** — Layout primitive with spacing/alignment props mapped to design tokens
- **`Text`** — Typography with size/color/weight props
- **`Heading`** — Semantic heading tags (h1-h6) auto-mapped from size
- **`TextField`** — Input wrapper with compound Root + Slot pattern
- **`Card`** — Container with surface/classic/ghost variants

## Creating New Base UI Wrappers

When you need a new component (Dialog, Select, DropdownMenu, Tabs, etc.):

1. **Check Base UI docs**: use context7 (`@base-ui/react`) for component API reference
2. **Create the wrapper** in `src/components/ui/{name}.tsx` — wrap Base UI primitives with custom styling
3. **Create the CSS module** in `src/components/ui/{name}.module.css` — use BEM-like naming (`.trigger`, `.popup`, `.item`)
4. **Use compound component pattern**: Export as `Component.Root`, `Component.Trigger`, `Component.Content`, etc.
5. **Export from barrel** in `src/components/ui/index.ts`

## Styling Rules

- **CSS modules are the only source of truth for styles.** Never use inline `style={{}}` for static styles. Inline `style` is only acceptable for truly dynamic values computed at runtime.
- **Component layout props on `Flex`/`Text`** (like `gap`, `direction`, `align`) are acceptable since they're structural, but visual styling must live in CSS modules.
- **Don't duplicate**: if a component accepts a prop that controls a CSS property, don't also set it in a CSS class on the same element.
- **Design tokens** live in `src/styles/tokens.css`. Reference via `var(--space-N)`, `var(--font-size-N)`, etc.
- **BEM-like CSS module naming**: `.button`, `.variant-solid`, `.color-blue`, `.size-2`

## Data Fetching (TanStack Query)

Use context7 (`@tanstack/react-query`) for hooks API reference. Follow existing patterns in `src/hooks/`.

Query key hierarchy: `['entity', 'variant', filters]`.
