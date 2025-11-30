import type { Metadata } from 'next'
import { ReactNode } from 'react'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'

import { AppShell } from '@/components/layout/app-shell'
import { Toaster } from '@/components/ui/toaster'
import './globals.css'

const inter = Inter({ subsets: ['latin'], display: 'swap' })

export const metadata: Metadata = {
  title: 'myTokenTools',
  description: 'Advanced token analytics toolkit for LLM builders.',
  generator: 'myTokenTools scaffold',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} font-sans antialiased`}>
        <AppShell>{children}</AppShell>
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}