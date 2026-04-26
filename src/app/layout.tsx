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
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#01074c',
            color: '#fff',
            boxShadow: '0 4px 20px rgba(1, 7, 76, 0.25)',
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
            <span style={{ marginLeft: '0.6rem', fontSize: '0.9375rem', fontWeight: 700, color: '#fb6322' }}>PowerPrint™</span>
          </a>
          <Link
            href="/admin"
            style={{
              fontSize: '0.875rem',
              fontWeight: 600,
              color: 'rgba(255,255,255,0.9)',
              textDecoration: 'none',
              padding: '0.45rem 0.9rem',
              borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.2)',
              transition: 'color 0.2s, background 0.2s, border-color 0.2s',
            }}
            className="header-admin-link"
          >
            Admin
          </Link>
        </header>
        <div className="mainShell">
          {children}
        </div>
      </body>
    </html>
  );
}
