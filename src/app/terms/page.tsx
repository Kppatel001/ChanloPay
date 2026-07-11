import type { Metadata } from 'next';
import { LegalPage, Section } from '@/components/legal-page';

export const metadata: Metadata = {
  title: 'Terms of Service · ChanloPay',
  description: 'The terms governing your use of ChanloPay.',
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="July 2026">
      <p>
        By creating an account or using ChanloPay, you agree to these Terms. If you do not agree,
        please do not use the service.
      </p>

      <Section heading="1. The service">
        <p>
          ChanloPay helps hosts collect digital contributions (Chanlo / Shagun) for weddings and social
          events by generating UPI payment pages and QR codes and keeping a record of contributions.
        </p>
      </Section>

      <Section heading="2. Payments and settlement">
        <p>
          All payments are made directly through the UPI network between the guest&apos;s payment app and
          the host&apos;s UPI ID. ChanloPay is <strong>not</strong> a payment processor, bank, or escrow
          service, does not hold funds, and is not a party to any transaction. Any payment disputes,
          refunds or chargebacks are between the guest, the host and their respective banks/UPI apps.
        </p>
      </Section>

      <Section heading="3. Host responsibilities">
        <p>
          You are responsible for the accuracy of the UPI ID and event details you enter, for any taxes
          applicable to contributions you receive, and for complying with applicable laws. You must not
          use ChanloPay for unlawful, fraudulent or deceptive purposes.
        </p>
      </Section>

      <Section heading="4. Acceptable use">
        <p>
          You agree not to attempt to breach the app&apos;s security, disrupt the service, scrape data, or
          submit malicious or false records. We may suspend accounts that violate these Terms.
        </p>
      </Section>

      <Section heading="5. Records accuracy">
        <p>
          Contribution records may be created by guests or entered manually by hosts and are provided
          for convenience. ChanloPay does not independently verify that every recorded payment was
          actually completed unless a verified payment provider is enabled.
        </p>
      </Section>

      <Section heading="6. Disclaimer and liability">
        <p>
          The service is provided &quot;as is&quot; without warranties of any kind. To the maximum extent
          permitted by law, ChanloPay is not liable for any indirect or consequential damages, or for
          losses arising from payment disputes, incorrect UPI details, or service interruptions.
        </p>
      </Section>

      <Section heading="7. Changes">
        <p>
          We may modify these Terms or the service at any time. Continued use after changes constitutes
          acceptance of the updated Terms.
        </p>
      </Section>
    </LegalPage>
  );
}
