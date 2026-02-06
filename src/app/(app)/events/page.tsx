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
import { Calendar, MapPin, QrCode, Loader2, Trash2, Plus, User as UserIcon, ExternalLink, Home, Share2, Printer, Info, Wallet } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  const [guestType, setGuestType] = useState('Gift');
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
      eventName: newEventName.trim(),
      eventDate: new Date().toISOString(),
      location: newEventLocation.trim(),
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
    if (!guestName.trim() || !guestAmount || !user || !firestore || !eventId) {
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
      name: guestName.trim(),
      village: villageName.trim() || 'N/A',
      email: 'Manual Entry',
      amount: amount,
      transactionDate: new Date().toISOString(),
      status: 'Success',
      type: guestType,
      paymentMethod: 'Cash',
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
        setGuestType('Gift');
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
          navigator.clipboard.writeText(url);
          toast({
            title: "Link Copied!",
            description: "Link copied to clipboard.",
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
    if (!printWindow) {
      toast({
        variant: 'destructive',
        title: 'Pop-up Blocked',
        description: 'Please allow pop-ups to print the QR code.',
      });
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print QR Code - ${eventName}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { 
              display: flex; 
              flex-direction: column; 
              align-items: center; 
              justify-content: center; 
              min-height: 100vh; 
              margin: 0; 
              padding: 20px;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
              text-align: center;
              background-color: white;
            }
            .container {
              border: 3px solid #9400D3;
              padding: 40px;
              border-radius: 32px;
              background: white;
              max-width: 500px;
              width: 100%;
              box-shadow: 0 10px 25px rgba(0,0,0,0.1);
            }
            img { width: 100%; max-width: 350px; height: auto; margin: 30px auto; display: block; border: 1px solid #eee; padding: 10px; border-radius: 12px; }
            h1 { margin: 0; color: #9400D3; font-size: 32px; font-weight: 800; line-height: 1.2; }
            p { font-size: 18px; color: #4b5563; margin: 10px 0; }
            .logo { font-weight: 800; font-size: 24px; color: #9400D3; margin-bottom: 24px; letter-spacing: -0.5px; }
            .instruction { font-weight: bold; color: #9400D3; border-top: 2px solid #f3f4f6; padding-top: 20px; margin-top: 20px; font-size: 20px; }
            .footer { margin-top: 20px; font-size: 14px; color: #9ca3af; }
            @media print {
              body { padding: 0; }
              .container { border-width: 2px; box-shadow: none; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">ChanloPay</div>
            <h1>${eventName}</h1>
            <p>Direct Digital Payment Portal</p>
            <img src="${qrCodeUrl}" id="qr-img" />
            <p class="instruction">Scan with Google Lens or QR Scanner</p>
            <p>Enter details & pay via any UPI app</p>
            <div class="footer">Powered by ChanloPay - Modern Wedding Registry</div>
          </div>
          <script>
            const img = document.getElementById('qr-img');
            const triggerPrint = () => {
              window.print();
            };
            if (img.complete) triggerPrint();
            else {
              img.onload = triggerPrint;
              img.onerror = () => alert('Error: Failed to load QR code. Please check your connection.');
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
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
              <div className="mt-4 text-center text-muted-foreground py-12 border-2 border-dashed rounded-lg bg-muted/20">
                <QrCode className="mx-auto h-12 w-12 opacity-20 mb-4" />
                <p className="mb-2 font-medium">No events created yet.</p>
                <p className="text-xs mb-4">Complete your profile to start creating events.</p>
                <Button variant="outline" onClick={handleOpenCreateEventDialog}>Create your first event</Button>
              </div>
            )}

            <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {events && events.map((event) => {
                const guestPayUrl = `${origin}/p/${user?.uid}/${event.id}`;
                const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(guestPayUrl)}`;
                const eventDate = new Date(event.eventDate);

                return (
                  <Card key={event.id} className="overflow-hidden flex flex-col shadow-md border-primary/10 hover:border-primary/30 transition-colors">
                    <CardHeader>
                      <CardTitle className="truncate text-xl">{event.eventName}</CardTitle>
                      <div className="space-y-1 mt-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4 text-primary" />
                          <span>{eventDate.toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4 text-primary" />
                          <span className="truncate">{event.location}</span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 pb-2">
                      <p className="text-xs text-muted-foreground bg-muted p-2 rounded leading-relaxed">
                        Guests scan this to enter their name & village before paying securely via any UPI app.
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
                              <QrCode className="h-5 w-5 text-primary" />
                              Event QR Portal
                            </DialogTitle>
                            <DialogDescription>
                              Digital payment gateway for <strong>{event.eventName}</strong>.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="flex flex-col items-center justify-center p-6 bg-white rounded-xl shadow-inner mt-4 border">
                            <Image
                              src={qrCodeUrl}
                              alt={`QR Code for ${event.eventName}`}
                              width={240}
                              height={240}
                              className="rounded-lg border-2 border-primary/5 p-2"
                            />
                            <div className="mt-4 flex items-center gap-2 text-primary font-bold text-xs bg-primary/5 px-3 py-1.5 rounded-full">
                              <Info className="h-3.5 w-3.5" />
                              Scan with Google Lens or QR scanner
                            </div>
                            <div className="mt-6 text-center w-full">
                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-bold">Direct Link</p>
                                <div className="flex items-center justify-center gap-2 bg-muted/50 p-2 rounded-lg">
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
                                    className="h-8 w-8 text-primary hover:bg-primary/10"
                                    onClick={() => handleShareLink(guestPayUrl, event.eventName)}
                                  >
                                    <Share2 className="h-4 w-4" />
                                  </Button>
                                </div>
                            </div>
                            <div className="mt-4 w-full">
                              <Button 
                                className="w-full font-bold"
                                variant="outline"
                                onClick={() => handlePrint(qrCodeUrl, event.eventName)}
                              >
                                <Printer className="mr-2 h-4 w-4" />
                                Print Invitation QR
                              </Button>
                            </div>
                          </div>
                          
                          <div className="mt-6 space-y-4 border-t pt-4">
                            <h4 className="font-bold text-sm flex items-center gap-2 text-primary">
                              <UserIcon className="h-4 w-4" />
                              Manual Record Entry
                            </h4>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                                Use this to manually record a cash payment or traditional gift received at the venue.
                            </p>
                            <div className="grid gap-3">
                              <div className="grid gap-1">
                                <Label htmlFor="guest-name" className="text-xs">Guest Full Name</Label>
                                <Input 
                                  id="guest-name" 
                                  placeholder="e.g. Rahul Sharma" 
                                  className="h-9 text-sm"
                                  value={guestName}
                                  onChange={(e) => setGuestName(e.target.value)}
                                />
                              </div>
                              <div className="grid gap-1">
                                <Label htmlFor="village-name" className="text-xs">Village Name</Label>
                                <Input 
                                  id="village-name" 
                                  placeholder="e.g. Chandpur" 
                                  className="h-9 text-sm"
                                  value={villageName}
                                  onChange={(e) => setVillageName(e.target.value)}
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="grid gap-1">
                                  <Label htmlFor="guest-amount" className="text-xs">Amount (₹)</Label>
                                  <Input 
                                    id="guest-amount" 
                                    type="number" 
                                    placeholder="501" 
                                    className="h-9 text-sm"
                                    value={guestAmount}
                                    onChange={(e) => setGuestAmount(e.target.value)}
                                  />
                                </div>
                                <div className="grid gap-1">
                                  <Label htmlFor="guest-type" className="text-xs">Category</Label>
                                  <Select value={guestType} onValueChange={setGuestType}>
                                    <SelectTrigger id="guest-type" className="h-9 text-sm">
                                      <SelectValue placeholder="Gift" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="Gift">Gift</SelectItem>
                                      <SelectItem value="Donation">Donation</SelectItem>
                                      <SelectItem value="Service">Service</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <Button 
                                className="w-full mt-2 font-bold" 
                                size="sm"
                                disabled={isRecordingTransaction}
                                onClick={() => handleRecordTransaction(event.id!)}
                              >
                                {isRecordingTransaction && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                <Wallet className="mr-2 h-4 w-4" />
                                Record Entry
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
                              Delete Permanently
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