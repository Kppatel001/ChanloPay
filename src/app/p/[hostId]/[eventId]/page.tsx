'use client';

import { useState, use } from 'react';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CheckCircle2, User, Home, ArrowLeft, ChevronRight, ShieldAlert, Phone, Languages, ShieldCheck, CreditCard, Copy, Check, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Event, Host } from '@/lib/types';
import { Logo } from '@/components/icons';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { initiateSecureGuestPayment, finalizeGuestPayment } from '@/app/actions/api';

// CENTRALIZED PLATFORM COLLECTION UPI
const PLATFORM_UPI_ID = 'chanlopay@upi'; 

export default function GuestPaymentPage({ params }: { params: Promise<{ hostId: string; eventId: string }> }) {
  const resolvedParams = use(params);
  const firestore = useFirestore();
  const { toast } = useToast();

  const [guestName, setGuestName] = useState('');
  const [villageName, setVillageName] = useState('');
  const [mobile, setMobile] = useState('');
  const [amount, setAmount] = useState('');
  const [language, setLanguage] = useState<'en' | 'gu' | 'hi'>('en');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isFinalized, setIsFinalized] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const hostRef = useMemoFirebase(() => {
    return doc(firestore, `hosts/${resolvedParams.hostId}`);
  }, [firestore, resolvedParams.hostId]);
  
  const eventRef = useMemoFirebase(() => {
    return doc(firestore, `hosts/${resolvedParams.hostId}/events/${resolvedParams.eventId}`);
  }, [firestore, resolvedParams.hostId, resolvedParams.eventId]);

  const { data: hostProfile, isLoading: hostLoading } = useDoc<Host>(hostRef);
  const { data: eventData, isLoading: eventLoading } = useDoc<Event>(eventRef);

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) {
      toast({ variant: 'destructive', title: 'Name Required', description: 'Please enter your full name.' });
      return;
    }
    if (!villageName.trim()) {
      toast({ variant: 'destructive', title: 'Village Required', description: 'Please enter your village name.' });
      return;
    }
    if (mobile && !/^\d{10}$/.test(mobile)) {
      toast({ variant: 'destructive', title: 'Invalid Mobile', description: 'Please enter a valid 10-digit WhatsApp number.' });
      return;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast({ variant: 'destructive', title: 'Invalid Amount', description: 'Please enter a valid amount greater than 0.' });
      return;
    }
    setHasSubmitted(true);
  };

  const handleConfirmPayment = async () => {
    if (!guestName || !villageName || !amount || !eventData) return;

    setIsSubmitting(true);

    try {
      const transactionData = {
        hostId: resolvedParams.hostId,
        eventId: resolvedParams.eventId,
        name: guestName.trim(),
        village: villageName.trim(),
        mobile: mobile,
        amount: parseFloat(amount),
        paymentMethod: 'Razorpay' as const,
        type: 'Gift' as const,
        language: language
      };

      const order = await initiateSecureGuestPayment(transactionData);

      await finalizeGuestPayment(
        order.orderId,
        order.integrityHash,
        transactionData,
        eventData.eventName
      );

      setIsFinalized(true);
      toast({
        title: 'Payment Successful',
        description: mobile ? 'Your receipt has been sent to WhatsApp.' : 'Thank you for your contribution!',
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Security Alert',
        description: err.message || 'The secure firewall rejected the request.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(PLATFORM_UPI_ID);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (hostLoading || eventLoading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-2 text-sm text-muted-foreground font-body">Opening secure portal...</p>
      </div>
    );
  }

  if (!hostProfile || !eventData) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background p-4 text-center">
        <div className="mb-4 text-destructive">
            <Logo className="h-12 w-12" />
        </div>
        <h1 className="text-xl font-headline font-bold mb-2">Event Not Found</h1>
        <p className="text-muted-foreground font-body">This link might be invalid or the event has ended.</p>
      </div>
    );
  }

  const upiUri = `upi://pay?pa=${PLATFORM_UPI_ID}&pn=ChanloPay%20Central&am=${parseFloat(amount).toFixed(2)}&cu=INR`;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-md flex flex-col items-center">
        <div className="mb-8 flex items-center gap-2 text-primary">
          <Logo className="h-8 w-8" />
          <h1 className="font-headline text-2xl font-bold">ChanloPay</h1>
        </div>

        {isFinalized ? (
          <Card className="w-full shadow-lg border-primary/20 animate-in fade-in zoom-in duration-300">
            <CardHeader className="text-center">
              <div className="mx-auto bg-green-100 text-green-600 p-2 rounded-full w-fit mb-2">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <CardTitle className="font-headline text-xl">Payment Recorded!</CardTitle>
              <CardDescription className="font-body">
                ₹{amount} for <strong>{eventData.eventName}</strong> has been securely logged.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 px-3 py-1.5 rounded-full border border-green-100">
                <ShieldCheck className="h-3.5 w-3.5" />
                Firewall Verified Transaction
              </div>
              {mobile && (
                <div className="text-center p-3 bg-primary/5 rounded-lg border border-primary/10">
                   <p className="text-sm font-bold text-primary mb-1">WhatsApp Receipt Sent</p>
                   <p className="text-[11px] text-muted-foreground leading-tight">
                     A digital receipt has been sent to <strong>+91 {mobile}</strong>.
                   </p>
                </div>
              )}
              <Button variant="outline" className="w-full font-bold" onClick={() => window.location.reload()}>
                Make Another Payment
              </Button>
            </CardContent>
          </Card>
        ) : !hasSubmitted ? (
          <Card className="w-full shadow-lg border-primary/20">
            <CardHeader className="text-center">
              <CardTitle className="font-headline text-2xl">{eventData.eventName}</CardTitle>
              <CardDescription className="font-body">
                Hosted by <span className="font-semibold text-foreground">{hostProfile.name}</span>
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleNext}>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="guestName" className="font-body text-xs uppercase tracking-wider font-bold text-muted-foreground">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-primary" />
                    <Input id="guestName" placeholder="Enter full name" className="pl-10 h-12" value={guestName} onChange={(e) => setGuestName(e.target.value)} required />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="villageName" className="font-body text-xs uppercase tracking-wider font-bold text-muted-foreground">Village Name</Label>
                  <div className="relative">
                    <Home className="absolute left-3 top-3 h-4 w-4 text-primary" />
                    <Input id="villageName" placeholder="Enter village name" className="pl-10 h-12" value={villageName} onChange={(e) => setVillageName(e.target.value)} required />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="mobile" className="font-body text-xs uppercase tracking-wider font-bold text-muted-foreground">WhatsApp Number (For Receipt)</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-primary" />
                    <Input id="mobile" placeholder="10-digit number" className="pl-10 h-12" value={mobile} onChange={(e) => setMobile(e.target.value)} maxLength={10} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="amount" className="font-body text-xs uppercase tracking-wider font-bold text-muted-foreground">Amount (₹)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-3 text-primary font-bold">₹</span>
                      <Input id="amount" type="number" placeholder="501" className="pl-8 h-12 font-bold" value={amount} onChange={(e) => setAmount(e.target.value)} required />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="language" className="font-body text-xs uppercase tracking-wider font-bold text-muted-foreground">Language</Label>
                    <Select value={language} onValueChange={(v: any) => setLanguage(v)}>
                        <SelectTrigger className="h-12">
                            <Languages className="mr-2 h-4 w-4 text-primary" />
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="en">English</SelectItem>
                            <SelectItem value="gu">ગુજરાતી</SelectItem>
                            <SelectItem value="hi">हिन्दी</SelectItem>
                        </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                  <Button type="submit" className="w-full h-14 text-xl font-bold group">
                    Proceed to Pay
                    <ChevronRight className="ml-1 h-6 w-6 group-hover:translate-x-1 transition-transform" />
                  </Button>
              </CardFooter>
            </form>
          </Card>
        ) : (
          <Card className="w-full shadow-lg border-primary/20 animate-in fade-in zoom-in duration-300">
            <CardHeader className="text-center bg-primary/5 rounded-t-lg">
              <CardTitle className="font-headline text-xl">Confirm & Record</CardTitle>
              <CardDescription>
                Paying <span className="font-bold text-foreground">₹{amount}</span> for <strong>{eventData.eventName}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              
              <div className="space-y-4">
                <Button className="w-full h-16 text-lg font-bold shadow-md" onClick={handleConfirmPayment} disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <CreditCard className="mr-2 h-6 w-6" />}
                  Confirm & Finalize
                </Button>

                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                  <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Or Direct UPI</span></div>
                </div>

                <Button asChild variant="outline" className="w-full h-16 text-lg font-bold border-2">
                  <a href={upiUri}>
                    <ExternalLink className="mr-2 h-6 w-6" />
                    Open UPI App
                  </a>
                </Button>
              </div>

              <Alert variant="default" className="bg-amber-50 border-amber-200">
                <ShieldAlert className="h-5 w-5 text-amber-600" />
                <AlertTitle className="text-amber-900 text-sm font-bold">Security Block Info:</AlertTitle>
                <AlertDescription className="text-amber-800 text-[11px] mt-1 leading-tight">
                  If your app says <strong>"Declined for Security"</strong>, copy the ID below and pay manually in your app.
                </AlertDescription>
              </Alert>

              <div className="flex items-center gap-3 bg-white p-4 rounded-xl border-2 border-amber-100 shadow-sm">
                <div className="truncate flex-1">
                  <p className="text-[10px] text-muted-foreground font-bold mb-1">PLATFORM UPI ID FOR MANUAL PAY</p>
                  <p className="text-sm font-mono font-bold text-primary truncate">
                    {PLATFORM_UPI_ID}
                  </p>
                </div>
                <Button size="sm" className="h-10 gap-2 font-bold" onClick={handleCopyUpi}>
                  {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {isCopied ? "Copied" : "Copy"}
                </Button>
              </div>

              <div className="pt-4 text-center">
                <Button variant="ghost" className="text-xs text-muted-foreground" onClick={() => setHasSubmitted(false)}>
                  <ArrowLeft className="mr-2 h-3 w-3" />
                  Edit Details
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
