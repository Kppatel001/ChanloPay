import type { Metadata } from 'next';
import { LegalPage, Section } from '@/components/legal-page';
import { ShieldCheck, Lock, KeyRound, ServerCog, Eye, AlertTriangle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Security · ChanloPay',
  description: 'How ChanloPay protects your events, payments and data.',
};

const measures = [
  { icon: KeyRound, title: 'Secure authentication', text: 'Hosts sign in with Firebase Authentication. Passwords are never stored by ChanloPay.' },
  { icon: Lock, title: 'Rule-enforced data access', text: 'Firestore security rules ensure each host can only ever read or edit their own events and records.' },
  { icon: ShieldCheck, title: 'Validated payment records', text: 'Every contribution is validated on the server (amount limits, field checks) before it can be saved, blocking malformed or tampered entries.' },
  { icon: ServerCog, title: 'Direct UPI, no card storage', text: 'Payments go straight to the host UPI ID through your bank-grade UPI app. ChanloPay never stores card or bank credentials.' },
  { icon: Eye, title: 'Hardened application layer', text: 'Strict security headers (CSP, HSTS, anti-clickjacking) and an edge firewall block common web attacks and automated probes.' },
  { icon: AlertTriangle, title: 'Fraud awareness', text: 'Optional AI-assisted analysis helps hosts spot unusual entries so the event ledger stays trustworthy.' },
];

export default function SecurityPage() {
  return (
    <LegalPage title="Security at ChanloPay" updated="July 2026">
      <p>
        ChanloPay is built to keep your celebrations and contributions safe. Security is layered
        across authentication, data access, the payment path and the application itself.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {measures.map((m) => (
          <div key={m.title} className="rounded-2xl border border-secondary/30 bg-card p-5 shadow-sm">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <m.icon className="h-5 w-5" />
            </div>
            <h3 className="font-headline text-base font-semibold">{m.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{m.text}</p>
          </div>
        ))}
      </div>

      <Section heading="How your payments are protected">
        <p>
          ChanloPay uses the UPI &quot;intent&quot; model: when a guest chooses to pay, their own bank-approved
          UPI app (GPay, PhonePe, Paytm, BHIM) completes the transfer directly to the host&apos;s UPI ID.
          The money never passes through ChanloPay, and no sensitive banking information is entered
          into or stored by the app.
        </p>
        <p>
          Contribution records saved in ChanloPay are protected by strict server-side rules: amounts
          are bounded, required fields are type-checked, and only the event host can read, edit or
          delete records. Guests can add their own entry but can never view or alter anyone else&apos;s.
        </p>
      </Section>

      <Section heading="Your responsibilities">
        <p>
          Keep your account password private and use a UPI ID you control. Always confirm the payment
          amount in your UPI app before approving. If you notice anything unusual on your dashboard,
          delete the record and contact support.
        </p>
      </Section>

      <Section heading="Reporting a vulnerability">
        <p>
          If you believe you have found a security issue, please report it responsibly by emailing the
          project maintainer. We appreciate disclosures that give us reasonable time to investigate and
          fix issues before they are made public.
        </p>
      </Section>
    </LegalPage>
  );
}
