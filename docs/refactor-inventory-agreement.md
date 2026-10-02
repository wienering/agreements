# Agreement and portal feature inventory

Written before the `refactor/agreement-document` extraction. Line counts are the files as they are on this branch before any code moves.

| Page | Lines |
| --- | ---: |
| `app/agreement/[token]/page.tsx` | 2111 |
| `app/admin/preview/[token]/page.tsx` | 1146 |
| `app/portal/agreement/[id]/page.tsx` | 947 |
| `app/portal/dashboard/page.tsx` | 633 |
| `app/portal/admin-preview/page.tsx` | 639 |

Phone visibility (`showPhoneNumberAlways`) and the virtual green screen override are not implemented on any page in this list. They live on `app/attendant/[id]/page.tsx` and `app/admin/agreements/page.tsx`, which this refactor does not touch. Backdrop *selection* is a link out of the portal agreement page, not a picker on the document itself.

## `app/agreement/[token]/page.tsx` (client signing)

Client component. Wrapped by `app/agreement/layout.tsx`, which sets `data-surface="client"`.

### Load and access

- Reads `token` from the route.
- `hasFetchedData` ref stops a second fetch under React strict mode.
- `GET /api/agreements/client?token=` only checks that the agreement exists. The response body is not stored. A 200 opens the email gate. 404 sets “Agreement not found or has expired.” Any other failure sets “Failed to load agreement.” Network failure sets “Error loading agreement.”
- There is no separate cancelled or expired screen. Both come back as the same not-found error.
- Document title is “Agreement - Loading...” until data arrives, then `{template title} - {client first last} | Photobooth Guys`.
- Loading screen (spinner, “Loading Agreement”) shows only while `loading && !showEmailVerification`. A `devLog` runs on that branch.
- Error screen title is always “Agreement Not Found”. Body is the error string, or “Failed to load agreement” if it is empty. Support line includes `info@photoboothguys.ca`.

### Email verification

- Modal: email field, Enter submits, Cancel clears the email and the error and hides the modal (it does not mark the user verified).
- Empty email: “Please enter your email address”.
- `POST /api/agreements/verify-email` with `{ token, email }`.
- Success stores `verifiedContact` (`role` primary or secondary, name, email), runs client-side smart fields, and reveals the document.
- Failure shows `data.error` or “Email verification failed”. Network errors show “Network error. Please try again.”
- While the gate is up and the user is not verified, a slim header (logo, “Photobooth Guys”, “Service Agreement”) is the only page content. Agreement data is not rendered.
- View tracking and the “Agreement Viewed” email are not done in the browser. A comment says `verify-email` does that on the server.

### Smart fields (client, after verify and after sign)

- `applySignerSmartFields` plus `pickSecondSigner` from `@/lib/agreementSmartFields`.
- Remaining placeholders: `client.eventDate` (Toronto date), `client.address` (event location, else client address), `client.notes`, `event.type`, `event.location`, `event.startTime`, `event.duration`, `event.package`, `event.price` (`$X.XX`), `agreement.date` (today, Toronto), `agreement.id`.
- Event relation wins over client fields. Values are HTML-escaped.
- `htmlToPlainText` is defined and never called.

### Document chrome

- Header cards: client name, phone if the string is present (no visibility flag), email, event date (weekday short), type, location, start time, duration, package. Event card shows if any of date, type, or location exists. Event fields prefer `agreement.event`, then `agreement.client`.
- Title, rule, “Service Agreement for {name}”.
- Signed badge in the header and a “Agreement Successfully Signed / legally binding” banner when `status === 'SIGNED'`.
- Partial banner when status is not `SIGNED`, `requireBothSignatures` is true, and `signatures.length > 0`: “Waiting on the other signer”, first signature’s name and email, and who is still outstanding (primary vs `secondSigner`).
- `secondSignerEnabled` is on the type and unused in the markup.
- Body HTML: if signed and `mergedHtml` is set, that snapshot; otherwise `customHtmlContent` or `template.htmlContent`. Passed through `sanitizeAgreementHtml`.
- Signature block when status is `SIGNED` or there is at least one signature. Rows come from `signatures` (IP omitted). If there are no signature rows, one legacy row uses the client name, client email, `signedAt`, and `signedFromIP`. Times use `formatDateTimeToronto`.
- Footer: Photobooth Guys, tagline, `info@photoboothguys.ca`, `647-378-5332`, Toronto, legal note.

### Signing

- Shown when status is not `SIGNED`.
- Prefills name and email from `verifiedContact`, otherwise the primary client. Focuses the first text input after 100ms.
- Modal: name, email, terms checkbox, Cancel (returns focus to the sign button and clears fields, error, and the checkbox), Sign.
- Sign stays disabled until the checkbox is checked. Tooltip on the wrapper: “Please accept the terms and conditions to sign the agreement” when the box is unchecked and a request is not in flight.
- Empty name or email: “Please fill in all fields”.
- `POST /api/agreements/sign` with `{ token, clientName, clientEmail }`.
- Success: store the response, re-run smart fields, close the modal.
- `isFinalSignature === false`: overlay “Signature recorded. Waiting for the other signer to complete the agreement.” for 3.5s, stay on the page.
- Otherwise overlay “Agreement signed successfully. A copy has been emailed to you.” for 3s, write `sessionStorage['agreement-signer-email-' + token]`, then `window.location.href = /agreement/${token}/thank-you`.
- The overlay always includes “Your agreement is now legally binding and has been securely stored.”, including the partial-signature case.
- API error: `error` or “Failed to sign agreement”. Network: “Error signing agreement”.
- If the verified email is already in `signatures`, the button is disabled and reads “You've signed — waiting on the other party”. While the request runs it reads “Signing...”. Cursor is `not-allowed` only while `isSigning`, not merely because the viewer already signed.
- Viewport under 768px changes button spacing, input size, and modal padding. It does not change which controls exist.

### PDF, email, hash

- `POST /api/agreements/pdf` with `{ token }` via `fetch` (not `adminFetch`).
- Download name: `agreement-{first}-{last}-{id}.pdf`. Success alert “PDF downloaded successfully!”. Failure alerts for a bad response and for a thrown error (`console.error('Download error:', err)`).
- `#download` on load or `hashchange`, once an agreement is loaded, runs the same download.
- Unsigned state also shows “Download PDF (Unsigned)” as an outline button.
- Signed state shows filled “Download PDF”, “Email Copy”, and a “Client Portal” link to `/portal/login`.
- Email opens a modal prefilled with the primary client email. `POST /api/agreements/email` with `{ token, recipientEmail }`. Empty address: “Please enter an email address”. Success closes the modal, clears the address, and shows a “Sent!” toast for 3s. Failure uses `errorData.error` or “Failed to send email”. Network: “Error sending email”.
- “Sent!” is positioned on the Email Copy button, not a page-level toast.

## `app/admin/preview/[token]/page.tsx`

Client component. Admin layout drops the admin chrome on `/admin/preview/` and sets `data-surface="client"`. No signing, no verification, no second-signer banner.

### Load and access

- `adminFetch` `GET /api/agreements/admin-preview?token=`. The JSON body is the agreement. Same fetch-once ref.
- 401: “Authentication required. Please log in as admin.” 403: “Admin access required.” 404: “Agreement not found or has expired.” Else “Failed to load agreement.” Network: “Error loading agreement.”
- Title starts as “Agreement Preview | Admin | Photobooth Guys”, then “Admin Preview - Loading...”, then “Admin Preview - {first last}”. The second effect overwrites the first once it runs.
- Loading copy: “Loading Agreement Preview”.
- Error title is “Access Denied” when the message includes “Authentication” or “Admin access”, otherwise “Agreement Not Found”. Support line: “Please contact support if you believe this is an error.” (no email address).

### Document chrome

- Coral full-width banner: “ADMIN PREVIEW MODE - This is how the client will see the agreement”, eye icon.
- Same header, title, signed badge, signed banner, body, footer as the client page, with these differences:
  - Event and package fields are read only from `agreement.client`. The type has no `event` relation.
  - Body is always `template.htmlContent` (signed snapshot and `customHtmlContent` are ignored).
  - No “waiting on the other signer” banner.
  - Signature block only when `status === 'SIGNED'`, and only one grid: client name, client email, `signedAt`, `signedFromIP`. “N/A” when date or IP is missing. No multi-signer rows.
- Actions are always “Download PDF” and “Email Copy”. No sign button and no client-portal link. No mobile-specific spacing.

### PDF and email

- Same hash-download behaviour.
- `adminFetch` `POST /api/agreements/pdf`. If `content-type` contains `text/plain`, the file extension is `txt` and the alert says PDF generation is temporarily unavailable and a text version was downloaded. Otherwise `.pdf` and “PDF downloaded successfully!”.
- Email uses `adminFetch` `POST /api/agreements/email`. Same modal, validation, toast, and error strings as the client page. Modal padding does not change on small screens.

## `app/portal/agreement/[id]/page.tsx`

Client component inside the portal layout (session chrome, sticky header, footer). Wrapped in `Suspense` because it reads search params. This page is not the signing document. It is the portal detail around a rendered HTML body.

### Access

- `?adminPreview=true` switches to admin preview. Requires `email` or `clientId`, else “Email or Client ID is required for admin preview”.
- Admin fetch: `GET /api/agreements/portal/admin-preview/agreement/{id}?email=` or `clientId=`. 401/403: “Admin access required”. 404: “Agreement not found”. Other statuses use `error` from JSON or “Failed to load agreement”. Network: “Network error. Please try again.”
- Otherwise `localStorage.portal_session_token`. Missing token redirects to `/portal/login` without an error string. `GET /api/agreements/portal/agreement/{id}` with `Authorization: Bearer`. 401 clears the token and redirects to login. 404: “Agreement not found”. Else “Failed to load agreement”. Same network message.
- Refetch when `agreementId` or `searchParams` change.
- Title: `{templateName} | Client Portal` once loaded.
- Activity refresh (not admin preview): `mousedown`, `keypress`, and `scroll` call `GET /api/agreements/portal/session` at most once a minute. Failures are `console.debug` only and do not log the user out.
- Loading spinner: “Loading agreement...”. Suspense fallback: “Loading...”.
- Error panel: message, Try Again (refetch), and Back to Dashboard → `/portal/dashboard`. `if (!data) return null` after a successful clear.

### What the page shows

- Admin banner when `adminPreview=true`: “Admin Preview Mode” / “Viewing agreement as admin”. Back link rebuilds `/portal/admin-preview?email=` or `clientId=`. The same back link is repeated in the header. Non-preview header links to `/portal/dashboard`.
- Title is `templateName`, then “Agreement ID: {id}”, status pill. Colours: SIGNED and COMPLETED success, LIVE ink, DRAFT warn, CANCELLED and VOID alert, anything else muted. All pills are `bg-panel` plus a hairline border.
- Quick actions: direct download `/api/agreements/portal/pdf/{id}`; “View Signed Version” (`/agreement/{uniqueToken}`, new tab) only when status is `SIGNED`; payment link; receipt link; template chooser `https://www.photoboothguys.ca/photo-booth-templates-chooser/`; “Choose Your Backdrop” when `backdropLink` is set, with `agreementId` appended to the URL (`&` if the URL already has a query, otherwise `?`).
- Gallery block when `galleryLinks` is non-empty or `galleryLink` is set. Heading switches singular/plural on `galleryLinks.length > 1`. Falls back to a single “Photo Gallery” button using `galleryLink`.
- Timeline: sent (`createdAt`), first viewed (`firstViewedAt`, plus “Viewed {n} times total” when `viewCount > 1`), signed (`signedAt`). View tracking is display-only here.
- Payment on the timeline: if the status text contains “balance due” or “balance” (case-insensitive) the pill is warn; otherwise it is plain.
- Content card: `mergedHtml` sanitized, or “No content available for this agreement.” If the rendered height is over 30rem (measured as 480px, immediately and again after 100ms), the card collapses with a fade mask and a Show More / Show Less toggle.
- Sidebar: status, created, signed, expires (`expiresAt`), cancelled (`cancelledAt`). Each date uses `formatDateTimeToronto` with year, long month, day, hour, minute.
- Export (hidden from working in admin preview): PDF, JSON, CSV via `GET /api/agreements/portal/export?agreementId=&format=&includeHtml=` (`includeHtml` is true only for PDF). Filename `agreement-{id}.{format}`. Admin preview sets “Export is not available in admin preview mode. Please use the admin interface.” and does not call the API. Missing token: “Session token required”.
- Client card: name, email, phone if present, address, event date, package. No phone-visibility rule.
- Resources: template chooser, backdrop (confirmed name, or a link, or a “contact us” empty state), FAQ `https://www.photoboothguys.ca/photobooth-questions/`, a static Photo Booth Tips card with no link.
- Notes: helper copy, add form (hidden in admin preview; submitting in that mode sets “Adding notes is not available in admin preview mode”), `POST /api/agreements/portal/add-note` with `{ content, agreementId }`. Empty content is ignored. Success refetches and clears the field. Failure: “Failed to add note” or the network message. Empty list: “No Notes Yet”. Each note shows content and “Added on {date}”.

Signing, second signer, require-both-signatures, thank-you redirect, and the client email gate are not on this page.

## `app/portal/dashboard/page.tsx`

Client component. Requires `portal_session_token` or redirects to `/portal/login`.

- Title: “Dashboard | Client Portal”, then “Dashboard - {first last} | Client Portal”.
- `GET /api/agreements/portal/dashboard` with optional `status` and `search`. 401 clears the token and redirects to login. Other errors use `error` or “Failed to load dashboard”. Network: “Network error. Please try again.” plus `console.error`.
- Initial effect depends on `router` only. A second effect refetches when `statusFilter` changes, but only if `loading` is already false, so the first paint does not double-fetch. Search runs on submit, not on each keystroke. Pressing `/` focuses the search box unless the user is already in an input, textarea, or contenteditable.
- Full-page spinner only when `loading && !data` (“Loading dashboard...”). Error panel with Try Again only when `error && !data`. A later failed filter does not replace the page if `data` is still set.
- Header: “Welcome to your Client Portal”.
- Collapsible “Your Event Overview” (starts open). Package and price, payment status of the first agreement that has `nextAction` (else the first agreement) plus “Make Payment →”, email, phone, location, event type, next-action callout.
- Status chips from `filters.availableStatuses` with counts, plus All using `pagination.totalCount` (the count for the current query, not a grand total once a filter is on).
- Empty copy: “You don't have any agreements yet.” or the filter hint.
- Each card links to `/portal/agreement/{id}`. Shows template title, status pill (same colours as the detail page), event date (agreement event, else client event), event name, “Whitelabel Client” when `client.isWhitelabelClient`, sent / first viewed / signed dates (`formatDateToronto`, short month), payment pill (warn if the text contains “balance due” or “balance”), “Gallery Available” when any gallery is set.
- Quick actions under the card, so they do not trigger the card link: View Details, View Signed Version when `summary.isSigned` (new tab to `/agreement/{token}`), payment, receipt, template chooser.
- Pagination renders when `totalPages > 1`. Previous and Next are disabled from `hasPrev` / `hasNext` and have no click handlers. They do not change the page.
- Typed and not shown: `lastViewedAt`, `backdropLink`, `client.address`, `summary.isExpired`, `summary.canSign`, `summary.daysUntilExpiry`.

## `app/portal/admin-preview/page.tsx`

Same dashboard, with these differences. Wrapped in `Suspense`.

- Does not read `portal_session_token` and does not redirect to portal login.
- Title is fixed: “Admin Preview | Client Portal”.
- `email` or `clientId` is required (“Email or Client ID is required”). Fetch is `GET /api/agreements/portal/admin-preview?...` with no bearer token. Errors: `error` or “Failed to load portal data”.
- Initial fetch depends on `searchParams`. Filter refetch also requires `data` to be set.
- Loading copy: “Loading portal data...”.
- Banner: “Admin Preview Mode”, “Viewing portal as: {email or N/A}”, Back to Admin → `/admin/agreements`.
- Heading: “Client Portal — {first last}” and “Admin preview of client portal”.
- Overview title is “Event Overview”. The user icon is muted, not accent.
- Empty copy: “This client doesn't have any agreements yet.”
- No whitelabel badge. Payment pills do not switch to the warn style.
- The card links to `/portal/agreement/{id}?adminPreview=true&email=` or `clientId=`, falling back to `data.client.id`.
- First quick action is “View Agreement” to `/agreement/{token}` in a new tab, not “View Details”.
- No pagination controls.
- Client type on this page does not include `isWhitelabelClient`. The response may include `isAdminPreview`, which the page never reads.

## Shared between the two document pages

`app/agreement/[token]/page.tsx` and `app/admin/preview/[token]/page.tsx` duplicate the header, title, signed banner, sanitized HTML body, signature section, download and email actions, email modal, footer, loading screen, and error screen. The client page adds verification, signing, the partial-signature banner, multi-signer rows, and the portal link.

## Shared between the two portal dashboards

`app/portal/dashboard/page.tsx` and `app/portal/admin-preview/page.tsx` duplicate the overview, filters, search, agreement cards, and quick actions. Auth, copy, link targets, the whitelabel badge, payment emphasis, and pagination differ as listed above.
