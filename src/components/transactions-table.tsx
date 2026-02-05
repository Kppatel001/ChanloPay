'use client';

import { useState, useEffect } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { collection, query, getDocs } from 'firebase/firestore';
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
import { FileDown, Loader2, User } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

// Augment jsPDF with autoTable
interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

export function TransactionsTable() {
  const { user } = useUser();
  const firestore = useFirestore();
  const searchParams = useSearchParams();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const page = Number(searchParams.get('page')) || 1;
  const perPage = 10;

  useEffect(() => {
    if (!firestore || !user) {
      if (!user) setIsLoading(false);
      return;
    }

    const fetchAllTransactions = async () => {
      setIsLoading(true);
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
                email: data.email || 'N/A',
                status: data.status || 'Success',
                type: data.type || 'Gift',
                date: data.transactionDate
                  ? new Date(data.transactionDate)
                  : new Date(),
                eventName: event.eventName,
              });
            });
          }
        })
      );

      setTransactions(
        allTransactions.sort((a, b) => b.date.getTime() - a.date.getTime())
      );
      setIsLoading(false);
    };

    fetchAllTransactions();
  }, [firestore, user]);

  const start = (page - 1) * perPage;
  const end = start + perPage;
  const paginatedTransactions = transactions.slice(start, end);
  const totalPages = Math.ceil(transactions.length / perPage);

  const getStatusVariant = (status: Transaction['status']) => {
    switch (status) {
      case 'Success':
        return 'default';
      case 'Pending':
        return 'secondary';
      case 'Failed':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);

  const handleExportPDF = () => {
    const doc = new jsPDF() as jsPDFWithAutoTable;
    doc.autoTable({
      head: [['Event', 'Guest Name', 'Amount', 'Date', 'Status']],
      body: transactions.map((t) => [
        t.eventName,
        t.name,
        formatCurrency(t.amount),
        t.date.toLocaleDateString(),
        t.status,
      ]),
    });
    doc.save('guest_payments.pdf');
  };

  const handleExportExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      transactions.map((t) => ({
        Event: t.eventName,
        'Guest Name': t.name,
        Amount: t.amount,
        Date: t.date,
        Status: t.status,
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
          <CardTitle>Guest Payments</CardTitle>
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Guest Payment History</CardTitle>
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
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Guest Full Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
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
                      <Badge variant={getStatusVariant(transaction.status)}>
                        {transaction.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(transaction.amount)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No guest payments recorded yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between pt-4">
          <div className="text-sm text-muted-foreground">
            Showing {transactions.length > 0 ? start + 1 : 0} to{' '}
            {Math.min(end, transactions.length)} of {transactions.length}{' '}
            recorded payments.
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
  );
}
