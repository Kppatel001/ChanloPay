'use client';

import { useState, useEffect } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { collection, query, getDocs, doc, deleteDoc } from 'firebase/firestore';
import type { Event, Transaction } from '@/lib/types';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import {
  Card,
  CardContent,
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
import { FileDown, Loader2, User, Trash2, Home, RefreshCw, MessageCircle, Phone, Eye, Download, ShieldCheck, CheckCircle2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Logo } from '@/components/icons';

// Augment jsPDF with autoTable
interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

export function TransactionsTable() {
  const { user } = useUser();
  const firestore = useFirestore();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  const page = Number(searchParams.get('page')) || 1;
  const perPage = 10;

  const fetchAllTransactions = async () => {
    if (!firestore || !user) return;
    
    setIsLoading(true);
    try {
        const eventsQuery = query(
        collection(firestore, `hosts/${user.uid}/events`)
        );
        const eventsSnapshot = await getDocs(eventsQuery);
        const events = eventsSnapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
        })) as Event[];

        if (events.length === 0) {
        setTransactions([]);
        setIsLoading(false);
        return;
        }

        const allTransactions: Transaction[] = [];
        await Promise.all(
        events.map(async (event) => {
            if (event.id) {
            const transactionsQuery = query(
                collection(
                firestore,
                `hosts/${user.uid}/events/${event.id}/transactions`
                )
            );
            const querySnapshot = await getDocs(transactionsQuery);
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                allTransactions.push({
                id: doc.id,
                amount: data.amount || 0,
                name: data.name || 'Guest',
                village: data.village || 'N/A',
                mobile: data.mobile || 'N/A',
                email: data.email || 'N/A',
                status: data.status || 'Success',
                type: data.type || 'Gift',
                receiptStatus: data.receiptStatus,
                receiptId: data.receiptId,
                date: data.transactionDate
                    ? new Date(data.transactionDate)
                    : new Date(),
                eventName: event.eventName,
                eventId: event.id,
                language: data.language || 'en',
                });
            });
            }
        })
        );

        setTransactions(
        allTransactions.sort((a, b) => b.date.getTime() - a.date.getTime())
        );
    } catch (error) {
        console.error("Error fetching transactions:", error);
    } finally {
        setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllTransactions();
  }, [firestore, user]);

  const handleDeleteTransaction = async (transactionId: string, eventId?: string) => {
    if (!user || !firestore || !eventId) return;

    const txnRef = doc(firestore, `hosts/${user.uid}/events/${eventId}/transactions`, transactionId);

    deleteDoc(txnRef)
      .then(() => {
        toast({
          title: "Payment Deleted",
          description: "The record has been removed.",
        });
        setTransactions(prev => prev.filter(t => t.id !== transactionId));
      })
      .catch(async () => {
        const permissionError = new FirestorePermissionError({
          path: txnRef.path,
          operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  const handleViewReceipt = (t: Transaction) => {
    setSelectedTransaction(t);
    setIsReceiptOpen(true);
  };

  const start = (page - 1) * perPage;
  const end = start + perPage;
  const paginatedTransactions = transactions.slice(start, end);
  const totalPages = Math.ceil(transactions.length / perPage);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);

  const handleExportPDF = () => {
    const doc = new jsPDF() as jsPDFWithAutoTable;
    doc.autoTable({
      head: [['Event', 'Guest Name', 'Village', 'Mobile', 'Amount', 'Date']],
      body: transactions.map((t) => [
        t.eventName,
        t.name,
        t.village || 'N/A',
        t.mobile || 'N/A',
        formatCurrency(t.amount),
        t.date.toLocaleDateString(),
      ]),
    });
    doc.save('guest_payments.pdf');
  };

  const handleExportExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      transactions.map((t) => ({
        Event: t.eventName,
        'Guest Name': t.name,
        Village: t.village || 'N/A',
        Mobile: t.mobile || 'N/A',
        Amount: t.amount,
        Date: t.date,
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Payments');
    XLSX.writeFile(workbook, 'guest_payments.xlsx');
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Guest Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Guest Payment History</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => fetchAllTransactions()}>
               <RefreshCw className="mr-2 h-4 w-4" />
               Refresh
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <FileDown className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportPDF}>
                  Export as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportExcel}>
                  Export as Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Guest Full Name</TableHead>
                  <TableHead>Village / Mobile</TableHead>
                  <TableHead>Status / Receipt</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTransactions.length > 0 ? (
                  paginatedTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-medium">
                        {transaction.eventName}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{transaction.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-xs">
                            <Home className="h-3 w-3 text-muted-foreground" />
                            <span>{transaction.village || 'N/A'}</span>
                          </div>
                          {transaction.mobile && transaction.mobile !== 'N/A' && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              <span>{transaction.mobile}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge variant="default" className="w-fit text-[10px] h-4">
                            {transaction.status}
                          </Badge>
                          {transaction.receiptStatus === 'Sent' && (
                             <div className="flex items-center gap-1 text-[10px] text-green-600 font-bold">
                               <MessageCircle className="h-3 w-3" />
                               WA Sent
                             </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(transaction.amount)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 justify-end">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-primary"
                            onClick={() => handleViewReceipt(transaction)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Record?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete the payment record for {transaction.name}? This cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDeleteTransaction(transaction.id, transaction.eventId)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No payments found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between pt-4">
            <div className="text-sm text-muted-foreground">
              Showing {transactions.length > 0 ? start + 1 : 0} to{' '}
              {Math.min(end, transactions.length)} of {transactions.length} recorded payments.
            </div>
            <div className="flex gap-2">
              <Button
                asChild
                variant="outline"
                size="sm"
                disabled={page <= 1}
              >
                <Link href={`/transactions?page=${page - 1}`}>Previous</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
              >
                <Link href={`/transactions?page=${page + 1}`}>Next</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Digital Receipt Dialog */}
      <Dialog open={isReceiptOpen} onOpenChange={setIsReceiptOpen}>
        <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden bg-white border-0">
          <div className="bg-primary p-6 text-primary-foreground flex flex-col items-center gap-2">
            <Logo className="h-10 w-10 text-white" />
            <div className="text-center">
              <h2 className="text-2xl font-bold tracking-tight">Receipt</h2>
              <p className="text-xs opacity-80 uppercase tracking-widest">Transaction Successfully Verified</p>
            </div>
          </div>
          
          <div className="p-8 space-y-6">
            <div className="flex justify-between items-center pb-4 border-b">
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Payer Details</p>
                <p className="text-sm font-bold">{selectedTransaction?.name}</p>
                <p className="text-xs text-muted-foreground">{selectedTransaction?.village}</p>
              </div>
              <div className="text-right space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Amount Paid</p>
                <p className="text-xl font-black text-primary">{formatCurrency(selectedTransaction?.amount || 0)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Event</p>
                <p className="text-xs font-semibold">{selectedTransaction?.eventName}</p>
              </div>
              <div className="space-y-1 text-right">
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Date</p>
                <p className="text-xs font-semibold">{selectedTransaction?.date.toLocaleDateString()}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Receipt ID</p>
                <p className="text-[11px] font-mono font-bold text-primary">{selectedTransaction?.receiptId}</p>
              </div>
              <div className="space-y-1 text-right">
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Method</p>
                <p className="text-xs font-semibold">{selectedTransaction?.paymentMethod || 'UPI'}</p>
              </div>
            </div>

            <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <p className="text-xs font-bold text-primary">WhatsApp Acknowledgment</p>
                <p className="text-[10px] text-muted-foreground">Digital receipt {selectedTransaction?.receiptStatus === 'Sent' ? 'delivered to' : 'attempted for'} +91 {selectedTransaction?.mobile}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 justify-center py-2">
              <ShieldCheck className="h-3 w-3 text-muted-foreground" />
              <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">Firewall Secured by ChanloPay</span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-4">
               <Button variant="outline" className="w-full h-10 text-xs font-bold" onClick={() => setIsReceiptOpen(false)}>
                 Close
               </Button>
               <Button className="w-full h-10 text-xs font-bold gap-2">
                 <Download className="h-3 w-3" />
                 Download PDF
               </Button>
            </div>
          </div>
          
          <div className="bg-muted/30 p-4 text-center">
            <p className="text-[9px] text-muted-foreground">This is a system-generated electronic receipt. No physical signature is required.</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
