
'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { doc, setDoc } from 'firebase/firestore';
import { Loader2, User, Phone, Wallet2, ShieldCheck } from 'lucide-react';

import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { Header } from '@/components/layout/header';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import type { Host } from '@/lib/types';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';

const profileFormSchema = z.object({
  name: z.string().min(1, 'Full name is required.'),
  mobile: z
    .string()
    .min(10, 'Please enter a valid 10-digit mobile number.')
    .max(10, 'Please enter a valid 10-digit mobile number.')
    .regex(/^\d+$/, 'Mobile number must contain only digits.'),
  upi: z.string().min(3, 'Enter a valid UPI ID for payouts.').optional().or(z.literal('')),
});

export default function SettingsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hostRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, `hosts/${user.uid}`);
  }, [user, firestore]);
  const { data: hostProfile } = useDoc<Host>(hostRef);

  const form = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: '',
      mobile: '',
      upi: '',
    },
  });

  useEffect(() => {
    if (hostProfile) {
      form.reset({
        name: hostProfile.name || '',
        mobile: hostProfile.mobile || '',
        upi: hostProfile.upi || '',
      });
    }
  }, [hostProfile, form]);

  async function onSubmit(values: z.infer<typeof profileFormSchema>) {
    if (!user || !firestore) return;
    setIsSubmitting(true);
    const hostDocRef = doc(firestore, `hosts/${user.uid}`);

    setDoc(hostDocRef, {
      ...values,
      id: user.uid,
    }, { merge: true })
      .then(() => {
        toast({
          title: 'Settings Saved',
          description: 'Your host profile and payout details have been updated.',
        });
      })
      .catch(async (serverError: any) => {
        const permissionError = new FirestorePermissionError({
          path: hostDocRef.path,
          operation: 'update',
          requestResourceData: values,
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header pageTitle="Settings" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card className="w-full max-w-2xl shadow-md border-primary/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-6 w-6 text-primary" />
                  Host Profile
                </CardTitle>
                <CardDescription>
                  Update your identity details. This helps us verify your account for security.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <User className="h-4 w-4 opacity-70" />
                        Full Name
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="space-y-2">
                  <Label htmlFor="email">Registered Email</Label>
                  <Input
                    id="email"
                    type="email"
                    disabled
                    className="bg-muted text-muted-foreground cursor-not-allowed"
                    value={user?.email ?? ''}
                  />
                  <p className="text-xs text-muted-foreground">Used for security alerts and payout receipts.</p>
                </div>

                <FormField
                  control={form.control}
                  name="mobile"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Phone className="h-4 w-4 opacity-70" />
                        Mobile Number
                      </FormLabel>
                      <FormControl>
                        <Input type="tel" placeholder="10-digit mobile number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card className="w-full max-w-2xl shadow-md border-primary/10 bg-primary/5">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Wallet2 className="h-6 w-6 text-primary" />
                        Payout Destination
                    </CardTitle>
                    <CardDescription>
                        Where should the platform transfer your collected funds?
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <FormField
                        control={form.control}
                        name="upi"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="font-bold">Your Bank UPI ID</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g. name@bank" {...field} className="bg-white" />
                                </FormControl>
                                <FormDescription>
                                    All event collections (after 2% fee) will be sent to this ID.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <div className="flex items-center gap-2 text-xs text-primary font-bold bg-primary/10 p-3 rounded-lg border border-primary/20">
                        <ShieldCheck className="h-4 w-4" />
                        Funds are held securely by ChanloPay until you request withdrawal.
                    </div>
                </CardContent>
                <CardFooter className="border-t py-4">
                    <Button type="submit" className="w-full sm:w-auto font-bold" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save All Settings
                    </Button>
                </CardFooter>
            </Card>
          </form>
        </Form>
      </main>
    </div>
  );
}
