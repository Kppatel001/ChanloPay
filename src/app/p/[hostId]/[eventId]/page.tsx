
'use client';

import { useState, use, useEffect } from 'react';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CheckCircle2, User, Home, ArrowLeft, ChevronRight, ShieldAlert, Phone, Languages, ShieldCheck, Sparkles, AlertCircle, ExternalLink, Copy, Check, QrCode } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Event, Host } from '@/lib/types';
import { Logo } from '@/components/icons';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { initiateSecureGuestPayment, finalizeGuestPayment } from '@/app/actions/api';

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
  const [showQrAlt, setShowQrAlt] = useState(false);

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

  const handleCopyUpi = () => {
    if (!hostProfile?.upi) return;
    navigator.clipboard.writeText(hostProfile.upi);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const getUpiQrUrl = () => {
    if (!hostProfile?.upi || !eventData) return '';
    const upiIntent = `upi://pay?pa=${hostProfile.upi}&pn=${encodeURIComponent(hostProfile.name || 'Host')}&tn=${encodeURIComponent(eventData.eventName)}&am=${parseFloat(amount).toFixed(2)}&cu=INR`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(upiIntent)}`;
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

  const isCompleted = eventData.status === 'Completed';

  return (
    <div className="min-h-screen bg-background p-2 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-md flex flex-col items-center">
        <div className="mb-4 md:mb-8 flex items-center gap-2 text-primary">
          <Logo className="h-8 w-8" />
          <h1 className="font-headline text-2xl font-bold">ChanloPay</h1>
        </div>

        {isCompleted && !isFinalized ? (
          <Card className="w-full shadow-lg border-destructive/20 bg-destructive/5">
            <CardHeader className="text-center p-4 md:p-6">
              <div className="mx-auto bg-destructive/10 text-destructive p-3 rounded-full w-fit mb-2">
                <AlertCircle className="h-6 w-6 md:h-8 md:w-8" />
              </div>
              <CardTitle className="font-headline text-xl md:text-2xl text-destructive">Registry Closed</CardTitle>
              <CardDescription className="font-body text-xs md:text-sm">
                This event (<strong>{eventData.eventName}</strong>) is no longer accepting digital shagun.
              </CardDescription>
            </CardHeader>
            <CardFooter className="p-4">
              <Button variant="outline" className="w-full" onClick={() => window.history.back()}>Go Back</Button>
            </CardFooter>
          </Card>
        ) : isFinalized ? (
          <Card className="w-full shadow-lg border-primary/20 animate-in fade-in zoom-in duration-300">
            <CardHeader className="text-center p-4 md:p-6">
              <div className="mx-auto bg-green-100 text-green-600 p-2 rounded-full w-fit mb-2">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <CardTitle className="font-headline text-lg md:text-xl">Request Logged!</CardTitle>
              <CardDescription className="font-body text-xs md:text-sm">
                ₹{amount} for <strong>{eventData.eventName}</strong> has been securely logged.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4 p-4">
              <div className="flex items-center gap-2 text-[10px] md:text-xs text-green-700 bg-green-50 px-3 py-1.5 rounded-full border border-green-100">
                <ShieldCheck className="h-3.5 w-3.5" />
                Verified Digital Record Created
              </div>
              <Alert className="bg-primary/5 border-primary/10">
                <Sparkles className="h-4 w-4 text-primary shrink-0" />
                <AlertDescription className="text-[10px] md:text-xs leading-tight">
                  A WhatsApp receipt will be sent automatically to your mobile number shortly.
                </AlertDescription>
              </Alert>
              <Button variant="outline" className="w-full font-bold h-10 md:h-12" onClick={() => window.location.reload()}>
                Make Another Payment
              </Button>
            </CardContent>
          </Card>
        ) : !hasSubmitted ? (
          <Card className="w-full shadow-lg border-primary/20">
            <CardHeader className="text-center p-4 md:p-6">
              <CardTitle className="font-headline text-lg md:text-2xl truncate">{eventData.eventName}</CardTitle>
              <CardDescription className="font-body text-xs md:text-sm">
                Hosted by <span className="font-semibold text-foreground truncate">{hostProfile.name}</span>
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleNext}>
              <CardContent className="space-y-4 p-4 md:p-6">
                <div className="grid gap-2">
                  <Label htmlFor="guestName" className="font-body text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                    <Input id="guestName" placeholder="Enter full name" className="pl-10 h-10 md:h-12 text-sm" value={guestName} onChange={(e) => setGuestName(e.target.value)} required />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="villageName" className="font-body text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Village Name</Label>
                  <div className="relative">
                    <Home className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                    <Input id="villageName" placeholder="Enter village name" className="pl-10 h-10 md:h-12 text-sm" value={villageName} onChange={(e) => setVillageName(e.target.value)} required />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="mobile" className="font-body text-[10px] uppercase tracking-wider font-bold text-muted-foreground">WhatsApp Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                    <Input id="mobile" placeholder="10-digit number" className="pl-10 h-10 md:h-12 text-sm" value={mobile} onChange={(e) => setMobile(e.target.value)} maxLength={10} />
                  </div>
                </div>

                <div className="space-y-3">
                    <Label className="font-body text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Quick Amount (Shagun)</Label>
                    <div className="grid grid-cols-3 md:grid-cols-5 gap-1.5 md:gap-2">
                        {QUICK_AMOUNTS.map((q) => (
                            <Button 
                                key={q} 
                                type="button" 
                                variant={amount === q.toString() ? 'default' : 'outline'} 
                                className="h-8 md:h-10 text-[10px] md:text-xs font-bold px-1"
                                onClick={() => setAmount(q.toString())}
                            >
                                ₹{q}
                            </Button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="amount" className="font-body text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Other Amount (₹)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary font-bold text-sm">₹</span>
                      <Input id="amount" type="number" placeholder="Custom" className="pl-7 h-10 md:h-12 font-bold text-sm" value={amount} onChange={(e) => setAmount(e.target.value)} required />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="language" className="font-body text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Receipt Lang</Label>
                    <Select value={language} onValueChange={(v: any) => setLanguage(v)}>
                        <SelectTrigger className="h-10 md:h-12 text-sm">
                            <Languages className="mr-1 h-3 w-3 md:h-4 md:w-4 text-primary shrink-0" />
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
              <CardFooter className="p-4 md:p-6">
                  <Button type="submit" className="w-full h-12 md:h-14 text-lg md:text-xl font-bold group">
                    Proceed to Pay
                    <ChevronRight className="ml-1 h-5 w-5 md:h-6 md:w-6 group-hover:translate-x-1 transition-transform" />
                  </Button>
              </CardFooter>
            </form>
          </Card>
        ) : (
          <Card className="w-full shadow-lg border-primary/20 animate-in fade-in zoom-in duration-300">
            <CardHeader className="text-center bg-primary/5 rounded-t-lg p-4 md:p-6">
              <CardTitle className="font-headline text-lg md:text-xl">One-Tap Payment</CardTitle>
              <CardDescription className="text-xs md:text-sm">
                Paying <span className="font-bold text-foreground">₹{amount}</span> to <span className="font-bold truncate">{hostProfile.name}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 md:p-6 space-y-4 md:space-y-6">
              
              <div className="space-y-4">
                <Button className="w-full h-16 md:h-20 text-lg md:text-xl font-black shadow-xl shadow-primary/20 bg-primary hover:bg-primary/90 flex flex-col gap-0" onClick={handleOpenUpiApp} disabled={isSubmitting}>
                  <div className="flex items-center gap-2">
                    {isSubmitting ? <Loader2 className="h-5 w-5 md:h-6 md:w-6 animate-spin" /> : <ExternalLink className="h-5 w-5 md:h-6 md:w-6" />}
                    OPEN UPI APPS
                  </div>
                  <span className="text-[9px] md:text-[10px] font-medium opacity-80">(GPay, PhonePe, Paytm)</span>
                </Button>

                {!showQrAlt ? (
                  <Button variant="ghost" className="w-full text-xs font-bold text-muted-foreground" onClick={() => setShowQrAlt(true)}>
                    <QrCode className="mr-2 h-4 w-4" />
                    Show QR Code (to scan from other device)
                  </Button>
                ) : (
                  <div className="flex flex-col items-center gap-4 p-4 bg-muted/20 rounded-2xl animate-in slide-in-from-top duration-300">
                     <p className="text-[10px] font-bold uppercase text-muted-foreground">Scan with any UPI App</p>
                     <div className="bg-white p-2 rounded-xl border-4 border-primary/10">
                        <img src={getUpiQrUrl()} alt="Payment QR" className="w-48 h-48" />
                     </div>
                     <Button variant="ghost" size="sm" className="text-[10px]" onClick={() => setShowQrAlt(false)}>Hide QR Code</Button>
                  </div>
                )}

                <Alert className="bg-amber-50 border-amber-200 py-3">
                  <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
                  <AlertDescription className="text-[10px] md:text-[11px] text-amber-800 leading-tight">
                    Browser blocks direct app launch? Copy UPI ID below and pay in your app.
                  </AlertDescription>
                </Alert>

                <div className="flex items-center gap-2 bg-white p-3 rounded-xl border-2 border-amber-100 shadow-sm">
                  <div className="truncate flex-1">
                    <p className="text-[9px] text-muted-foreground font-bold mb-0.5 uppercase">Direct UPI ID</p>
                    <p className="text-xs font-mono font-bold text-primary truncate">
                      {hostProfile.upi}
                    </p>
                  </div>
                  <Button size="sm" className="h-8 gap-1 text-[10px] font-bold shrink-0" onClick={handleCopyUpi}>
                    {isCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {isCopied ? "Copied" : "Copy"}
                  </Button>
                </div>
              </div>

              <div className="text-center">
                <Button variant="ghost" size="sm" className="text-[10px] text-muted-foreground" onClick={() => setHasSubmitted(false)}>
                  <ArrowLeft className="mr-1.5 h-3 w-3" />
                  Back to Details
                </Button>
              </div>
            </CardContent>
            <CardFooter className="bg-muted/30 py-3 flex justify-center gap-1.5 text-center">
                <ShieldCheck className="h-3 w-3 text-primary" />
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Secure Tracking Enabled</span>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
}
