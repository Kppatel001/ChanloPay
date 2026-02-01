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
import { transactions } from '@/lib/mock-data';
import type { Transaction } from '@/lib/types';
import Link from 'next/link';

type TransactionsTableProps = {
  page: number;
  perPage: number;
};

export async function TransactionsTable({
  page,
  perPage,
}: TransactionsTableProps) {
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
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Transaction ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedTransactions.length > 0 ? (
              paginatedTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell className="font-medium">
                    {transaction.id}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(transaction.status)}>
                      {transaction.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{transaction.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {transaction.email}
                    </div>
                  </TableCell>
                  <TableCell>{transaction.type}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(transaction.amount)}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  No transactions yet.
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
          transactions.
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
    </>
  );
}
