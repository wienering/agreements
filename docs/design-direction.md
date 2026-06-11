# Photobooth Guys Agreements App — Design Direction

One-page spec. Cursor executes against this; it does not improvise beyond it.

## Principle

The app is the last surface not on brand. Emails, quote PDFs, and print materials already share one design language. This is a re-skin: same markup, same components, same logic, new token layer. No behavioral changes of any kind.

## Two surfaces

**Client surface** (signing pages, thank-you page, client portal, OTP login, anything a client ever sees): light mode, a direct continuation of the email system. A client who clicks the coral button in an email lands on a page that looks like the email.

**Admin surface** (everything behind login, plus the attendant hub): dark mode, warm charcoal, gold accent. Visually sibling to the client surface, instantly distinguishable from it.

## Tokens

### Shared brand tokens
| Token | Hex | Use |
|---|---|---|
| Paper | #FAF6EF | Client backgrounds, email parity |
| Ink | #2A2724 | Client text, admin surface derivation |
| Coral | #C0552F | Client primary actions ONLY. Never in admin. |
| Gold | #C6A04D | Admin primary accent ONLY. Never client-facing. |
| Panel | #F2EBDD | Client panels, notice blocks |
| Hairline | #E5DDCF | Client dividers |
| Muted | #6E655A | Client secondary text |
| Alert | #B3392B | Destructive/alert, both surfaces (matches email alert tone) |
| Success | #3F6F4F | Signed/confirmed states, both surfaces. Muted, not emerald. |
| Warn | #B07D2A | Pending/attention states, both surfaces |

### Admin dark tokens (derived from Ink, warm — never blue-gray slate)
| Token | Hex | Use |
|---|---|---|
| Admin BG | #1E1B18 | Page background |
| Admin Surface | #2A2724 | Cards, panels, modals |
| Admin Surface Raised | #353029 | Hover states, nested panels |
| Admin Text | #EDE7DC | Primary text |
| Admin Muted | #9A9087 | Secondary text, labels |
| Admin Hairline | #3D372F | Borders, dividers |

## Typography

- **Display (serif):** Fraunces (Google Fonts) — page titles, section headers, the wordmark treatment. Echoes the Didone PG monogram without using a display-only face for UI. Used with restraint: headings only, never body or controls.
- **UI/body (sans):** Montserrat — all working text, buttons, labels, matching the brand wordmark face. System-ui fallback.
- **Data (mono):** ui-monospace stack — agreement IDs, codes, timestamps in admin tables.

Type is the single biggest de-genericizer. A serif page title over sans working text, consistently applied, removes the app from the template lineup on its own.

## Signature elements

1. **The rule motif.** A thin accent rule under the wordmark/page title — coral on client, gold on admin — same device as the email header. This is the cross-surface signature.
2. **PG monogram** replaces any generic icon in headers/avatars/loading states.
3. **Status badges** keep the existing disciplined system, recolored to the semantic tokens above (Success/Warn/Alert/Muted). No emerald anywhere.
4. **Buttons** keep the primary/ghost/danger system: primary = coral (client) or gold with ink text (admin), ghost = hairline border + transparent, danger = Alert.

## Hard rules

- Re-skin only. No logic, route, handler, or markup-structure changes. The security work is not to be touched.
- Coral and gold never appear on the same surface.
- No gradients, no emoji, no glow effects.
- Accessibility floor: text contrast ≥ 4.5:1 (verify gold-on-charcoal and coral-on-paper for small text; use the token on a darker/lighter step if needed), visible keyboard focus (2px accent outline), reduced motion respected.
- Attendant hub counts as admin surface (dark/gold) — Ian works events in the dark.

## Rollout order

1. **Token extraction** (read-only first pass): inventory every hardcoded color/font in the app, map each to a token above, report unmapped stragglers for a decision.
2. **Client surface** conversion — small, high impact, completes the email-to-page continuity.
3. **Admin surface**, page by page, Overview first.

Each stage: propose, review, apply — same rhythm as the security work.
