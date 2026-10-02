import { formatDateTimeToronto } from '@/lib/dates';
import { prisma } from '@/lib/prisma';
import { sendTelegramMessage } from '@/lib/telegram';

export const ERROR_ALERT_ACTION = 'ERROR_ALERT';
export const ERROR_ALERT_WINDOW_MS = 60 * 60 * 1000;
const STACK_LINE_LIMIT = 5;
const MESSAGE_LIMIT = 500;

const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_PATTERN = /(?:\+?\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/g;
const BARE_PHONE_PATTERN = /(?<!\d)\d{10,11}(?!\d)/g;
const BEARER_PATTERN = /\bBearer\s+\S+/gi;
const JWT_PATTERN = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;
const SECRET_ASSIGNMENT_PATTERN =
  /((?:token|signature|sig|secret|password|api[_-]?key|authorization)\s*[=:]\s*)\S+/gi;
const STRIPE_KEY_PATTERN = /\b(?:sk|pk|rk)_(?:live|test)_[A-Za-z0-9]+\b/g;

export function redactSensitive(value: string): string {
  return value
    .replace(EMAIL_PATTERN, '[redacted-email]')
    .replace(BEARER_PATTERN, 'Bearer [redacted-token]')
    .replace(JWT_PATTERN, '[redacted-token]')
    .replace(SECRET_ASSIGNMENT_PATTERN, '$1[redacted-token]')
    .replace(STRIPE_KEY_PATTERN, '[redacted-token]')
    .replace(PHONE_PATTERN, '[redacted-phone]')
    .replace(BARE_PHONE_PATTERN, '[redacted-phone]');
}

export function errorMessageOf(error: unknown): string {
  if (error instanceof Error) {
    return error.message || error.name || 'Unknown error';
  }
  if (typeof error === 'string' && error.trim()) {
    return error;
  }
  return 'Unknown error';
}

export function errorStackOf(error: unknown): string | undefined {
  if (error instanceof Error && typeof error.stack === 'string' && error.stack.trim()) {
    return error.stack;
  }
  return undefined;
}

export function buildErrorAlertSignature(route: string, message: string): string {
  const safeRoute = redactSensitive(stripQuery(route) || 'unknown');
  const safeMessage = redactSensitive(message).slice(0, MESSAGE_LIMIT);
  return `${safeRoute}\n${safeMessage}`;
}

export function isRecentErrorAlert(lastSentAt: Date | null, now: Date): boolean {
  if (!lastSentAt || Number.isNaN(lastSentAt.getTime()) || Number.isNaN(now.getTime())) {
    return false;
  }
  return now.getTime() - lastSentAt.getTime() < ERROR_ALERT_WINDOW_MS;
}

/**
 * Same route and same message count as one error. A prior alert blocks another
 * until a full hour has passed. A different message on the same route does not.
 */
export function shouldSendErrorAlert(input: {
  now: Date;
  signature: string;
  recent: { signature: string; createdAt: Date } | null;
}): boolean {
  if (!input.recent || input.recent.signature !== input.signature) {
    return true;
  }
  return !isRecentErrorAlert(input.recent.createdAt, input.now);
}

export function formatErrorAlertMessage(input: {
  route: string;
  method: string;
  message: string;
  stack?: string;
  now: Date;
}): string {
  const time = formatDateTimeToronto(input.now, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
  const lines = [
    'Server error',
    `Environment: ${alertEnvironment()}`,
    `Route: ${redactSensitive(stripQuery(input.route) || 'unknown')}`,
    `Method: ${redactSensitive(input.method || 'UNKNOWN')}`,
    `Time: ${time}`,
    `Message: ${redactSensitive(input.message).slice(0, MESSAGE_LIMIT)}`,
  ];
  const stack = firstStackLines(input.stack);
  if (stack) {
    lines.push('Stack:', stack);
  }
  return lines.join('\n');
}

export async function reportServerError(input: {
  route: string;
  method?: string;
  error: unknown;
  now?: Date;
}): Promise<void> {
  try {
    if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
      console.error('[error-alert] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set');
      return;
    }

    const now = input.now ?? new Date();
    const message = errorMessageOf(input.error);
    const route = stripQuery(input.route) || 'unknown';
    const method = (input.method || 'UNKNOWN').toUpperCase();
    const signature = buildErrorAlertSignature(route, message);

    const recent = await prisma.auditLog.findFirst({
      where: {
        action: ERROR_ALERT_ACTION,
        createdAt: { gt: new Date(now.getTime() - ERROR_ALERT_WINDOW_MS) },
        metadata: {
          path: ['signature'],
          equals: signature,
        },
      },
      select: { createdAt: true },
    });

    if (
      !shouldSendErrorAlert({
        now,
        signature,
        recent: recent ? { signature, createdAt: recent.createdAt } : null,
      })
    ) {
      return;
    }

    await prisma.auditLog.create({
      data: {
        actor: 'system',
        action: ERROR_ALERT_ACTION,
        metadata: { signature },
      },
    });

    await sendTelegramMessage(
      formatErrorAlertMessage({
        route,
        method,
        message,
        stack: errorStackOf(input.error),
        now,
      }),
      { disableWebPagePreview: true },
    );
  } catch (alertError) {
    console.error('[error-alert] failed to send', alertError);
  }
}

function alertEnvironment(): string {
  const value = process.env.VERCEL_ENV?.trim();
  return value || 'local';
}

function stripQuery(route: string): string {
  return route.split('?')[0]?.trim() ?? '';
}

function firstStackLines(stack: string | undefined): string {
  if (!stack) return '';
  return redactSensitive(stack)
    .split(/\r?\n/)
    .slice(0, STACK_LINE_LIMIT)
    .join('\n');
}
