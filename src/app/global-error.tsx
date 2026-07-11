'use client';

import { useEffect } from 'react';

/**
 * Last-resort boundary that catches errors thrown in the root layout itself.
 * It must render its own <html>/<body> because it replaces the root layout.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global application error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          textAlign: 'center',
          padding: '24px',
          margin: 0,
        }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>
          ChanloPay hit an unexpected error
        </h1>
        <p style={{ color: '#6b7280', marginBottom: 24, maxWidth: 420 }}>
          Please try again. If the problem continues, refresh the page.
        </p>
        <button
          onClick={() => reset()}
          style={{
            background: '#7B1E2B',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: 8,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
