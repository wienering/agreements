export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-slate-200/70 bg-white/70 backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            {/* Logo placeholder (replace with real logo when available) */}
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-amber-400 text-slate-900 font-bold">
              PG
            </div>
            <div className="leading-tight">
              <p className="text-sm text-slate-500 dark:text-slate-400">Photobooth Guys</p>
              <h1 className="text-base font-semibold text-slate-900 dark:text-slate-100">Agreements</h1>
            </div>
          </div>
          <nav className="hidden gap-6 md:flex">
            <a href="/admin" className="text-sm font-medium text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">Dashboard</a>
            <a href="/admin/templates" className="text-sm font-medium text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">Templates</a>
            <a href="/admin/agreements" className="text-sm font-medium text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">Agreements</a>
          </nav>
          <a
            href="/admin"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-offset-slate-900"
          >
            Go to Admin
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.15),transparent_60%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(37,99,235,0.25),transparent_60%)]" />
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-6 py-16 md:grid-cols-2 md:py-24">
          <div>
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              <span className="h-2 w-2 rounded-full bg-green-500" /> Live • Production Ready
            </p>
            <h2 className="mb-4 text-4xl font-extrabold tracking-tight text-slate-900 md:text-5xl dark:text-white">
              Streamlined Client Agreements
            </h2>
            <p className="mb-8 max-w-prose text-slate-600 dark:text-slate-300">
              Create templates, personalize with smart fields, send for e‑signature, and deliver PDFs — all under the Photobooth Guys brand.
            </p>
            <div className="flex flex-col items-start gap-3 sm:flex-row">
              <a
                href="/admin"
                className="inline-flex items-center justify-center rounded-md bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-offset-slate-900"
              >
                Open Admin Dashboard
              </a>
              <a
                href="/admin/templates"
                className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Browse Templates
              </a>
            </div>
          </div>

          {/* Illustration */}
          <div className="relative mx-auto w-full max-w-xl">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-lg dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-md bg-amber-400 text-center font-bold leading-8 text-slate-900">PG</div>
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Agreement Preview</span>
                </div>
                <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">Draft</span>
              </div>
              <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                <div className="h-3 w-2/3 rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-3 w-11/12 rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-3 w-10/12 rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-3 w-9/12 rounded bg-slate-200 dark:bg-slate-800" />
                <div className="mt-6 flex items-center gap-3">
                  <div className="h-9 w-28 rounded-md bg-blue-600/90" />
                  <div className="h-9 w-28 rounded-md border border-slate-200 dark:border-slate-700" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-slate-200/70 bg-white py-14 dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-3 text-2xl">🧩</div>
              <h3 className="mb-2 font-semibold text-slate-900 dark:text-white">Smart Templates</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">Use smart fields like {'{{client.firstName}}'} to personalize instantly.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-3 text-2xl">✉️</div>
              <h3 className="mb-2 font-semibold text-slate-900 dark:text-white">Send & Track</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">Generate unique links, email clients, and monitor status.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-3 text-2xl">✍️</div>
              <h3 className="mb-2 font-semibold text-slate-900 dark:text-white">E‑Signature</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">Type or draw signatures with a full audit trail.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-3 text-2xl">🌙</div>
              <h3 className="mb-2 font-semibold text-slate-900 dark:text-white">Dark Mode</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">Beautiful by default and easy on the eyes.</p>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-8 text-center shadow-sm dark:border-slate-800 dark:from-slate-950 dark:to-slate-900">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Ready to get started?</h3>
            <p className="max-w-prose text-sm text-slate-600 dark:text-slate-300">Jump into the admin dashboard to create your first template and send an agreement.</p>
            <a href="/admin" className="inline-flex items-center justify-center rounded-md bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-offset-slate-900">Go to Admin</a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 text-sm text-slate-500 dark:text-slate-400">
          <span>© {new Date().getFullYear()} Photobooth Guys • Agreements</span>
          <a href="/admin/login" className="hover:text-slate-700 dark:hover:text-slate-200">Admin Login</a>
        </div>
      </footer>
    </main>
  )
}
