import { applySignerSmartFields, pickSecondSigner } from '@/lib/agreementSmartFields';
import { escapeHtml } from '@/lib/htmlEscape';
import { formatDateToronto } from '@/lib/dates';
import type { AgreementClient, AgreementEvent, AgreementRecord } from './types';

export function processSmartFields(
  html: string,
  client: AgreementClient,
  agreementId: string,
  event: AgreementEvent | null = null,
  agreement: AgreementRecord | null = null,
) {
  if (!html || !client) return html;

  let processedHtml = applySignerSmartFields(html, client, pickSecondSigner(agreement));
  const esc = (value: string) => escapeHtml(value);

  const address = event ? (event.eventLocation ?? '') : (client.address || '');
  const notes = event?.notes ?? client.notes;

  const eventDate = event?.eventDate || client.eventDate;
  const eventType = event?.eventType || client.eventType || '';
  const eventLocation = event?.eventLocation || client.eventLocation || '';
  const eventStartTime = event?.eventStartTime || client.eventStartTime || '';
  const eventDuration = event?.eventDuration || client.eventDuration || '';
  const eventPackage = event?.eventPackage || client.eventPackage || '';
  const packagePrice = event?.packagePrice || client.packagePrice;

  processedHtml = processedHtml.replace(/\{\{client\.eventDate\}\}/g, esc(eventDate ? formatDateToronto(eventDate) : ''));
  processedHtml = processedHtml.replace(/\{\{client\.address\}\}/g, esc(address));
  processedHtml = processedHtml.replace(/\{\{client\.notes\}\}/g, esc(notes || ''));

  processedHtml = processedHtml.replace(/\{\{event\.type\}\}/g, esc(eventType));
  processedHtml = processedHtml.replace(/\{\{event\.location\}\}/g, esc(eventLocation));
  processedHtml = processedHtml.replace(/\{\{event\.startTime\}\}/g, esc(eventStartTime));
  processedHtml = processedHtml.replace(/\{\{event\.duration\}\}/g, esc(eventDuration));
  processedHtml = processedHtml.replace(/\{\{event\.package\}\}/g, esc(eventPackage));
  processedHtml = processedHtml.replace(/\{\{event\.price\}\}/g, esc(packagePrice ? `$${Number(packagePrice).toFixed(2)}` : ''));

  processedHtml = processedHtml.replace(/\{\{agreement\.date\}\}/g, esc(formatDateToronto(new Date())));
  processedHtml = processedHtml.replace(/\{\{agreement\.id\}\}/g, esc(agreementId || ''));

  return processedHtml;
}
