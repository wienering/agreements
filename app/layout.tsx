import type { Metadata } from 'next'
import { Libre_Franklin } from 'next/font/google'
import { Providers } from './providers'
import '@flaticon/flaticon-uicons/css/regular/rounded.css'
import './globals.css'

/* One family across every role. next/font self-hosts the files at build time,
   so nothing is fetched from a CDN at runtime. The display variable is kept
   because ~13 surfaces reference it; it now resolves to the same family. */
const libreFranklin = Libre_Franklin({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-ui',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Agreements',
  description: 'Client agreement management system',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.ico',
    apple: '/favicon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${libreFranklin.className} ${libreFranklin.variable}`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
