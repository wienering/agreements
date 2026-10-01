# Design debt — deferred polish

Tracked items from the design-system migration audit and polish pass. Not in scope for the current session unless noted.

## High priority

### Agreement PDF token layer
- `app/api/agreements/pdf/route.ts` still generates plain Helvetica output with no brand palette.
- Bring onto the same RGB token set as `app/api/quotes/generate-pdf/route.ts`.
- Consider a shared `lib/design-tokens.ts` (or similar) consumed by CSS custom properties, quote PDF, agreement PDF, and `lib/email/layout.ts`.

### Keyboard focus outline pass
- Done: global `:focus-visible` in `globals.css` — `outline: 2px solid var(--accent)` and `outline-offset: 2px` on `a`, `button`, `input`, `select`, `textarea`, and `[tabindex]`.
- Done: removed bare `outline: 'none'` from `SearchableSelect` and `RichTextEditor` (no replacement focus style).
- Still open: inline `outline: 'none'` outside `app/components/` (`app/admin/agreements/page.tsx`, `app/admin/clients/page.tsx`, `app/agreement/[token]/page.tsx`). Those inline styles beat the global rule.

### Surface-aware shared components
- Done: `StatusBadge` accent, warning, and danger variants use tokens (`--accent`, `--accent-wash`, `--accent-rgb`, `--status-wait`, `--status-wait-rgb`, `--status-action`, `--status-action-rgb`). No `var(--gold)` and no literal rgba.
- Done: `Toast` success uses `--accent` / `--accent-on`. Error text uses `--accent-on` instead of `#fff`.
- Still open: `FileUpload`, `SearchableSelect`, `RichTextEditor`, and `AdminButton` assume admin tokens. `AdminButton` danger hover and `FileUpload` still use literal rgba.
- Parameterize by surface or split into client/admin variants so reuse cannot leak the old coral/gold aliases onto the wrong surface.

## Medium priority

### adminTheme cleanup
- Done: no dark-theme branch. `adminTheme` is light only (`adminTheme.admin`). Chart and status literals match the `:root` hex in `globals.css`.
- Done: `adminHeaderAddButton.hover` is `var(--panel)`, the same colour as `--admin-surface-raised`. The old `#3F3A34` hover is gone.

### Email route inline hex consolidation
- Several API routes still inline `#C0552F`, `#2A2724`, `#F2EBDD`, etc. instead of importing constants from `lib/email/layout.ts`.
- `app/api/agreements/sign/route.ts` still has a legacy `#e2e8f0` / `#ffffff` signature block.

### Analytics color literals
- `app/api/analytics/route.ts` uses `#dc2626` for DRAFT.
- `app/api/analytics/pipeline/route.ts` uses `#c6a04d` literals.
- Centralize on `accentTokens` or a shared design-tokens module.

### Toast and misc hardcoded colors
- Done: `Toast` error text is `var(--accent-on)` (light text on the alert fill).
- `admin/page.tsx` chart `neutralBar = '#5c5650'` — unmapped admin neutral.
- Client/admin `#fff` signature field backgrounds in agreement and preview pages → `var(--paper)`.

## Low priority

### PG monogram loading states
- Portal pages use anonymous `animate-spin` rings; admin layout uses `UIcon name="spinner"`.
- Spec: PG monogram in headers/avatars/loading states — apply consistently.

### Section headers without display font
- Portal agreement detail, dashboard overview sections, thank-you post-success `h2`s, attendant hub job cards, admin templates modals — still sans-only.
- Page-level titles were addressed in the polish pass; section-level Fraunces is still inconsistent.

### Spec doc sync
- `docs/design-direction.md` still lists Warn as `#B07D2A`. Token layer now uses surface-scoped values (`#8A6220` client, `#B4862A` admin) — update the spec when the palette is finalized.

### Residual spec violations (visual)
- Gradients on attendant hub job cards and admin agreements tracking tooltips (`linear-gradient`).
- Glow on thank-you checkmark pulse animation.
- `portal/login` `animate-pulse` on PG avatar.
