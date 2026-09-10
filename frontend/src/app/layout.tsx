import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import RootLayoutClient from '@/components/RootLayoutClient'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Sizzle — Find it. Cook it.',
  description: 'Search recipes by dish or ingredient, then cook them one step at a time.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" style={{ height: '100%', overflow: 'hidden' }}>
      <body className={inter.className} style={{ margin: 0, padding: 0, height: '100%', overflow: 'hidden', backgroundColor: 'transparent' }}>
        <RootLayoutClient>{children}</RootLayoutClient>
      </body>
    </html>
  );
}
