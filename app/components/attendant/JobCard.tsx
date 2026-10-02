import Link from 'next/link';
import { formatEventDateToronto, formatEventDateTorontoShort } from '@/lib/dates';
import { UIcon } from '../UIcon';
import { BackdropSection } from './BackdropSection';

export type AttendantJobCardModel = {
  id: string;
  clientName: string;
  eventLocation: string | null;
  eventDate: string | null;
  eventStartTime: string | null;
  eventType: string | null;
  backdropSelected: boolean;
  backdropName: string | null;
};

type JobCardProps = {
  job: AttendantJobCardModel;
  href: string;
  variant: 'featured' | 'compact';
};

function eventTypeBadgeClass(eventType: string): string {
  const type = eventType.toLowerCase();
  if (type.includes('sport')) return 'bg-warn text-accent-on';
  if (
    type.includes('wedding') ||
    type.includes('corporate') ||
    type.includes('business') ||
    type.includes('birthday') ||
    type.includes('party') ||
    type.includes('music') ||
    type.includes('concert')
  ) {
    return 'bg-accent text-accent-on';
  }
  return 'bg-admin-muted text-accent-on';
}

function EventTypeBadge({
  eventType,
  size,
}: {
  eventType: string;
  size: 'featured' | 'compact';
}) {
  const sizing = size === 'featured' ? 'px-3 py-1.5 text-xs' : 'px-2.5 py-1 text-[11px]';
  return (
    <span
      className={`inline-block rounded-sm font-semibold uppercase tracking-wide ${sizing} ${eventTypeBadgeClass(eventType)}`}
    >
      {eventType}
    </span>
  );
}

export function JobCard({ job, href, variant }: JobCardProps) {
  if (variant === 'featured') {
    return (
      <article className="h-full overflow-hidden border border-admin-hairline bg-admin-surface">
        <div className="flex h-[200px] items-start justify-between bg-admin-bg p-6">
          {job.eventType ? <EventTypeBadge eventType={job.eventType} size="featured" /> : <span />}
          {job.backdropSelected ? (
            <span className="inline-flex items-center gap-1 rounded-sm bg-accent px-3 py-1.5 text-xs font-semibold text-accent-on">
              <UIcon name="check" className="text-xs text-accent-on" />
              Backdrop Selected
            </span>
          ) : null}
        </div>
        <div className="p-6">
          <h2 className="m-0 mb-3 text-2xl font-bold leading-snug text-admin-text">
            {job.clientName}
          </h2>
          {job.eventLocation ? (
            <p className="m-0 mb-2 flex items-center gap-1.5 text-sm text-admin-muted">
              <UIcon name="marker" className="text-sm text-admin-muted" />
              <span>{job.eventLocation}</span>
            </p>
          ) : null}
          {job.eventDate ? (
            <p className="m-0 mb-4 flex items-center gap-1.5 text-sm text-admin-muted">
              <UIcon name="calendar" className="text-sm text-admin-muted" />
              <span>{formatEventDateToronto(job.eventDate)}</span>
              {job.eventStartTime ? <span className="ml-2">• {job.eventStartTime}</span> : null}
            </p>
          ) : null}
          {job.backdropName ? (
            <div className="mt-4 border-t border-admin-hairline pt-4">
              <BackdropSection name={job.backdropName} variant="inline" iconTone="accent" />
            </div>
          ) : null}
          <Link
            href={href}
            className="mt-5 inline-block rounded-sm bg-accent px-6 py-3 text-sm font-semibold text-accent-on no-underline transition-colors hover:bg-accent-hover"
          >
            View Details →
          </Link>
        </div>
      </article>
    );
  }

  return (
    <Link href={href} prefetch className="block h-full w-full text-inherit no-underline">
      <article className="flex h-full flex-col overflow-hidden border border-admin-hairline bg-admin-surface transition duration-300 hover:-translate-y-1 hover:border-accent hover:shadow-lg">
        <div className="flex h-[120px] items-start justify-between bg-admin-bg p-4">
          {job.eventType ? <EventTypeBadge eventType={job.eventType} size="compact" /> : <span />}
          {job.backdropSelected ? (
            <span className="inline-flex rounded-sm bg-accent px-2 py-1">
              <UIcon name="check" className="text-[10px] text-accent-on" />
            </span>
          ) : null}
        </div>
        <div className="flex flex-1 flex-col p-5">
          <h3 className="m-0 mb-3 text-lg font-bold leading-snug text-admin-text">{job.clientName}</h3>
          <div className="mb-4 flex flex-1 flex-col gap-2">
            {job.eventLocation ? (
              <div className="flex items-start gap-2">
                <UIcon name="marker" className="shrink-0 text-sm text-admin-muted" />
                <span className="text-[13px] leading-snug text-admin-text">{job.eventLocation}</span>
              </div>
            ) : null}
            {job.eventDate ? (
              <div className="flex items-start gap-2">
                <UIcon name="calendar" className="shrink-0 text-sm text-admin-muted" />
                <span className="text-[13px] font-medium text-admin-text">
                  {formatEventDateTorontoShort(job.eventDate)}
                  {job.eventStartTime ? (
                    <span className="ml-1.5 text-admin-muted">• {job.eventStartTime}</span>
                  ) : null}
                </span>
              </div>
            ) : null}
            {job.backdropName ? (
              <div className="mt-1">
                <BackdropSection name={job.backdropName} variant="inline" iconTone="muted" />
              </div>
            ) : null}
          </div>
          <div className="border-t border-admin-hairline pt-3">
            <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-accent">
              View Details →
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
