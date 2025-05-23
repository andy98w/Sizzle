import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import RootLayoutClient from '@/components/RootLayoutClient'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Sizzle - Animated Recipe Assistant',
  description: 'AI-powered recipe assistant with animated step-by-step cooking instructions',
}

// Server component for layout
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className} style={{ margin: 0, padding: 0, minHeight: '100vh', backgroundColor: 'transparent' }}>
        <RootLayoutClient>{children}</RootLayoutClient>
      </body>
    </html>
  );
}