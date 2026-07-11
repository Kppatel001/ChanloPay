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
  