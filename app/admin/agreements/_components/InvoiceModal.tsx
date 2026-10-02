import { formatDateToronto } from '@/lib/dates';
import { AdminButton } from '../../../components/AdminButton';
import { UIcon } from '../../../components/UIcon';
import { ModalFrame } from './ModalFrame';
import { packagePriceOf } from './agreementUtils';
import type { Agreement, InvoiceResult, InvoiceType } from './types';
import { eyebrowClass, fieldClass, metaPanelClass, raisedPanelClass } from './uiClasses';

export function InvoiceModal({
  agreement,
  creating,
  result,
  error,
  invoiceType,
  customAmount,
  disableOnlinePayment,
  onType,
  onCustomAmount,
  onDisableOnline,
  onClose,
  onCreate,
}: {
  agreement: Agreement | null;
  creating: boolean;
  result: InvoiceResult | null;
  error: string | null;
  invoiceType: InvoiceType;
  customAmount: string;
  disableOnlinePayment: boolean;
  onType: (value: InvoiceType) => void;
  onCustomAmount: (value: string) => void;
  onDisableOnline: (value: boolean) => void;
  onClose: () => void;
  onCreate: () => void;
}) {
  if (!agreement) return null;
  const price = packagePriceOf(agreement);
  const priceText = price ? `$${Number(price || 0).toFixed(2)}` : 'Not set';

  return (
    <ModalFrame maxWidthClass="max-w-[600px]" paddingClass="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="m-0 text-2xl font-bold text-admin-text">
          <span className="inline-flex items-center gap-2.5">
            <UIcon name="credit-card" className="text-2xl" />
            Create Stripe Invoice
          </span>
        </h2>
        <button type="button" onClick={onClose} className="p-1 text-admin-text">
          <UIcon name="x" className="text-[22px]" />
        </button>
      </div>

      {creating && (
        <div className="px-5 py-10 text-center">
          <div className="mb-4 flex justify-center">
            <UIcon name="spinner" className="animate-spin text-5xl text-admin-text" />
          </div>
          <p className="m-0 text-base text-admin-text">Creating invoice...</p>
        </div>
      )}

      {!creating && result?.success && (
        <div>
          <div className="mb-6 rounded border border-success bg-admin-surface-raised p-4">
            <h4 className="m-0 mb-2 flex items-center gap-2 text-lg text-success">
              <UIcon name="check" className="text-xl" />
              Invoice Created Successfully!
            </h4>
            <p className="m-0 text-sm text-admin-text">
              {result.message || `Successfully created ${result.invoices?.length || 1} invoice(s). The invoice(s) have been sent to the client via email.`}
            </p>
          </div>
          {result.invoices && result.invoices.length > 0 && (
            <div className={`mb-6 ${metaPanelClass}`}>
              <h3 className="m-0 mb-4 text-base font-semibold text-admin-text">Invoice Details</h3>
              {result.invoices.map((invoice, index) => (
                <div key={index} className={`rounded border border-admin-hairline bg-admin-surface p-4 ${index < result.invoices!.length - 1 ? 'mb-3' : ''}`}>
                  <div className="mb-3 flex items-center justify-between">
                    <span className={`rounded bg-admin-surface-raised px-3 py-1 text-xs font-semibold uppercase ${invoice.type === 'deposit' ? 'text-warn' : 'text-admin-text'}`}>
                      {invoice.type === 'deposit' ? 'Deposit' : invoice.type === 'remaining' ? 'Remaining Balance' : 'Full Amount'}
                    </span>
                    <span className="text-lg font-bold text-admin-text">${invoice.amount.toFixed(2)}</span>
                  </div>
                  <div className="mb-2 text-sm text-admin-muted">
                    <strong>Due Date:</strong> {formatDateToronto(invoice.dueDate, { year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                  {invoice.invoiceUrl && (
                    <a href={invoice.invoiceUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block rounded bg-accent px-4 py-2 text-sm font-medium text-accent-on no-underline">
                      View Invoice →
                    </a>
                  )}
                </div>
              ))}
              {result.customerId && (
                <div className="mt-3 border-t border-admin-hairline pt-3 text-xs text-admin-muted">
                  <strong>Stripe Customer ID:</strong> {result.customerId}
                </div>
              )}
            </div>
          )}
          <div className="flex justify-end">
            <button type="button" onClick={onClose} className="rounded border-0 bg-accent px-6 py-3 text-sm font-medium text-accent-on">
              Close
            </button>
          </div>
        </div>
      )}

      {!creating && error && (
        <div>
          <div className="mb-6 rounded border border-alert bg-admin-surface-raised p-4">
            <h4 className="m-0 mb-2 flex items-center gap-2 text-lg text-alert">
              <UIcon name="circle-xmark" className="text-xl" />
              Error Creating Invoice
            </h4>
            <p className="m-0 text-sm text-alert">{error}</p>
          </div>
          <div className="flex justify-end">
            <AdminButton variant="ghost" onClick={onClose}>Close</AdminButton>
          </div>
        </div>
      )}

      {!creating && !result && !error && (
        <div>
          <div className={`mb-6 ${metaPanelClass}`}>
            <h3 className="m-0 mb-4 text-base font-semibold text-admin-text">Agreement Information</h3>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
              <Info label="Client" value={`${agreement.client.firstName} ${agreement.client.lastName}`} />
              <Info label="Email" value={agreement.client.email || 'Not set'} />
              <Info label="Template" value={agreement.template.title} />
              <Info label="Invoice Amount" value={priceText} />
            </div>
          </div>
          <label className={eyebrowClass}>Invoice Type</label>
          <select
            value={invoiceType}
            onChange={(event) => {
              const next = event.target.value as InvoiceType;
              onType(next);
              if (next !== 'custom-amount') onCustomAmount('');
            }}
            className={`${fieldClass} mb-6 cursor-pointer py-2.5`}
          >
            <option value="default">Default (Deposit + Remaining)</option>
            <option value="total-only">Total Amount Only</option>
            <option value="total-minus-deposit">Total Amount Minus $100 Deposit</option>
            <option value="custom-amount">Custom Amount</option>
          </select>
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={disableOnlinePayment} onChange={(event) => onDisableOnline(event.target.checked)} className="h-[18px] w-[18px] cursor-pointer" />
            <span className="text-sm font-medium text-admin-text">Disable online payment (invoice will be view-only)</span>
          </label>
          <p className="mb-6 mt-2 text-xs text-admin-muted">
            When enabled, clients will receive the invoice but won&apos;t be able to pay online. You can send payment instructions separately.
          </p>
          {invoiceType === 'custom-amount' && (
            <div className="mb-6">
              <label className={eyebrowClass}>Custom Invoice Amount ($)</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={customAmount}
                placeholder="Enter amount (e.g., 650.00)"
                onChange={(event) => onCustomAmount(event.target.value)}
                className={`${fieldClass} py-2.5`}
              />
              {price && <p className="mb-0 mt-2 text-xs text-admin-muted">Total package price: {priceText}</p>}
            </div>
          )}
          <div className={`mb-6 p-4 ${raisedPanelClass}`}>
            <p className="m-0 text-sm leading-relaxed text-admin-text">
              <strong>Note:</strong> This will create a Stripe invoice and send it to the client via email.
              {invoiceType === 'default' && (
                <>
                  <br />
                  The invoice due dates will be calculated based on the event date:
                  <br />
                  • If event date is more than 7 days away: $100 deposit due today, remaining amount due 7 days before event
                  <br />
                  • If event date is 7 days or less: Full amount due today
                </>
              )}
              {invoiceType === 'total-only' && (
                <>
                  <br />
                  A single invoice will be created for the full amount, due 1 week before the event date.
                </>
              )}
              {invoiceType === 'total-minus-deposit' && (
                <>
                  <br />
                  A single invoice will be created for the total amount minus $100 (assuming deposit was paid outside of Stripe), due 1 week before the event date.
                </>
              )}
              {invoiceType === 'custom-amount' && (
                <>
                  <br />
                  A single invoice will be created for the custom amount you specify, due 1 week before the event date.
                </>
              )}
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <AdminButton variant="ghost" onClick={onClose}>Cancel</AdminButton>
            <AdminButton variant="primary" onClick={onCreate} disabled={!agreement.client.email || (invoiceType === 'custom-amount' && !customAmount)}>
              Create Invoice
            </AdminButton>
          </div>
        </div>
      )}
    </ModalFrame>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className={eyebrowClass}>{label}</label>
      <p className="m-0 text-sm font-medium text-admin-text">{value}</p>
    </div>
  );
}
