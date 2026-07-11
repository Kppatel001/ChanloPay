import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    // Surface real type errors at build time instead of silently shipping them.
    ignoreBuildErrors: false,
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
      "script-src 'self' '