export const fieldClass =
  'w-full rounded border border-admin-hairline bg-admin-surface px-3 py-2 text-sm text-admin-text outline-none';

export const fieldOnBgClass =
  'w-full rounded border border-admin-hairline bg-admin-bg px-3 py-2 text-sm text-admin-text outline-none focus:border-accent';

export const labelClass = 'mb-2 block font-medium text-admin-text';

export const smallLabelClass = 'mb-1.5 block text-[13px] font-medium text-admin-text';

export const eyebrowClass =
  'mb-1 block text-xs font-semibold uppercase tracking-[0.5px] text-admin-muted';

export const metaPanelClass = 'rounded border border-admin-hairline bg-admin-bg p-5';

export const raisedPanelClass = 'rounded border border-admin-hairline bg-admin-surface-raised p-3';

export const modalActionsClass = 'flex justify-end gap-3';

export function hintTextClass(urgency: string, warn: boolean): string {
  const color =
    urgency === 'danger' ? 'text-alert' : urgency === 'warning' ? 'text-warn' : 'text-admin-muted';
  return `${color} ${warn ? 'font-semibold' : 'font-normal'}`;
}
