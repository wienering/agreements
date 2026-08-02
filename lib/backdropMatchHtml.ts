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
      background: #f4f4f2;
      color: #1a1a18;
      font-family: 'Libre Franklin', Helvetica, Arial, sans-serif;
      font-variant-numeric: tabular-nums;
    }
    .card {
      width: 100%;
      max-width: 420px;
      background: #ffffff;
      border: 1px solid #e3e3de;
      border-radius: 2px;
      padding: 32px 24px;
      text-align: left;
    }
    .mark {
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin: 0 0 8px;
    }
    .mark-success { color: #2f6a4c; }
    .mark-error { color: #9e2b2b; }
    h1 {
      margin: 0 0 12px;
      padding-bottom: 12px;
      border-bottom: 1px solid #1a1a18;
      font-size: 21px;
      line-height: 1.25;
      letter-spacing: -0.01em;
      color: #1a1a18;
      font-weight: 600;
    }
    p {
      margin: 0;
      color: #5e5e58;
      font-size: 15px;
      line-height: 1.5;
    }
    .details {
      margin: 24px 0;
      text-align: left;
      border-top: 1px solid #e3e3de;
    }
    .detail-row {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 10px 0;
      border-bottom: 1px solid #e3e3de;
    }
    .detail-label {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #5e5e58;
    }
    .detail-value {
      font-size: 15px;
      line-height: 1.4;
      color: #1a1a18;
    }
    .confirm-form {
      margin: 0;
    }
    .confirm-button {
      width: 100%;
      border: 1px solid #1e3b31;
      border-radius: 2px;
      background: #1e3b31;
      color: #fbfbf9;
      cursor: pointer;
      font-family: inherit;
      font-size: 15px;
      font-weight: 600;
      line-height: 1.2;
      padding: 14px 16px;
    }
    .confirm-button:hover {
      background: #162d25;
      border-color: #162d25;
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
    `<div class="mark mark-success">Confirmed</div>
     <h1>Backdrop attached</h1>
     <p>Backdrop attached to ${escapeHtml(clientName)}&rsquo;s agreement.</p>`,
  );
}

export function renderBackdropMatchErrorPage(): string {
  return backdropMatchPageShell(
    'Link unavailable',
    `<div class="mark mark-error">Action needed</div>
     <h1>Link unavailable</h1>
     <p>This link is invalid or has expired.</p>`,
  );
}
