
'use client';

import { useState, use, useEffect } from 'react';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CheckCircle2, User, Home, Phone, Languages, ShieldCheck, Sparkles, Wallet, X, ArrowRight, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Event, Host } from '@/lib/types';
import { Logo } from '@/components/icons';
import { initiateSecureGuestPayment, finalizeGuestPayment } from '@/app/actions/api';
import { cn } from '@/lib/utils';

const QUICK_AMOUNTS = [101, 501, 1001, 2101, 5001];

type FlowStep = 'details' | 'confirm' | 'success';

export default function GuestPaymentPage({ params }: { params: Promise<{ hostId: string; eventId: string }> }) {
  const resolvedParams = use(params);
  const firestore = useFirestore();
  const { toast } = useToast();

  // Flow State
  const [step, setStep] = useState<FlowStep>('details');
  
  // Guest Details
  const [guestName, setGuestName] = useState('');
  const [villageName, setVillageName] = useState('');
  const [mobile, setMobile] = useState('');
  const [amount, setAmount] = useState('501');
  const [language, setLanguage] = useState<'en' | 'gu' | 'hi'>('en');
  
  // Processing State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receiptId, setReceiptId] = useState<string | null>(null);

  const hostRef = useMemoFirebase(() => {
    return doc(firestore, `hosts/${resolvedParams.hostId}`);
  }, [firestore, resolvedParams.hostId]);
  
  const eventRef = useMemoFirebase(() => {
    return doc(firestore, `hosts/${resolvedParams.hostId}/events/${resolvedParams.eventId}`);
  }, [firestore, resolvedParams.hostId, resolvedParams.eventId]);

  const { data: hostProfile, isLoading: hostLoading } = useDoc<Host>(hostRef);
  const { data: eventData, isLoading: eventLoading } = useDoc<Event>(eventRef);

  const handleContinueToPay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim() || !amount || parseFloat(amount) <= 0) {
      toast({ variant: 'destructive', title: 'Missing Details', description: 'Please enter your name and shagun amount.' });
      return;
    }

    if (!hostProfile?.upi) {
      toast({ variant: 'destructive', title: 'Setup Incomplete', description: 'The host has not set up their UPI ID yet.' });
      return;
    }

    // Construct UPI Deep Link
    const upiUri = `upi://pay?pa=${hostProfile.upi}&pn=${encodeURIComponent(hostProfile.name || 'Event Host')}&tn=${encodeURIComponent(eventData?.eventName || 'Shagun')}&am=${parseFloat(amount).toFixed(2)}&cu=INR`;

    // Attempt to open UPI App
    window.location.href = upiUri;
    
    // Move to confirmation step
    setStep('confirm');
  };

  const handleFinalizeRecord = async () => {
    setIsSubmitting(true);
    try {
      const transactionData = {
        hostId: resolvedParams.hostId,
        eventId: resolvedParams.eventId,
        name: guestName.trim(),
        village: villageName.trim() || 'N/A',
        mobile: mobile,
        amount: parseFloat(amount),
        paymentMethod: 'UPI' as const,
        type: 'Gift' as const,
        language: language,
      };

      // 1. Secure handshake
      const order = await initiateSecureGuestPayment(transactionData);
      
      // 2. Finalize and log in DB
      const result = await finalizeGuestPayment(
        order.orderId,
        order.integrityHash,
        transactionData,
        eventData!.eventName
      );

      setReceiptId(result.receiptId);
      setStep('success');
      toast({ title: "Gift Recorded", description: "Your payment has been logged successfully." });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (hostLoading || eventLoading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-[#FFF8E7] p-4">
        <Loader2 className="h-8 w-8 animate-spin text-[#7B1E2B]" />
        <p className="mt-2 text-sm text-muted-foreground font-bold">Opening Secure Portal...</p>
      </div>
    );
  }

  if (!hostProfile || !eventData) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-[#FFF8E7] p-4 text-center">
        <Logo className="h-12 w-12 text-[#7B1E2B] mb-4" />
        <h1 className="text-xl font-headline font-bold mb-2">Portal Unavailable</h1>
        <p className="text-muted-foreground">This event may have ended or the link is invalid.</p>
        <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF8E7] p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-md">
        
        {/* Header Section */}
        <div className="text-center space-y-1 mb-6">
          <Logo className="h-10 w-10 text-[#7B1E2B] mx-auto mb-2" />
          <h2 className="font-headline text-2xl md:text-3xl font-black text-[#7B1E2B] uppercase tracking-tighter">
            {eventData.eventName}
          </h2>
          <p className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-widest">
            Host: {hostProfile.name}
          </p>
        </div>

        {/* STEP 1: Details Entry */}
        {step === 'details' && (
          <Card className="w-full shadow-2xl border-none rounded-[2rem] overflow-hidden bg-white animate-in slide-in-from-bottom-4 duration-500">
            <CardHeader className="pb-2 text-center">
               <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-2 text-primary">
                 <Sparkles className="h-6 w-6" />
               </div>
               <CardTitle className="text-xl font-black text-[#7B1E2B] uppercase tracking-tighter">Guest Information</CardTitle>
               <CardDescription className="text-xs font-bold">Provide details before proceeding to pay.</CardDescription>
            </CardHeader>
            <form onSubmit={handleContinueToPay}>
              <CardContent className="space-y-5 py-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#7B1E2B]" />
                    <Input 
                      placeholder="Your Full Name" 
                      className="h-14 pl-12 text-base font-bold bg-muted/20 border-none rounded-2xl" 
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Village / City</Label>
                    <div className="relative">
                      <Home className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#7B1E2B]" />
                      <Input 
                        placeholder="Location" 
                        className="h-14 pl-12 text-base font-bold bg-muted/20 border-none rounded-2xl" 
                        value={villageName}
                        onChange={(e) => setVillageName(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Mobile (WA)</Label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#7B1E2B]" />
                      <Input 
                        placeholder="Mobile" 
                        className="h-14 pl-12 text-base font-bold bg-muted/20 border-none rounded-2xl" 
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value)}
                        maxLength={10}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Shagun Amount (₹)</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {QUICK_AMOUNTS.slice(0, 3).map((q) => (
                      <Button 
                        key={q} 
                        type="button"
                        variant={amount === q.toString() ? 'default' : 'outline'} 
                        className={cn("h-12 font-black rounded-xl text-lg", amount === q.toString() ? "bg-[#D4AF37] text-white border-none shadow-lg" : "border-[#D4AF37]/20 text-[#7B1E2B]")}
                        onClick={() => setAmount(q.toString())}
                      >
                        ₹{q}
                      </Button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-[#7B1E2B] text-lg">₹</span>
                      <Input 
                        placeholder="Custom" 
                        type="number" 
                        className="h-14 pl-8 text-lg font-black bg-muted/20 border-none rounded-2xl" 
                        value={amount} 
                        onChange={(e) => setAmount(e.target.value)}
                        required
                      />
                    </div>
                    <Select value={language} onValueChange={(v: any) => setLanguage(v)}>
                      <SelectTrigger className="w-[100px] h-14 font-bold border-none bg-muted/20 rounded-2xl">
                         <Languages className="mr-1 h-4 w-4 text-[#7B1E2B]" />
                         <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                         <SelectItem value="en">EN</SelectItem>
                         <SelectItem value="gu">GU</SelectItem>
                         <SelectItem value="hi">HI</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-2">
                <Button 
                  type="submit" 
                  className="w-full h-16 text-xl font-black bg-[#1A237E] hover:bg-[#1A237E]/90 text-white shadow-2xl shadow-blue-900/20 rounded-2xl group"
                >
                  CONTINUE TO PAY
                  <ArrowRight className="ml-2 h-6 w-6 group-hover:translate-x-1 transition-transform" />
                </Button>
              </CardFooter>
            </form>
          </Card>
        )}

        {/* STEP 2: Post-Payment Confirmation */}
        {step === 'confirm' && (
          <Card className="w-full shadow-2xl border-none p-8 text-center animate-in zoom-in duration-300 rounded-[2rem] bg-white">
            <div className="mx-auto bg-amber-100 text-amber-600 p-5 rounded-full w-fit mb-6">
              <Wallet className="h-12 w-12" />
            </div>
            <CardTitle className="text-2xl font-black text-[#7B1E2B] uppercase mb-2">Payment Completed?</CardTitle>
            <p className="text-sm font-medium text-muted-foreground mb-8">
              If you have finished the payment in GPay/PhonePe/Paytm, please click below to receive your receipt.
            </p>
            <div className="space-y-3">
              <Button 
                className="w-full h-16 text-xl font-black bg-success-green hover:bg-success-green/90 text-white rounded-2xl shadow-xl" 
                onClick={handleFinalizeRecord}
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="h-6 w-6 animate-spin" /> : 'YES, RECORD MY GIFT'}
              </Button>
              <Button 
                variant="outline" 
                className="w-full h-12 font-bold text-muted-foreground border-none hover:bg-muted" 
                onClick={() => setStep('details')}
              >
                NO, GO BACK
              </Button>
            </div>
          </Card>
        )}

        {/* STEP 3: Success Receipt */}
        {step === 'success' && (
          <Card className="w-full shadow-2xl border-none animate-in fade-in zoom-in duration-300 overflow-hidden rounded-[2rem] bg-white">
            <div className="bg-success-green/10 p-8 text-center border-b border-success-green/20">
              <div className="mx-auto bg-success-green text-white p-4 rounded-full w-fit mb-4 shadow-lg">
                <Check className="h-10 w-10" />
              </div>
              <CardTitle className="font-headline text-3xl text-success-green uppercase tracking-tighter">Dhanyavad!</CardTitle>
              <p className="text-sm font-bold text-muted-foreground mt-2">
                Your gift of ₹{amount} has been securely recorded for the host.
              </p>
            </div>
            <CardContent className="p-8 space-y-6">
               <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 flex items-center gap-3">
                 <ShieldCheck className="h-6 w-6 text-primary shrink-0" />
                 <div className="flex-1">
                    <p className="text-[10px] font-black uppercase text-muted-foreground">Receipt ID</p>
                    <p className="text-sm font-mono font-bold text-primary">{receiptId}</p>
                 </div>
               </div>
               <div className="text-center">
                  <p className="text-xs text-muted-foreground font-medium">A digital receipt has been triggered via WhatsApp.</p>
               </div>
               <Button className="w-full h-14 text-lg font-black bg-[#1A237E] hover:bg-[#1A237E]/90 text-white shadow-xl rounded-2xl" onClick={() => window.location.reload()}>
                 ANOTHER ENTRY
               </Button>
            </CardContent>
            <CardFooter className="justify-center pb-6">
               <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                 <ShieldCheck className="h-3 w-3" />
                 SECURE DIGITAL LEDGER
               </p>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
}
