import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TransactionsTable } from '@/components/transactions-table';

type TransactionsPageProps = {
  searchParams: {
    page?: string;
  };
};

export default function TransactionsPage({
  searchParams,
}: TransactionsPageProps) {
  const page = Number(searchParams.page) || 1;
  const perPage = 10;

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header pageTitle="Transactions" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
          </CardHeader>
          <CardContent>
            <TransactionsTable page={page} perPage={perPage} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
