/** @type { import('pm2').StartOptions } */
module.exports = {
  apps: [
    {
      name: 'career-assessment',
      cwd: __dirname,
      script: 'node_modules/next/dist/bin/next',
      args: 'start -H 0.0.0.0 -p 3000',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: { NODE_ENV: 'production' },
      error_file: 'logs/err.log',
      out_file: 'logs/out.log',
    },
  ],
};
