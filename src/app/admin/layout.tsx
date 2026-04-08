import Image from 'next/image';
import styles from './admin.module.css';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.adminRoot}>
      <header className={styles.adminHeader}>
        <div className={styles.adminHeaderInner}>
          <Image src="/logo/logo-transparent.png" alt="biaPathways" width={100} height={28} style={{ objectFit: 'contain' }} />
          <h1 className={styles.adminTitle}>Admin — PowerPrint™</h1>
        </div>
        <a href="/" className={styles.backLink}>← Back to app</a>
      </header>
      <div className={styles.adminContent}>
        {children}
      </div>
    </div>
  );
}
