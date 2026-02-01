import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { transactions } from '@/lib/mock-data';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export function RecentTransactions() {
  const recentTransactions = transactions.slice(0, 5);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Transactions</CardTitle>
        <CardDescription>
          You made {transactions.length} transactions this month.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {recentTransactions.map((transaction, index) => {
          const avatar = PlaceHolderImages.find(p => p.id === `user-avatar-${index + 1}`);
          return (
            <div key={transaction.id} className="flex items-center">
              <Avatar className="h-9 w-9">
                {avatar && <AvatarImage src={avatar.imageUrl} alt="Avatar" data-ai-hint={avatar.imageHint} />}
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
        })}
      </CardContent>
    </Card>
  );
}
