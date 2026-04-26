'use client';

import Link from 'next/link';
import styles from './home.module.css';

export default function HomePage() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div className={styles.centerWrap}>
          <div className={styles.card}>
            <div className={styles.brandRow}>
              <img
                src="/theo-bot/character/1.png"
                alt="TheoBot"
                className={styles.brandAvatar}
              />
              <div className={styles.brandText}>
                <div className={styles.brandName}>
                  <span className={styles.brandTheo}>Theo</span>
                  <span className={styles.brandBot}>Bot</span>
                </div>
                <div className={styles.brandSub}>AI CAREER COACH</div>
              </div>
            </div>

            <h1 className={styles.title}>
              Welcome to <span className={styles.titleAccent}>TheoBot</span>
            </h1>
            <p className={styles.subtitle}>
              Pick a quick starting point — you can change it anytime.
            </p>

            <div className={styles.quickGrid}>
              <Link href="/assessment" className={styles.quickBtn}>
                <span className={styles.quickIcon} aria-hidden>📄</span>
                Resume Review
              </Link>
              <Link href="/assessment" className={styles.quickBtn}>
                <span className={styles.quickIcon} aria-hidden>💬</span>
                Interview Prep
              </Link>
              <Link href="/assessment" className={styles.quickBtn}>
                <span className={styles.quickIcon} aria-hidden>in</span>
                LinkedIn Update
              </Link>
              <Link href="/assessment" className={styles.quickBtn}>
                <span className={styles.quickIcon} aria-hidden>🧭</span>
                Networking Strategy
              </Link>
            </div>

            <Link href="/assessment" className={styles.cta}>
              Start Assessment
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
