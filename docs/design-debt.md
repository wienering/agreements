# Design debt — deferred polish

Tracked items from the design-system migration audit and polish pass. Not in scope for the current session unless noted.

## High priority

### Agreement PDF token layer
- `app/api/agreements/pdf/route.ts` still generates plain Helvetica output with no brand palette.
- Bring onto the same RGB token set as `app/api/quotes/generate-pdf/route.ts`.
- Consider a shared `lib/design-tokens.ts` (or similar) consumed by CSS custom properties, quote PDF, agreement PDF, and `lib/email/layout.ts`.

### Keyboard focus outline pass
- Spec: visible keyboard focus with 2px accent outline.
- Many controls use `outline: 'none'` without a tokenized replacement (`SearchableSelect`, `RichTextEditor`, admin filter inputs, agreement signature fields, inline-styled admin forms).
- Audit and replace with a shared focus style (`outline: 2px solid var(--accent)` or surface-appropriate equivalent).

### Surface-aware shared components
- `StatusBadge` hardcodes `var(--gold)` on the accent variant; warning variant uses literal `rgba(176, 125, 42, …)` from the old warn hex.
- `Toast` success type hardcodes `var(--gold)`; error type uses `#fff`.
- `FileUpload`, `SearchableSelect`, `RichTextEditor`, `AdminButton` assume admin tokens.
- Parameterize by surface or split into client/admin variants so reuse cannot leak gold onto client or coral onto admin.

## Medium priority

### adminTheme cleanup
- Flatten `adminTheme.dark` nesting (dark-only app; the `.dark` key is legacy shape).
- Promote `#3F3A34` (`adminHeaderAddButton.hover`) to a named admin raised-hover token in `globals.css`.

### Email route inline hex consolidation
- Several API routes still inline `#C0552F`, `#2A2724`, `#F2EBDD`, etc. instead of importing constants from `lib/email/layout.ts`.
- `app/api/agreements/sign/route.ts` still has a legacy `#e2e8f0` / `#ffffff` signature block.

### Analytics color literals
- `app/api/analytics/route.ts` uses `#dc2626` for DRAFT.
- `app/api/analytics/pipeline/route.ts` uses `#c6a04d` literals.
- Centralize on `accentTokens` or a shared design-tokens module.

### Toast and misc hardcoded colors
- `Toast` error type: `color: '#fff'` → token or `var(--admin-text)` / white-on-alert pattern.
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
