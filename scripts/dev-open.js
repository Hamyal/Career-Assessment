/**
 * Start Next.js dev server and open http://localhost:3000 in the default browser after a short delay.
 * Run: npm run dev:open  (or node scripts/dev-open.js)
 */
const { spawn } = require('child_process');
const { exec } = require('child_process');
const path = require('path');

const PORT = 3000;
const URL = `http://localhost:${PORT}`;
const DELAY_MS = 6000;

const isWindows = process.platform === 'win32';

const child = spawn(isWindows ? 'npm.cmd' : 'npm', ['run', 'dev'], {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit',
  shell: isWindows,
});

child.on('error', (err) => {
  console.error('Failed to start dev server:', err.message);
  process.exit(1);
});

setTimeout(() => {
  const openCmd = isWindows ? `start ${URL}` : `open ${URL}`;
  exec(openCmd, (err) => {
    if (err) console.warn('Could not open browser:', err.message);
    else console.log('Opened', URL);
  });
}, DELAY_MS);
