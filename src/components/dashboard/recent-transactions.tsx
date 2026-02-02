import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import type { Transaction } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

interface RecentTransactionsProps {
  transactions: Transaction[];
  isLoading: boolean;
}

export function RecentTransactions({
  transactions,
  isLoading,
}: RecentTransactionsProps) {
  const recentTransactions = transactions.slice(0, 5);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>
            <Skeleton className="h-4 w-48" />
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="ml-4 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="ml-auto h-5 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Transactions</CardTitle>
        <CardDescription>
          You have {transactions.length} transactions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {recentTransactions.length > 0 ? (
          recentTransactions.map((transaction, index) => {
            const avatar = PlaceHolderImages.find(
              (p) => p.id === `user-avatar-${index + 1}`
            );
            return (
              <div key={transaction.id} className="flex items-center">
                <Avatar className="h-9 w-9">
                  {avatar && (
                    <AvatarImage
                      src={avatar.imageUrl}
                      alt="Avatar"
                      data-ai-hint={avatar.imageHint}
                    />
                  )}
                  <AvatarFallback>
                    {transaction.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="ml-4 space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {transaction.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {transaction.email}
                  </p>
                </div>
                <div className="ml-auto font-medium">
                  +{formatCurrency(transaction.amount)}
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex h-48 items-center justify-center text-center text-muted-foreground">
            No recent transactions.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
