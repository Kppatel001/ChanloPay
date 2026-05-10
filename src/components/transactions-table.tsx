
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
import { FileDown, Loader2, User, Trash2, Home, RefreshCw, MessageCircle, Phone, Eye, Download, ShieldCheck, CheckCircle2, AlertTriangle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Logo } from '@/components/icons';

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
                status: data.status || 'Success',
                type: data.type || 'Gift',
                receiptStatus: data.receiptStatus,
                receiptId: data.receiptId,
                paymentMethod: data.paymentMethod,
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
      head: [['Event', 'Guest Name', 'Village', 'Amount', 'Date', 'Method']],
      body: transactions.map((t) => [
        t.eventName,
        t.name,
        t.village || 'N/A',
        formatCurrency(t.amount),
        t.date.toLocaleDateString(),
        t.paymentMethod || 'UPI'
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
        Amount: t.amount,
        Date: t.date,
        Method: t.paymentMethod || 'UPI'
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
          <CardTitle>Digital Ledger</CardTitle>
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
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-2xl font-black uppercase tracking-tighter">Verified Ledger</CardTitle>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" /> Permanent Transaction Records
            </p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button variant="outline" size="sm" className="flex-1 sm:flex-none font-bold" onClick={() => fetchAllTransactions()}>
               <RefreshCw className="mr-2 h-4 w-4" />
               Refresh
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex-1 sm:flex-none font-bold">
                  <FileDown className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportPDF} className="font-bold">
                  Export as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportExcel} className="font-bold">
                  Export as Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border overflow-x-auto shadow-sm">
            <Table className="min-w-[700px]">
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="font-black uppercase tracking-widest text-[10px]">Event</TableHead>
                  <TableHead className="font-black uppercase tracking-widest text-[10px]">Guest Details</TableHead>
                  <TableHead className="font-black uppercase tracking-widest text-[10px]">Village / Mobile</TableHead>
                  <TableHead className="font-black uppercase tracking-widest text-[10px]">Method</TableHead>
                  <TableHead className="text-right font-black uppercase tracking-widest text-[10px]">Amount</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTransactions.length > 0 ? (
                  paginatedTransactions.map((transaction) => (
                    <TableRow key={transaction.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-bold truncate max-w-[150px]">
                        {transaction.eventName}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="bg-primary/10 p-1.5 rounded-full text-primary shrink-0">
                            <User className="h-3 w-3" />
                          </div>
                          <span className="font-bold truncate max-w-[120px]">{transaction.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-[10px] md:text-xs font-medium">
                            <Home className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span className="truncate max-w-[100px]">{transaction.village || 'N/A'}</span>
                          </div>
                          {transaction.mobile && (
                            <div className="flex items-center gap-2 text-[10px] md:text-xs text-muted-foreground">
                              <Phone className="h-3 w-3 shrink-0" />
                              <span className="font-mono">{transaction.mobile}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge variant="outline" className="w-fit text-[9px] h-4 uppercase font-black tracking-widest">
                            {transaction.paymentMethod || 'UPI'}
                          </Badge>
                          {transaction.receiptStatus === 'Sent' && (
                             <div className="flex items-center gap-1 text-[9px] text-success-green font-bold uppercase">
                               <MessageCircle className="h-3 w-3" />
                               WA Sent
                             </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-black text-primary">
                        {formatCurrency(transaction.amount)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 justify-end">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-primary hover:bg-primary/10"
                            onClick={() => handleViewReceipt(transaction)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-48 text-center text-muted-foreground uppercase font-bold text-xs"
                    >
                      No verified payments in ledger.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl mt-6 flex items-start gap-3">
             <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
             <div className="space-y-1">
                <p className="text-xs font-black text-amber-800 uppercase tracking-widest">Hard Rule: Immutable Ledger</p>
                <p className="text-[10px] text-amber-700 font-medium">
                  To prevent fraud, transactions cannot be edited or deleted. If a mistake was made, please record a reversal entry or contact support for administrative correction.
                </p>
             </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6">
            <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
              Record {transactions.length > 0 ? start + 1 : 0} - {Math.min(end, transactions.length)} of {transactions.length}
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                asChild
                variant="outline"
                size="sm"
                className="flex-1 sm:flex-none font-bold uppercase text-[10px] tracking-widest h-8"
                disabled={page <= 1}
              >
                <Link href={`/transactions?page=${page - 1}`}>Previous</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="flex-1 sm:flex-none font-bold uppercase text-[10px] tracking-widest h-8"
                disabled={page >= totalPages}
              >
                <Link href={`/transactions?page=${page + 1}`}>Next</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isReceiptOpen} onOpenChange={setIsReceiptOpen}>
        <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden bg-white border-none shadow-2xl rounded-[2rem]">
          <DialogHeader className="sr-only">
            <DialogTitle>Digital Receipt</DialogTitle>
          </DialogHeader>
          <div className="bg-primary p-8 text-primary-foreground flex flex-col items-center gap-3">
            <Logo className="h-12 w-12 text-white" />
            <div className="text-center">
              <h2 className="text-2xl font-black uppercase tracking-tighter">Verified Receipt</h2>
              <p className="text-[9px] opacity-70 uppercase font-black tracking-[0.2em]">Transaction Logged Successfully</p>
            </div>
          </div>
          
          <div className="p-8 space-y-8">
            <div className="flex justify-between items-start pb-6 border-b border-muted">
              <div className="space-y-1">
                <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest">Guest Details</p>
                <p className="text-base font-black text-foreground truncate max-w-[140px]">{selectedTransaction?.name}</p>
                <p className="text-[10px] text-muted-foreground font-bold uppercase truncate max-w-[140px]">{selectedTransaction?.village}</p>
              </div>
              <div className="text-right space-y-1">
                <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest">Amount Paid</p>
                <p className="text-2xl font-black text-primary">{formatCurrency(selectedTransaction?.amount || 0)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-y-6 gap-x-4">
              <div className="space-y-1">
                <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest">Event Name</p>
                <p className="text-xs font-bold truncate">{selectedTransaction?.eventName}</p>
              </div>
              <div className="space-y-1 text-right">
                <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest">Date Recorded</p>
                <p className="text-xs font-bold">{selectedTransaction?.date.toLocaleDateString()}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest">Receipt ID</p>
                <p className="text-[10px] font-mono font-bold text-primary">{selectedTransaction?.receiptId}</p>
              </div>
              <div className="space-y-1 text-right">
                <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest">Method</p>
                <p className="text-xs font-bold uppercase">{selectedTransaction?.paymentMethod || 'UPI'}</p>
              </div>
            </div>

            <div className="bg-success-green/5 p-4 rounded-xl border border-success-green/10 flex items-center gap-3">
              <CheckCircle2 className="h-4 w-4 text-success-green shrink-0" />
              <div className="flex-1">
                <p className="text-[10px] font-black text-success-green uppercase tracking-widest">Digital Acknowledgment</p>
                <p className="text-[9px] text-muted-foreground font-medium">Receipt {selectedTransaction?.receiptStatus === 'Sent' ? 'delivered to' : 'pending for'} {selectedTransaction?.mobile}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 pt-2">
               <Button className="w-full h-12 font-black uppercase tracking-widest text-xs bg-[#1A237E] hover:bg-[#1A237E]/90" onClick={() => setIsReceiptOpen(false)}>
                 Close Receipt
               </Button>
            </div>
          </div>
          
          <div className="bg-muted/30 p-4 text-center">
            <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Verified Digital Record Secured by ChanloPay</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
