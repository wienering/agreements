# Backdrop Selection Form Update Instructions

## Overview
The backdrop selection form needs to read the `agreementId` from the URL query parameter and include it in the form submission. This ensures the backdrop selection is applied to the correct agreement, especially for whitelist clients with multiple events.

## Why This Is Needed
- **Whitelist Clients**: Companies like "Nonstop Entertainment" have multiple events. Without `agreementId`, the system tries to match by email/name/date which can fail or match the wrong event.
- **Accuracy**: Using `agreementId` directly targets the exact agreement, eliminating matching errors.
- **Reliability**: No dependency on potentially ambiguous matching criteria.

## API Endpoint
**URL:** `POST /api/agreements/update-backdrop-selection`

**Full URL Example:** `https://your-agreements-domain.com/api/agreements/update-backdrop-selection`

**Note:** Replace `your-agreements-domain.com` with your actual domain where the agreements app is hosted.

## Authentication (required)

Client submissions must include a shared secret header (same fail-closed pattern as Bookly webhooks):

| Header | Value |
|--------|--------|
| `X-Backdrop-Secret` | Same value as `BACKDROP_FORM_SECRET` on the agreements server |

- If `BACKDROP_FORM_SECRET` is **not** set on the server, the API returns **503**.
- If the header is missing or wrong, the API returns **401**.

Generate a secret (e.g. `openssl rand -hex 32`) and set it in:
- Agreements app: `BACKDROP_FORM_SECRET` in Vercel / `.env`
- Backdrop selection tool: send the same value in `X-Backdrop-Secret` on every POST

Admin saves from the agreements UI use admin session + CSRF instead of this header.

## Required Changes to Backdrop Selection Form

### 1. Read `agreementId` from URL Query Parameter

When the form loads, extract the `agreementId` from the URL:

**JavaScript Example:**
```javascript
// Get agreementId from URL query parameter
const urlParams = new URLSearchParams(window.location.search);
const agreementId = urlParams.get('agreementId');
```

**PHP Example:**
```php
$agreementId = $_GET['agreementId'] ?? null;
```

### 2. Include `agreementId` in Form Submission

When submitting the backdrop selection, include the `agreementId` in the request body:

**JavaScript Fetch Example:**
```javascript
const formData = {
  agreementId: agreementId,  // Add this field
  backdropName: selectedBackdropName,
  // Remove or make optional: clientEmail, clientName, eventDate
};

const response = await fetch('https://your-domain.com/api/agreements/update-backdrop-selection', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Backdrop-Secret': process.env.BACKDROP_FORM_SECRET, // server-side only — never expose in browser
  },
  body: JSON.stringify(formData),
});
```

If the form submits from the **browser**, the backdrop tool backend should proxy the POST and attach `X-Backdrop-Secret` server-side. Do not embed the secret in client-side JavaScript.

**PHP cURL Example:**
```php
$data = [
    'agreementId' => $agreementId,
    'backdropName' => $backdropName,
];

$ch = curl_init('https://your-domain.com/api/agreements/update-backdrop-selection');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'X-Backdrop-Secret: ' . getenv('BACKDROP_FORM_SECRET'),
]);

$response = curl_exec($ch);
curl_close($ch);
```

### 3. API Request Format

**Preferred Method (with agreementId):**
```json
{
  "agreementId": "clx123abc456",
  "backdropName": "Elegant Floral"
}
```

**Fallback Method (without agreementId - for backward compatibility):**
```json
{
  "clientEmail": "client@example.com",
  "clientName": "John Doe",
  "eventDate": "2025-01-15",
  "backdropName": "Elegant Floral"
}
```

Legacy fallback matching uses Toronto calendar dates (`America/Toronto`). Prefer `agreementId` whenever possible.

## Backdrop match proposals (no agreementId)

When the backdrop tool receives a submission **without** `agreementId`, call the propose endpoint instead of writing directly. The agreements app finds a confident match and sends you a Telegram message with a confirmation link. **Nothing is written until you tap that link.**

### Propose endpoint

**URL:** `POST /api/agreements/propose-backdrop-match`

**Full URL Example:** `https://your-agreements-domain.com/api/agreements/propose-backdrop-match`

**When to call:** After a client submits a backdrop selection and the URL has no `agreementId` (or ownership binding cannot be sent).

**Authentication:** Same as update-backdrop-selection — `X-Backdrop-Secret` header with `BACKDROP_FORM_SECRET`. Fail-closed: **503** if secret unset on server, **401** if header missing or wrong.

**Request body:**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `clientEmail` | string | **yes** | Valid email |
| `attendantId` | string | **yes** | Attendant CUID (`c` + 24 lowercase alphanumeric) |
| `backdropName` | string | **yes** | Trimmed on receipt |
| `clientName` | string | no | Shown in Telegram copy |
| `eventDate` | string | no | Shown in Telegram for comparison (Toronto calendar day) |

**Example:**

```json
{
  "clientEmail": "client@example.com",
  "clientName": "Jane Smith",
  "attendantId": "clxxxxxxxxxxxxxxxxxxxxxxxxx",
  "eventDate": "2026-06-15",
  "backdropName": "Gold Sequin"
}
```

**JavaScript fetch example (server-side):**

```javascript
const response = await fetch('https://your-domain.com/api/agreements/propose-backdrop-match', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Backdrop-Secret': process.env.BACKDROP_FORM_SECRET,
  },
  body: JSON.stringify({
    clientEmail,
    clientName,
    attendantId,
    eventDate,
    backdropName,
  }),
});

// Always expect 200 { ok: true } on success — match outcome does not change status
const result = await response.json();
```

**Responses:**

| Status | Body | When |
|--------|------|------|
| `200` | `{ "ok": true }` | Valid auth + body, regardless of match outcome |
| `400` | `{ "ok": false, "error": "Validation failed", "issues": [...] }` | Zod validation failure |
| `401` | `{ "error": "..." }` | Missing or wrong `X-Backdrop-Secret` |
| `503` | `{ "error": "..." }` | `BACKDROP_FORM_SECRET` not configured |

Internal match or Telegram failures are logged server-side; the backdrop tool still receives `200 { "ok": true }` so the client's submission is never blocked.

### Match logic

The server finds non-archived, non-cancelled agreements where:

1. Client email equals `clientEmail` (case-insensitive), and
2. The agreement's backdrop link URL contains `attendantId` as a bounded token (`/select/{id}` or `attendantId={id}`).

| Candidates | Result |
|------------|--------|
| Exactly **1** | Telegram message with client name, submitted vs agreement event dates, backdrop name, and a signed confirmation URL |
| **0** or **2+** | Informational Telegram only: "Unlinked backdrop selection — no confident match" with details and candidate count. No link. |

### Confirmation (Telegram link)

When exactly one candidate is found, the Telegram message includes a link like:

`GET /api/agreements/confirm-backdrop-match?token=...`

- Token is HMAC-SHA256 signed, stateless, 7-day expiry (requires `MATCH_CONFIRM_SECRET` on the agreements server).
- Tapping the link writes `selectedBackdropName`, logs activity with `via: 'proposed-match'`, sends a Telegram "confirmed" message, and renders a minimal HTML confirmation page.
- Idempotent: tapping twice writes the same value.
- Invalid or expired token shows a generic error page with no details.

### Agreements server env vars (proposals)

In addition to `BACKDROP_FORM_SECRET`:

```env
MATCH_CONFIRM_SECRET="..."   # openssl rand -hex 32 — signs confirmation links
TELEGRAM_BOT_TOKEN="..."     # same bot as unsigned agreement chaser
TELEGRAM_CHAT_ID="..."       # your Telegram chat ID
```

### Recommended submission flow

```
if (agreementId from URL) {
  POST /api/agreements/update-backdrop-selection
  body: { agreementId, attendantId, clientEmail, backdropName }
} else {
  POST /api/agreements/propose-backdrop-match
  body: { clientEmail, clientName, attendantId, eventDate, backdropName }
}
```

Never auto-write when `agreementId` is missing — always propose and wait for Telegram confirmation.

## Benefits of Using agreementId

1. **Accuracy**: Directly targets the specific agreement, eliminating matching errors
2. **Whitelist Client Support**: Works correctly for companies with multiple events
3. **Reliability**: No dependency on email/name/date matching which can fail
4. **Speed**: Faster processing since no database lookup is needed

## Testing

After updating the form, test with:
1. Regular client agreement
2. Whitelist client with single event
3. Whitelist client with multiple events (verify it updates the correct one)

## Current Status

✅ **API is ready** - The `/api/agreements/update-backdrop-selection` endpoint accepts `agreementId` and shared-secret auth  
✅ **Match proposals** - `POST /api/agreements/propose-backdrop-match` sends Telegram confirmation links when `agreementId` is absent  
✅ **URL includes agreementId** - The portal appends `?agreementId=xxx` to backdrop links  
⏳ **Backdrop tool** - Must send `X-Backdrop-Secret` (server-side), `agreementId` when available, or call propose-backdrop-match when not

## Troubleshooting

If backdrop selections aren't working:
1. Check browser console / server logs for 401 (bad secret) or 503 (secret not configured on agreements app)
2. Verify the API endpoint URL is correct
3. Check that `agreementId` is being read from the URL
4. Verify the request includes `agreementId` in the JSON body
5. Confirm `BACKDROP_FORM_SECRET` matches on both apps
6. Check server logs for API errors

## URL Format

The backdrop link URL will now include the agreementId:
- `https://backdrop-tool.com?agreementId=clx123abc456`
- `https://backdrop-tool.com?existing=param&agreementId=clx123abc456`

The form should read this parameter and include it in the submission.
