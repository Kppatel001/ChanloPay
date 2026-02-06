
'use client';

import { useState, use, useEffect } from 'react';
import Image from 'next/image';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, collection, addDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle2, QrCode, User, Wallet, ArrowLeft, Home, ExternalLink, ChevronRight, AlertCircle, Info, Copy, Check, ShieldAlert, AlertTriangle, ArrowRightCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Event, Host } from '@/lib/types';
import { Logo } from '@/components/icons';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function GuestPaymentPage({ params }: { params: Promise<{ hostId: string; eventId: string }> }) {
  const resolvedParams = use(params);
  const firestore = useFirestore();
  const { toast } = useToast();

  const [guestName, setGuestName] = useState('');
  const [villageName, setVillageName] = useState('');
  const [amount, setAmount] = useState('');
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
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast({ variant: 'destructive', title: 'Invalid Amount', description: 'Please enter a valid amount greater than 0.' });
      return;
    }
    setHasSubmitted(true);
  };

  const handleCopyUpi = () => {
    if (hostProfile?.upi) {
      navigator.clipboard.writeText(hostProfile.upi);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      toast({
        title: "UPI ID Copied",
        description: "Paste it in your payment app to bypass security blocks.",
      });
    }
  };

  const handleConfirmPayment = async () => {
    if (!guestName || !villageName || !amount) return;

    setIsSubmitting(true);

    const transactionData = {
      name: guestName.trim(),
      village: villageName.trim(),
      email: 'Guest',
      amount: parseFloat(amount),
      transactionDate: new Date().toISOString(),
      status: 'Success',
      type: 'Gift',
      paymentMethod: 'UPI',
      receiptQrCode: `guest_txn_${Date.now()}`,
      eventId: resolvedParams.eventId,
    };

    const transactionsColRef = collection(firestore, `hosts/${resolvedParams.hostId}/events/${resolvedParams.eventId}/transactions`);
    
    addDoc(transactionsColRef, transactionData)
      .then(() => {
        setIsFinalized(true);
        toast({
          title: 'Details Saved',
          description: 'Thank you! Your contribution record has been saved.',
        });
      })
      .catch(async (error) => {
        const permissionError = new FirestorePermissionError({
          path: transactionsColRef.path,
          operation: 'create',
          requestResourceData: transactionData,
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setIsSubmitting(false);
      });
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

  const isHostSetup = hostProfile.upi && hostProfile.name;

  if (!isHostSetup) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background p-4 text-center max-w-md mx-auto">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Host Setup Incomplete</AlertTitle>
          <AlertDescription>
            The host has not yet completed their payment setup. Please contact the event host.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const formattedAmount = parseFloat(amount).toFixed(2);
  // Using a cleaner UPI URI structure which is more compatible with modern GPay/PhonePe versions
  const upiUri = `upi://pay?pa=${hostProfile.upi}&pn=${encodeURIComponent(hostProfile.name || '')}&am=${formattedAmount}&cu=INR&tn=${encodeURIComponent('Wedding Gift')}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(upiUri)}`;

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
              <CardTitle className="font-headline text-xl">Thank You!</CardTitle>
              <CardDescription className="font-body">
                Your payment of <span className="font-bold text-foreground">₹{amount}</span> for <strong>{eventData.eventName}</strong> has been recorded.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <p className="text-sm text-center text-muted-foreground leading-relaxed">
                The host has been notified of your contribution. You can safely close this window.
              </p>
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
                    <Input
                      id="guestName"
                      placeholder="Enter your full name"
                      className="pl-10 font-body h-12 border-primary/20 focus:border-primary"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="villageName" className="font-body text-xs uppercase tracking-wider font-bold text-muted-foreground">Village Name</Label>
                  <div className="relative">
                    <Home className="absolute left-3 top-3 h-4 w-4 text-primary" />
                    <Input
                      id="villageName"
                      placeholder="Enter your village name"
                      className="pl-10 font-body h-12 border-primary/20 focus:border-primary"
                      value={villageName}
                      onChange={(e) => setVillageName(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="amount" className="font-body text-xs uppercase tracking-wider font-bold text-muted-foreground">Amount to Pay (₹)</Label>
                  <div className="relative">
                    <span className="absolute left-4 top-3.5 text-primary text-lg font-bold">₹</span>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="Enter amount"
                      className="pl-10 font-body text-2xl h-16 font-bold border-primary/30 focus:border-primary bg-primary/5"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                  <Button type="submit" className="w-full font-body font-bold h-14 text-xl shadow-md hover:shadow-lg transition-all group">
                    Next
                    <ChevronRight className="ml-1 h-6 w-6 group-hover:translate-x-1 transition-transform" />
                  </Button>
              </CardFooter>
            </form>
          </Card>
        ) : (
          <Card className="w-full shadow-lg border-primary/20 animate-in fade-in zoom-in duration-300">
            <CardHeader className="text-center bg-primary/5 rounded-t-lg">
              <CardTitle className="font-headline text-xl">Complete Payment</CardTitle>
              <CardDescription className="font-body">
                Paying <span className="font-bold text-foreground text-lg">₹{amount}</span> to {hostProfile.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center p-6">
              
              <div className="w-full space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">1</div>
                    <p className="text-sm font-bold uppercase tracking-tight text-primary">Click to Open UPI App</p>
                  </div>
                  <Button asChild className="w-full font-body font-bold h-16 text-xl shadow-lg bg-primary hover:bg-primary/90">
                    <a href={upiUri}>
                      <ExternalLink className="mr-2 h-6 w-6" />
                      Open GPay / PhonePe
                    </a>
                  </Button>
                </div>

                <div className="border-t-2 border-dashed border-muted-foreground/20 pt-6">
                  <div className="flex items-center gap-2 mb-4 text-amber-600">
                    <ShieldAlert className="h-5 w-5" />
                    <p className="text-xs font-bold uppercase">Payment Declined? (Bank Block)</p>
                  </div>
                  
                  <Alert variant="default" className="bg-amber-50 border-amber-200 mb-6 py-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                    <AlertTitle className="text-amber-900 text-sm font-bold italic">NPCI Security Bypass:</AlertTitle>
                    <AlertDescription className="text-amber-800 text-[11px] leading-relaxed mt-1 font-medium">
                      If your app says <strong>"Declined for Security Reasons"</strong>, please <strong>Copy the ID below</strong> and pay manually in your app (New Payment &gt; UPI ID).
                    </AlertDescription>
                  </Alert>

                  <div className="flex items-center gap-3 bg-white p-4 rounded-xl w-full justify-between border-2 border-amber-100 shadow-sm">
                    <div className="truncate flex-1">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Host UPI ID</p>
                      <p className="text-base font-mono font-bold text-primary truncate tracking-tight">
                        {hostProfile.upi}
                      </p>
                    </div>
                    <Button 
                      size="sm" 
                      className="h-12 gap-2 font-bold px-5 shadow-md shrink-0" 
                      onClick={handleCopyUpi}
                    >
                      {isCopied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                      {isCopied ? "Copied" : "Copy ID"}
                    </Button>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center py-6 border-t border-muted-foreground/10">
                   <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-4 font-bold">Alternative: Scan to Pay</p>
                   <div className="bg-white p-4 rounded-2xl border-2 border-primary/10 shadow-inner">
                    <Image
                      src={qrCodeUrl}
                      alt="Payment QR Code"
                      width={180}
                      height={180}
                      className="rounded-lg"
                    />
                  </div>
                  <p className="mt-3 text-[10px] text-primary font-bold bg-primary/5 px-3 py-1 rounded-full">Scan with Google Lens or any Camera</p>
                </div>

                <div className="space-y-4 border-t pt-6">
                  <div className="flex items-center gap-2">
                    <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">2</div>
                    <p className="text-sm font-bold uppercase tracking-tight text-primary">After Paying, Save your record</p>
                  </div>
                  <Button 
                    className="w-full font-body font-bold h-16 text-xl border-2 border-primary text-primary bg-primary/5 hover:bg-primary/10" 
                    variant="outline"
                    onClick={handleConfirmPayment}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <CheckCircle2 className="mr-2 h-6 w-6" />}
                    Confirm & Save Entry
                  </Button>
                </div>

                <div className="pt-4 text-center">
                  <Button 
                    variant="ghost" 
                    className="font-body text-xs text-muted-foreground hover:text-primary"
                    onClick={() => setHasSubmitted(false)}
                  >
                    <ArrowLeft className="mr-2 h-3 w-3" />
                    Go back to Edit Details
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
