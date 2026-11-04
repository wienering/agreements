import { after } from 'next/server';
import type { LeadStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { sendTelegramMessage } from '@/lib/telegram';
import { isLeadsSheetConfigured, readLeadsSheet, writeLeadsSheetCells } from '@/lib/googleSheets/client';
import { addTorontoCalendarDaysFrom, torontoDateKey } from '@/lib/dates';
import { columnLetter, findLeadRow, findSheetColumns } from '@/lib/leads/sheetRow';
import { formatSheetDate, leadStatusToSheet, parseFollowUpDate } from '@/lib/leads/status';

export type SheetSyncResult = 'synced' | 'nothing_to_write' | 'not_in_sheet' | 'off' | 'failed';

/**
 * Push a lead's status to its Sheet row so WF2 skips (or resumes) it.
 * `previous` is the status before the change; it decides whether Following up means "resume".
 */
export async function syncLeadStatusToSheet(leadId: string, previous?: LeadStatus): Promise<SheetSyncResult> {
  if (!isLeadsSheetConfigured()) return 'off';

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { id: true, status: true, lostReason: true, sheetLeadId: true, email: true, firstName: true, lastName: true },
  });
  if (!lead) return 'nothing_to_write';

  const value = leadStatusToSheet(lead.status, lead.lostReason, previous);
  if (value === null) return 'nothing_to_write';

  try {
    const rows = await readLeadsSheet();
    const columns = rows.length > 0 ? findSheetColumns(rows[0]) : null;
    if (!columns) throw new Error('Sheet header is missing lead_id, email, new status or next follow-up date');

    const rowNumber = findLeadRow(rows, columns, { sheetLeadId: lead.sheetLeadId, email: lead.email });
    if (!rowNumber) {
      // Not on the working tab (never added, or already moved to Archived): nothing for WF2 to skip.
      await prisma.lead.update({ where: { id: lead.id }, data: { sheetSyncError: null } });
      return 'not_in_sheet';
    }

    const cells: Array<[string, string]> = [[`${columnLetter(columns.newStatus)}${rowNumber}`, value]];
    const followUpCell = `${columnLetter(columns.nextFollowUp)}${rowNumber}`;

    if (lead.status === 'BOOKED' || lead.status === 'LOST') {
      cells.push([followUpCell, '']);
    } else if (value === 'active') {
      // Resuming: make sure WF2 picks it up on its next run.
      const current = parseFollowUpDate(rows[rowNumber - 1][columns.nextFollowUp]);
      if (!current || torontoDateKey(current) < torontoDateKey(new Date())) {
        cells.push([followUpCell, formatSheetDate(addTorontoCalendarDaysFrom(new Date(), 1))]);
      }
    }

    await writeLeadsSheetCells(cells);
    await prisma.lead.update({
      where: { id: lead.id },
      data: { sheetSyncedAt: new Date(), sheetSyncError: null },
    });
    return 'synced';
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[lead-sheet-sync] failed', lead.id, message);
    await prisma.lead
      .update({ where: { id: lead.id }, data: { sheetSyncError: message.slice(0, 500) } })
      .catch(() => undefined);
    await sendTelegramMessage(
      `Lead Sheet sync failed for ${lead.firstName} ${lead.lastName} (${lead.email}). WF2 may still follow up. Use "Retry sync" on the lead.\n${message.slice(0, 200)}`,
    );
    return 'failed';
  }
}

/** Run the sync after the response is sent (inside a request), or right away otherwise. */
export function queueLeadSheetSync(leadId: string, previous?: LeadStatus): void {
  if (!isLeadsSheetConfigured()) return;
  const task = () => syncLeadStatusToSheet(leadId, previous);
  try {
    after(task);
  } catch {
    void task();
  }
}
