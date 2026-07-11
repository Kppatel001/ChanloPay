import { Header } from '@/components/layout/header';
import { TransactionsTable } from '@/components/transactions-table';

export default function TransactionsPage() {
  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header pageTitle="Transactions" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <TransactionsTable />
      </main>
    </div>
  );
}
