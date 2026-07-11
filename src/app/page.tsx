'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/icons';
import {
  QrCode,
  ShieldCheck,
  Wallet,
  FileDown,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

const features = [
  {
    icon: QrCode,
    title: 'One QR for every guest',
    description:
      'Create an event and share a single permanent QR. Any number of guests can scan and pay — no per-guest setup.',
  },
  {
    icon: Wallet,
    title: 'Direct UPI payments',
    description:
      'Money goes straight to your UPI ID via GPay, PhonePe, Paytm or BHIM. Fast, cashless and transparent.',
  },
  {
    icon: FileDown,
    title: 'Digital records & exports',
    description:
      'Every contribution is recorded with name and village. Export the full guest list to PDF or Excel anytime.',
  },
  {
    icon: ShieldCheck,
    title: 'Fraud checks built in',
    description:
      'Optional AI-assisted analysis helps you spot unusual entries so your event ledger stays trustworthy.',
  },
];

export default function Home() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && user) {
      router.replace('/dashboard');
    }
  }, [user, isUserLoading, router]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm md:px-8">
        <div className="flex items-center gap-2 text-primary">
          <Logo className="h-7 w-7" />
          <span className="font-headline text-xl font-bold">ChanloPay</span>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild>
            <Link href="/signup">Get started</Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="mx-auto max-w-5xl px-4 py-16 text-center md:py-24">
          <div className="mx-auto mb-6 flex w-fit items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Smart digital Chanlo collection
          </div>
          <h1 className="font-headline text-4xl font-bold leading-tight md:text-6xl">
            Collect wedding <span className="text-primary">Shagun</span> the
            modern way
          </h1>
          <p className="mx-auto mt-6 max-w-2xl font-body text-lg text-muted-foreground">
            ChanloPay turns cash-heavy wedding gifting into a clean, cashless
            experience. Create an event, share one QR, and let guests pay
            securely over UPI while you keep a perfect digital record.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-12 px-8 text-base font-bold">
              <Link href="/signup">
                Create your event
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 px-8 text-base font-bold">
              <Link href="/login">I already have an account</Link>
            </Button>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-5xl px-4 pb-20">
          <div className="grid gap-6 sm:grid-cols-2">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-primary/10 bg-card p-6 shadow-sm transition-colors hover:border-primary/30"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="font-headline text-lg font-bold">{f.title}</h3>
                <p className="mt-2 font-body text-sm leading-relaxed text-muted-foreground">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="border-t bg-muted/30">
          <div className="mx-auto max-w-5xl px-4 py-16">
            <h2 className="text-center font-headline text-2xl font-bold md:text-3xl">
              Three steps to go cashless
            </h2>
            <div className="mt-10 grid gap-8 sm:grid-cols-3">
              {[
                { n: 1, t: 'Add your UPI', d: 'Sign up and enter your UPI ID once in Settings.' },
                { n: 2, t: 'Create an event', d: 'Generate a permanent QR code for your wedding or function.' },
                { n: 3, t: 'Share & collect', d: 'Guests scan, pay, and every contribution is recorded for you.' },
              ].map((s) => (
                <div key={s.n} className="text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                    {s.n}
                  </div>
                  <h3 className="mt-4 font-headline text-lg font-bold">{s.t}</h3>
                  <p className="mt-2 font-body text-sm text-muted-foreground">{s.d}</p>
                </div>
              ))}
            </div>
            <div className="mt-12 text-center">
              <Button asChild size="lg" className="h-12 px-8 text-base font-bold">
                <Link href="/signup">Get started free</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-6">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-4 text-sm text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <Logo className="h-5 w-5 text-primary" />
            <span className="font-semibold">ChanloPay</span>
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1">
            <Link href="/security" className="hover:text-primary">Security</Link>
            <Link href="/privacy" className="hover:text-primary">Privacy</Link>
            <Link href="/terms" className="hover:text-primary">Terms</Link>
          </nav>
          <p className="text-center">Secure digital gifting for weddings &amp; social events.</p>
        </div>
      </footer>
    </div>
  );
}
