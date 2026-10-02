import type { Ref, RefObject } from 'react';
import { AdminButton } from '../../../components/AdminButton';
import { UIcon } from '../../../components/UIcon';
import { AgreementRow, type RowActions } from './AgreementRow';
import { CompletedAgreementCard } from './CompletedAgreementCard';
import type { Agreement, BackdropLinkOption } from './types';
import { ITEMS_PER_PAGE, NO_ATTENDANT_FILTER, STATUS_FILTERS } from './types';

function Pager({
  page,
  totalPages,
  total,
  start,
  end,
  noun,
  onPrev,
  onNext,
  useAdminButtons = false,
}: {
  page: number;
  totalPages: number;
  total: number;
  start: number;
  end: number;
  noun: string;
  onPrev: () => void;
  onNext: () => void;
  useAdminButtons?: boolean;
}) {
  if (totalPages <= 1) return null;
  const prevDisabled = page === 1;
  const nextDisabled = page === totalPages;
  const pageButtonClass = (disabled: boolean) =>
    `rounded border-0 px-3.5 py-1.5 text-sm font-medium ${
      disabled ? 'cursor-not-allowed bg-admin-hairline text-admin-muted' : 'cursor-pointer bg-accent text-white'
    }`;

  return (
    <div className="mt-2 mb-8 flex flex-wrap items-center justify-between gap-3 rounded border border-admin-hairline bg-admin-surface px-4 py-3">
      <span className="text-sm text-admin-muted">
        Showing {start}–{end} of {total} {noun}
      </span>
      <div className="flex items-center gap-2">
        {useAdminButtons ? (
          <AdminButton variant={prevDisabled ? 'ghost' : 'primary'} size="compact" onClick={onPrev} disabled={prevDisabled}>
            ← Prev
          </AdminButton>
        ) : (
          <button type="button" onClick={onPrev} disabled={prevDisabled} className={pageButtonClass(prevDisabled)}>
            ← Prev
          </button>
        )}
        <span className="min-w-20 text-center text-sm text-admin-text">
          Page {page} of {totalPages}
        </span>
        {useAdminButtons ? (
          <AdminButton variant={nextDisabled ? 'ghost' : 'primary'} size="compact" onClick={onNext} disabled={nextDisabled}>
            Next →
          </AdminButton>
        ) : (
          <button type="button" onClick={onNext} disabled={nextDisabled} className={pageButtonClass(nextDisabled)}>
            Next →
          </button>
        )}
      </div>
    </div>
  );
}

export function AgreementsList({
  searchInputRef,
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  attendantFilter,
  setAttendantFilter,
  backdropLinks,
  debouncedSearchTerm,
  filteredCount,
  activeAgreements,
  completedAgreements,
  paginatedActive,
  paginatedCompleted,
  activePage,
  setActivePage,
  activeTotalPages,
  completedPage,
  setCompletedPage,
  completedTotalPages,
  completedExpanded,
  setCompletedExpanded,
  expandedRows,
  toggleRow,
  warningType,
  actions,
}: {
  searchInputRef: RefObject<HTMLInputElement | null>;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  attendantFilter: string;
  setAttendantFilter: (value: string) => void;
  backdropLinks: BackdropLinkOption[];
  debouncedSearchTerm: string;
  filteredCount: number;
  activeAgreements: Agreement[];
  completedAgreements: Agreement[];
  paginatedActive: Agreement[];
  paginatedCompleted: Agreement[];
  activePage: number;
  setActivePage: (value: number | ((page: number) => number)) => void;
  activeTotalPages: number;
  completedPage: number;
  setCompletedPage: (value: number | ((page: number) => number)) => void;
  completedTotalPages: number;
  completedExpanded: boolean;
  setCompletedExpanded: (value: boolean | ((open: boolean) => boolean)) => void;
  expandedRows: Set<string>;
  toggleRow: (id: string) => void;
  warningType: (agreement: Agreement) => string | null;
  actions: RowActions;
}) {
  const sortedLinks = [...backdropLinks].sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));

  return (
    <>
      <div className="mb-6 rounded border border-admin-hairline bg-admin-surface p-4">
        <div className="flex flex-col items-center gap-3 md:flex-row">
          <div className="flex w-full flex-1 items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-admin-muted" aria-hidden="true">
              <path
                d="M9 17A8 8 0 1 0 9 1a8 8 0 0 0 0 16ZM19 19l-4.35-4.35"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <input
              ref={searchInputRef as Ref<HTMLInputElement>}
              type="text"
              placeholder="Search by client, email, template, event, attendant, or status..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="flex-1 rounded border border-admin-hairline bg-admin-bg px-3 py-2 text-sm text-admin-text outline-none focus:border-accent"
            />
          </div>
          <div className="flex w-full shrink-0 items-center gap-2 md:w-60">
            <label htmlFor="attendant-filter" className="whitespace-nowrap text-[13px] font-medium text-admin-text">
              Attendant
            </label>
            <select
              id="attendant-filter"
              value={attendantFilter}
              onChange={(event) => setAttendantFilter(event.target.value)}
              className="min-w-0 flex-1 rounded border border-admin-hairline bg-admin-bg px-3 py-2 text-sm text-admin-text"
            >
              <option value="ALL">All attendants</option>
              <option value={NO_ATTENDANT_FILTER}>No attendant</option>
              {sortedLinks.map((link) => (
                <option key={link.id} value={link.id}>
                  {link.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2 rounded border border-admin-hairline bg-admin-surface px-4 py-3">
        <span className="mr-1 text-sm font-medium text-admin-text">Filter by Status:</span>
        {STATUS_FILTERS.map((status) => {
          const isActive = statusFilter === status;
          return (
            <AdminButton
              key={status}
              size="compact"
              variant="ghost"
              onClick={() => setStatusFilter(status)}
              className={
                isActive
                  ? '!border-[rgba(var(--accent-rgb),0.22)] !bg-accent-wash !font-semibold !text-accent'
                  : '!border-admin-hairline !bg-admin-surface-raised !text-admin-muted'
              }
            >
              {status}
            </AdminButton>
          );
        })}
      </div>

      {filteredCount === 0 ? (
        <div className="rounded border border-admin-hairline bg-admin-surface px-6 py-12 text-center">
          <p className="m-0 text-base text-admin-muted">
            {debouncedSearchTerm.trim()
              ? `No agreements found matching "${debouncedSearchTerm}".`
              : attendantFilter !== 'ALL'
                ? 'No agreements found for this attendant filter.'
                : 'No agreements found. Create your first agreement to get started.'}
          </p>
        </div>
      ) : (
        <>
          {activeAgreements.length > 0 && (
            <>
              {statusFilter === 'ALL' && completedAgreements.length > 0 && (
                <h3 className="m-0 mb-4 flex items-center gap-2 text-base font-semibold text-admin-text">
                  <UIcon name="clipboard" className="text-base" />
                  Active Agreements
                  <span className="text-[13px] font-normal text-admin-muted">({activeAgreements.length})</span>
                </h3>
              )}
              <div className="mb-8 grid gap-4">
                {paginatedActive.map((agreement) => (
                  <AgreementRow
                    key={agreement.id}
                    agreement={agreement}
                    expanded={expandedRows.has(agreement.id)}
                    onToggle={() => toggleRow(agreement.id)}
                    warningType={warningType(agreement)}
                    actions={actions}
                  />
                ))}
              </div>
              <Pager
                page={activePage}
                totalPages={activeTotalPages}
                total={activeAgreements.length}
                start={(activePage - 1) * ITEMS_PER_PAGE + 1}
                end={Math.min(activePage * ITEMS_PER_PAGE, activeAgreements.length)}
                noun="agreements"
                onPrev={() => setActivePage((page) => Math.max(1, page - 1))}
                onNext={() => setActivePage((page) => Math.min(activeTotalPages, page + 1))}
              />
            </>
          )}

          {completedAgreements.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => setCompletedExpanded((open) => !open)}
                className="flex w-full items-center gap-2.5 rounded border border-admin-hairline bg-admin-surface px-4 py-3.5 text-left text-[15px] font-semibold text-success"
              >
                <UIcon name="check" className="text-base text-success" />
                Completed Agreements
                <span className="text-[13px] font-normal text-admin-muted">({completedAgreements.length})</span>
                <span className="ml-auto text-[13px] text-admin-muted">{completedExpanded ? '▲ Hide' : '▼ Show'}</span>
              </button>
              {completedExpanded && (
                <div className="mb-4 rounded-b border border-t-0 border-admin-hairline p-4">
                  <div className="grid gap-4">
                    {paginatedCompleted.map((agreement) => (
                      <CompletedAgreementCard key={agreement.id} agreement={agreement} actions={actions} />
                    ))}
                  </div>
                  <Pager
                    page={completedPage}
                    totalPages={completedTotalPages}
                    total={completedAgreements.length}
                    start={(completedPage - 1) * ITEMS_PER_PAGE + 1}
                    end={Math.min(completedPage * ITEMS_PER_PAGE, completedAgreements.length)}
                    noun="completed"
                    onPrev={() => setCompletedPage((page) => Math.max(1, page - 1))}
                    onNext={() => setCompletedPage((page) => Math.min(completedTotalPages, page + 1))}
                    useAdminButtons
                  />
                </div>
              )}
            </>
          )}
        </>
      )}
    </>
  );
}
