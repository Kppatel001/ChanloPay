
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
import { ShieldCheck, Loader2, FileText, CheckCircle2 } from 'lucide-react';
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
        title: 'Policy Accepted',
        description: 'Thank you for your trust in ChanloPay.',
      });
    } catch (error) {
      console.error('Error accepting policies:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save acceptance. Please try again.',
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
            <DialogTitle className="text-2xl font-black tracking-tighter text-white">Privacy & Terms</DialogTitle>
          </div>
          <DialogDescription className="text-primary-foreground/80 font-medium">
            Please review and accept our policies to continue using ChanloPay.
          </DialogDescription>
        </div>

        <div className="p-6">
          <ScrollArea className="h-[250px] pr-4">
            <div className="space-y-4 text-sm font-medium text-muted-foreground leading-relaxed">
              <p>
                Namaste! To provide a secure event money collection experience, ChanloPay needs to collect and process some of your basic information.
              </p>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5" />
                  <span><strong>Personal Details:</strong> We collect your name, phone number, and email to verify your identity.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5" />
                  <span><strong>Payout Information:</strong> Your UPI ID is stored securely to facilitate bank transfers for your collections.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5" />
                  <span><strong>Transaction Records:</strong> We maintain a transparent digital log of all payments made to your events.</span>
                </div>
              </div>
              <p className="bg-muted p-3 rounded-lg border-l-4 border-primary text-foreground text-xs">
                <strong>Disclaimer:</strong> ChanloPay acts as a centralized collection system. All payments are verified before payout. The platform is not responsible for incorrect payments made outside the system.
              </p>
              <p>
                By clicking "Accept & Continue", you agree to our full Privacy Policy and Terms of Service.
              </p>
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="bg-muted/30 p-6 flex flex-col sm:flex-row gap-3 border-t">
          <Button variant="ghost" asChild className="text-xs font-bold order-2 sm:order-1">
            <Link href="/policies">View Full Policy</Link>
          </Button>
          <Button onClick={handleAccept} disabled={isSubmitting} className="w-full sm:w-auto font-black uppercase tracking-widest order-1 sm:order-2">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
            Accept & Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
