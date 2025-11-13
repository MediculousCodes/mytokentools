import type { Metadata } from 'next'
// 1. Comment out the font import
// import { Geist, Geist_Mono } from 'next/font/google' 
import { Analytics } from '@vercel/analytics/next'
import ThemeToggle from './components/ThemeToggle'
import './globals.css'

// 2. Comment out the font variables
// const _geist = Geist({ subsets: ["latin"] });
// const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'myTokenTools', 
  description: 'Created with v0',
  generator: 'v0.app',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.React.Node
}>) {
  return (
    <html lang="en">
      {/* 3. Remove the font variable from the body className */}
      <body className={`font-sans antialiased`}>
      <div style={{position:'fixed', right:16, top:16, zIndex:999}}>
        <ThemeToggle />
      </div>
        {children}
        <Analytics />
      </body>
    </html>
  )
}