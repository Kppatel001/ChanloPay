
'use client';

import { Header } from '@/components/layout/header';
import { useUser } from '@/firebase';
import { ShieldAlert, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function AdminPage() {
  const { user } = useUser();

  if (user?.email !== 'admin@chanlopay.com') {
    return (
      <div className="flex h-screen flex-col items-center justify-center p-4 text-center bg-muted/10">
        <ShieldAlert className="h-20 w-20 text-destructive mb-4 animate-pulse" />
        <h1 className="text-3xl font-black mb-2 uppercase tracking-tighter">Access Forbidden</h1>
        <p className="text-muted-foreground max-w-md font-medium">
          Only authorized platform administrators can access the system management.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/5">
      <Header pageTitle="System Admin" />
      <main className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-8">
        <div className="space-y-1">
          <h2 className="text-3xl font-black tracking-tighter">Platform Monitor</h2>
          <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Direct UPI Settlement Active</p>
        </div>

        <Card className="border-none shadow-xl rounded-2xl">
          <CardHeader className="bg-primary p-8 text-primary-foreground">
            <div className="flex items-center gap-3">
              <Info className="h-8 w-8" />
              <CardTitle className="text-xl">Settlement Notice</CardTitle>
            </div>
            <CardDescription className="text-primary-foreground/80 font-medium">
              ChanloPay is currently in Direct-to-Host mode.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <p className="text-muted-foreground leading-relaxed">
              In this mode, all guest payments are routed directly to the host's personal UPI ID. 
              The platform serves as a secure transaction ledger and WhatsApp receipt generator. 
              Manual payout processing is disabled as funds do not pass through the platform account.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
