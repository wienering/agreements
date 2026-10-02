import { UIcon } from '../../../components/UIcon';

export function NoAttendantHint() {
  return (
    <span
      title="No attendant assigned to this event"
      className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium text-status-idle"
    >
      <UIcon name="user" className="text-xs text-status-action opacity-80" />
      No attendant
    </span>
  );
}
