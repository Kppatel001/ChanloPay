import { NextResponse, type NextRequest } from 'next/server';

/**
 * Lightweight edge "firewall" (WAF) for ChanloPay.
 *
 * It runs before every non-static request and blocks common automated probes
 * (secret files, admin panels of other stacks, path traversal, obvious
 * injection payloads in the URL). Application-level security headers are set in
 * next.config.ts; this layer adds request-level blocking and a marker header.
 *
 * This is a first line of defence only — the authoritative protections are the
 * Firestore security rules and Firebase Auth.
 */

// Paths that no legitimate ChanloPay client ever requests.
const BLOCKED_PATTERNS: RegExp[] = [
  /\/\.(env|git|hg|svn|aws|ssh)(\/|$)/i,   // secret/config files
  /\/wp-(admin|login|content|includes)/i,   // WordPress probes
  /\/(phpmyadmin|pma|adminer|xmlrpc\.php)/i, // db admin probes
  /\/vendor\/|\/node_modules\//i,            // internal dirs
  /\.(bak|old|sql|log|ini|conf|pem|key)(\?|$)/i, // sensitive extensions
  /(\.\.\/|\.\.%2f)/i,                        // path traversal
  /<script|onerror=|javascript:/i,           // reflected-XSS payloads in URL
  /(union(\s|%20)+select|sleep\(\d)/i,       // crude SQLi probes
];

export function middleware(request: NextRequest) {
  const url = decodeURIComponent(request.nextUrl.pathname + request.nextUrl.search);

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(url)) {
      return new NextResponse('Request blocked by ChanloPay firewall.', {
        status: 403,
        headers: { 'X-ChanloPay-Firewall': 'blocked' },
      });
    }
  }

  const res = NextResponse.next();
  res.headers.set('X-ChanloPay-Firewall', 'active');
  return res;
}

// Run on everything except Next internals and static assets.
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp)$).*)'],
};
