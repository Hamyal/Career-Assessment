import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'PowerPrint™ Career Assessment | biaPathways',
  description: 'Full-screen conversational career assessment by biaPathways',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap" rel="stylesheet" />
      </head>
      <body>
        <header
          style={{
            padding: '0.875rem 1.5rem',
            borderBottom: '1px solid rgba(180, 185, 205, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(232, 234, 242, 0.95)',
            backdropFilter: 'saturate(180%) blur(10px)',
          }}
        >
          <a href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
            <Image
              src="/logo/logo-transparent.png"
              alt="biaPathways"
              width={140}
              height={40}
              style={{ objectFit: 'contain' }}
              priority
            />
            <span style={{ marginLeft: '0.5rem', fontSize: '0.9375rem', fontWeight: 600, color: '#1a365d' }}>PowerPrint™</span>
          </a>
          <Link
            href="/admin"
            style={{
              fontSize: '0.875rem',
              color: '#5a6178',
              textDecoration: 'none',
              fontWeight: 500,
            }}
            className="header-admin-link"
          >
            Admin
          </Link>
        </header>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {children}
        </div>
      </body>
    </html>
  );
}
