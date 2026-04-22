import type { SVGProps } from 'react';

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M8 12h.01" stroke="hsl(var(--accent))" />
      <path d="M12 12h.01" stroke="hsl(var(--accent))" />
      <path d="M16 12h.01" stroke="hsl(var(--accent))" />
      <path d="M17.5 7.5a4.5 4.5 0 1 0-9 0" />
      <path d="M8.5 7.5c0-2.73 1.5-5 3.5-5s3.5 2.27 3.5 5" />
      <path d="M4 12c0 4.42 3.58 8 8 8s8-3.58 8-8" />
    </svg>
  );
}