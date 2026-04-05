
'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/header';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collectionGroup, query, orderBy, onSnapshot, DocumentData, QuerySnapshot } from 'firebase/firestore';
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
import { Button } from '@/components/ui/button';
import { ShieldAlert, CheckCircle2, XCircle, Clock, Loader2, IndianRupee, ExternalLink } from 'lucide-react';
import { updateWithdrawalStatus } from '@/app/actions/api';
import { useToast } from '@/hooks/use-toast';

export default function AdminPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // COLLECTION GROUP QUERY for Admin (requires index if filtered/ordered)
  useEffect(() => {
    if (!firestore || user?.email !== 'admin@chanlopay.com') {
        if (user && user.email !== 'admin@chanlopay.com') {
            setIsLoading(false);
        }
        return;
    }

    const q = query(collectionGroup(firestore, 'withdrawals'), orderBy('requestDate', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
      const data = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
      })) as WithdrawalRequest[];
      setWithdrawals(data);
      setIsLoading(false);
    }, (err) => {
      console.error("Admin: Error fetching withdrawals:", err);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [firestore, user]);

  const handleUpdateStatus = async (hostId: string, withdrawalId: string, status: any) => {
    setProcessingId(withdrawalId);
    try {
      await updateWithdrawalStatus(hostId, withdrawalId, status);
      toast({
        title: "Status Updated",
        description: `Withdrawal is now ${status}.`,
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: "Update Failed",
        description: err.message,
      });
    } finally {
      setProcessingId(null);
    }
  };

  if (user?.email !== 'admin@chanlopay.com') {
    return (
      <div className="flex h-screen flex-col items-center justify-center p-4 text-center">
        <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-black mb-2">Access Denied</h1>
        <p className="text-muted-foreground max-w-md">
          This panel is restricted to ChanloPay Platform Administrators. 
          Please contact support if you believe this is an error.
        </p>
      </div>
    );
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header pageTitle="Admin Portal" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="flex items-center justify-between">
            <div className="space-y-1">
                <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
                    <ShieldAlert className="h-6 w-6 text-primary" />
                    Pending Payouts
                </h2>
                <p className="text-sm text-muted-foreground">Verify and release funds to event hosts.</p>
            </div>
            <Badge variant="outline" className="h-8 px-4 font-bold border-primary text-primary">
                {withdrawals.filter(w => w.status === 'Pending Review').length} Action Required
            </Badge>
        </div>

        <Card className="border-none shadow-xl">
          <CardHeader className="bg-primary/5 rounded-t-xl border-b">
            <CardTitle>Global Withdrawal Queue</CardTitle>
            <CardDescription>Manage all host payout requests from a single view.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
                <div className="flex h-64 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-muted/30">
                            <TableRow>
                                <TableHead>Host / Event</TableHead>
                                <TableHead>Request Date</TableHead>
                                <TableHead>Total (2% Fee)</TableHead>
                                <TableHead>Payout Amount</TableHead>
                                <TableHead>UPI ID</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {withdrawals.map((req) => (
                                <TableRow key={req.id} className="hover:bg-muted/20">
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-black text-sm">{req.hostName}</span>
                                            <span className="text-xs text-muted-foreground">{req.eventName}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-xs font-medium">
                                        {new Date(req.requestDate).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold">{formatCurrency(req.totalAmount)}</span>
                                            <span className="text-[10px] text-destructive">-{formatCurrency(req.platformFee)}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-black text-primary">
                                        {formatCurrency(req.payoutAmount)}
                                    </TableCell>
                                    <TableCell className="font-mono text-[10px] font-bold">
                                        {req.hostUpi}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={req.status === 'Completed' ? 'default' : 'secondary'} className="text-[10px] py-0.5">
                                            {req.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {req.status === 'Pending Review' && (
                                            <div className="flex justify-end gap-2">
                                                <Button 
                                                    size="sm" 
                                                    className="h-8 bg-green-600 hover:bg-green-700"
                                                    onClick={() => handleUpdateStatus(req.hostId, req.id, 'Completed')}
                                                    disabled={processingId === req.id}
                                                >
                                                    {processingId === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                                </Button>
                                                <Button 
                                                    size="sm" 
                                                    variant="destructive" 
                                                    className="h-8"
                                                    onClick={() => handleUpdateStatus(req.hostId, req.id, 'Rejected')}
                                                    disabled={processingId === req.id}
                                                >
                                                    {processingId === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                        )}
                                        {req.status === 'Completed' && (
                                            <span className="text-[10px] font-bold text-green-600 flex items-center justify-end gap-1">
                                                <CheckCircle2 className="h-3 w-3" />
                                                Processed
                                            </span>
                                        )}
                                    </TableRow>
                            ))}
                            {withdrawals.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                                        No pending withdrawal requests found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
