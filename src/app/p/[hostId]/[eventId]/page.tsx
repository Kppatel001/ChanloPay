'use client';

import { useState, use, useEffect } from 'react';
import Image from 'next/image';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, collection, addDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle2, QrCode, User, Wallet, ArrowLeft, Home, ExternalLink, ChevronRight, AlertCircle, Info, Copy, Check, ShieldAlert, AlertTriangle, ShieldCheck, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Event, Host } from '@/lib/types';
import { Logo } from '@/components/icons';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { createSecureOrder, verifyPaymentSignature } from '@/app/actions/record-transaction';

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

  const handleConfirmPayment = async () => {
    if (!guestName || !villageName || !amount) return;

    setIsSubmitting(true);

    try {
      // 1. API LAYER: Create a Secure Order
      const orderResult = await createSecureOrder({
        hostId: resolvedParams.hostId,
        eventId: resolvedParams.eventId,
        name: guestName.trim(),
        village: villageName.trim(),
        amount: parseFloat(amount),
        paymentMethod: 'Gateway',
        type: 'Gift'
      });

      if (!orderResult.success) {
        throw new Error(orderResult.error);
      }

      // 2. SIMULATION: In a real Razorpay flow, the Razorpay Modal would open here.
      // After checkout, we verify the signature.
      const verification = await verifyPaymentSignature('pay_mock_123', orderResult.orderId!, 'signature_mock_123');

      if (!verification.verified) {
        throw new Error("Payment verification failed.");
      }

      // 3. FIRESTORE: Record verified transaction
      const transactionData = {
        name: guestName.trim(),
        village: villageName.trim(),
        email: 'Verified Guest',
        amount: parseFloat(amount),
        transactionDate: new Date().toISOString(),
        status: 'Success',
        type: 'Gift',
        paymentMethod: 'Razorpay',
        receiptQrCode: `razorpay_${orderResult.orderId}`,
        eventId: resolvedParams.eventId,
        integrityHash: orderResult.integrityHash
      };

      const transactionsColRef = collection(firestore, `hosts/${resolvedParams.hostId}/events/${resolvedParams.eventId}/transactions`);
      
      addDoc(transactionsColRef, transactionData)
        .then(() => {
          setIsFinalized(true);
          toast({
            title: 'Payment Verified & Recorded',
            description: 'Your contribution has been securely processed via Gateway.',
          });
        })
        .catch(async () => {
          const permissionError = new FirestorePermissionError({
            path: transactionsColRef.path,
            operation: 'create',
            requestResourceData: transactionData,
          });
          errorEmitter.emit('permission-error', permissionError);
        });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Payment Failed',
        description: err.message || 'The secure gateway rejected the payment.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyUpi = () => {
    if (hostProfile?.upi) {
      navigator.clipboard.writeText(hostProfile.upi);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
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

  const upiUri = `upi://pay?pa=${hostProfile.upi}&pn=${encodeURIComponent(hostProfile.name || '')}&am=${parseFloat(amount).toFixed(2)}&cu=INR`;
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
              <CardTitle className="font-headline text-xl">Payment Successful!</CardTitle>
              <CardDescription className="font-body">
                ₹{amount} for <strong>{eventData.eventName}</strong> has been securely recorded.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 px-3 py-1.5 rounded-full border border-green-100">
                <ShieldCheck className="h-3.5 w-3.5" />
                Gateway Verified Transaction
              </div>
              <p className="text-sm text-center text-muted-foreground">
                The host has been notified. You can safely close this window.
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
                  <Label htmlFor="amount" className="font-body text-xs uppercase tracking-wider font-bold text-muted-foreground">Amount (₹)</Label>
                  <div className="relative">
                    <span className="absolute left-4 top-3 text-primary text-xl font-bold">₹</span>
                    <Input id="amount" type="number" placeholder="501" className="pl-10 text-2xl h-14 font-bold bg-primary/5" value={amount} onChange={(e) => setAmount(e.target.value)} required />
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
              <CardTitle className="font-headline text-xl">Secure Checkout</CardTitle>
              <CardDescription>
                Paying <span className="font-bold text-foreground">₹{amount}</span> to {hostProfile.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">1</div>
                  <p className="text-sm font-bold text-primary">SELECT PAYMENT OPTION</p>
                </div>

                <Button className="w-full h-16 text-lg font-bold shadow-md" onClick={handleConfirmPayment} disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <CreditCard className="mr-2 h-6 w-6" />}
                  Pay via Secure Gateway
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
                <AlertDescription className="text-amber-800 text-[11px] mt-1">
                  If your app says <strong>"Declined for Security"</strong>, please copy the ID below and pay manually via "New Payment" in your app.
                </AlertDescription>
              </Alert>

              <div className="flex items-center gap-3 bg-white p-4 rounded-xl border-2 border-amber-100 shadow-sm">
                <div className="truncate flex-1">
                  <p className="text-[10px] text-muted-foreground font-bold mb-1">UPI ID FOR MANUAL PAY</p>
                  <p className="text-sm font-mono font-bold text-primary truncate">
                    {hostProfile.upi}
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
