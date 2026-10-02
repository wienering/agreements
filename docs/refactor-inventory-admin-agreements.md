# Admin agreements page — feature inventory

Recorded before the split of `app/admin/agreements/page.tsx` (6,938 lines). This is the live page at `/admin/agreements`, not the archived list.

## Page chrome

- Document title: `Agreements | Admin | Photobooth Guys`
- Header: "Agreements", gold/accent rule (`.admin-title-rule`), subtitle "Manage client agreements and contracts"
- **Archived** (ghost button) — navigates to `/admin/agreements/archived`. Title: "View archived agreements (includes completed and cancelled)"
- **+ New Agreement** (primary) — opens the create form. Full width on viewports under 768px

## Search, filters, sort

Search is debounced 300ms. `/` focuses the search box unless an input, textarea, or contenteditable is already focused. Changing search, status, or attendant resets both pagers to page 1.

- **Search box** — placeholder "Search by client, email, template, event, attendant, or status...". Matches client first name, last name, email, template title, event type, event location, event package, attendant name (`backdropLink.name`), and status (case-insensitive substring)
- **Attendant filter** (`#attendant-filter`): All attendants, No attendant (`__none__`), then each backdrop link sorted by name. "No attendant" keeps rows whose attendant name is blank, including cancelled ones
- **Status filter chips**: ALL, DRAFT, LIVE, SENT, SIGNED, COMPLETED, CANCELLED. Active chip uses the accent badge style; inactive uses the neutral badge style. `SENT` has no matching status value in data
- **Sort** (no column-header control): event date ascending (soonest first). Date is `event.eventDate`, else the legacy `client.eventDate`. Rows with no usable date sort last

## List sections

The list is not an HTML `<table>`. Active rows are compact cards with columns. Completed rows are fuller cards. Both layouts are used on every viewport; columns compress under 768px.

Empty copy:

- No match for the search string
- "No agreements found for this attendant filter." when an attendant filter is on and search is empty
- "No agreements found. Create your first agreement to get started."

### Active agreements

Shown when any non-`COMPLETED` row remains after filters. Heading "Active Agreements (count)" only when the status filter is ALL and at least one completed row also exists.

**Collapsed row columns**

| Column | Desktop / tablet (≥768px) | Mobile (<768px) |
|---|---|---|
| Expand chevron | Rotates −90° when collapsed. Transition skipped when `prefers-reduced-motion` | Same, top-aligned |
| Event date | `Mon D, YYYY` plus relative phrase (`today`, `tomorrow`, `in N days`, `in N weeks`, `in N months`, `in N years`, `past`) | Compact date (`Mon D`) plus compact relative (`1d`, `1wk`, `2mo`, `1y`, `past`, `—`) |
| Name | Client first + last, truncated until the row is expanded. Hover shows the engagement tooltip | Same name. Tooltip still bound to hover |
| Attendant | Under the name: `Attendant: {name}` or a "No attendant" hint (hidden when the row is cancelled and has no attendant, and hidden when a name exists) | Same, plus status hint sharing the line |
| Engagement | Status hint (danger / warning / muted) and client email, both ellipsized, with `title` | Status hint moves next to the attendant line. Email is not shown here |
| Status badge | Clickable. Opens the status editor. Click does not expand the row | Smaller badge, stacked |
| Payment badge | Shown only when `paymentStatus` is set. Credit-card icon. Not clickable | Same, smaller, stacked above status |
| Warning icon | Absolute top-right of the card when analytics marks the row | In the badge stack instead |

Click or Enter/Space on the row toggles expand. Actions sit in a region that does not toggle the row.

**Card chrome**

- Default hairline border
- Warning types from `/api/analytics/warnings` thicken the border: `expiration` and `critical` use the alert color; `warning` uses the warn color
- Icons: `expiration` clock (warn), `critical` siren (alert), `warning` circle-exclamation (warn)
- LIVE rows emailed 3 or more Toronto calendar days ago show a top-left banner: "Might need personal follow-up" (warn) or, at 5 or more days, "Needs Personal Follow-up" (alert). The row's top padding grows to clear it

**Expanded metadata**

- Created date
- Expires date, clickable, unless status is SIGNED
- Attendant line (accent) or "No attendant" hint
- Selected backdrop name when set

**Expanded row actions**

| Control | When | Notes |
|---|---|---|
| Edit | Always | Opens the agreement editor |
| Create Invoice | Always | Disabled without a client email |
| View Agreement | Always | Opens the copy-link modal |
| Attendant View | Always | Opens the attendant modal and seeds phone / green-screen toggles |
| Resend Email | LIVE or SIGNED, and `lastEmailedAt` is set | Shows "Sending..." while in flight. Title includes prior send count |
| Request Google Review | COMPLETED and not yet requested | Disabled without email or while sending |
| Review requested {date} | COMPLETED and `reviewRequestSentAt` is set | Check icon, not a button |
| Send to Client | DRAFT | "Sending..." while in flight |
| Delete | DRAFT | Confirm dialog. "Deleting..." while in flight |
| Cancel Agreement | SIGNED | Opens the 4-step cancel modal |
| Archive | SIGNED or COMPLETED | Confirm dialog. "Archiving..." while in flight |

Active pagination (25 per page) appears when there is more than one page: "Showing X–Y of Z agreements", Prev, "Page N of M", Next. Disabled ends use the hairline fill.

### Completed agreements

Collapsed by default. Header button "Completed Agreements (count)" with "▼ Show" / "▲ Hide". Green check icon.

Each card:

- Name (engagement tooltip on hover), unread-notes badge
- Attendant or "No attendant" hint
- Status badge (not clickable in this section)
- Details: Template title, Event Date ("Not set" if missing), Signed ("Not signed" if missing)
- Actions: View Agreement, Edit Details, Request Google Review or the "Review requested" stamp, Archive

Warning borders are computed and unused; the card border stays the hairline.

Completed pagination (25 per page): "Showing X–Y of Z completed", Prev, page label, Next, using `AdminButton`.

### Badges

- **Unread notes**: red pill, count or `9+`, title "{n} unread client note(s)". Hidden at 0
- **No attendant**: user icon plus "No attendant", title "No attendant assigned to this event". Not shown for CANCELLED
- **Status badge** and **payment badge** as above

### Engagement tooltip

Created on mouse enter of the client name, removed on leave. Appended to `document.body` with `data-surface="admin"` and class `engagement-tooltip`. Flips below the name when it would run off the right edge.

Contents: status-tinted header "Engagement" plus uppercase status, agreement title, client email, emails sent with last email date (or "Never emailed"), view count with last view date (or "Never viewed") and "Not viewed!" when the count is 0, and a follow-up block when status is LIVE and it has been 3 or more days since the last email.

## Inline edits (from the list)

- **Status** — modal "Edit Agreement Status". Options: DRAFT, LIVE, SIGNED, COMPLETED, CANCELLED (the CANCELLED option is rejected by the API; real cancellation is the signed-agreement flow). Update / Cancel. Marking COMPLETED when payment status is not "fully paid" opens the payment warning first
- **Expiration** — expanded row, not for SIGNED. Modal "Edit Expiration Date", `datetime-local`, Toronto conversion. Save / Cancel

## Keyboard and scroll lock

Escape closes the topmost overlay, in this order: attendant, gallery-ready preview, review request, copy link, email preview, invoice, cancel, payment warning, status editor, expiration editor, resend-expiration prompt, create form, agreement editor.

Any of those overlays (and the attendant/copy-link/cancel/payment/review/invoice/email/gallery dialogs when their agreement is set) locks body scroll.

## Create agreement modal

Opened by "+ New Agreement", or by URL `?create=true&client=...&event=...` (JSON in the query) or `?templateId=`. Those query params are stripped after the form opens. Backdrop click and Cancel close it. Default expiry is two Toronto calendar weeks from now, same local time of day.

Fields: Client (`SearchableSelect`, required), Template (required; label is internal title or title), Expires At. Optional "Add a second signer" with first name, last name, email (required while enabled), phone, and "Require both signatures to make agreement binding". Submit "Create Agreement" / "Creating...". Success prepends the created row and resets the form.

## Agreement editor (becomes the detail drawer)

Opened by Edit / Edit Details. Title "Edit Agreement", × close. Sections start as content closed, second signer closed, portal open, attendant closed, tracking closed, client notes closed. Opening a different agreement resets that and clears loaded notes and the activity timeline.

### Agreement Content

- Rich text editor. Initial value is `customHtmlContent`, else `template.htmlContent`
- Quick add chips that append a field: First Name, Last Name, Full Name, Email, Phone, Event Date, Notes, Both: Full Names, Both: First Names, Both: Last Names, 2nd: First Name, 2nd: Last Name, 2nd: Full Name, 2nd: Email, 2nd: Phone, Agreement Date, Agreement ID
- Live preview (`RichTextPreview`)

### Second Signer

Same checkbox, four fields, and "require both signatures" rule as create.

### Client Portal Settings

- Payment status: Not Set, Not paid, Invoice issued, Deposit paid, Balance due, Fully paid. Legacy values are normalized (`paid` / `paid in full` → Fully paid, and similar)
- Stripe payment link, Stripe receipt link
- Event gallery links: title + URL, Remove (when more than one), Add another gallery, Preview, Send Gallery Ready Email (disabled with no URL; "Sending..." / "Loading preview..."). After a send, "Email sent to client" with the timestamp
- Next Action (max 500, shown to the client)
- **Update Portal Settings** — saves payment info, gallery links, next action, and attendant link together

### Attendant & Backdrop

- Attendant dropdown (backdrop links, plus "No backdrop link"). Changing it clears the backdrop choice and loads options from the attendant id parsed out of the link URL (`/select/{id}` or `attendantId`)
- Backdrop dropdown when an attendant id is known: loading copy, error copy, "-- Select a backdrop --", "No Backdrop", then options. Save and Clear. Clear asks "Are you sure you want to clear the backdrop selection?"
- Current selection line when one is stored

### Tracking

Loads `/api/agreements/{id}/activity` the first time it opens. Checkbox "Pause automatic reminders" (immediate save). Italic "Automatic reminders paused" when on. Timeline or "No tracking activity yet." / "Loading activity...". Legacy rows are tagged "from records".

### Client Notes

Loads `/api/agreements/client-notes?agreementId=` the first time it opens. Shows the unread badge in the heading. Opening with unread notes marks them viewed and clears the badge. Empty copy: "No notes from this client yet." Each note shows content and a Toronto timestamp.

### Footer actions

- Save Changes (content + second signer) — "Saving..." while in flight
- Preview Client View / Preview — client agreement URL in a new tab
- Attendant View / Attendant — opens the attendant modal
- View Client Portal / Portal — `/portal/admin-preview?email=`, disabled without an email (`alert` if missing)
- Preview Email / Email
- Send to Client / Send — uses the page sending flag ("Sending...")

Short labels are used at widths of 1024px and below.

## Modals

### Attendant view

"Attendant View Options". Toggles, saved immediately: **Always Show Phone Number**, **Force Virtual Green Screen**. Copy Attendant Link (`/attendant/{id}`). Open the attendant page in a new tab. Cancel.

### Cancel (signed agreements only)

Four steps. Non-signed rows toast "Only signed agreements can be cancelled".

1. Reason (required). Client, template, signed time. Continue to step 2 / cancel
2. Admin name (required). Shows the reason. Continue / back
3. Summary, type `CANCEL AGREEMENT` exactly. Continue / back
4. Final summary. Confirm cancellation (calls `/api/agreements/cancel`) / back

Success removes the row and toasts that the client was emailed.

### Copy link / view agreement

"View Agreement". Admin View (`/admin/preview/{token}`), Client View (`/agreement/{token}`), Copy Client Link, Cancel.

### Invoice

"Create Stripe Invoice". Disabled start when the client has no email.

- Type: Default (Deposit + Remaining), Total Amount Only, Total Amount Minus $100 Deposit, Custom Amount (amount input). If payment status already says deposit, the default selection is total-minus-deposit
- Disable online payment checkbox
- Note that Stripe emails the invoice
- Creating spinner, success (invoice list, due dates, Stripe customer id), error state, close

Success sets payment status to "Invoice issued" on the row and refreshes the list for the Stripe payment link.

### Payment warning

Shown when status is being set to COMPLETED and payment is not fully paid. Explains that. Shows client, template, and current payment status. Continue anyway / go back. Continue runs the status update.

### Review request

"Request Google Review". Client and email. Toggle "Google listing": Ontario by default, Calgary when on. Send Review Request / Cancel. Only COMPLETED agreements with an email. A failed send with a fallback copies the review link.

### Email preview

Preview of the agreement email: subject "Your Photo Booth Agreement - {first} {last}", from Photobooth Guys `<info@photoboothguys.ca>`, rendered HTML body, and send.

### Gallery ready preview

Loaded from `GET /api/agreements/send-gallery-ready-email?agreementId=`. Shows subject and HTML, or "Cannot send yet" with `sendBlockedReason`. Send from the preview closes it on success.

### Resend when expired

If Resend Email finds `expiresAt` in the past, a prompt collects a new expiration (default, two weeks out), saves it, then resends. Fallback send failures copy the client link.

## URL entry points (before the drawer)

- `?create=true&client={json}&event={json}` pre-fills client id and event id and opens create
- `?templateId=` pre-fills the template and opens create

Both are removed with `history.replaceState` to `/admin/agreements`.

## Data the page loads on mount

- `GET /api/agreements` (full rows, including template HTML)
- `GET /api/agreements/backdrop-links`
- `GET /api/clients`
- `GET /api/templates`
- `GET /api/analytics/warnings`

Routes that do more than change one field, and stay as their own calls: create (`POST /api/agreements`), send, resend, review request, gallery email, cancel, archive, delete, invoice, backdrop selection (`POST /api/agreements/update-backdrop-selection`), agreement content save (`PUT /api/agreements/update-agreement`), activity, client notes.
