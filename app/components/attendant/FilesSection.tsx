import { UIcon } from '../UIcon';

export type AttendantFile = {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  googleDriveLink: string;
};

type FilesSectionProps = {
  files: AttendantFile[];
  error?: string | null;
};

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function fileIconName(fileType: string): string {
  if (fileType.includes('zip')) return 'box';
  if (fileType.includes('image')) return 'image';
  return 'file';
}

export function FilesSection({ files, error = null }: FilesSectionProps) {
  return (
    <section className="attendant-card mb-6 border border-admin-hairline bg-admin-surface p-8">
      <h2 className="mb-6 border-b border-admin-hairline pb-4 text-xl font-bold text-admin-text">
        Event Files
      </h2>
      {error ? (
        <p className="m-0 text-sm text-alert">{error}</p>
      ) : files.length === 0 ? (
        <p className="m-0 text-sm text-admin-muted">No files have been uploaded for this event.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-3 border border-admin-hairline bg-admin-bg p-4 transition-colors hover:border-accent hover:bg-admin-surface"
            >
              <UIcon
                name={fileIconName(file.fileType)}
                className="text-[32px] text-admin-muted"
              />
              <div className="min-w-0 flex-1">
                <div className="mb-1 truncate text-base font-semibold text-admin-text">
                  {file.fileName}
                </div>
                <div className="text-xs text-admin-muted">{formatFileSize(file.fileSize)}</div>
              </div>
              <a
                href={file.googleDriveLink}
                target="_blank"
                rel="noopener noreferrer"
                className="whitespace-nowrap bg-accent px-4 py-2 text-sm font-medium text-accent-on no-underline transition-colors hover:bg-accent-hover"
              >
                Open in Drive
              </a>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
