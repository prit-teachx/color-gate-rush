import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Color Gate Rush',
  description:
    'Neon 3-color cube gate rush ? offline, no account. Cycle faces, match gates, chain perfects.',
  applicationName: 'Color Gate Rush',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Color Gate Rush',
  },
}

export const viewport: Viewport = {
  themeColor: '#050512',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
