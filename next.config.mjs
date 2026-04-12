/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Allow local /public directory images (default) — no external domains needed
    unoptimized: false,
  },
};

export default nextConfig;
