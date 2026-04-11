import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AIQ Advisors — AI-Powered Strategic Guidance',
  description:
    'Expert AI consultation for legal and real estate professionals. Navigate AI and blockchain adoption with confidence.',
  metadataBase: new URL('https://consult.aiq.llc'),
  openGraph: {
    title: 'AIQ Advisors',
    description: 'AI-powered strategic guidance for legal and real estate professionals.',
    siteName: 'AIQ Advisors',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  )
}
