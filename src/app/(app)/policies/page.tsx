
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FileText, ShieldCheck, Info, AlertCircle } from 'lucide-react';

export default function PoliciesPage() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/5">
      <Header pageTitle="Legal & Policies" />
      <main className="flex flex-1 flex-col gap-8 p-4 md:p-8 max-w-4xl mx-auto">
        
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-black tracking-tighter uppercase">Our Commitment to You</h2>
          <p className="text-muted-foreground font-medium">Transparency, Security, and Trust at every step.</p>
        </div>

        <Card className="border-none shadow-xl overflow-hidden rounded-2xl">
          <CardHeader className="bg-primary text-primary-foreground p-8">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-8 w-8" />
              <CardTitle className="text-2xl font-black text-white">Privacy Policy</CardTitle>
            </div>
            <CardDescription className="text-primary-foreground/80 font-medium">
              Last Updated: {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-8 leading-relaxed text-foreground/80">
            
            <section className="space-y-4">
              <h3 className="text-lg font-black text-primary uppercase flex items-center gap-2">
                <Info className="h-5 w-5" /> 1. Data Collection
              </h3>
              <p>
                To provide the ChanloPay service, we collect basic information during signup and event creation. This includes your <strong>Full Name, Email Address, Mobile Number,</strong> and <strong>UPI ID</strong>. We also record every transaction made to your events (Amount, Payer Name, Village) to maintain a transparent digital register.
              </p>
            </section>

            <section className="space-y-4">
              <h3 className="text-lg font-black text-primary uppercase flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" /> 2. Data Usage & Security
              </h3>
              <p>
                Your data is used strictly for event management, identity verification, and processing your withdrawal requests. We use industry-standard encryption and secure cloud infrastructure (Firebase) to protect your records. We do not sell your personal data to third parties.
              </p>
            </section>

            <section className="space-y-4">
              <h3 className="text-lg font-black text-primary uppercase flex items-center gap-2">
                <FileText className="h-5 w-5" /> 3. Terms of Service
              </h3>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Platform Fees:</strong> A 2% platform fee is deducted from the total collection of every event to cover operational costs.</li>
                <li><strong>Managed Escrow:</strong> All payments are collected into the ChanloPay platform account. Hosts can request withdrawals after the event is completed.</li>
                <li><strong>Verification Period:</strong> Withdrawal requests undergo a 48-72 hour review period for security and verification purposes.</li>
                <li><strong>Failed Payments:</strong> ChanloPay is not responsible for failed or incorrect payments made outside our verified guest portal.</li>
              </ul>
            </section>

            <section className="bg-muted p-6 rounded-xl border-l-8 border-destructive">
              <h3 className="text-sm font-black text-destructive uppercase mb-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" /> Disclaimer
              </h3>
              <p className="text-xs font-bold leading-tight">
                ChanloPay acts as a facilitator for digital gifts. While we ensure high security and transparency, users are advised to verify their bank account and UPI details accurately. Incorrect information may lead to delays or loss of funds during transfer.
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
