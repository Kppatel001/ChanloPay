
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
import { Wallet2, Clock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet2 className="h-6 w-6 text-primary" />
                Withdrawal History
              </CardTitle>
              <CardDescription>
                Track your payout requests. Processing typically takes 48-72 hours.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex h-32 items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : withdrawals && withdrawals.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
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
                        <TableRow key={req.id}>
                          <TableCell className="font-medium">{req.eventName}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(req.requestDate).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="font-semibold">{formatCurrency(req.totalAmount)}</TableCell>
                          <TableCell className="text-destructive font-medium">
                            -{formatCurrency(req.platformFee)}
                          </TableCell>
                          <TableCell className="font-bold text-primary">
                            {formatCurrency(req.payoutAmount)}
                          </TableCell>
                          <TableCell>
                            <Badge 
                                variant={req.status === 'Completed' ? 'default' : 'secondary'}
                                className="gap-1.5"
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
                <div className="flex h-48 flex-col items-center justify-center text-center py-12 border-2 border-dashed rounded-lg bg-muted/20">
                  <Wallet2 className="h-12 w-12 opacity-20 mb-4" />
                  <p className="text-muted-foreground font-medium">No withdrawal requests yet.</p>
                  <p className="text-xs text-muted-foreground mt-1">Complete an event to request your first payout.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
