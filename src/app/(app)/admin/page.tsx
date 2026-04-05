
'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/header';
import { useUser, useFirestore } from '@/firebase';
import { collection, query, orderBy, onSnapshot, DocumentData, QuerySnapshot } from 'firebase/firestore';
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
import { ShieldAlert, CheckCircle2, XCircle, Loader2, IndianRupee, Clock } from 'lucide-react';
import { updateWithdrawalStatus } from '@/app/actions/api';
import { useToast } from '@/hooks/use-toast';

export default function AdminPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (!firestore || user?.email !== 'admin@chanlopay.com') {
        if (user && user.email !== 'admin@chanlopay.com') {
            setIsLoading(false);
        }
        return;
    }

    // Standard collection query on root "withdrawals" (No composite index needed for single field orderBy)
    const q = query(collection(firestore, 'withdrawals'), orderBy('requestDate', 'desc'));
    
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
      <div className="flex h-screen flex-col items-center justify-center p-4 text-center bg-muted/10">
        <ShieldAlert className="h-20 w-20 text-destructive mb-4 animate-pulse" />
        <h1 className="text-3xl font-black mb-2 uppercase tracking-tighter">Access Forbidden</h1>
        <p className="text-muted-foreground max-w-md font-medium">
          Only authorized platform administrators can access the payout management system.
        </p>
      </div>
    );
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: IndianRupee ? 'currency' : 'decimal', currency: 'INR' }).format(amount);

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/5">
      <Header pageTitle="Payout Control Center" />
      <main className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
                <h2 className="text-3xl font-black tracking-tighter flex items-center gap-2">
                    Global Payout Queue
                </h2>
                <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Verification and Funds Release Engine</p>
            </div>
            <div className="flex gap-2">
                <Badge variant="outline" className="h-10 px-4 font-bold border-primary/20 bg-white text-primary flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {withdrawals.filter(w => w.status === 'Pending Review').length} Pending
                </Badge>
                <Badge variant="outline" className="h-10 px-4 font-bold border-green-200 bg-white text-green-600 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    {withdrawals.filter(w => w.status === 'Completed').length} Processed
                </Badge>
            </div>
        </div>

        <Card className="border-none shadow-2xl overflow-hidden rounded-2xl">
          <CardHeader className="bg-primary p-8 text-primary-foreground">
            <CardTitle className="text-xl">Active Withdrawal Requests</CardTitle>
            <CardDescription className="text-primary-foreground/80 font-medium">
              Review every collection before authorizing bank transfers.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
                <div className="flex h-64 items-center justify-center">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="font-bold uppercase text-[10px]">Host / Event Details</TableHead>
                                <TableHead className="font-bold uppercase text-[10px]">Requested Date</TableHead>
                                <TableHead className="font-bold uppercase text-[10px]">Financial Summary</TableHead>
                                <TableHead className="font-bold uppercase text-[10px]">Payout UPI</TableHead>
                                <TableHead className="font-bold uppercase text-[10px]">Platform Status</TableHead>
                                <TableHead className="text-right font-bold uppercase text-[10px]">Decision</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="bg-white">
                            {withdrawals.map((req) => (
                                <TableRow key={req.id} className="hover:bg-primary/5 transition-colors border-b">
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-black text-sm uppercase tracking-tight">{req.hostName}</span>
                                            <span className="text-[11px] text-muted-foreground font-bold">{req.eventName}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-xs font-bold text-muted-foreground">
                                        {new Date(req.requestDate).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-black text-foreground">Total: {formatCurrency(req.totalAmount)}</span>
                                            <span className="text-[10px] text-destructive font-bold">Fee (2%): -{formatCurrency(req.platformFee)}</span>
                                            <span className="text-sm font-black text-primary mt-1">Payout: {formatCurrency(req.payoutAmount)}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <code className="bg-muted px-2 py-1 rounded text-[10px] font-bold text-primary">
                                                {req.hostUpi}
                                            </code>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge 
                                            variant={req.status === 'Completed' ? 'default' : 'secondary'} 
                                            className={`text-[10px] py-1 px-3 uppercase font-black ${req.status === 'Completed' ? 'bg-green-600' : ''}`}
                                        >
                                            {req.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {req.status === 'Pending Review' ? (
                                            <div className="flex justify-end gap-2">
                                                <Button 
                                                    size="sm" 
                                                    className="h-9 px-4 bg-green-600 hover:bg-green-700 font-bold"
                                                    onClick={() => handleUpdateStatus(req.hostId, req.id, 'Completed')}
                                                    disabled={processingId === req.id}
                                                >
                                                    {processingId === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                                                    Approve
                                                </Button>
                                                <Button 
                                                    size="sm" 
                                                    variant="destructive" 
                                                    className="h-9 px-4 font-bold"
                                                    onClick={() => handleUpdateStatus(req.hostId, req.id, 'Rejected')}
                                                    disabled={processingId === req.id}
                                                >
                                                    {processingId === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
                                                    Reject
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-end">
                                                <span className={`text-[10px] font-black uppercase flex items-center gap-1 ${req.status === 'Completed' ? 'text-green-600' : 'text-destructive'}`}>
                                                    {req.status === 'Completed' ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                                    Record {req.status}
                                                </span>
                                                <span className="text-[9px] text-muted-foreground font-bold">Actioned on {new Date().toLocaleDateString()}</span>
                                            </div>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {withdrawals.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-64 text-center">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <div className="bg-muted p-4 rounded-full">
                                                <ShieldAlert className="h-8 w-8 text-muted-foreground" />
                                            </div>
                                            <p className="font-black uppercase tracking-widest text-muted-foreground text-sm">No Payout Requests Pending</p>
                                        </div>
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
