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
  DialogTrigger,
} from '@/components/ui/dialog';
import type { Event } from '@/lib/types';
import { Calendar, MapPin, QrCode, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export default function EventsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const eventsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, `hosts/${user.uid}/events`), orderBy('createdAt', 'desc'));
  }, [user, firestore]);
  const { data: events, isLoading: eventsLoading } = useCollection<Event>(eventsQuery);

  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
  const [newEventName, setNewEventName] = useState('');
  const [newEventLocation, setNewEventLocation] = useState('');
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);

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
    addDoc(collectionRef, newEvent).then(() => {
      toast({
        title: "Event Created!",
        description: `${newEvent.eventName} has been created successfully.`,
      });
      setNewEventName('');
      setNewEventLocation('');
      setCreateDialogOpen(false);
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

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header pageTitle="Events" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="grid gap-8">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="font-headline text-2xl font-semibold">Your Events</h2>
              <Dialog open={isCreateDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>Create New Event</Button>
                </DialogTrigger>
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
            </div>
            
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
                    <CardFooter>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button className="w-full">
                            <QrCode className="mr-2 h-4 w-4" />
                            View QR Code
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
