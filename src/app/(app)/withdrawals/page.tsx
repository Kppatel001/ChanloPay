
'use client';

import { Header } from '@/components/layout/header';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { WithdrawalRequest } from '@/lib/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Wallet2, Clock, CheckCircle2, AlertCircle, Loader2, IndianRupee } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function WithdrawalsPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const withdrawalsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, `hosts/${user.uid}/withdrawals`), orderBy('requestDate', 'desc'));
  }, [user, firestore]);

  const { data: withdrawals, isLoading } = useCollection<WithdrawalRequest>(withdrawalsQuery);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header pageTitle="Withdrawals" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-1">
          <Card className="border-primary/10 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet2 className="h-6 w-6 text-primary" />
                Withdrawal History
              </CardTitle>
              <CardDescription>
                Track your platform payout requests. Processing typically takes 48-72 hours.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex h-48 items-center justify-center">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-xs text-muted-foreground font-medium">Loading history...</p>
                  </div>
                </div>
              ) : withdrawals && withdrawals.length > 0 ? (
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead>Event Name</TableHead>
                        <TableHead>Requested On</TableHead>
                        <TableHead>Total Collected</TableHead>
                        <TableHead>Fee (2%)</TableHead>
                        <TableHead>Payout Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {withdrawals.map((req) => (
                        <TableRow key={req.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="font-bold">{req.eventName}</TableCell>
                          <TableCell className="text-xs text-muted-foreground font-medium">
                            {new Date(req.requestDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                          </TableCell>
                          <TableCell className="font-semibold">{formatCurrency(req.totalAmount)}</TableCell>
                          <TableCell className="text-destructive font-bold text-xs">
                            -{formatCurrency(req.platformFee)}
                          </TableCell>
                          <TableCell className="font-black text-primary text-base">
                            {formatCurrency(req.payoutAmount)}
                          </TableCell>
                          <TableCell>
                            <Badge 
                                variant={req.status === 'Completed' ? 'default' : 'secondary'}
                                className="gap-1.5 px-3 py-1 font-bold"
                            >
                                {req.status === 'Pending Review' && <Clock className="h-3 w-3" />}
                                {req.status === 'Completed' && <CheckCircle2 className="h-3 w-3" />}
                                {req.status === 'Rejected' && <AlertCircle className="h-3 w-3" />}
                                {req.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex h-64 flex-col items-center justify-center text-center py-12 border-2 border-dashed rounded-xl bg-muted/20 border-primary/10">
                  <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                    <IndianRupee className="h-10 w-10 text-primary opacity-40" />
                  </div>
                  <p className="text-foreground font-black text-lg">No withdrawal requests yet</p>
                  <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
                    Once you request a payout from your Events dashboard, it will appear here for tracking.
                  </p>
                  <Button asChild variant="outline" className="mt-6 border-primary text-primary font-bold hover:bg-primary/5">
                    <Link href="/events">Go to Events</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
