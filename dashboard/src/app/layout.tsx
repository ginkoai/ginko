/**
 * @fileType: layout
 * @status: current
 * @updated: 2025-12-11
 * @tags: [layout, root, fonts, providers, ginko-branding]
 * @related: [globals.css, providers.tsx]
 * @priority: critical
 * @complexity: low
 * @dependencies: [next, react-hot-toast]
 */
import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import { Providers } from '@/components/providers'
import { OAuthHandler } from '@/components/auth/oauth-handler'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap', // Prevent FOIT (Flash of Invisible Text)
  preload: true,
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap', // Prevent FOIT
  preload: true,
})

export const metadata: Metadata = {
  title: 'ginko - The AI Collaboration Platform',
  description: 'Where humans and AI ship together. Back in flow in 30 seconds.',
  keywords: ['ginko', 'claude', 'ai', 'development', 'context', 'collaboration'],
  authors: [{ name: 'Chris Norton' }],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <Providers>
          <OAuthHandler />
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: 'hsl(0 0% 6%)',  // --card
                color: 'hsl(0 0% 98%)',      // --foreground
                border: '1px solid hsl(0 0% 16%)',  // --border
                fontFamily: 'var(--font-mono)',
              },
              success: {
                iconTheme: {
                  primary: 'hsl(74 100% 48%)',  // --primary (ginko green)
                  secondary: 'hsl(0 0% 4%)',
                },
              },
              error: {
                iconTheme: {
                  primary: 'hsl(0 62% 30%)',  // --destructive
                  secondary: 'hsl(0 0% 98%)',
                },
              },
            }}
          />
        </Providers>
      </body>
    </html>
  )
}