export default function AssessmentLoading() {
  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        background: 'linear-gradient(180deg, rgba(1, 7, 76, 0.9) 0%, rgba(1, 7, 76, 0.25) 55%, #f7f7f8 100%)',
        color: '#01074c',
        fontFamily: "var(--font-assessment, 'General Sans', system-ui, sans-serif)",
      }}
    >
      <div
        style={{
          width: 'min(520px, 100%)',
          background: 'rgba(255,255,255,0.92)',
          border: '1px solid rgba(229,229,229,0.9)',
          borderRadius: 18,
          padding: '1.25rem 1.25rem',
          boxShadow: '0 10px 30px rgba(1, 7, 76, 0.12)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            aria-hidden
            style={{
              width: 14,
              height: 14,
              borderRadius: '999px',
              border: '2px solid rgba(251, 99, 34, 0.35)',
              borderTopColor: '#fb6322',
              animation: 'spin 0.9s linear infinite',
            }}
          />
          <div style={{ fontWeight: 700, letterSpacing: '-0.01em' }}>Loading assessment…</div>
        </div>
        <p style={{ margin: '0.6rem 0 0', color: '#4a5568', lineHeight: 1.5 }}>
          First load can take a moment while we prepare the conversation.
        </p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </main>
  );
}

