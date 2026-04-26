'use client';

/**
 * Admin dashboard — view sessions by email, click to see full data, download PDF.
 */

import { useState, useEffect, useCallback } from 'react';
import styles from './admin.module.css';

type SessionRow = {
  id: string;
  email: string;
  created_at: string;
  primary_type?: string | null;
  secondary_type?: string | null;
  is_blended?: boolean;
  decoder?: number | null;
  signal?: number | null;
  bridge?: number | null;
  heartbeat?: number | null;
  stress_profile?: Record<string, number> | null;
  pdf_url?: string | null;
};

const fetchOpts = { credentials: 'include' as RequestCredentials };

export default function AdminPage() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchEmail, setSearchEmail] = useState('');
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [selectedSession, setSelectedSession] = useState<SessionRow | null>(null);

  const loadSessions = useCallback(() => {
    setLoading(true);
    fetch('/api/admin/sessions?' + (searchEmail ? `email=${encodeURIComponent(searchEmail)}` : ''), fetchOpts)
      .then((res) => {
        if (res.status === 401) {
          setAuthenticated(false);
          return [];
        }
        setAuthenticated(true);
        return res.ok ? res.json() : [];
      })
      .then((data: SessionRow[]) => setSessions(Array.isArray(data) ? data : []))
      .catch(() => {
        setAuthenticated(false);
        setSessions([]);
      })
      .finally(() => setLoading(false));
  }, [searchEmail]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ password }),
    })
      .then((res) => {
        if (!res.ok) {
          setLoginError('Invalid password');
          return;
        }
        setPassword('');
        loadSessions();
      })
      .catch(() => setLoginError('Login failed'));
  };

  const handleLogout = () => {
    fetch('/api/admin/logout', { method: 'POST', credentials: 'include' }).then(() => {
      setAuthenticated(false);
      setSessions([]);
      setSelectedSession(null);
    });
  };

  const exportCsv = () => {
    const params = searchEmail ? `?email=${encodeURIComponent(searchEmail)}` : '';
    window.open(`${window.location.origin}/api/admin/export-csv${params}`, '_blank');
  };

  const openDetail = (s: SessionRow, e?: React.MouseEvent) => {
    if (e?.target instanceof HTMLElement && e.target.closest('a')) return;
    setSelectedSession(s);
  };

  const hasPdf = (s: SessionRow) => s.pdf_url && !s.pdf_url.includes('example.com');

  if (authenticated === false) {
    return (
      <div className={styles.container}>
        <div className={styles.loginWrap}>
          <h2 className={styles.loginTitle}>Admin login</h2>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.loginInput}
              autoFocus
            />
            {loginError && <p className={styles.loginError}>{loginError}</p>}
            <button type="submit" className={styles.loginBtn}>
              Log in
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <input
            type="text"
            placeholder="Search by email"
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            className={styles.searchInput}
          />
          <button type="button" onClick={exportCsv} className={styles.exportBtn}>
            Export CSV
          </button>
          {!loading && sessions.length > 0 && (
            <span className={styles.toolbarCount}>{sessions.length} session{sessions.length !== 1 ? 's' : ''}</span>
          )}
        </div>
        <button type="button" onClick={handleLogout} className={styles.logoutBtn}>
          Log out
        </button>
      </div>

      {loading ? (
        <p className={styles.loadingMsg}>Loading sessions…</p>
      ) : sessions.length === 0 ? (
        <p className={styles.emptyMsg}>No sessions found. Try a different search or add assessments.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Email</th>
                <th>Created</th>
                <th>Primary</th>
                <th>Secondary</th>
                <th>Blended</th>
                <th title="Decoder / Signal / Bridge / Heartbeat">Traits (D/S/B/H)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id} onClick={() => openDetail(s)}>
                  <td className={styles.emailCell}>{s.email}</td>
                  <td>{new Date(s.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</td>
                  <td>
                    {s.primary_type ? (
                      <span className={styles.primaryBadge}>{s.primary_type}</span>
                    ) : (
                      <span className={styles.emptyCell}>—</span>
                    )}
                  </td>
                  <td>
                    {s.secondary_type ? (
                      <span className={styles.secondaryBadge}>{s.secondary_type}</span>
                    ) : (
                      <span className={styles.emptyCell}>—</span>
                    )}
                  </td>
                  <td>
                    <span className={s.is_blended ? styles.blendedYes : styles.blendedNo}>
                      {s.is_blended ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className={styles.traitsCell}>
                    {[s.decoder, s.signal, s.bridge, s.heartbeat].every((n) => n == null) ? (
                      <span className={styles.emptyCell}>—</span>
                    ) : (
                      `${s.decoder ?? 0} / ${s.signal ?? 0} / ${s.bridge ?? 0} / ${s.heartbeat ?? 0}`
                    )}
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className={styles.actionsCell}>
                      <button
                        type="button"
                        onClick={() => openDetail(s)}
                        className={styles.viewBtn}
                      >
                        View
                      </button>
                      {hasPdf(s) ? (
                        <a
                          href={s.pdf_url!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.downloadLink}
                        >
                          Download PDF
                        </a>
                      ) : (
                        <span className={styles.emptyCell}>—</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedSession && (
        <div
          className={styles.overlay}
          onClick={() => setSelectedSession(null)}
          role="presentation"
        >
          <div
            className={styles.detailPanel}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="detail-title"
          >
            <div className={styles.detailHeader}>
              <h2 id="detail-title" className={styles.detailTitle}>
                {selectedSession.email}
              </h2>
              <button
                type="button"
                onClick={() => setSelectedSession(null)}
                className={styles.closeBtn}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className={styles.detailBody}>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Created</span>
                <span className={styles.detailValue}>
                  {new Date(selectedSession.created_at).toLocaleString()}
                </span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Primary archetype</span>
                <span className={styles.detailValue}>{selectedSession.primary_type ?? '—'}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Secondary archetype</span>
                <span className={styles.detailValue}>{selectedSession.secondary_type ?? '—'}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Blended profile</span>
                <span className={styles.detailValue}>
                  {selectedSession.is_blended ? 'Yes' : 'No'}
                </span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Trait scores (D / S / B / H)</span>
                <span className={styles.detailValue}>
                  {[selectedSession.decoder, selectedSession.signal, selectedSession.bridge, selectedSession.heartbeat].every((n) => n == null)
                    ? '—'
                    : `${selectedSession.decoder ?? 0} · ${selectedSession.signal ?? 0} · ${selectedSession.bridge ?? 0} · ${selectedSession.heartbeat ?? 0}`}
                </span>
              </div>
              {selectedSession.stress_profile && Object.keys(selectedSession.stress_profile).length > 0 && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Stress profile</span>
                  <span className={styles.detailValue}>
                    {Object.entries(selectedSession.stress_profile)
                      .map(([tag, count]) => `${tag}: ${count}`)
                      .join('  ·  ')}
                  </span>
                </div>
              )}
              <div className={styles.detailActions}>
                {hasPdf(selectedSession) ? (
                  <a
                    href={selectedSession.pdf_url!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.downloadBtn}
                  >
                    Download PDF report
                  </a>
                ) : (
                  <span className={styles.detailValue}>No PDF available for this session.</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
