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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import type { Event, Host } from '@/lib/types';
import { Calendar, MapPin, QrCode, Loader2, Trash2, Plus, User as UserIcon, ExternalLink, Home, Share2, Printer } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export default function EventsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [origin, setOrigin] = useState('');

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

  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
  const [newEventName, setNewEventName] = useState('');
  const [newEventLocation, setNewEventLocation] = useState('');
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);

  // Recording transaction state
  const [guestName, setGuestName] = useState('');
  const [villageName, setVillageName] = useState('');
  const [guestAmount, setGuestAmount] = useState('');
  const [isRecordingTransaction, setIsRecordingTransaction] = useState(false);
  
  const handleOpenCreateEventDialog = () => {
    const isProfileComplete = hostProfile && hostProfile.name && hostProfile.mobile && hostProfile.upi;

    if (!isProfileComplete) {
        toast({
            variant: 'destructive',
            title: 'Profile Incomplete',
            description: 'Please complete your profile in Settings before creating an event.',
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
      eventName: newEventName,
      eventDate: new Date().toISOString(),
      location: newEventLocation,
      qrCode: 'GUEST_PAYMENT_URL',
      createdAt: serverTimestamp(),
    };
    
    const collectionRef = collection(firestore, `hosts/${user.uid}/events`);
    addDoc(collectionRef, newEvent).then(() => {
      toast({
        title: "Event Created!",
        description: `${newEvent.eventName} has been created.`,
      });
      setNewEventName('');
      setNewEventLocation('');
      setCreateDialogOpen(false);
    }).catch(async () => {
      const permissionError = new FirestorePermissionError({
        path: collectionRef.path,
        operation: 'create',
        requestResourceData: newEvent,
      });
      errorEmitter.emit('permission-error', permissionError);
    }).finally(() => {
      setIsCreatingEvent(false);
    });
  };

  const handleRecordTransaction = async (eventId: string) => {
    if (!guestName || !guestAmount || !user || !firestore || !eventId) {
      toast({
        variant: 'destructive',
        title: 'Missing Details',
        description: 'Please enter guest full name and amount.',
      });
      return;
    }

    setIsRecordingTransaction(true);

    const amount = parseFloat(guestAmount);
    const transactionData = {
      name: guestName,
      village: villageName,
      email: 'Manual Entry',
      amount: amount,
      transactionDate: new Date().toISOString(),
      status: 'Success',
      type: 'Gift',
      paymentMethod: 'UPI',
      receiptQrCode: `manual_txn_${Date.now()}`,
      eventId: eventId,
    };

    const transactionsColRef = collection(firestore, `hosts/${user.uid}/events/${eventId}/transactions`);
    
    addDoc(transactionsColRef, transactionData)
      .then(() => {
        toast({
          title: "Payment Recorded",
          description: `Successfully recorded ₹${amount} from ${guestName}.`,
        });
        setGuestName('');
        setVillageName('');
        setGuestAmount('');
      })
      .catch(async () => {
        const permissionError = new FirestorePermissionError({
          path: transactionsColRef.path,
          operation: 'create',
          requestResourceData: transactionData,
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setIsRecordingTransaction(false);
      });
  };

  const handleDeleteEvent = (eventId: string) => {
    if (!user || !firestore || !eventId) return;

    const eventRef = doc(firestore, `hosts/${user.uid}/events`, eventId);

    deleteDoc(eventRef).then(() => {
      toast({
        title: "Event Deleted",
        description: "The event has been successfully deleted.",
      });
    }).catch(async () => {
      const permissionError = new FirestorePermissionError({
        path: eventRef.path,
        operation: 'delete',
      });
      errorEmitter.emit('permission-error', permissionError);
    });
  };

  const handleShareLink = (url: string, eventName: string) => {
    if (typeof navigator !== 'undefined') {
      if (navigator.share) {
        navigator.share({
          title: `Pay for ${eventName}`,
          text: `Please use this link to pay for ${eventName} via ChanloPay:`,
          url: url,
        }).catch(err => {
          // If share fails (e.g. Permission Denied), fallback to clipboard
          navigator.clipboard.writeText(url);
          toast({
            title: "Link Copied!",
            description: "Sharing failed, so the link was copied to clipboard instead.",
          });
        });
      } else {
        navigator.clipboard.writeText(url);
        toast({
          title: "Link Copied!",
          description: "Event payment link has been copied to clipboard.",
        });
      }
    }
  };

  const handlePrint = (qrCodeUrl: string, eventName: string) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Print QR Code - ${eventName}</title>
            <style>
              body { 
                display: flex; 
                flex-direction: column; 
                align-items: center; 
                justify-content: center; 
                height: 100vh; 
                margin: 0; 
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                text-align: center;
              }
              .container {
                border: 2px solid #6d28d9;
                padding: 40px;
                border-radius: 20px;
                background: white;
              }
              img { width: 400px; height: 400px; margin-bottom: 20px; }
              h1 { margin: 0; color: #6d28d9; font-size: 32px; }
              p { font-size: 18px; color: #4b5563; margin-top: 10px; }
              .logo { font-weight: bold; font-size: 24px; color: #6d28d9; margin-bottom: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="logo">ChanloPay</div>
              <h1>${eventName}</h1>
              <p>Scan to Pay via UPI</p>
              <img src="${qrCodeUrl}" />
              <p>Enter your details and pay securely</p>
            </div>
            <script>
              window.onload = () => {
                window.print();
                window.close();
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header pageTitle="Events" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="grid gap-8">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="font-headline text-2xl font-semibold">Your Events</h2>
              <Button onClick={handleOpenCreateEventDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Create New Event
              </Button>
            </div>
            
            <Dialog open={isCreateDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Create New Event</DialogTitle>
                    <DialogDescription>
                      Fill in the details for your new event. This will generate a scannable QR code for your guests.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="name" className="text-right">
                        Event Name
                      </Label>
                      <Input
                        id="name"
                        value={newEventName}
                        onChange={(e) => setNewEventName(e.target.value)}
                        className="col-span-3"
                        placeholder="e.g., Wedding Ceremony"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="location" className="text-right">
                        Location
                      </Label>
                      <Input
                        id="location"
                        value={newEventLocation}
                        onChange={(e) => setNewEventLocation(e.target.value)}
                        className="col-span-3"
                        placeholder="e.g., Grand Palace Hotel"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" onClick={handleCreateEvent} disabled={isCreatingEvent}>
                      {isCreatingEvent && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Create Event
                    </Button>
                  </DialogFooter>
                </DialogContent>
            </Dialog>

            {eventsLoading && <div className="mt-4 text-center">Loading events...</div>}

            {!eventsLoading && (!events || events.length === 0) && (
              <div className="mt-4 text-center text-muted-foreground py-8 border-2 border-dashed rounded-lg">
                <p className="mb-2">No events created yet.</p>
                <Button variant="link" onClick={handleOpenCreateEventDialog}>Create your first event</Button>
              </div>
            )}

            <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {events && events.map((event) => {
                const guestPayUrl = `${origin}/p/${user?.uid}/${event.id}`;
                const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(guestPayUrl)}`;
                const eventDate = new Date(event.eventDate);

                return (
                  <Card key={event.id} className="overflow-hidden flex flex-col shadow-md">
                    <CardHeader>
                      <CardTitle className="truncate">{event.eventName}</CardTitle>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>{eventDate.toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span className="truncate">{event.location}</span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1">
                      <p className="text-sm text-muted-foreground">
                        Guests scan this to enter their details before paying via UPI.
                      </p>
                    </CardContent>
                    <CardFooter className="grid grid-cols-2 gap-4 border-t pt-4 bg-muted/30">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button className="w-full" variant="outline">
                            <QrCode className="mr-2 h-4 w-4" />
                            View QR
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <QrCode className="h-5 w-5" />
                              Scan to Pay
                            </DialogTitle>
                            <DialogDescription>
                              Guests scan this to enter their name and village before paying for <strong>{event.eventName}</strong>.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg shadow-inner mt-4">
                            <Image
                              src={qrCodeUrl}
                              alt={`QR Code for ${event.eventName}`}
                              width={220}
                              height={220}
                              className="rounded-md border p-3"
                            />
                            <div className="mt-4 text-center w-full">
                                <p className="text-xs text-muted-foreground mb-2">Direct Payment URL:</p>
                                <div className="flex items-center justify-center gap-2">
                                  <a 
                                      href={guestPayUrl} 
                                      target="_blank" 
                                      rel="noopener noreferrer" 
                                      className="text-xs font-mono text-primary flex items-center justify-center gap-1 hover:underline truncate max-w-[200px]"
                                  >
                                      {guestPayUrl.replace(/^https?:\/\//, '')}
                                      <ExternalLink className="h-3 w-3 shrink-0" />
                                  </a>
                                  <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    className="h-8 w-8"
                                    onClick={() => handleShareLink(guestPayUrl, event.eventName)}
                                  >
                                    <Share2 className="h-4 w-4 text-primary" />
                                  </Button>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 mt-4 w-full">
                              <Button 
                                variant="secondary"
                                onClick={() => handleShareLink(guestPayUrl, event.eventName)}
                              >
                                <Share2 className="mr-2 h-4 w-4" />
                                Share
                              </Button>
                              <Button 
                                variant="outline"
                                onClick={() => handlePrint(qrCodeUrl, event.eventName)}
                              >
                                <Printer className="mr-2 h-4 w-4" />
                                Print
                              </Button>
                            </div>
                          </div>
                          
                          <div className="mt-6 space-y-4 border-t pt-4">
                            <h4 className="font-semibold text-sm flex items-center gap-2">
                              <UserIcon className="h-4 w-4" />
                              Manual Guest Entry
                            </h4>
                            <p className="text-xs text-muted-foreground">
                                Use this if you want to record a payment manually on behalf of a guest.
                            </p>
                            <div className="grid gap-3">
                              <div className="grid gap-1">
                                <Label htmlFor="guest-name" className="text-xs">Guest Full Name</Label>
                                <div className="relative">
                                  <UserIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                  <Input 
                                    id="guest-name" 
                                    placeholder="Enter full name" 
                                    className="pl-9"
                                    value={guestName}
                                    onChange={(e) => setGuestName(e.target.value)}
                                  />
                                </div>
                              </div>
                              <div className="grid gap-1">
                                <Label htmlFor="village-name" className="text-xs">Village Name</Label>
                                <div className="relative">
                                  <Home className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                  <Input 
                                    id="village-name" 
                                    placeholder="Enter village" 
                                    className="pl-9"
                                    value={villageName}
                                    onChange={(e) => setVillageName(e.target.value)}
                                  />
                                </div>
                              </div>
                              <div className="grid gap-1">
                                <Label htmlFor="guest-amount" className="text-xs">Amount Received</Label>
                                <div className="relative">
                                  <span className="absolute left-3 top-2.5 text-muted-foreground text-sm font-medium">₹</span>
                                  <Input 
                                    id="guest-amount" 
                                    type="number" 
                                    placeholder="Enter amount" 
                                    className="pl-7"
                                    value={guestAmount}
                                    onChange={(e) => setGuestAmount(e.target.value)}
                                  />
                                </div>
                              </div>
                              <Button 
                                className="w-full mt-2" 
                                size="sm"
                                disabled={isRecordingTransaction}
                                onClick={() => handleRecordTransaction(event.id!)}
                              >
                                {isRecordingTransaction && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Record Payment
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                       <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" className="w-full">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Event?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action will permanently delete "{event.eventName}" and all its transaction history.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteEvent(event.id!)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
