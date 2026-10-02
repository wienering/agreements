export function UnreadNotesBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  const label = count > 9 ? '9+' : String(count);
  return (
    <span
      title={`${count} unread client note${count === 1 ? '' : 's'}`}
      className={`inline-flex h-[18px] shrink-0 items-center justify-center rounded-full bg-alert text-[10px] font-bold leading-none text-white ${
        count > 9 ? 'min-w-5 px-[5px]' : 'min-w-[18px] px-0'
      }`}
    >
      {label}
    </span>
  );
}
