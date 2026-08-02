function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function backdropMatchPageShell(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background: #1e1b18;
      color: #ede7dc;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    .card {
      width: 100%;
      max-width: 420px;
      background: #1A1A18;
      border: 1px solid #3d372f;
      border-radius: 12px;
      padding: 28px 24px;
      text-align: center;
    }
    .mark {
      width: 48px;
      height: 48px;
      margin: 0 auto 16px;
      border-radius: 999px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      font-weight: 700;
    }
    .mark-success {
      background: color-mix(in srgb, #3f6f4f 24%, #1A1A18);
      color: #3f6f4f;
      border: 1px solid color-mix(in srgb, #3f6f4f 40%, #3d372f);
    }
    .mark-error {
      background: color-mix(in srgb, #9E2B2B 20%, #1A1A18);
      color: #9E2B2B;
      border: 1px solid color-mix(in srgb, #9E2B2B 35%, #3d372f);
    }
    h1 {
      margin: 0 0 8px;
      font-size: 20px;
      line-height: 1.3;
      color: #c6a04d;
      font-weight: 600;
    }
    p {
      margin: 0;
      color: #9a9087;
      font-size: 15px;
      line-height: 1.5;
    }
    .details {
      margin: 20px 0 24px;
      text-align: left;
      border: 1px solid #3d372f;
      border-radius: 8px;
      overflow: hidden;
    }
    .detail-row {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 12px 14px;
      border-bottom: 1px solid #3d372f;
    }
    .detail-row:last-child {
      border-bottom: none;
    }
    .detail-label {
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: #9a9087;
    }
    .detail-value {
      font-size: 15px;
      line-height: 1.4;
      color: #ede7dc;
    }
    .confirm-form {
      margin: 0;
    }
    .confirm-button {
      width: 100%;
      border: 1px solid #c6a04d;
      border-radius: 8px;
      background: #c6a04d;
      color: #1A1A18;
      cursor: pointer;
      font-size: 15px;
      font-weight: 600;
      line-height: 1.2;
      padding: 14px 16px;
    }
    .confirm-button:active {
      filter: brightness(0.95);
    }
  </style>
</head>
<body>
  <div class="card">
    ${body}
  </div>
</body>
</html>`;
}

function detailRow(label: string, value: string): string {
  return `<div class="detail-row">
    <div class="detail-label">${escapeHtml(label)}</div>
    <div class="detail-value">${escapeHtml(value)}</div>
  </div>`;
}

export function renderBackdropMatchConfirmPage(params: {
  token: string;
  clientName: string;
  backdropName: string;
  submittedEventLabel: string;
  agreementEventLabel: string;
  actionPath?: string;
}): string {
  const actionPath = params.actionPath ?? '/api/agreements/confirm-backdrop-match';

  return backdropMatchPageShell(
    'Confirm backdrop',
    `<h1>Confirm backdrop match</h1>
     <p>Review the details below, then confirm to attach this backdrop.</p>
     <div class="details">
       ${detailRow('Client', params.clientName)}
       ${detailRow('Backdrop', params.backdropName)}
       ${detailRow('Submitted event', params.submittedEventLabel)}
       ${detailRow('Agreement event', params.agreementEventLabel)}
     </div>
     <form class="confirm-form" method="POST" action="${escapeHtml(actionPath)}">
       <input type="hidden" name="token" value="${escapeHtml(params.token)}" />
       <button type="submit" class="confirm-button">Confirm Backdrop</button>
     </form>`,
  );
}

export function renderBackdropMatchSuccessPage(clientName: string): string {
  return backdropMatchPageShell(
    'Backdrop confirmed',
    `<div class="mark mark-success">✓</div>
     <h1>Backdrop attached</h1>
     <p>Backdrop attached to ${escapeHtml(clientName)}&rsquo;s agreement.</p>`,
  );
}

export function renderBackdropMatchErrorPage(): string {
  return backdropMatchPageShell(
    'Link unavailable',
    `<div class="mark mark-error">!</div>
     <h1>Link unavailable</h1>
     <p>This link is invalid or has expired.</p>`,
  );
}
