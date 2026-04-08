import Link from 'next/link';
import LookupReport from './components/LookupReport';
import styles from './home.module.css';

export default function HomePage() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <span className={`${styles.decor} ${styles.decorTop}`} aria-hidden />
        <span className={`${styles.decor} ${styles.decorBottom}`} aria-hidden />
        <span className={`${styles.decor} ${styles.decorCenter}`} aria-hidden />
        <img
          src="/logo/bia-bg.png"
          alt=""
          className={styles.bgImage}
          aria-hidden
        />
        <div className={styles.centerWrap}>
          <div className={styles.card}>
          <p className={styles.badge}>biaPathways</p>
          <h1 className={styles.title}>
            PowerPrint™ <span className={styles.titleAccent}>Career Assessment</span>
          </h1>
          <p className={styles.subtitle}>
            A structured career assessment that reveals how you’re wired for work. Get your personalized report and insights by biaPathways.
          </p>
          <Link href="/assessment" className={styles.cta}>
            Start Assessment
          </Link>
          <LookupReport />
        </div>
        </div>
      </main>
    </div>
  );
}
