export type TelegramSendOptions = {
  disableWebPagePreview?: boolean;
};

export async function sendTelegramMessage(
  text: string,
  options?: TelegramSendOptions,
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.error('[telegram] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set');
    return;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        ...(options?.disableWebPagePreview ? { disable_web_page_preview: true } : {}),
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error('[telegram] send failed:', response.status, body);
    }
  } catch (error) {
    console.error('[telegram] send failed:', error);
  }
}
