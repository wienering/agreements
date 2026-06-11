import type { Metadata } from 'next'
import { Fraunces, Montserrat } from 'next/font/google'
import { Providers } from './providers'
import '@flaticon/flaticon-uicons/css/regular/rounded.css'
import './globals.css'

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

const montserrat = Montserrat({
  subsets: ['latin'],
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
      <body className={`${montserrat.className} ${fraunces.variable} ${montserrat.variable}`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
