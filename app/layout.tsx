import type { Metadata } from 'next'
import localFont from 'next/font/local'
import { Providers } from './providers'
import '@flaticon/flaticon-uicons/css/regular/rounded.css'
import './globals.css'

/* One family across every role. The font files come from the @fontsource/libre-franklin package,
   so builds never download from Google Fonts (a failed download there used to break the build) and
   nothing is fetched from a CDN at runtime. The display variable is kept because ~13 surfaces
   reference it; it resolves to the same family. */
const libreFranklin = localFont({
  src: [
    { path: '../node_modules/@fontsource/libre-franklin/files/libre-franklin-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: '../node_modules/@fontsource/libre-franklin/files/libre-franklin-latin-600-normal.woff2', weight: '600', style: 'normal' },
  ],
  variable: '--font-ui',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Photobooth Guys',
  description: 'Photobooth Guys client agreements and bookings',
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
