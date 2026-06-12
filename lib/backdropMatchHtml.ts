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
      background: #2a2724;
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
      background: color-mix(in srgb, #3f6f4f 24%, #2a2724);
      color: #3f6f4f;
      border: 1px solid color-mix(in srgb, #3f6f4f 40%, #3d372f);
    }
    .mark-error {
      background: color-mix(in srgb, #b3392b 20%, #2a2724);
      color: #b3392b;
      border: 1px solid color-mix(in srgb, #b3392b 35%, #3d372f);
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
  </style>
</head>
<body>
  <div class="card">
    ${body}
  </div>
</body>
</html>`;
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
