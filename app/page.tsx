import { Metadata } from 'next';
import { UIcon } from './components/UIcon';

export const metadata: Metadata = {
  title: 'Photobooth Guys - Agreement Management System',
  description: 'Streamlined client agreement management for Photobooth Guys. Create templates, personalize with smart fields, send for e-signature, and deliver PDFs.',
};

export default function Home() {
  return (
    <main data-surface="client" className="min-h-screen bg-paper">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-hairline bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-coral text-white font-bold">
              PG
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold tracking-wide text-muted uppercase">Photobooth Guys</p>
              <p className="text-base font-semibold text-ink">Agreements</p>
            </div>
          </div>
          <nav className="hidden gap-6 md:flex">
            <a href="/admin" className="text-sm font-medium text-ink hover:text-coral hover:underline underline-offset-2">Dashboard</a>
            <a href="/admin/templates" className="text-sm font-medium text-ink hover:text-coral hover:underline underline-offset-2">Templates</a>
            <a href="/admin/agreements" className="text-sm font-medium text-ink hover:text-coral hover:underline underline-offset-2">Agreements</a>
          </nav>
          <a
            href="/admin"
            className="rounded-md bg-coral px-4 py-2 text-sm font-semibold text-white hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-coral focus:ring-offset-2 focus:ring-offset-paper"
          >
            Go to Admin
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-6 py-16 md:grid-cols-2 md:py-24">
          <div>
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-hairline bg-panel px-3 py-1 text-xs font-medium text-muted">
              <span className="h-2 w-2 rounded-full bg-success" /> Live • Production Ready
            </p>
            <h1 className="client-page-title mb-4 text-4xl font-extrabold tracking-tight text-ink md:text-5xl">
              Streamlined Client Agreements
            </h1>
            <div className="client-title-rule" aria-hidden="true" />
            <p className="mb-8 mt-4 max-w-prose text-muted">
              Create templates, personalize with smart fields, send for e‑signature, and deliver PDFs — all under the Photobooth Guys brand.
            </p>
            <div className="flex flex-col items-start gap-3 sm:flex-row">
              <a
                href="/admin"
                className="inline-flex items-center justify-center rounded-md bg-coral px-5 py-3 text-sm font-semibold text-white hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-coral focus:ring-offset-2 focus:ring-offset-paper"
              >
                Open Admin Dashboard
              </a>
              <a
                href="/admin/templates"
                className="inline-flex items-center justify-center rounded-md border border-hairline bg-panel px-5 py-3 text-sm font-semibold text-ink hover:bg-paper focus:outline-none focus:ring-2 focus:ring-coral focus:ring-offset-2 focus:ring-offset-paper"
              >
                Browse Templates
              </a>
            </div>
          </div>

          {/* Illustration */}
          <div className="relative mx-auto w-full max-w-xl">
            <div className="rounded-xl border border-hairline bg-panel p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-coral text-sm font-bold text-white">PG</div>
                  <span className="text-sm font-semibold text-ink">Agreement Preview</span>
                </div>
                <span className="rounded-full border border-hairline bg-paper px-2 py-1 text-xs font-medium text-muted">Draft</span>
              </div>
              <div className="space-y-3 text-sm text-muted">
                <div className="h-3 w-2/3 rounded bg-hairline" />
                <div className="h-3 w-11/12 rounded bg-hairline" />
                <div className="h-3 w-10/12 rounded bg-hairline" />
                <div className="h-3 w-9/12 rounded bg-hairline" />
                <div className="mt-6 flex items-center gap-3">
                  <div className="h-9 w-28 rounded-md bg-coral" />
                  <div className="h-9 w-28 rounded-md border border-hairline bg-paper" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-hairline bg-panel py-14">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-hairline bg-paper p-6">
              <div className="mb-3 text-2xl text-coral">
                <UIcon name="layer-plus" className="text-2xl" />
              </div>
              <h3 className="mb-2 font-semibold text-ink">Smart Templates</h3>
              <p className="text-sm text-muted">Use smart fields like {'{{client.firstName}}'} to personalize instantly.</p>
            </div>
            <div className="rounded-xl border border-hairline bg-paper p-6">
              <div className="mb-3 text-2xl text-coral">
                <UIcon name="envelope" className="text-2xl" />
              </div>
              <h3 className="mb-2 font-semibold text-ink">Send & Track</h3>
              <p className="text-sm text-muted">Generate unique links, email clients, and monitor status.</p>
            </div>
            <div className="rounded-xl border border-hairline bg-paper p-6">
              <div className="mb-3 text-2xl text-coral">
                <UIcon name="stamp" className="text-2xl" />
              </div>
              <h3 className="mb-2 font-semibold text-ink">E‑Signature</h3>
              <p className="text-sm text-muted">Type or draw signatures with a full audit trail.</p>
            </div>
            <div className="rounded-xl border border-hairline bg-paper p-6">
              <div className="mb-3 text-2xl text-coral">
                <UIcon name="document" className="text-2xl" />
              </div>
              <h3 className="mb-2 font-semibold text-ink">Paper & Ink</h3>
              <p className="text-sm text-muted">Client-facing pages match your email and quote materials.</p>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-hairline bg-paper p-8 text-center">
            <h3 className="text-lg font-semibold text-ink">Ready to get started?</h3>
            <p className="max-w-prose text-sm text-muted">Jump into the admin dashboard to create your first template and send an agreement.</p>
            <a href="/admin" className="inline-flex items-center justify-center rounded-md bg-coral px-5 py-3 text-sm font-semibold text-white hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-coral focus:ring-offset-2 focus:ring-offset-paper">Go to Admin</a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-hairline bg-paper py-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 text-sm text-muted">
          <span>© {new Date().getFullYear()} Photobooth Guys • Agreements</span>
          <a href="/admin/login" className="font-medium text-ink hover:text-coral hover:underline underline-offset-2">Admin Login</a>
        </div>
      </footer>
    </main>
  )
}
