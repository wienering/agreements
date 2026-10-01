# Design

<!-- impeccable:design-schema 1 -->

## What this system is

There is no concept here and no metaphor. These are documents, and they should look like documents made by a company that has been doing this for a long time. Nothing on any surface should require explanation before it makes sense.

This pass changes **palette, typography, spacing, rules, and the treatment of sidebars and headers**. It does not change content, field order, document structure, or copy meaning. The quote says what it needs to say and the fields are right.

### Rejected, with reasons

| Rejected | Why |
|---|---|
| Cream ground, terracotta or clay accent, high contrast serif headers | The outgoing look, and a well known generic AI default |
| Dark navy or near black dashboard, gold accent, rounded square logo tile | The other generic AI default, and the reason gold is quarantined below |
| Any metaphor system (targets, film, strips, instruments) | Ruled out by the brief. If it needs explaining, it does not ship |

## Color

**Strategy: restrained.** Neutrals carry the surface, one accent appears sparingly. The design is black on near white with a green rule, not a green brand. If a mockup ever reads as "the green one," the accent has been overused.

### Neutrals

| Token | Hex | Role |
|---|---|---|
| `--paper` | `#FBFBF9` | Client ground and admin sidebar. Near white at 251/251/249, an R−B spread of **2**. The outgoing cream was 250/246/239, a spread of 11. |
| `--panel` | `#F2F2EF` | Inset panels, table zebra, terms block |
| `--app-bg` | `#F4F4F2` | Admin page ground, one step below the white content surface |
| `--surface` | `#FFFFFF` | Admin cards and content areas |
| `--rule` | `#E3E3DE` | Hairlines. The default divider everywhere |
| `--rule-strong` | `#1A1A18` | The one heavy rule: under a document title, above a total |
| `--ink` | `#1A1A18` | Body and headings |
| `--ink-muted` | `#5E5E58` | Secondary text. Set to clear 4.5:1 on paper **and** panel |

### Accent and status

| Token | Hex | Role |
|---|---|---|
| `--accent` | `#1E3B31` | Deep green. Reads near black at small sizes, resolves as green in mass. Rules under headers, the total figure, links, primary button. |
| `--accent-hover` | `#162D25` | Pressed and hover states |
| `--accent-wash` | `#EDF2EF` | The only tinted fill permitted, for an active nav row |
| `--status-good` | `#2F6A4C` | Signed, completed, paid |
| `--status-wait` | `#2C5878` | Sent, awaiting, in progress |
| `--status-action` | `#9E2B2B` | Overdue, expiring, needs attention |
| `--status-idle` | `#6B6B64` | Draft, inactive |

### Gold is quarantined

The only place `--logo-gold` `#A8843C` appears is the thin outline inside the PG monogram, and it is not a token that interface elements can reference.

- That rules it out as a border, rule, button, link, badge, chart series, hover state, or active state.
- It is never a background.
- It should not sit adjacent to a dark ground in a way that recreates the look being replaced.

The palette above is chosen so a black and gold mark sits comfortably on it. Near white ground with a deep green accent leaves gold reading as part of the logo rather than part of the interface.

### Standing prohibitions

- No ground where R−B > 4. That is the cream tell.
- No terracotta or clay family. `#C0552F` and its neighbours are out of the system entirely, including as a status color, which is why `--status-action` is a true red rather than an orange red.
- No high contrast serif headers.
- No rounded square logo tile, on any surface.

## Typography

**Libre Franklin, one family, across every role.** A Franklin Gothic revival: the face of American job printing, invoices, and certificates. Warm, sturdy, quiet, and not on anyone's trend list. Hierarchy comes from size, weight, tracking, and space, never from a second family or a display face.

| Role | Setting |
|---|---|
| Wordmark and section labels | 600, uppercase, 10–11px, +0.16em |
| Document title | 600, 26–32px, −0.01em |
| Page and card heading | 600, 15–21px |
| Body | 400, 15–16px / 1.65, measure 65–75ch |
| Micro-label, table header, nav | 600, uppercase, 10–11px, +0.12em |
| All figures | 400/600 with `font-variant-numeric: tabular-nums` |

**Why one family.** Money columns must align, and the same type has to survive three channels that do not share font support. Tabular figures in a single grotesque give identical alignment in the browser, in Outlook (falling back to Arial), and in jsPDF (falling back to Helvetica). A second family would degrade differently in each one.

**Channel notes**

- **Email:** webfonts do not load in Outlook. Fall back to Helvetica then Arial. Structure and spacing carry the identity, not the face.
- **PDF:** jsPDF core fonts are Helvetica, Times, Courier. Helvetica is the honest fallback. Embedding a Libre Franklin subset is optional and worth it only if the letterhead is judged to need it.
- **Web:** self-host Libre Franklin (400, 600), no CDN.

**A noted alternative:** if the client documents ever read as too plain, the sanctioned change is a low contrast text serif for client body copy only, never for headers. Headers stay sans. This is not in the current system.

## Spacing, rules, and dividers

8px base. Steps of 8 / 16 / 24 / 32 / 48. More space above a heading than below it.

**The documents are held together by rules and space, not by containers.** This is the largest single change from the outgoing design.

- **Hairline** `--rule` at 1px (0.25mm in PDF) is the default divider: between line items, between list rows, under table headers.
- **Heavy rule** `--rule-strong` at 1px full ink appears at most twice per document: under the document title, and above the total.
- **No card borders on client surfaces.** No shadows, no boxes around blocks that a rule and whitespace can separate. The only filled block on a client surface is the terms panel in `--panel`.
- **Admin may use cards**, because a dashboard needs regions. They are `--surface` white on `--app-bg`, separated by a 1px `--rule`, with no shadow and 2px radius maximum.
- Radius: **2px maximum**, everywhere, including buttons.

## Headers and sidebar

**Client header (email and PDF):** logo lockup at the left, contact details right aligned opposite it, a single hairline beneath. No colored band, no filled bar, no reversed block. The letterhead is the mark, the details, and the rule.

**Admin sidebar:** light. `--paper` panel against a `--surface` white content area, divided by a 1px `--rule`. The real logo lockup sits at the top left on the light ground, at its natural proportions, with no tile, no container, and no background behind it. Active nav row is `--accent-wash` fill with a 2px `--accent` left rule and the label in `--accent`.

**Admin page header:** page title only, then a hairline. No eyebrow or kicker line above the title. The sidebar already says whose product this is.

## The logo

A stacked serif PG monogram in black with a thin gold outline, above PHOTOBOOTH GUYS in widely tracked sans capitals. **Not yet in the repository.** Mockups carry a marked placeholder box at the correct proportions.

### Where to put the files

Create `public/brand/` and drop in:

| File | Format | Size | Used by |
|---|---|---|---|
| `logo-lockup.svg` | SVG, transparent | vector | Web and admin |
| `logo-lockup@2x.png` | PNG-24, transparent | **480px wide** | Email, displayed at 160px |
| `logo-lockup-print.png` | PNG-24, transparent | **≥1000px wide** | jsPDF letterhead, placed at 26mm |
| `logo-mark.svg` | SVG, transparent | vector | Favicon and compact admin states |

**Notes on why the formats differ.** SVG does not render in most email clients, so email needs the PNG. jsPDF `addImage` takes PNG or JPEG only, and a 26mm placement at 300dpi needs about 310px, so 1000px gives room for a larger letterhead later without resampling.

**Display sizes:** email 160px wide, PDF 26mm wide, admin sidebar 132px wide. Clear space on all sides equal to the monogram's cap height.

Replace `public/favicon.svg` at the same time. It is still the generic blue document-and-checkmark placeholder from the project template.

## Accessibility

Body and small text at 4.5:1 minimum, verified against both the paper and panel grounds. Status is never communicated by color alone: every status color is paired with its written label. Radius, rules, and spacing carry structure for anyone who cannot separate the status hues.

## Constraints inherited from the codebase

- Token names in `app/globals.css` and `tailwind.config.ts` are load bearing (~158 usages of the `--accent` alias). Change values behind existing names; do not rename in the same pass.
- Recharts needs literal hex. Keep `app/lib/adminTheme.ts` as the single source of chart literals.
- Much of admin uses inline `style` objects rather than Tailwind. Migration is per file, not global.
- The quote PDF is imperative jsPDF drawing code in `app/api/quotes/generate-pdf/route.ts`. A4 with 18mm margins is preserved exactly.
