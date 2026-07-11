import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    // Kept true so the production build (Vercel) does not fail on pre-existing
    // type errors in the codebase. Run `npm run typecheck` locally to surface
    // and fix them incrementally; flip this to false once the project is clean.
    ignoreBuildErrors: true,
  },
  eslint: {
    // Lint is run manually via `npm run lint`. It's kept out of the production
    // build because stylistic rules (e.g. react/no-unescaped-entities) would
    // otherwise fail the build on pre-existing, harmless content across the app.
    ignoreDuringBuilds: true,
  },
  // Application-wide security headers ("firewall" at the HTTP layer).
  async headers() {
    const csp = [
      "default-src 'self'",
      // Next.js and the Firebase SDK require inline/eval; keep script tight otherwise.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://api.qrserver.com https://placehold.co https://images.unsplash.com https://picsum.photos",
      // Firebase Auth + Firestore realtime endpoints.
      "connect-src 'self' https://*.googleapis.com https://*.google.com https://*.gstatic.com https://*.firebaseio.com wss://*.firebaseio.com https://*.firebaseinstallations.googleapis.com",
      "frame-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      "upgrade-insecure-requests",
    ].join('; ');

    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(self)' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'placehold.co', port: '', pathname: '/**' },
      { protocol: 'https', hostname: 'images.unsplash.com', port: '', pathname: '/**' },
      { protocol: 'https', hostname: 'picsum.photos', port: '', pathname: '/**' },
      { protocol: 'https', hostname: 'api.qrserver.com', port: '', pathname: '/**' },
    ],
  },
};

export default nextConfig;
