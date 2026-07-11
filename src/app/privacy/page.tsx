import type { Metadata } from 'next';
import { LegalPage, Section } from '@/components/legal-page';

export const metadata: Metadata = {
  title: 'Privacy Policy · ChanloPay',
  description: 'How ChanloPay collects, uses and protects your information.',
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="July 2026">
      <p>
        This Privacy Policy explains how ChanloPay (&quot;we&quot;, &quot;us&quot;) collects, uses and
        safeguards information when you use the app as a host or a guest.
      </p>

      <Section heading="Information we collect">
        <p>
          <strong>Hosts:</strong> email address, and the profile details you provide (name, mobile
          number, UPI ID). <strong>Guests:</strong> the details entered on a payment page — name,
          village or city, and optionally mobile number, relationship and a blessing message, along
          with the contribution amount.
        </p>
      </Section>

      <Section heading="How we use information">
        <p>
          Information is used solely to operate the service: authenticating hosts, generating event
          payment pages and QR codes, recording contributions, and showing hosts their own analytics.
          We do not sell your data, and ChanloPay does not display third-party advertising.
        </p>
      </Section>

      <Section heading="Payments">
        <p>
          Payments are completed directly between the guest&apos;s UPI app and the host&apos;s UPI ID.
          ChanloPay does not process, receive or store card numbers, bank account numbers or UPI PINs.
          We store only the contribution record (name, amount, date and the optional details above).
        </p>
      </Section>

      <Section heading="Data storage and security">
        <p>
          Data is stored in Google Firebase (Firestore) and protected by security rules that restrict
          access to the owning host. See our <a href="/security" className="text-primary underline">Security</a> page
          for details on the safeguards in place.
        </p>
      </Section>

      <Section heading="Data retention and your choices">
        <p>
          Hosts can delete individual contribution records or entire events at any time, which removes
          the associated data. To delete your account and all associated data, contact support.
        </p>
      </Section>

      <Section heading="Children">
        <p>ChanloPay is intended for adults managing events and is not directed at children under 18.</p>
      </Section>

      <Section heading="Changes to this policy">
        <p>
          We may update this policy from time to time. Material changes will be reflected by the
          &quot;Last updated&quot; date above.
        </p>
      </Section>
    </LegalPage>
  );
}
