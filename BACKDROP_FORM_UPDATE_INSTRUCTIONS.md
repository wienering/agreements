# Backdrop Selection Form Update Instructions

## Overview
The backdrop selection form needs to be updated to read the `agreementId` from the URL query parameter and include it in the form submission. This ensures the backdrop selection is applied to the correct agreement, especially for whitelist clients with multiple events.

## Why This Is Needed
- **Whitelist Clients**: Companies like "Nonstop Entertainment" have multiple events. Without `agreementId`, the system tries to match by email/name/date which can fail or match the wrong event.
- **Accuracy**: Using `agreementId` directly targets the exact agreement, eliminating matching errors.
- **Reliability**: No dependency on potentially ambiguous matching criteria.

## API Endpoint
**URL:** `POST /api/agreements/update-backdrop-selection`

**Full URL Example:** `https://your-agreements-domain.com/api/agreements/update-backdrop-selection`

**Note:** Replace `your-agreements-domain.com` with your actual domain where the agreements app is hosted.

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
  },
  body: JSON.stringify(formData)
});
```

**PHP cURL Example:**
```php
$data = [
    'agreementId' => $agreementId,  // Add this field
    'backdropName' => $backdropName,
    // Remove or make optional: clientEmail, clientName, eventDate
];

$ch = curl_init('https://your-domain.com/api/agreements/update-backdrop-selection');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);

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

✅ **API is ready** - The `/api/agreements/update-backdrop-selection` endpoint now accepts `agreementId`
✅ **URL includes agreementId** - The portal now appends `?agreementId=xxx` to backdrop links
⏳ **Form needs update** - The backdrop selection form needs to read and send `agreementId`

## Troubleshooting

If backdrop selections aren't working:
1. Check browser console for errors when submitting the form
2. Verify the API endpoint URL is correct
3. Check that `agreementId` is being read from the URL
4. Verify the request includes `agreementId` in the JSON body
5. Check server logs for API errors

## URL Format

The backdrop link URL will now include the agreementId:
- `https://backdrop-tool.com?agreementId=clx123abc456`
- `https://backdrop-tool.com?existing=param&agreementId=clx123abc456`

The form should read this parameter and include it in the submission.

