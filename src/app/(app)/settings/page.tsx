'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { doc, setDoc } from 'firebase/firestore';
import { Loader2, User, Phone, Wallet } from 'lucide-react';

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
  upi: z.string().min(3, 'Please enter a valid UPI ID (e.g. name@bank).'),
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

    // We merge the changes to avoid overwriting uneditable fields like email or registrationDate
    setDoc(hostDocRef, {
      ...values,
      id: user.uid,
    }, { merge: true })
      .then(() => {
        toast({
          title: 'Settings Saved',
          description: 'Your host profile and payment details have been updated.',
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
        <Card className="w-full max-w-2xl shadow-md">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-6 w-6" />
                  Host Profile
                </CardTitle>
                <CardDescription>
                  Your payment details are used to generate QR codes for your events. Ensure your UPI ID is correct to receive payments.
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
                  <p className="text-xs text-muted-foreground">Contact support to change your email address.</p>
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

                <FormField
                  control={form.control}
                  name="upi"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Wallet className="h-4 w-4 opacity-70" />
                        UPI ID (VPA)
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., yourname@okaxis" {...field} />
                      </FormControl>
                      <FormDescription>
                        This UPI ID will be used for all event QR codes.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter className="bg-muted/30 border-t py-4">
                <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>
      </main>
    </div>
  );
}
