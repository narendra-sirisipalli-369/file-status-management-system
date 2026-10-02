/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Allow local /public directory images (default) — no external domains needed
    unoptimized: false,
  },
  // pdfkit reads its built-in AFM font files via __dirname-relative fs calls —
  // webpack bundling breaks that path, so keep it outside the bundle.
  experimental: {
    serverComponentsExternalPackages: ['pdfkit'],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Clickjacking protection — this app is never meant to be framed.
          { key: 'X-Frame-Options', value: 'DENY' },
          // Stop browsers from MIME-sniffing responses into an executable type.
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Don't leak full URLs (which can carry tracking IDs) to other origins.
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
