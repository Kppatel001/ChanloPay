
'use client';

import { useState, use, useEffect } from 'react';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Loader2, 
  CheckCircle2, 
  User, 
  Home, 
  Phone, 
  Languages, 
  ShieldCheck, 
  Wallet, 
  X, 
  ArrowRight, 
  Check, 
  AlertCircle,
  MessageCircle,
  Share2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Event, Host } from '@/lib/types';
import { Logo } from '@/components/icons';
import { initiateSecureGuestPayment, finalizeGuestPayment } from '@/app/actions/api';
import { cn } from '@/lib/utils';

const QUICK_AMOUNTS = [101, 501, 1001, 2101];

type FlowStep = 'details' | 'processing' | 'success';

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
  
  // Internal State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [txnTime, setTxnTime] = useState<string>('');

  const hostRef = useMemoFirebase(() => {
    return doc(firestore, `hosts/${resolvedParams.hostId}`);
  }, [firestore, resolvedParams.hostId]);
  
  const eventRef = useMemoFirebase(() => {
    return doc(firestore, `hosts/${resolvedParams.hostId}/events/${resolvedParams.eventId}`);
  }, [firestore, resolvedParams.hostId, resolvedParams.eventId]);

  const { data: hostProfile, isLoading: hostLoading } = useDoc<Host>(hostRef);
  const { data: eventData, isLoading: eventLoading } = useDoc<Event>(eventRef);

  const validateForm = () => {
    if (!guestName.trim()) {
      toast({ variant: 'destructive', title: 'Name Required', description: 'Please enter your name for the registry.' });
      return false;
    }
    if (!amount || parseFloat(amount) <= 0) {
      toast({ variant: 'destructive', title: 'Invalid Amount', description: 'Please enter a valid shagun amount.' });
      return false;
    }
    if (!hostProfile?.upi) {
      toast({ variant: 'destructive', title: 'Payment Unavailable', description: 'Host has not configured their UPI ID yet.' });
      return false;
    }
    return true;
  };

  const handlePayNow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    
    // Construct UPI Deep Link
    const upiUri = `upi://pay?pa=${hostProfile!.upi}&pn=${encodeURIComponent(hostProfile!.name || 'Event Host')}&tn=${encodeURIComponent(eventData?.eventName || 'Shagun')}&am=${parseFloat(amount).toFixed(2)}&cu=INR`;

    // Attempt to open UPI App
    window.location.href = upiUri;
    
    // Move to processing/confirmation step
    setTimeout(() => {
        setStep('processing');
        setIsSubmitting(false);
    }, 1000);
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

      // 1. Finalize record in database
      const order = await initiateSecureGuestPayment(transactionData);
      const result = await finalizeGuestPayment(
        order.orderId,
        order.integrityHash,
        transactionData,
        eventData!.eventName
      );

      setReceiptId(result.receiptId);
      setTxnTime(new Date().toLocaleString());
      setStep('success');
      toast({ title: "Gift Recorded", description: "Thank you for your contribution!" });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (hostLoading || eventLoading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-[#FFF8E7] p-4">
        <Loader2 className="h-10 w-10 animate-spin text-[#7B1E2B]" />
        <p className="mt-4 text-xs font-black uppercase tracking-widest text-[#7B1E2B]/60">Secure Gateway Loading...</p>
      </div>
    );
  }

  if (!hostProfile || !eventData) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-[#FFF8E7] p-4 text-center">
        <Logo className="h-16 w-16 text-[#7B1E2B] mb-6" />
        <h1 className="text-2xl font-headline font-black mb-2 uppercase text-[#7B1E2B]">Portal Error</h1>
        <p className="text-muted-foreground text-sm font-medium max-w-xs">This event link is either invalid or the host profile is not properly set up.</p>
        <Button variant="outline" className="mt-8 border-[#7B1E2B] text-[#7B1E2B]" onClick={() => window.location.reload()}>Refresh Page</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF8E7] p-4 md:p-8 flex flex-col items-center font-body">
      <div className="w-full max-w-md">
        
        {/* TOP BRANDING SECTION */}
        <div className="text-center space-y-1 mb-8">
          <Logo className="h-12 w-12 text-[#7B1E2B] mx-auto mb-4" />
          <h2 className="font-headline text-3xl font-black text-[#7B1E2B] uppercase tracking-tighter leading-none">
            {eventData.eventName}
          </h2>
          <div className="flex items-center justify-center gap-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest">
            <span className="w-4 h-px bg-muted-foreground/30"></span>
            Hosted by: {hostProfile.name || 'Our Family'}
            <span className="w-4 h-px bg-muted-foreground/30"></span>
          </div>
        </div>

        {/* STEP 1: GUEST INFORMATION FORM */}
        {step === 'details' && (
          <Card className="w-full shadow-2xl border-none rounded-[2.5rem] overflow-hidden bg-white animate-in slide-in-from-bottom-8 duration-700">
            <CardHeader className="pb-2 text-center border-b bg-muted/5">
               <CardTitle className="text-xl font-black text-[#7B1E2B] uppercase tracking-tighter">Shagun Registry</CardTitle>
               <CardDescription className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Enter details to provide gift</CardDescription>
            </CardHeader>
            <form onSubmit={handlePayNow}>
              <CardContent className="space-y-6 py-10 px-8">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Guest Full Name</Label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#7B1E2B] group-focus-within:scale-110 transition-transform" />
                    <Input 
                      placeholder="Enter Name" 
                      className="h-16 pl-12 text-lg font-bold bg-muted/20 border-none rounded-2xl focus-visible:ring-2 focus-visible:ring-[#7B1E2B]/20 transition-all" 
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Village / City</Label>
                    <div className="relative group">
                      <Home className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#7B1E2B]" />
                      <Input 
                        placeholder="Location" 
                        className="h-16 pl-12 text-base font-bold bg-muted/20 border-none rounded-2xl" 
                        value={villageName}
                        onChange={(e) => setVillageName(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Mobile (WhatsApp)</Label>
                    <div className="relative group">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#7B1E2B]" />
                      <Input 
                        placeholder="10 Digits" 
                        className="h-16 pl-12 text-base font-bold bg-muted/20 border-none rounded-2xl" 
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value)}
                        maxLength={10}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Payment Amount (INR)</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {QUICK_AMOUNTS.map((q) => (
                      <Button 
                        key={q} 
                        type="button"
                        variant={amount === q.toString() ? 'default' : 'outline'} 
                        className={cn(
                            "h-12 font-black rounded-xl text-sm transition-all border-2", 
                            amount === q.toString() 
                                ? "bg-[#D4AF37] text-white border-none shadow-lg scale-105" 
                                : "border-[#D4AF37]/10 text-[#7B1E2B] hover:bg-[#D4AF37]/5"
                        )}
                        onClick={() => setAmount(q.toString())}
                      >
                        ₹{q}
                      </Button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1 group">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-[#7B1E2B] text-xl">₹</span>
                      <Input 
                        placeholder="Custom Amount" 
                        type="number" 
                        className="h-16 pl-10 text-xl font-black bg-muted/20 border-none rounded-2xl focus-visible:ring-2 focus-visible:ring-[#7B1E2B]/20" 
                        value={amount} 
                        onChange={(e) => setAmount(e.target.value)}
                        required
                      />
                    </div>
                    <Select value={language} onValueChange={(v: any) => setLanguage(v)}>
                      <SelectTrigger className="w-[80px] h-16 font-bold border-none bg-muted/20 rounded-2xl">
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
              <CardFooter className="pt-2 pb-10 px-8">
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full h-20 text-2xl font-black bg-[#1A237E] hover:bg-[#1A237E]/90 text-white shadow-2xl shadow-[#1A237E]/30 rounded-[1.5rem] group transition-all active:scale-95"
                >
                  {isSubmitting ? <Loader2 className="h-8 w-8 animate-spin" /> : (
                    <>
                        PAY NOW
                        <ArrowRight className="ml-3 h-7 w-7 group-hover:translate-x-2 transition-transform" />
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        )}

        {/* STEP 2: POST-PAYMENT CONFIRMATION */}
        {step === 'processing' && (
          <Card className="w-full shadow-2xl border-none p-12 text-center animate-in zoom-in duration-500 rounded-[2.5rem] bg-white">
            <div className="mx-auto bg-[#FFF8E7] text-[#D4AF37] p-8 rounded-full w-fit mb-10 border-4 border-white shadow-xl">
              <Wallet className="h-16 w-16" />
            </div>
            <CardTitle className="text-3xl font-black text-[#7B1E2B] uppercase tracking-tighter mb-4">Payment Finished?</CardTitle>
            <p className="text-sm font-medium text-muted-foreground mb-12 px-2 leading-relaxed">
              If you completed the payment in your UPI app, please confirm here to finalize your digital record.
            </p>
            <div className="space-y-4">
              <Button 
                className="w-full h-20 text-2xl font-black bg-success-green hover:bg-success-green/90 text-white rounded-[1.5rem] shadow-2xl shadow-success-green/20 transition-all active:scale-95" 
                onClick={handleFinalizeRecord}
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="h-8 w-8 animate-spin" /> : 'YES, RECORD MY GIFT'}
              </Button>
              <div className="flex flex-col gap-2 pt-4">
                <Button 
                    variant="ghost" 
                    className="w-full h-12 font-bold text-muted-foreground uppercase tracking-widest text-[10px]" 
                    onClick={() => setStep('details')}
                >
                    <ArrowRight className="h-4 w-4 mr-2 rotate-180" />
                    Edit Payment Details
                </Button>
                <Button 
                    variant="link" 
                    className="text-destructive font-black text-[10px] uppercase tracking-[0.2em]"
                    onClick={() => window.location.reload()}
                >
                    Cancel Transaction
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* STEP 3: SUCCESS RECEIPT */}
        {step === 'success' && (
          <Card className="w-full shadow-2xl border-none animate-in fade-in zoom-in duration-700 overflow-hidden rounded-[2.5rem] bg-white">
            <div className="bg-success-green/5 py-14 px-10 text-center border-b border-success-green/10 relative">
               <div className="absolute top-4 right-8 opacity-10">
                 <ShieldCheck className="h-32 w-32" />
               </div>
              <div className="mx-auto bg-success-green text-white p-6 rounded-full w-fit mb-8 shadow-2xl border-4 border-white">
                <Check className="h-14 w-14" />
              </div>
              <CardTitle className="font-headline text-5xl text-success-green uppercase tracking-tighter mb-3 leading-none">Dhanyavad!</CardTitle>
              <p className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.3em]">
                Verified Digital Shagun Record
              </p>
            </div>
            <CardContent className="p-10 space-y-10">
               <div className="space-y-6">
                    <div className="flex justify-between items-end border-b pb-4">
                        <div className="space-y-1">
                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Guest Name</p>
                            <p className="text-xl font-black text-foreground">{guestName}</p>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">{villageName}</p>
                        </div>
                        <div className="text-right space-y-1">
                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Paid Amount</p>
                            <p className="text-3xl font-black text-[#7B1E2B]">₹{amount}</p>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-muted/30 p-4 rounded-2xl space-y-1">
                            <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Receipt ID</p>
                            <p className="text-xs font-mono font-bold text-primary truncate">{receiptId}</p>
                        </div>
                        <div className="bg-muted/30 p-4 rounded-2xl space-y-1">
                            <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Timestamp</p>
                            <p className="text-xs font-bold truncate">{txnTime}</p>
                        </div>
                    </div>
               </div>

               <div className="space-y-3">
                    <Button 
                        className="w-full h-16 text-lg font-black bg-success-green hover:bg-success-green/90 text-white shadow-xl shadow-success-green/10 rounded-2xl group transition-all"
                        onClick={() => toast({ title: "Receipt Triggered", description: "Checking WhatsApp delivery..." })}
                    >
                        <MessageCircle className="mr-2 h-6 w-6 group-hover:scale-110 transition-transform" />
                        SEND WHATSAPP RECEIPT
                    </Button>
                    <Button 
                        variant="outline"
                        className="w-full h-14 text-sm font-black text-[#1A237E] border-[#1A237E]/20 rounded-2xl transition-all" 
                        onClick={() => window.location.reload()}
                    >
                        DONE
                    </Button>
               </div>
            </CardContent>
            <CardFooter className="justify-center pb-8 opacity-40">
               <div className="flex items-center gap-2 text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                 <ShieldCheck className="h-3 w-3" />
                 Secure Ledger System Verified
               </div>
            </CardFooter>
          </Card>
        )}
        
        {/* FOOTER INFO */}
        <div className="mt-12 text-center space-y-2 opacity-50">
            <div className="flex items-center justify-center gap-4 text-[9px] font-black uppercase tracking-[0.2em] text-[#7B1E2B]">
                <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> SSL Secured</span>
                <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> PCI Compliant</span>
            </div>
            <p className="text-[8px] font-bold text-muted-foreground uppercase">Powered by ChanloPay Secure Event Gateway</p>
        </div>
      </div>
    </div>
  );
}
