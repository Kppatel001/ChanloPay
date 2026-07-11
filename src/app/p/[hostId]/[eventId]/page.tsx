'use client';

import { useState, use } from 'react';
import Image from 'next/image';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, collection, addDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Loader2, CheckCircle2, User, ArrowLeft, Home, ExternalLink, ChevronRight,
  AlertCircle, Copy, Check, ShieldAlert, AlertTriangle, Phone, Heart,
  Gift, Share2, MessageCircle, Sparkles,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Event, Host, TransactionDoc } from '@/lib/types';
import { Logo } from '@/components/icons';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const QUICK_AMOUNTS = [101, 251, 501, 1001, 2101];

export default function GuestPaymentPage({ params }: { params: Promise<{ hostId: string; eventId: string }> }) {
  const resolvedParams = use(params);
  const firestore = useFirestore();
  const { toast } = useToast();

  // step: 'welcome' | 'details' | 'pay' | 'done'
  const [step, setStep] = useState<'welcome' | 'details' | 'pay' | 'done'>('welcome');

  const [guestName, setGuestName] = useState('');
  const [villageName, setVillageName] = useState('');
  const [mobile, setMobile] = useState('');
  const [relationship, setRelationship] = useState('');
  const [blessing, setBlessing] = useState('');
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [receiptRef, setReceiptRef] = useState('');

  const hostRef = useMemoFirebase(
    () => doc(firestore, `hosts/${resolvedParams.hostId}`),
    [firestore, resolvedParams.hostId]
  );
  const eventRef = useMemoFirebase(
    () => doc(firestore, `hosts/${resolvedParams.hostId}/events/${resolvedParams.eventId}`),
    [firestore, resolvedParams.hostId, resolvedParams.eventId]
  );

  const { data: hostProfile, isLoading: hostLoading } = useDoc<Host>(hostRef);
  const { data: eventData, isLoading: eventLoading } = useDoc<Event>(eventRef);

  const handleContinueToDetails = () => setStep('details');

  const handleDetailsNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) {
      toast({ variant: 'destructive', title: 'Name Required', description: 'Please enter your full name.' });
      return;
    }
    if (!villageName.trim()) {
      toast({ variant: 'destructive', title: 'Village Required', description: 'Please enter your village or city.' });
      return;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast({ variant: 'destructive', title: 'Invalid Amount', description: 'Please choose or enter an amount greater than 0.' });
      return;
    }
    setStep('pay');
  };

  const handleCopyUpi = () => {
    if (hostProfile?.upi) {
      navigator.clipboard.writeText(hostProfile.upi);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      toast({ title: 'UPI ID Copied', description: 'Paste it in your payment app to pay manually.' });
    }
  };

  const handleConfirmPayment = async () => {
    if (!guestName || !villageName || !amount) return;
    setIsSubmitting(true);

    const ref = `CP${Date.now().toString().slice(-8)}`;
    const transactionData: TransactionDoc = {
      name: guestName.trim(),
      village: villageName.trim(),
      mobile: mobile.trim() || undefined,
      relationship: relationship.trim() || undefined,
      blessing: blessing.trim() || undefined,
      email: 'Guest',
      amount: parseFloat(amount),
      transactionDate: new Date().toISOString(),
      status: 'Success',
      type: 'Gift',
      paymentMethod: 'UPI',
      receiptQrCode: ref,
      eventId: resolvedParams.eventId,
    };

    const transactionsColRef = collection(
      firestore,
      `hosts/${resolvedParams.hostId}/events/${resolvedParams.eventId}/transactions`
    );

    addDoc(transactionsColRef, transactionData)
      .then(() => {
        setReceiptRef(ref);
        setStep('done');
      })
      .catch(() => {
        errorEmitter.emit(
          'permission-error',
          new FirestorePermissionError({
            path: transactionsColRef.path,
            operation: 'create',
            requestResourceData: transactionData,
          })
        );
      })
      .finally(() => setIsSubmitting(false));
  };

  const resetForNext = () => {
    setGuestName(''); setVillageName(''); setMobile(''); setRelationship('');
    setBlessing(''); setAmount(''); setReceiptRef(''); setStep('welcome');
  };

  const shareReceipt = () => {
    const text =
      `🎉 Shagun sent via ChanloPay\n\n` +
      `Event: ${eventData?.eventName}\n` +
      `From: ${guestName}\n` +
      `Amount: ₹${amount}\n` +
      `Ref: ${receiptRef}\n` +
      `Date: ${new Date().toLocaleString()}`;
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({ title: 'Shagun Receipt', text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      toast({ title: 'Receipt Copied', description: 'Receipt details copied to clipboard.' });
    }
  };

  const whatsappReceipt = () => {
    const text = encodeURIComponent(
      `🎉 Shagun sent via ChanloPay\nEvent: ${eventData?.eventName}\nFrom: ${guestName}\nAmount: ₹${amount}\nRef: ${receiptRef}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
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
        <div className="mb-4 text-destructive"><Logo className="h-12 w-12" /></div>
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

  const formattedAmount = parseFloat(amount || '0').toFixed(2);
  const upiUri = `upi://pay?pa=${hostProfile.upi}&pn=${encodeURIComponent(hostProfile.name || '')}&am=${formattedAmount}&cu=INR&tn=${encodeURIComponent('Wedding Gift - ' + eventData.eventName)}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(upiUri)}`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-secondary/15 via-background to-background p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-md flex flex-col items-center">
        <div className="mb-6 flex items-center gap-2 text-primary">
          <Logo className="h-8 w-8" />
          <h1 className="font-headline text-2xl font-bold">ChanloPay</h1>
        </div>

        {/* STEP: WELCOME */}
        {step === 'welcome' && (
          <Card className="w-full shadow-soft border-secondary/30 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="relative bg-gradient-to-br from-primary via-primary to-[hsl(351_55%_24%)] px-6 pt-10 pb-16 text-center text-primary-foreground">
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-secondary/90 text-primary shadow-lg animate-float">
                <Gift className="h-8 w-8" />
              </div>
              <p className="text-xs uppercase tracking-[0.2em] text-secondary/90 font-bold">You&apos;re invited to bless</p>
              <h2 className="mt-2 font-headline text-3xl font-bold leading-tight">{eventData.eventName}</h2>
              <p className="mt-2 text-sm text-primary-foreground/80 font-body">
                Hosted by <span className="font-semibold text-secondary">{hostProfile.name}</span>
              </p>
              {eventData.location && (
                <p className="mt-1 text-xs text-primary-foreground/70 font-body">📍 {eventData.location}</p>
              )}
            </div>
            <CardContent className="-mt-8 px-6 pb-6">
              <div className="glass rounded-xl p-4 text-center shadow-soft">
                <p className="text-sm text-foreground/80 font-body leading-relaxed">
                  Send your <span className="font-bold text-primary">Shagun</span> securely over UPI.
                  Your blessing is recorded digitally for the family.
                </p>
              </div>
              <Button
                onClick={handleContinueToDetails}
                className="mt-5 w-full h-14 text-lg font-bold bg-navy text-navy-foreground hover:bg-navy/90 shadow-soft group"
              >
                <Heart className="mr-2 h-5 w-5 fill-current" />
                Pay Shagun
                <ChevronRight className="ml-1 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <p className="mt-3 text-center text-[11px] text-muted-foreground">
                Secure UPI · GPay · PhonePe · Paytm · BHIM
              </p>
            </CardContent>
          </Card>
        )}

        {/* STEP: DETAILS */}
        {step === 'details' && (
          <Card className="w-full shadow-soft border-secondary/30 animate-in fade-in slide-in-from-right-2 duration-300">
            <CardHeader className="text-center">
              <CardTitle className="font-headline text-2xl">Your Blessing</CardTitle>
              <CardDescription className="font-body">Tell the family who's blessing them</CardDescription>
            </CardHeader>
            <form onSubmit={handleDetailsNext}>
              <CardContent className="space-y-4">
                <Field icon={<User className="h-4 w-4 text-primary" />} label="Full Name" required>
                  <Input value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Enter your full name" className="pl-10 h-12" required />
                </Field>
                <Field icon={<Home className="h-4 w-4 text-primary" />} label="Village / City" required>
                  <Input value={villageName} onChange={(e) => setVillageName(e.target.value)} placeholder="Enter your village or city" className="pl-10 h-12" required />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field icon={<Phone className="h-4 w-4 text-primary" />} label="Mobile" hint="optional">
                    <Input value={mobile} onChange={(e) => setMobile(e.target.value)} type="tel" placeholder="Mobile" className="pl-10 h-12" />
                  </Field>
                  <Field icon={<Heart className="h-4 w-4 text-primary" />} label="Relation" hint="optional">
                    <Input value={relationship} onChange={(e) => setRelationship(e.target.value)} placeholder="e.g. Uncle" className="pl-10 h-12" />
                  </Field>
                </div>

                <div className="grid gap-2">
                  <Label className="font-body text-xs uppercase tracking-wider font-bold text-muted-foreground">Choose Amount (₹)</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {QUICK_AMOUNTS.map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setAmount(String(amt))}
                        className={`h-12 rounded-lg border-2 font-bold transition-all ${
                          amount === String(amt)
                            ? 'border-primary bg-primary text-primary-foreground shadow-soft scale-[1.03]'
                            : 'border-secondary/40 bg-secondary/10 text-primary hover:border-primary/50'
                        }`}
                      >
                        ₹{amt}
                      </button>
                    ))}
                    <div className="relative">
                      <span className="absolute left-3 top-3.5 text-primary font-bold">₹</span>
                      <Input
                        value={QUICK_AMOUNTS.includes(Number(amount)) ? '' : amount}
                        onChange={(e) => setAmount(e.target.value)}
                        type="number"
                        placeholder="Other"
                        className="pl-7 h-12 font-bold text-center"
                      />
                    </div>
                  </div>
                </div>

                <Field icon={<Sparkles className="h-4 w-4 text-primary" />} label="Blessing Message" hint="optional">
                  <Textarea value={blessing} onChange={(e) => setBlessing(e.target.value)} placeholder="Write a short blessing for the couple..." className="pl-10 pt-3 min-h-[70px]" />
                </Field>
              </CardContent>
              <CardFooter className="flex-col gap-2">
                <Button type="submit" className="w-full h-14 text-lg font-bold bg-navy text-navy-foreground hover:bg-navy/90 shadow-soft group">
                  Continue to Payment
                  <ChevronRight className="ml-1 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button type="button" variant="ghost" className="text-xs text-muted-foreground" onClick={() => setStep('welcome')}>
                  <ArrowLeft className="mr-1 h-3 w-3" /> Back
                </Button>
              </CardFooter>
            </form>
          </Card>
        )}

        {/* STEP: PAY */}
        {step === 'pay' && (
          <Card className="w-full shadow-soft border-secondary/30 animate-in fade-in slide-in-from-right-2 duration-300">
            <CardHeader className="text-center bg-primary/5 rounded-t-lg border-b border-secondary/20">
              <CardTitle className="font-headline text-xl">Complete Payment</CardTitle>
              <CardDescription className="font-body">
                Paying <span className="font-bold text-primary text-lg">₹{amount}</span> to {hostProfile.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center p-6 space-y-6">
              <div className="w-full space-y-3">
                <StepLabel n={1} text="Open your UPI app & pay" />
                <Button asChild className="w-full h-16 text-lg font-bold bg-navy text-navy-foreground hover:bg-navy/90 shadow-soft">
                  <a href={upiUri}>
                    <ExternalLink className="mr-2 h-6 w-6" />
                    Open GPay / PhonePe
                  </a>
                </Button>
              </div>

              <div className="w-full border-t-2 border-dashed border-secondary/30 pt-5">
                <div className="flex items-center gap-2 mb-3 text-secondary-foreground">
                  <ShieldAlert className="h-5 w-5 text-primary" />
                  <p className="text-xs font-bold uppercase text-primary">Payment declined by bank?</p>
                </div>
                <Alert className="bg-secondary/10 border-secondary/30 mb-4 py-3">
                  <AlertTriangle className="h-5 w-5 text-primary" />
                  <AlertTitle className="text-primary text-sm font-bold">Pay manually with UPI ID</AlertTitle>
                  <AlertDescription className="text-foreground/70 text-[11px] leading-relaxed mt-1">
                    If your app shows <strong>"Declined for Security Reasons"</strong>, copy the ID below and pay via <strong>New Payment &gt; UPI ID</strong>.
                  </AlertDescription>
                </Alert>
                <div className="flex items-center gap-3 bg-card p-4 rounded-xl border-2 border-secondary/30 shadow-sm">
                  <div className="truncate flex-1">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Host UPI ID</p>
                    <p className="text-base font-mono font-bold text-primary truncate">{hostProfile.upi}</p>
                  </div>
                  <Button size="sm" className="h-11 gap-2 font-bold px-4 bg-primary shrink-0" onClick={handleCopyUpi}>
                    {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {isCopied ? 'Copied' : 'Copy'}
                  </Button>
                </div>
              </div>

              <div className="w-full flex flex-col items-center border-t border-secondary/20 pt-5">
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-3 font-bold">Or scan to pay</p>
                <div className="bg-white p-3 rounded-2xl border-2 border-secondary/20 shadow-inner">
                  <Image src={qrCodeUrl} alt="Payment QR Code" width={170} height={170} className="rounded-lg" />
                </div>
              </div>

              <div className="w-full space-y-3 border-t border-secondary/20 pt-5">
                <StepLabel n={2} text="After paying, save your record" />
                <Button
                  className="w-full h-16 text-lg font-bold bg-success text-success-foreground hover:bg-success/90 shadow-soft"
                  onClick={handleConfirmPayment}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <CheckCircle2 className="mr-2 h-6 w-6" />}
                  Confirm &amp; Save Entry
                </Button>
                <Button variant="ghost" className="w-full text-xs text-muted-foreground" onClick={() => setStep('details')}>
                  <ArrowLeft className="mr-2 h-3 w-3" /> Edit details
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP: SUCCESS */}
        {step === 'done' && (
          <Card className="w-full shadow-soft border-success/30 overflow-hidden animate-in fade-in zoom-in duration-500">
            <div className="bg-gradient-to-br from-success to-[hsl(123_46%_26%)] px-6 pt-10 pb-8 text-center text-success-foreground">
              <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-white/95 text-success shadow-lg animate-pop-in">
                <CheckCircle2 className="h-11 w-11" />
              </div>
              <h2 className="font-headline text-2xl font-bold">Thank You, {guestName.split(' ')[0]}!</h2>
              <p className="mt-1 text-sm text-success-foreground/85">Your blessing has been recorded 🎉</p>
            </div>
            <CardContent className="p-6 space-y-4">
              <div className="rounded-xl border border-secondary/30 bg-secondary/5 divide-y divide-secondary/20">
                <ReceiptRow label="Amount" value={`₹${amount}`} strong />
                <ReceiptRow label="Event" value={eventData.eventName} />
                <ReceiptRow label="From" value={guestName} />
                {villageName && <ReceiptRow label="Village / City" value={villageName} />}
                <ReceiptRow label="Reference" value={receiptRef} mono />
                <ReceiptRow label="Date & Time" value={new Date().toLocaleString()} />
              </div>
              {blessing && (
                <div className="rounded-xl bg-primary/5 border border-primary/10 p-3 text-center">
                  <p className="text-xs text-muted-foreground uppercase font-bold mb-1">Your Blessing</p>
                  <p className="text-sm italic text-foreground/80">“{blessing}”</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="font-bold border-primary/30 text-primary" onClick={shareReceipt}>
                  <Share2 className="mr-2 h-4 w-4" /> Share
                </Button>
                <Button className="font-bold bg-success text-success-foreground hover:bg-success/90" onClick={whatsappReceipt}>
                  <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
                </Button>
              </div>
              <Button variant="ghost" className="w-full font-bold" onClick={resetForNext}>
                Done · Make another payment
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function Field({
  icon, label, hint, required, children,
}: {
  icon: React.ReactNode; label: string; hint?: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label className="font-body text-xs uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-1">
        {label}{required && <span className="text-destructive">*</span>}
        {hint && <span className="normal-case tracking-normal font-normal text-[10px] opacity-70">({hint})</span>}
      </Label>
      <div className="relative">
        <span className="absolute left-3 top-3.5 z-10">{icon}</span>
        {children}
      </div>
    </div>
  );
}

function StepLabel({ n, text }: { n: number; text: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">{n}</div>
      <p className="text-sm font-bold uppercase tracking-tight text-primary">{text}</p>
    </div>
  );
}

function ReceiptRow({ label, value, strong, mono }: { label: string; value?: string; strong?: boolean; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-sm ${strong ? 'font-bold text-primary text-base' : 'font-medium text-foreground'} ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}
