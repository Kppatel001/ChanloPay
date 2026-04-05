'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/header';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { Event, Host } from '@/lib/types';
import { Calendar, MapPin, Loader2, Trash2, Plus, Share2, Wallet2, TrendingUp, Phone, Home, Languages } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, doc, deleteDoc, getDocs, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { recordManualEntry, requestWithdrawal } from '@/app/actions/api';

export default function EventsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [origin, setOrigin] = useState('');
  const [eventStats, setEventStats] = useState<Record<string, { count: number, total: number }>>({});

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  const hostRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, `hosts/${user.uid}`);
  }, [user, firestore]);
  const { data: hostProfile } = useDoc<Host>(hostRef);

  const eventsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, `hosts/${user.uid}/events`), orderBy('createdAt', 'desc'));
  }, [user, firestore]);
  const { data: events, isLoading: eventsLoading } = useCollection<Event>(eventsQuery);

  useEffect(() => {
    if (!user || !firestore || !events) return;

    events.forEach(async (event) => {
      if (event.id) {
        const txnRef = collection(firestore, `hosts/${user.uid}/events/${event.id}/transactions`);
        const q = query(txnRef, where("status", "==", "Success"));
        const snapshot = await getDocs(q);
        
        let total = 0;
        snapshot.forEach(d => total += (d.data().amount || 0));
        
        setEventStats(prev => ({ 
          ...prev, 
          [event.id!]: { count: snapshot.size, total: total } 
        }));
      }
    });
  }, [user, firestore, events]);

  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
  const [newEventName, setNewEventName] = useState('');
  const [newEventLocation, setNewEventLocation] = useState('');
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState<string | null>(null);

  const [guestName, setGuestName] = useState('');
  const [villageName, setVillageName] = useState('');
  const [guestMobile, setGuestMobile] = useState('');
  const [guestAmount, setGuestAmount] = useState('');
  const [guestType, setGuestType] = useState('Gift');
  const [guestLanguage, setGuestLanguage] = useState('en');
  const [isRecordingTransaction, setIsRecordingTransaction] = useState(false);
  
  const handleOpenCreateEventDialog = () => {
    const isProfileComplete = !!(hostProfile && hostProfile.name && hostProfile.mobile);
    if (!isProfileComplete) {
        toast({
            variant: 'destructive',
            title: 'Profile Incomplete',
            description: 'Please complete your host profile in Settings.',
        });
        return;
    }
    setCreateDialogOpen(true);
  };

  const handleCreateEvent = async () => {
    if (!newEventName || !newEventLocation || !user || !firestore || !hostProfile) return;
    setIsCreatingEvent(true);

    const newEvent: Omit<Event, 'id'> = {
      hostId: user.uid,
      eventName: newEventName.trim(),
      eventDate: new Date().toISOString(),
      location: newEventLocation.trim(),
      qrCode: 'PLATFORM_COLLECT',
      createdAt: serverTimestamp(),
      withdrawalRequested: false,
    };
    
    const collectionRef = collection(firestore, `hosts/${user.uid}/events`);
    addDoc(collectionRef, newEvent).then(() => {
      toast({ title: "Event Created!", description: `${newEvent.eventName} is now live.` });
      setNewEventName('');
      setNewEventLocation('');
      setCreateDialogOpen(false);
    }).catch(async () => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: collectionRef.path, operation: 'create' }));
    }).finally(() => setIsCreatingEvent(false));
  };

  const handleWithdrawFunds = async (event: Event) => {
    if (!user || !event.id) return;
    setIsWithdrawing(event.id);
    try {
      const result = await requestWithdrawal(user.uid, event.id);
      toast({
        title: "Withdrawal Requested",
        description: `₹${result.payoutAmount.toFixed(2)} payout submitted for review.`,
      });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Withdrawal Failed', description: err.message });
    } finally {
      setIsWithdrawing(null);
    }
  };

  const handleRecordTransaction = async (event: Event) => {
    if (!guestName.trim() || !guestAmount || !user || !firestore || !event.id) {
      toast({ variant: 'destructive', title: 'Missing Details', description: 'Enter name and amount.' });
      return;
    }
    setIsRecordingTransaction(true);
    try {
      const amount = parseFloat(guestAmount);
      await recordManualEntry({
        hostId: user.uid,
        eventId: event.id,
        name: guestName.trim(),
        village: villageName.trim() || 'N/A',
        mobile: guestMobile,
        amount: amount,
        paymentMethod: 'Cash',
        type: guestType as any,
        language: guestLanguage as any
      }, event.eventName);

      toast({ title: "Payment Recorded", description: "Receipt triggered via WhatsApp." });
      setGuestName('');
      setVillageName('');
      setGuestMobile('');
      setGuestAmount('');
      setGuestType('Gift');
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'API Error', description: err.message });
    } finally {
      setIsRecordingTransaction(false);
    }
  };

  const handleDeleteEvent = (eventId: string) => {
    if (!user || !firestore || !eventId) return;
    const eventRef = doc(firestore, `hosts/${user.uid}/events`, eventId);
    deleteDoc(eventRef).then(() => {
      toast({ title: "Event Deleted", description: "Record removed." });
    });
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header pageTitle="Events" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="flex items-center justify-between">
          <h2 className="font-headline text-2xl font-semibold">Event Management</h2>
          <Button onClick={handleOpenCreateEventDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Create Event
          </Button>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Start New Event</DialogTitle>
                <DialogDescription>
                  Money will be collected into your ChanloPay Platform balance.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Event Name</Label>
                  <Input id="name" value={newEventName} onChange={(e) => setNewEventName(e.target.value)} placeholder="Wedding, Birthday, etc." />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="location">Venue</Label>
                  <Input id="location" value={newEventLocation} onChange={(e) => setNewEventLocation(e.target.value)} placeholder="City, Hall Name" />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreateEvent} disabled={isCreatingEvent}>
                  {isCreatingEvent && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Launch Event
                </Button>
              </DialogFooter>
            </DialogContent>
        </Dialog>

        {eventsLoading && <div className="text-center py-12">Loading event collection...</div>}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {events && events.map((event) => {
            const stats = eventStats[event.id!] || { count: 0, total: 0 };
            const canWithdraw = stats.total > 0 && !event.withdrawalRequested;

            return (
              <Card key={event.id} className="relative overflow-hidden border-primary/20 shadow-md">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="truncate">{event.eventName}</CardTitle>
                    {event.withdrawalRequested ? (
                        <Badge variant="secondary" className="bg-green-100 text-green-700">Withdrawn</Badge>
                    ) : (
                        <Badge variant="outline" className="text-[10px]">{stats.count} Records</Badge>
                    )}
                  </div>
                  <div className="space-y-1 mt-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" /> {new Date(event.eventDate).toLocaleDateString()}</div>
                    <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> {event.location}</div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-muted/50 p-4 rounded-lg border flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground">Platform Balance</p>
                      <p className="text-xl font-black text-primary">{formatCurrency(stats.total)}</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-primary opacity-20" />
                  </div>
                  
                  {canWithdraw && (
                    <Button 
                      className="w-full font-bold shadow-lg shadow-primary/10" 
                      onClick={() => handleWithdrawFunds(event)}
                      disabled={isWithdrawing === event.id}
                    >
                      {isWithdrawing === event.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wallet2 className="mr-2 h-4 w-4" />}
                      Request Payout (98%)
                    </Button>
                  )}
                  {event.withdrawalRequested && (
                    <Button className="w-full" variant="outline" disabled>
                       Processing Withdrawal
                    </Button>
                  )}
                </CardContent>
                <CardFooter className="flex gap-2 border-t pt-4">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="flex-1">Manage</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Event Controls</DialogTitle>
                        <DialogDescription>Record cash or share payment link.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
                            <p className="text-xs font-bold text-primary mb-2">Guest Payment Link</p>
                            <div className="flex items-center gap-2">
                                <Input value={`${origin}/p/${user?.uid}/${event.id}`} readOnly className="text-xs h-8" />
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => {
                                    navigator.clipboard.writeText(`${origin}/p/${user?.uid}/${event.id}`);
                                    toast({ title: "Link Copied" });
                                }}>
                                    <Share2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <p className="text-xs font-bold uppercase text-muted-foreground">Manual Cash Record</p>
                            <div className="grid gap-2">
                                <Input placeholder="Guest Name" value={guestName} onChange={(e) => setGuestName(e.target.value)} />
                                <Input placeholder="Village" value={villageName} onChange={(e) => setVillageName(e.target.value)} />
                                <div className="flex gap-2">
                                    <Input placeholder="Amount (₹)" type="number" value={guestAmount} onChange={(e) => setGuestAmount(e.target.value)} />
                                    <Input placeholder="Mobile (WA)" value={guestMobile} onChange={(e) => setGuestMobile(e.target.value)} maxLength={10} />
                                </div>
                                <Button className="w-full" size="sm" onClick={() => handleRecordTransaction(event)} disabled={isRecordingTransaction}>
                                    {isRecordingTransaction && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Record & Send Receipt
                                </Button>
                            </div>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteEvent(event.id!)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}
