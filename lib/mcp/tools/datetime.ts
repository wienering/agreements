import { formatTorontoOffsetIso } from '@/lib/dates';

/** Format any MCP tool date/time field as America/Toronto with offset. */
export function mcpDateTime(value: Date | string | number | null | undefined): string | null {
  return formatTorontoOffsetIso(value);
}
