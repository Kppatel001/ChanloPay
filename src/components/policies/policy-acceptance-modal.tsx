
'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ShieldCheck, Loader2, CheckCircle2, Lock } from 'lucide-react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import type { Host } from '@/lib/types';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

export function PolicyAcceptanceModal() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hostRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, `hosts/${user.uid}`);
  }, [user, firestore]);

  const { data: hostProfile, isLoading: isProfileLoading } = useDoc<Host>(hostRef);

  useEffect(() => {
    if (!isUserLoading && !isProfileLoading && hostProfile) {
      if (!hostProfile.policiesAccepted) {
        setIsOpen(true);
      }
    }
  }, [isUserLoading, isProfileLoading, hostProfile]);

  const handleAccept = async () => {
    if (!user || !firestore) return;
    setIsSubmitting(true);
    try {
      const hostDocRef = doc(firestore, `hosts/${user.uid}`);
      await updateDoc(hostDocRef, {
        policiesAccepted: true,
        policiesAcceptedAt: new Date().toISOString(),
      });
      setIsOpen(false);
      toast({
        title: 'Consent Recorded',
        description: 'You now have full access to ChanloPay.',
      });
    } catch (error) {
      console.error('Error accepting policies:', error);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: 'Please check your connection and try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none shadow-2xl [&>button]:hidden" onPointerDownOutside={(e) => e.preventDefault()}>
        <div className="bg-primary p-6 text-primary-foreground">
          <div className="flex items-center gap-3 mb-2">
            <ShieldCheck className="h-8 w-8 text-white" />
            <DialogTitle className="text-2xl font-black tracking-tighter text-white uppercase">User Compliance</DialogTitle>
          </div>
          <DialogDescription className="text-primary-foreground/80 font-medium">
            To ensure a safe environment, please review our data and payment terms.
          </DialogDescription>
        </div>

        <div className="p-6">
          <ScrollArea className="h-[280px] pr-4">
            <div className="space-y-5 text-sm font-medium text-muted-foreground leading-relaxed">
              <p>
                Namaste! Before you begin, we must disclose how ChanloPay manages your event information and digital gifts.
              </p>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="bg-primary/10 p-1.5 rounded-lg">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  </div>
                  <span><strong>Personal Records:</strong> We store your Name, Mobile, and UPI ID to verify payouts.</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-primary/10 p-1.5 rounded-lg">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  </div>
                  <span><strong>Gift Ledger:</strong> Every payment from your guests is logged permanently for your transparency.</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-primary/10 p-1.5 rounded-lg">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  </div>
                  <span><strong>Platform Fees:</strong> A 2% fee is deducted from collections to maintain the secure WhatsApp receipt system.</span>
                </div>
              </div>

              <div className="bg-destructive/5 p-4 rounded-xl border border-destructive/10 text-destructive text-[11px] font-bold">
                <div className="flex items-center gap-2 mb-1">
                   <Lock className="h-3 w-3" />
                   DISCLAIMER
                </div>
                The platform is not responsible for failed payments made outside our verified portal. Always verify your UPI ID in Settings before sharing links.
              </div>

              <p className="text-xs">
                By clicking below, you give consent for data collection and agree to our full Terms of Service.
              </p>
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="bg-muted/30 p-6 flex flex-col sm:flex-row gap-3 border-t">
          <Button variant="ghost" asChild className="text-xs font-bold order-2 sm:order-1 hover:bg-white">
            <Link href="/policies">Read Full Policy</Link>
          </Button>
          <Button onClick={handleAccept} disabled={isSubmitting} className="w-full sm:w-auto font-black uppercase tracking-widest order-1 sm:order-2 h-11">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
            Accept & Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
