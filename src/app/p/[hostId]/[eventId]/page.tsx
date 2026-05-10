
'use client';

import { useState, use, useEffect } from 'react';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CheckCircle2, User, Home, ArrowLeft, ChevronRight, ShieldAlert, Phone, Languages, ShieldCheck, Sparkles, AlertCircle, ExternalLink, Copy, Check, QrCode, Maximize2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Event, Host } from '@/lib/types';
import { Logo } from '@/components/icons';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { initiateSecureGuestPayment, finalizeGuestPayment } from '@/app/actions/api';
import { cn } from '@/lib/utils';

const QUICK_AMOUNTS = [101, 501, 1001, 2101, 5001];

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
  const [isQrFullScreen, setIsQrFullScreen] = useState(false);

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
    if (eventData?.status === 'Completed') return;

    if (!guestName.trim()) {
      toast({ variant: 'destructive', title: 'Name Required', description: 'Please enter your full name.' });
      return;
    }
    if (!villageName.trim()) {
      toast({ variant: 'destructive', title: 'Village Required', description: 'Please enter your village name.' });
      return;
    }
    setHasSubmitted(true);
  };

  const handleOpenUpiApp = async () => {
    if (!guestName || !villageName || !amount || !eventData || !hostProfile?.upi) {
      toast({ variant: 'destructive', title: 'Payment Error', description: 'Host UPI ID is missing.' });
      return;
    }

    if (eventData.status === 'Completed') {
      toast({ variant: 'destructive', title: 'Event Closed', description: 'This event is no longer accepting payments.' });
      return;
    }

    setIsSubmitting(true);

    try {
      const transactionData = {
        hostId: resolvedParams.hostId,
        eventId: resolvedParams.eventId,
        name: guestName.trim(),
        village: villageName.trim(),
        mobile: mobile,
        amount: parseFloat(amount),
        paymentMethod: 'UPI' as const,
        type: 'Gift' as const,
        language: language
      };

      const order = await initiateSecureGuestPayment(transactionData);
      const upiUri = `upi://pay?pa=${hostProfile.upi}&pn=${encodeURIComponent(hostProfile.name || 'Event Host')}&tn=${encodeURIComponent(eventData.eventName)}&am=${parseFloat(amount).toFixed(2)}&cu=INR`;

      await finalizeGuestPayment(
        order.orderId,
        order.integrityHash,
        transactionData,
        eventData.eventName
      );

      window.location.href = upiUri;
      setIsFinalized(true);
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

  const getUpiQrUrl = () => {
    if (!hostProfile?.upi || !eventData) return null;
    const upiIntent = `upi://pay?pa=${hostProfile.upi}&pn=${encodeURIComponent(hostProfile.name || 'Host')}&tn=${encodeURIComponent(eventData.eventName)}&am=${parseFloat(amount || '0').toFixed(2)}&cu=INR`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(upiIntent)}`;
  };

  if (hostLoading || eventLoading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-[#FFF8E7] p-4">
        <Loader2 className="h-8 w-8 animate-spin text-[#7B1E2B]" />
        <p className="mt-2 text-sm text-muted-foreground font-body">Opening secure portal...</p>
      </div>
    );
  }

  if (!hostProfile || !eventData) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-[#FFF8E7] p-4 text-center">
        <Logo className="h-12 w-12 text-[#7B1E2B] mb-4" />
        <h1 className="text-xl font-headline font-bold mb-2">Event Not Found</h1>
        <p className="text-muted-foreground font-body">This link might be invalid or the event has ended.</p>
      </div>
    );
  }

  const isCompleted = eventData.status === 'Completed';

  return (
    <div className="min-h-screen bg-[#FFF8E7] p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-1 text-center">
          <Logo className="h-10 w-10 text-[#7B1E2B]" />
          <h1 className="font-headline text-3xl font-black text-[#7B1E2B] uppercase tracking-tighter">ChanloPay</h1>
        </div>

        {isCompleted && !isFinalized ? (
          <Card className="w-full shadow-2xl border-none">
            <CardHeader className="text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <CardTitle className="font-headline text-2xl text-destructive">Registry Closed</CardTitle>
              <CardDescription>
                <strong>{eventData.eventName}</strong> is no longer accepting digital shagun.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button variant="outline" className="w-full h-12" onClick={() => window.history.back()}>Go Back</Button>
            </CardFooter>
          </Card>
        ) : isFinalized ? (
          <Card className="w-full shadow-2xl border-none animate-in fade-in zoom-in duration-300">
            <CardHeader className="text-center">
              <div className="mx-auto bg-green-100 text-green-600 p-4 rounded-full w-fit mb-4">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <CardTitle className="font-headline text-2xl">Payment Logged!</CardTitle>
              <CardDescription>
                ₹{amount} for <strong>{eventData.eventName}</strong> has been securely recorded.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 flex items-center gap-3">
                 <ShieldCheck className="h-6 w-6 text-primary" />
                 <p className="text-xs font-bold leading-tight">Your verified digital record is now part of the event ledger.</p>
               </div>
               <Button className="w-full h-14 text-lg font-bold bg-[#1A237E] hover:bg-[#1A237E]/90" onClick={() => window.location.reload()}>
                 Make Another Payment
               </Button>
            </CardContent>
          </Card>
        ) : !hasSubmitted ? (
          <Card className="w-full shadow-2xl border-none">
            <CardHeader className="text-center pb-2">
              <CardTitle className="font-headline text-2xl text-[#7B1E2B]">{eventData.eventName}</CardTitle>
              <CardDescription>Hosted by {hostProfile.name}</CardDescription>
            </CardHeader>
            <form onSubmit={handleNext}>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#7B1E2B]" />
                    <Input placeholder="Enter your full name" className="pl-10 h-14 text-base bg-muted/20 border-none" value={guestName} onChange={(e) => setGuestName(e.target.value)} required />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Village Name</Label>
                  <div className="relative">
                    <Home className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#7B1E2B]" />
                    <Input placeholder="Enter your village" className="pl-10 h-14 text-base bg-muted/20 border-none" value={villageName} onChange={(e) => setVillageName(e.target.value)} required />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Mobile (Optional for Receipt)</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#7B1E2B]" />
                    <Input placeholder="10-digit number" className="pl-10 h-14 text-base bg-muted/20 border-none" value={mobile} onChange={(e) => setMobile(e.target.value)} maxLength={10} />
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full h-16 text-xl font-bold bg-[#1A237E] hover:bg-[#1A237E]/90 group">
                  Continue to Pay
                  <ChevronRight className="ml-2 h-6 w-6 group-hover:translate-x-1 transition-transform" />
                </Button>
              </CardFooter>
            </form>
          </Card>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center space-y-1">
              <h2 className="font-headline text-3xl font-black text-[#7B1E2B] uppercase">{eventData.eventName}</h2>
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Hosted by {hostProfile.name}</p>
            </div>

            <Card className="w-full shadow-2xl border-none overflow-hidden bg-white">
              <div className="p-8 flex flex-col items-center gap-6">
                <div 
                  className="bg-white p-4 rounded-3xl shadow-xl border-4 border-[#7B1E2B]/5 relative group cursor-pointer"
                  onClick={() => setIsQrFullScreen(true)}
                >
                  {getUpiQrUrl() && (
                    <img src={getUpiQrUrl()!} alt="Payment QR" className="w-64 h-64 md:w-72 md:h-72 object-contain" />
                  )}
                  <div className="absolute inset-0 bg-white/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl">
                    <Maximize2 className="h-8 w-8 text-[#7B1E2B]" />
                  </div>
                </div>

                <div className="text-center space-y-1">
                   <p className="text-sm font-black text-[#7B1E2B]">Scan & Pay with Any UPI App</p>
                   <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">Supported: GPay • PhonePe • Paytm • BHIM</p>
                </div>

                <div className="w-full space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    {QUICK_AMOUNTS.slice(0, 3).map((q) => (
                      <Button 
                        key={q} 
                        variant={amount === q.toString() ? 'default' : 'outline'} 
                        className={cn("h-12 font-black text-lg", amount === q.toString() ? "bg-[#D4AF37] text-white border-none" : "border-[#D4AF37]/20 text-[#7B1E2B]")}
                        onClick={() => setAmount(q.toString())}
                      >
                        ₹{q}
                      </Button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                     <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-[#7B1E2B]">₹</span>
                        <Input 
                          placeholder="Other" 
                          type="number" 
                          className="pl-7 h-12 font-black bg-muted/20 border-none" 
                          value={amount} 
                          onChange={(e) => setAmount(e.target.value)} 
                        />
                     </div>
                     <Select value={language} onValueChange={(v: any) => setLanguage(v)}>
                        <SelectTrigger className="h-12 font-bold border-none bg-muted/20">
                           <Languages className="mr-2 h-4 w-4 text-[#7B1E2B]" />
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

                <Button className="w-full h-16 text-xl font-black bg-[#1A237E] hover:bg-[#1A237E]/90 shadow-xl shadow-blue-900/20" onClick={handleOpenUpiApp} disabled={isSubmitting || !amount}>
                  {isSubmitting ? <Loader2 className="h-6 w-6 animate-spin mr-2" /> : <ExternalLink className="h-6 w-6 mr-2" />}
                  PAY NOW
                </Button>
              </div>
            </Card>

            <div className="text-center">
              <Button variant="ghost" size="sm" className="text-muted-foreground font-bold" onClick={() => setHasSubmitted(false)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Change Details
              </Button>
            </div>
          </div>
        )}
      </div>

      {isQrFullScreen && (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center p-8 animate-in fade-in duration-300">
           <Button variant="ghost" className="absolute top-4 right-4 h-12 w-12 rounded-full" onClick={() => setIsQrFullScreen(false)}>
             <ArrowLeft className="h-8 w-8" />
           </Button>
           <h2 className="text-4xl font-black text-[#7B1E2B] uppercase mb-8">{eventData.eventName}</h2>
           <div className="bg-white p-4 rounded-[3rem] shadow-2xl border-8 border-[#7B1E2B]/5">
              {getUpiQrUrl() && (
                <img src={getUpiQrUrl()!} alt="Big QR" className="w-[80vw] h-[80vw] max-w-[500px] max-h-[500px]" />
              )}
           </div>
           <p className="mt-8 text-2xl font-black text-[#7B1E2B]">SCAN TO PAY SHAGUN</p>
        </div>
      )}
    </div>
  );
}
