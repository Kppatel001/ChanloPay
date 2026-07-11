
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FileText, ShieldCheck, Info, AlertCircle, Mail, Globe, Lock } from 'lucide-react';

export default function PoliciesPage() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/5">
      <Header pageTitle="Privacy & Terms" />
      <main className="flex flex-1 flex-col gap-8 p-4 md:p-8 max-w-4xl mx-auto">
        
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-black tracking-tighter uppercase">Transparency & Trust</h2>
          <p className="text-muted-foreground font-medium">How ChanloPay manages your data and digital gifts.</p>
        </div>

        <Card className="border-none shadow-xl overflow-hidden rounded-2xl">
          <CardHeader className="bg-primary text-primary-foreground p-8">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-8 w-8" />
              <CardTitle className="text-2xl font-black text-white">Platform Policies</CardTitle>
            </div>
            <CardDescription className="text-primary-foreground/80 font-medium">
              Effective Date: {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-10 leading-relaxed text-foreground/80">
            
            <section className="space-y-4">
              <h3 className="text-lg font-black text-primary uppercase flex items-center gap-2">
                <Info className="h-5 w-5" /> 1. Information We Collect
              </h3>
              <p>
                To provide our digital registry services, we collect:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-sm">
                <li><strong>Identity Data:</strong> Full name and email address provided during signup.</li>
                <li><strong>Contact & Payout Data:</strong> Mobile number and UPI ID for secure settlement of your funds.</li>
                <li><strong>Transaction Records:</strong> Name, village, amount, and timestamp for every payment made to your events.</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h3 className="text-lg font-black text-primary uppercase flex items-center gap-2">
                <Lock className="h-5 w-5" /> 2. Data Usage & Protection
              </h3>
              <p>
                Your data is used strictly for identity verification, transaction tracking, and processing withdrawal requests. We employ industry-standard encryption through Google Firebase to ensure your event records remain private and secure. <strong>We do not sell your personal data to advertisers.</strong>
              </p>
            </section>

            <section className="space-y-4">
              <h3 className="text-lg font-black text-primary uppercase flex items-center gap-2">
                <Globe className="h-5 w-5" /> 3. Payment & Fee Policy
              </h3>
              <p>
                ChanloPay acts as a centralized digital ledger. 
              </p>
              <ul className="list-disc pl-5 space-y-2 text-sm font-medium">
                <li>Payments are collected by the platform to ensure every "Shagun" is recorded and acknowledged with a receipt.</li>
                <li>A <strong>2% platform fee</strong> is deducted from the total collection to cover WhatsApp costs, security, and hosting.</li>
                <li>Funds are settled to the Host's Bank Account/UPI ID only after a verification period (48-72 hours) to prevent fraud.</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h3 className="text-lg font-black text-primary uppercase flex items-center gap-2">
                <AlertCircle className="h-5 w-5" /> 4. Limitations & User Responsibility
              </h3>
              <p>
                As a Host, you are responsible for providing accurate UPI details. ChanloPay is <strong>not liable</strong> for:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-sm">
                <li>Loss of funds due to incorrect UPI IDs entered by the Host.</li>
                <li>Failed payments or cash transactions not recorded through the platform portal.</li>
                <li>Misuse of the "Manual Entry" feature for logging fake or non-existent payments.</li>
              </ul>
            </section>

            <section className="bg-primary/5 p-6 rounded-xl border border-primary/20">
              <h3 className="text-sm font-black text-primary uppercase mb-3 flex items-center gap-2">
                <Mail className="h-4 w-4" /> Support & Contact
              </h3>
              <p className="text-xs font-medium">
                If you have questions regarding these policies or a specific transaction, please reach out to our team at <strong>support@chanlopay.com</strong>.
              </p>
            </section>

          </CardContent>
        </Card>

        <div className="text-center py-8">
          <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">
            © {new Date().getFullYear()} ChanloPay Secure Event Registry. All Rights Reserved.
          </p>
        </div>
      </main>
    </div>
  );
}
