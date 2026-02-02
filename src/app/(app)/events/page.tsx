'use client';

import Image from 'next/image';
import { useState } from 'react';
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
import { Calendar, MapPin, QrCode, Loader2, Trash2 } from 'lucide-react';
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

  const hostRef = useMemoFirebase(() => {
    if (!user) return null;
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
    if (!newEventName || !newEventLocation || !user || !firestore) return;

    setIsCreatingEvent(true);

    const newEvent: Omit<Event, 'id'> = {
      hostId: user.uid,
      eventName: newEventName,
      eventDate: new Date().toISOString(),
      location: newEventLocation,
      qrCode: `chanlopay_evt_${Date.now()}_${newEventName.toLowerCase().replace(/\s/g, '_')}`,
      createdAt: serverTimestamp(),
    };
    
    const collectionRef = collection(firestore, `hosts/${user.uid}/events`);
    addDoc(collectionRef, newEvent).then((docRef) => {
      toast({
        title: "Event Created!",
        description: `${newEvent.eventName} has been created successfully.`,
      });
      setNewEventName('');
      setNewEventLocation('');
      setCreateDialogOpen(false);

      // Add dummy transactions
      const eventId = docRef.id;
      const transactionsColRef = collection(firestore, `hosts/${user.uid}/events/${eventId}/transactions`);
      const dummyTransactions = [
        {
          name: 'Olivia Martin',
          email: 'olivia.martin@email.com',
          amount: Math.floor(Math.random() * 200) + 50,
          transactionDate: new Date().toISOString(),
          status: 'Success',
          type: 'Gift',
          paymentMethod: 'UPI',
          receiptQrCode: `chanlopay_txn_${Date.now()}_1`,
          eventId: eventId,
        },
        {
          name: 'Liam Brown',
          email: 'liam.brown@email.com',
          amount: Math.floor(Math.random() * 100) + 20,
          transactionDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          status: 'Success',
          type: 'Gift',
          paymentMethod: 'Card',
          receiptQrCode: `chanlopay_txn_${Date.now()}_2`,
          eventId: eventId,
        },
        {
          name: 'Ava Jones',
          email: 'ava.jones@email.com',
          amount: Math.floor(Math.random() * 50) + 10,
          transactionDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'Failed',
          type: 'Gift',
          paymentMethod: 'UPI',
          receiptQrCode: `chanlopay_txn_${Date.now()}_3`,
          eventId: eventId,
        }
      ];

      dummyTransactions.forEach(tx => {
        addDoc(transactionsColRef, tx).catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({
                path: transactionsColRef.path,
                operation: 'create',
                requestResourceData: tx,
            });
            errorEmitter.emit('permission-error', permissionError);
        });
      });

    }).catch(async (serverError) => {
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

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header pageTitle="Events" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="grid gap-8">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="font-headline text-2xl font-semibold">Your Events</h2>
              <Button onClick={handleOpenCreateEventDialog}>Create New Event</Button>
            </div>
            
            <Dialog open={isCreateDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Create New Event</DialogTitle>
                    <DialogDescription>
                      Fill in the details for your new event. Click save when
                      you&apos;re done.
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
                        placeholder="e.g., John & Jane's Wedding"
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
                        placeholder="e.g., The Grand Ballroom"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" onClick={handleCreateEvent} disabled={isCreatingEvent}>
                      {isCreatingEvent && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Event
                    </Button>
                  </DialogFooter>
                </DialogContent>
            </Dialog>

            {eventsLoading && <div className="mt-4 text-center">Loading events...</div>}

            {!eventsLoading && (!events || events.length === 0) && (
              <div className="mt-4 text-center text-muted-foreground py-8">
                <p>No events created yet.</p>
                <p>Click "Create New Event" to get started.</p>
              </div>
            )}

            <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {events && events.map((event) => {
                const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(event.qrCode)}`;
                const eventDate = new Date(event.eventDate);

                return (
                  <Card key={event.id}>
                    <CardHeader>
                      <CardTitle>{event.eventName}</CardTitle>
                      <div>
                        <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>{eventDate.toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span>{event.location}</span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Click below to view the QR code for guests to make payments.
                      </p>
                    </CardContent>
                    <CardFooter className="grid grid-cols-2 gap-4">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button className="w-full" variant="outline">
                            <QrCode className="mr-2 h-4 w-4" />
                            View QR
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>Scan to Pay</DialogTitle>
                            <DialogDescription>
                              Guests can scan this code with their phone to send a
                              gift for {event.eventName}.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="flex items-center justify-center p-4">
                            <Image
                              src={qrCodeUrl}
                              alt={`QR Code for ${event.eventName}`}
                              width={250}
                              height={250}
                              className="rounded-lg"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="qr-link">Shareable Link</Label>
                            <Input id="qr-link" readOnly value={qrCodeUrl} />
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
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete this event and all of its associated data.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteEvent(event.id!)}>Continue</AlertDialogAction>
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
