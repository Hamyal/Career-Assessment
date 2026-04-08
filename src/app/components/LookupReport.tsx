'use client';

import { useState } from 'react';
import styles from './LookupReport.module.css';

export default function LookupReport() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ pdf_url: string; email_masked: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleLookup = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      setError('Enter your participant code');
      return;
    }
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/lookup?code=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? 'No report found');
        return;
      }
      setResult({ pdf_url: data.pdf_url, email_masked: data.email_masked ?? '' });
    } catch {
      setError('Lookup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <h2 className={styles.heading}>Look up your report</h2>
      <p className={styles.hint}>Enter the participant code you received when you completed the assessment.</p>
      <div className={styles.row}>
        <input
          type="text"
          placeholder="e.g. ABC123"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 12))}
          onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
          className={styles.input}
          aria-label="Participant code"
        />
        <button
          type="button"
          onClick={handleLookup}
          disabled={loading}
          className={styles.button}
        >
          {loading ? 'Looking up…' : 'Look up'}
        </button>
      </div>
      {error && <p className={styles.error}>{error}</p>}
      {result && (
        <div className={styles.result}>
          <p className={styles.resultLine}>
            Report for <strong>{result.email_masked}</strong>
          </p>
          <a href={result.pdf_url} target="_blank" rel="noopener noreferrer" className={styles.pdfLink}>
            Download your report (PDF)
          </a>
        </div>
      )}
    </div>
  );
}
