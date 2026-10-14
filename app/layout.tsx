import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin', 'latin-ext'], variable: '--font-inter' })
const mono = JetBrains_Mono({ subsets: ['latin', 'latin-ext'], variable: '--font-mono-face' })

export const metadata: Metadata = {
  title: 'AI Trainer PWA — Twój osobisty trener AI',
  description:
    'Trener personalny AI: rejestruj treningi na siłowni, śledź postępy i otrzymuj analizy Gemini po każdej sesji.',
  generator: 'v0.app',
  applicationName: 'AI Trainer',
  appleWebApp: { capable: true, title: 'AI Trainer', statusBarStyle: 'black-translucent' },
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#09090b',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pl" className={`dark ${inter.variable} ${mono.variable}`}>
      <body className="font-sans antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
