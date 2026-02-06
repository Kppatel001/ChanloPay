
'use client';

import { useState, use, useEffect } from 'react';
import Image from 'next/image';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, collection, addDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle2, QrCode, User, Wallet, ArrowLeft, Home, ExternalLink, ChevronRight, AlertCircle, Info, Copy, Check, ShieldAlert } from 'lucide-react';
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
        description: "Paste it in your payment app to complete the transfer.",
      });
    }
  };

  const handleConfirmPayment = async () => {
    if (!guestName || !amount) return;

    setIsSubmitting(true);

    const transactionData = {
      name: guestName.trim(),
      village: villageName.trim() || 'N/A',
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
          title: 'Payment Recorded',
          description: 'Thank you! Your contribution has been recorded in the event history.',
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

  // Critical check for host setup
  const isHostSetup = hostProfile.upi && hostProfile.name;

  if (!isHostSetup) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background p-4 text-center max-w-md mx-auto">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Host Setup Incomplete</AlertTitle>
          <AlertDescription>
            The host has not yet completed their payment setup. Please contact the event host to inform them.
          </AlertDescription>
        </Alert>
        <div className="mt-8 flex items-center gap-2 text-primary opacity-50">
          <Logo className="h-6 w-6" />
          <span className="font-headline text-lg font-bold">ChanloPay</span>
        </div>
      </div>
    );
  }

  // Simplified UPI URI to bypass strict app security filters
  const formattedAmount = parseFloat(amount).toFixed(2);
  const upiUri = `upi://pay?pa=${hostProfile.upi}&pn=${encodeURIComponent(hostProfile.name || '')}&am=${formattedAmount}&cu=INR`;
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
                Your payment of <span className="font-bold text-foreground">₹{amount}</span> for <strong>{eventData.eventName}</strong> has been successfully recorded.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <p className="text-sm text-center text-muted-foreground">
                The host has been notified of your contribution. You can now safely close this window.
              </p>
              <Button variant="outline" className="w-full" onClick={() => window.location.reload()}>
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
                  <Label htmlFor="guestName" className="font-body">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="guestName"
                      placeholder="Enter your full name"
                      className="pl-10 font-body h-12"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="villageName" className="font-body">Village Name</Label>
                  <div className="relative">
                    <Home className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="villageName"
                      placeholder="Enter your village (optional)"
                      className="pl-10 font-body h-12"
                      value={villageName}
                      onChange={(e) => setVillageName(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="amount" className="font-body">Amount to Pay (₹)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-3.5 text-muted-foreground text-sm font-medium">₹</span>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="Enter amount"
                      className="pl-8 font-body text-xl h-14 font-bold"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                  <Button type="submit" className="w-full font-body font-bold h-12 text-lg">
                    Next
                    <ChevronRight className="ml-2 h-5 w-5" />
                  </Button>
              </CardFooter>
            </form>
          </Card>
        ) : (
          <Card className="w-full shadow-lg border-primary/20 animate-in fade-in zoom-in duration-300">
            <CardHeader className="text-center">
              <CardTitle className="font-headline text-xl">Complete Payment</CardTitle>
              <CardDescription className="font-body">
                Amount: <span className="font-bold text-foreground text-lg">₹{amount}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <div className="bg-white p-4 rounded-xl border-2 border-primary/10 shadow-inner">
                <Image
                  src={qrCodeUrl}
                  alt="Payment QR Code"
                  width={220}
                  height={220}
                  className="rounded-md"
                />
              </div>

              <div className="mt-6 w-full space-y-4">
                <div className="space-y-2">
                  <p className="text-xs font-bold text-center uppercase tracking-tight text-muted-foreground">Option 1: Quick Pay</p>
                  <Button asChild className="w-full font-body font-bold h-14 text-lg bg-primary hover:bg-primary/90">
                    <a href={upiUri}>
                      <ExternalLink className="mr-2 h-5 w-5" />
                      Open UPI App
                    </a>
                  </Button>
                </div>

                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                  <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground font-bold">Or Manual Pay</span></div>
                </div>

                <div className="space-y-3">
                  <Alert variant="default" className="bg-amber-50 border-amber-200">
                    <ShieldAlert className="h-4 w-4 text-amber-600" />
                    <AlertTitle className="text-amber-800 text-[11px] font-bold">If "Security Error" appears:</AlertTitle>
                    <AlertDescription className="text-amber-700 text-[10px] leading-tight mt-1">
                      1. Copy the UPI ID below.<br />
                      2. Open GPay/PhonePe manually.<br />
                      3. Paste the ID & Pay ₹{amount}.
                    </AlertDescription>
                  </Alert>

                  <div className="flex items-center gap-2 bg-muted p-3 rounded-lg w-full justify-between border-2 border-dashed border-muted-foreground/20">
                    <div className="truncate">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Copy UPI ID</p>
                      <p className="text-xs font-mono font-bold text-primary truncate">
                        {hostProfile.upi}
                      </p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="secondary" 
                      className="h-10 gap-2 font-bold px-4" 
                      onClick={handleCopyUpi}
                    >
                      {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      {isCopied ? "Copied" : "Copy"}
                    </Button>
                  </div>
                </div>

                <div className="pt-4 space-y-3">
                  <Button 
                    className="w-full font-body font-bold h-14 text-lg border-2 border-primary text-primary" 
                    variant="outline"
                    onClick={handleConfirmPayment}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
                    Confirm & Save Details
                  </Button>

                  <Button 
                    variant="ghost" 
                    className="w-full font-body text-xs"
                    onClick={() => setHasSubmitted(false)}
                  >
                    <ArrowLeft className="mr-2 h-3 w-3" />
                    Change Amount / Name
                  </Button>
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-muted/30 pt-4 flex-col gap-2">
                <p className="text-[10px] text-center w-full text-muted-foreground font-body">
                    Your details will only be saved after you click <strong>Confirm</strong>.
                </p>
                <p className="text-[10px] text-center w-full text-muted-foreground font-bold uppercase tracking-widest">
                    Secure Wedding Registry
                </p>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
}
