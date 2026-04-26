'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        background: '#f7f7f8',
        fontFamily: "var(--font-assessment, system-ui, -apple-system, sans-serif)",
        color: '#0d0d0d',
      }}
    >
      <div
        style={{
          width: 'min(720px, 100%)',
          background: '#fff',
          border: '1px solid #e5e5e5',
          borderRadius: 16,
          padding: '1.25rem 1.25rem',
          boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
        }}
      >
        <div style={{ fontWeight: 800, fontSize: '1.125rem' }}>Something went wrong</div>
        <p style={{ margin: '0.6rem 0 1rem', color: '#4a5568', lineHeight: 1.5 }}>
          Try reloading this screen. If it keeps happening, check the server terminal output.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            background: '#01074c',
            color: '#fff',
            border: 'none',
            padding: '0.55rem 0.9rem',
            borderRadius: 10,
            cursor: 'pointer',
            fontWeight: 700,
          }}
        >
          Reload
        </button>
        <pre
          style={{
            marginTop: '1rem',
            padding: '0.9rem',
            background: '#0b1020',
            color: '#e5e7eb',
            borderRadius: 12,
            overflow: 'auto',
            fontSize: 12,
            lineHeight: 1.45,
          }}
        >
          {error?.message}
        </pre>
      </div>
    </main>
  );
}

