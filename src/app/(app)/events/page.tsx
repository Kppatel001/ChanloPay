
'use client';

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
import { Calendar, MapPin, Loader2, Trash2, Plus, Share2, TrendingUp, Wallet2, CheckCircle2, PlayCircle, StopCircle, QrCode, Download, Maximize2, X, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, doc, deleteDoc, getDocs, where, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { recordManualEntry, requestWithdrawal } from '@/app/actions/api';
import Image from 'next/image';

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

  const fetchStats = async () => {
    if (!user || !firestore || !events) return;
    for (const event of events) {
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
    }
  };

  useEffect(() => {
    fetchStats();
  }, [user, firestore, events]);

  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
  const [newEventName, setNewEventName] = useState('');
  const [newEventLocation, setNewEventLocation] = useState('');
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);

  const [guestName, setGuestName] = useState('');
  const [villageName, setVillageName] = useState('');
  const [guestMobile, setGuestMobile] = useState('');
  const [guestAmount, setGuestAmount] = useState('');
  const [guestType, setGuestType] = useState('Gift');
  const [guestLanguage, setGuestLanguage] = useState('en');
  const [isRecordingTransaction, setIsRecordingTransaction] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState<string | null>(null);

  // QR Code State
  const [selectedEventForQr, setSelectedEventForQr] = useState<Event | null>(null);
  const [isQrFullScreen, setIsQrFullScreen] = useState(false);
  
  const handleOpenCreateEventDialog = () => {
    const isProfileComplete = !!(hostProfile && hostProfile.name && hostProfile.mobile && hostProfile.upi);
    if (!isProfileComplete) {
        toast({
            variant: 'destructive',
            title: 'Profile Incomplete',
            description: 'Please complete your host profile (Name, Mobile, and UPI ID) in Settings to create events.',
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
      qrCode: 'PLATFORM_UPI',
      createdAt: serverTimestamp(),
      withdrawalRequested: false,
      status: 'Live'
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

  const handleUpdateStatus = async (eventId: string, status: 'Live' | 'Completed') => {
    if (!user || !firestore) return;
    const eventRef = doc(firestore, `hosts/${user.uid}/events`, eventId);
    try {
      await updateDoc(eventRef, { status });
      toast({ title: status === 'Live' ? 'Event Live' : 'Event Completed', description: `Status updated to ${status}.` });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update status.' });
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
        language: guestLanguage as any,
        isManualEntry: true
      }, event.eventName);

      toast({ title: "Payment Recorded", description: "Receipt triggered via WhatsApp." });
      setGuestName('');
      setVillageName('');
      setGuestMobile('');
      setGuestAmount('');
      setGuestType('Gift');
      fetchStats();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'API Error', description: err.message });
    } finally {
      setIsRecordingTransaction(false);
    }
  };

  const handleWithdraw = async (event: Event) => {
    const stats = eventStats[event.id!];
    if (!stats || stats.total <= 0 || !user || !hostProfile?.upi || !event.id) {
        toast({ variant: 'destructive', title: 'Withdrawal Error', description: 'No funds or missing UPI ID in settings.' });
        return;
    }

    if (event.status !== 'Completed') {
      toast({ variant: 'destructive', title: 'Event Still Live', description: 'Please mark the event as Completed before requesting withdrawal.' });
      return;
    }

    setIsWithdrawing(event.id);
    try {
        await requestWithdrawal({
            hostId: user.uid,
            eventId: event.id,
            hostName: hostProfile.name || 'Host',
            eventName: event.eventName,
            totalAmount: stats.total,
            hostUpi: hostProfile.upi
        });
        toast({ title: 'Withdrawal Requested', description: 'Your payout is being processed (48-72h).' });
    } catch (err: any) {
        toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
        setIsWithdrawing(null);
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

  const getUpiQrUrl = (event: Event) => {
    if (!hostProfile?.upi) return null;
    const upiIntent = `upi://pay?pa=${hostProfile.upi}&pn=${encodeURIComponent(hostProfile.name || 'Host')}&tn=${encodeURIComponent(event.eventName)}&cu=INR`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(upiIntent)}`;
  };

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
                  Money will be collected into the ChanloPay Platform account for security.
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
            const isLive = event.status !== 'Completed';

            return (
              <Card key={event.id} className={`relative overflow-hidden border-primary/20 shadow-md ${!isLive ? 'bg-muted/5 opacity-80' : ''}`}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="truncate">{event.eventName}</CardTitle>
                      <Badge variant={isLive ? "default" : "secondary"} className="mt-1 text-[9px] uppercase tracking-wider">
                        {isLive ? 'Live' : 'Completed'}
                      </Badge>
                    </div>
                    <Badge variant="outline" className="text-[10px]">{stats.count} Records</Badge>
                  </div>
                  <div className="space-y-1 mt-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" /> {new Date(event.eventDate).toLocaleDateString()}</div>
                    <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> {event.location}</div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-muted/50 p-4 rounded-lg border flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground">Platform Collection</p>
                      <p className="text-xl font-black text-primary">{formatCurrency(stats.total)}</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-primary opacity-20" />
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-2 border-t pt-4">
                  <div className="flex w-full gap-2">
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
                    
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-10 w-10 text-primary" 
                      title="View QR" 
                      onClick={() => {
                        if (!hostProfile?.upi) {
                          toast({
                            variant: 'destructive',
                            title: 'UPI ID Missing',
                            description: 'Please add your UPI ID in Settings to generate a payment QR code.',
                          });
                          return;
                        }
                        setSelectedEventForQr(event);
                      }}
                    >
                      <QrCode className="h-5 w-5" />
                    </Button>

                    <div className="flex gap-1">
                      {isLive ? (
                        <Button variant="secondary" size="icon" className="h-10 w-10 text-amber-600" title="Mark Completed" onClick={() => handleUpdateStatus(event.id!, 'Completed')}>
                          <StopCircle className="h-5 w-5" />
                        </Button>
                      ) : (
                        <Button variant="secondary" size="icon" className="h-10 w-10 text-green-600" title="Go Live" onClick={() => handleUpdateStatus(event.id!, 'Live')}>
                          <PlayCircle className="h-5 w-5" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => handleDeleteEvent(event.id!)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  {event.withdrawalRequested ? (
                    <div className="w-full flex items-center justify-center gap-2 py-2 bg-green-50 text-green-700 text-xs font-bold rounded-lg border border-green-100">
                        <CheckCircle2 className="h-4 w-4" />
                        Payout Requested
                    </div>
                  ) : (
                    <Button 
                        className="w-full font-bold uppercase tracking-wider text-[10px]" 
                        variant={!isLive ? "default" : "secondary"}
                        onClick={() => handleWithdraw(event)}
                        disabled={isWithdrawing === event.id || stats.total <= 0}
                    >
                        {isWithdrawing === event.id ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Wallet2 className="h-3 w-3 mr-2" />}
                        {isLive ? "Mark Completed to Withdraw" : "Request Withdrawal"}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* Dynamic QR Code Modal */}
        <Dialog open={!!selectedEventForQr} onOpenChange={(open) => !open && setSelectedEventForQr(null)}>
          <DialogContent className="sm:max-w-md p-0 overflow-hidden border-none shadow-2xl">
            {selectedEventForQr && (
              <div className="flex flex-col items-center">
                <div className="bg-primary w-full p-6 text-primary-foreground text-center">
                  <DialogTitle className="text-2xl font-black uppercase tracking-tight">Event Payment QR</DialogTitle>
                  <DialogDescription className="text-primary-foreground/80 font-medium">
                    {selectedEventForQr.eventName} • {hostProfile?.name}
                  </DialogDescription>
                </div>
                
                <div className="p-8 flex flex-col items-center gap-6 w-full">
                  <div className="bg-white p-4 rounded-3xl shadow-xl border-4 border-primary/10 relative group min-h-[256px] flex items-center justify-center">
                    {getUpiQrUrl(selectedEventForQr) ? (
                      <>
                        <img 
                          src={getUpiQrUrl(selectedEventForQr)!} 
                          alt="UPI QR Code" 
                          className="w-64 h-64 md:w-80 md:h-80 object-contain"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-white/80 opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl">
                           <Button size="lg" variant="secondary" onClick={() => setIsQrFullScreen(true)}>
                             <Maximize2 className="mr-2 h-5 w-5" />
                             Full Screen
                           </Button>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-destructive font-bold p-4 text-center">
                        <AlertCircle className="h-10 w-10" />
                        <p>UPI ID Required</p>
                        <p className="text-[10px] text-muted-foreground font-normal">Add your UPI ID in Settings to see the QR code.</p>
                      </div>
                    )}
                  </div>

                  <div className="w-full grid grid-cols-2 gap-3">
                    <Button className="w-full font-bold" disabled={!hostProfile?.upi} onClick={() => {
                       navigator.clipboard.writeText(`${origin}/p/${user?.uid}/${selectedEventForQr.id}`);
                       toast({ title: "Link Copied" });
                    }}>
                      <Share2 className="mr-2 h-4 w-4" />
                      Share Link
                    </Button>
                    <Button variant="outline" className="w-full font-bold" disabled={!hostProfile?.upi} onClick={() => window.print()}>
                      <Download className="mr-2 h-4 w-4" />
                      Print QR
                    </Button>
                  </div>

                  <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 flex items-center gap-3 w-full">
                    <div className="bg-primary/10 p-2 rounded-full text-primary">
                      <TrendingUp className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Instant Settlement</p>
                      <p className="text-xs font-bold text-primary">Payments go directly to your Bank Account via UPI.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Full Screen QR Modal */}
        {isQrFullScreen && selectedEventForQr && (
          <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center p-8 animate-in fade-in duration-300">
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute top-4 right-4 h-12 w-12 rounded-full"
              onClick={() => setIsQrFullScreen(false)}
            >
              <X className="h-8 w-8 text-primary" />
            </Button>
            
            <div className="text-center mb-8">
              <h1 className="text-4xl md:text-6xl font-black text-primary uppercase mb-2">{selectedEventForQr.eventName}</h1>
              <p className="text-xl md:text-2xl text-muted-foreground font-bold uppercase tracking-widest">Scan to pay Shagun</p>
            </div>

            <div className="bg-white p-6 md:p-12 rounded-[3rem] shadow-2xl border-8 border-primary/5">
              {getUpiQrUrl(selectedEventForQr) && (
                <img 
                  src={getUpiQrUrl(selectedEventForQr)!} 
                  alt="Full Screen UPI QR" 
                  className="w-[70vw] h-[70vw] max-w-[500px] max-h-[500px]"
                />
              )}
            </div>

            <div className="mt-12 flex flex-col items-center gap-4">
               <Badge className="text-xl px-6 py-2 rounded-full bg-primary text-white font-black uppercase tracking-tighter">
                 Verified Digital Ledger
               </Badge>
               <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest">Powered by ChanloPay</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
