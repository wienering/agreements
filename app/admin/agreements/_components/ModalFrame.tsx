import type { ReactNode } from 'react';

export function ModalFrame({
  children,
  onBackdropClick,
  maxWidthClass = 'max-w-[400px]',
  paddingClass = 'p-6',
}: {
  children: ReactNode;
  onBackdropClick?: () => void;
  maxWidthClass?: string;
  paddingClass?: string;
}) {
  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center overflow-y-auto bg-black/50 p-3 md:p-5"
      onClick={onBackdropClick}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        className={`box-border w-full ${maxWidthClass} max-h-[min(90vh,100%)] overflow-y-auto rounded border border-admin-hairline bg-admin-surface ${paddingClass}`}
      >
        {children}
      </div>
    </div>
  );
}

export function ModalTitle({
  children,
  icon,
}: {
  children: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <h3 className="m-0 mb-4 flex items-center gap-2 text-lg text-admin-text">
      {icon}
      {children}
    </h3>
  );
}

export function CloseIconButton({ onClick, title = 'Close modal' }: { onClick: () => void; title?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="rounded p-1 text-2xl leading-none text-admin-muted hover:bg-admin-surface-raised hover:text-admin-text"
    >
      ×
    </button>
  );
}
