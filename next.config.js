/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // OneDrive / cloud-synced folders often break native file watchers; polling keeps `next dev` from hanging at "Starting…"
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }
    return config;
  },
};

module.exports = nextConfig;