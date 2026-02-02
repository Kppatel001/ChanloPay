'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { StatsCards } from '@/components/dashboard/stats-cards';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { OverviewChart } from '@/components/dashboard/overview-chart';
import { RecentTransactions } from '@/components/dashboard/recent-transactions';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, getDocs } from 'firebase/firestore';
import type { Event, Transaction } from '@/lib/types';

export default function DashboardPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isTransactionsLoading, setTransactionsLoading] = useState(true);

  const eventsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, `hosts/${user.uid}/events`));
  }, [user, firestore]);

  const { data: events, isLoading: areEventsLoading } = useCollection<Event>(eventsQuery);

  useEffect(() => {
    if (!firestore || !user || areEventsLoading) {
      if (!areEventsLoading) {
        setTransactionsLoading(false);
      }
      return;
    }

    const fetchTransactions = async () => {
      setTransactionsLoading(true);
      if (!events || events.length === 0) {
        setTransactions([]);
        setTransactionsLoading(false);
        return;
      }

      const allTransactions: Transaction[] = [];
      // Fetch transactions for all events
      await Promise.all(
        events.map(async (event) => {
          if (event.id) {
            const transactionsQuery = query(
              collection(firestore, `hosts/${user.uid}/events/${event.id}/transactions`)
            );
            const querySnapshot = await getDocs(transactionsQuery);
            querySnapshot.forEach((doc) => {
              const data = doc.data();
              // Adapt firestore data to the Transaction type used in UI components
              allTransactions.push({
                id: doc.id,
                amount: data.amount || 0,
                name: data.name || 'Unknown User',
                email: data.email || 'N/A',
                status: data.status || 'Success',
                type: data.type || 'Gift',
                date: data.transactionDate ? new Date(data.transactionDate) : new Date(),
              });
            });
          }
        })
      );

      setTransactions(allTransactions.sort((a, b) => b.date.getTime() - a.date.getTime()));
      setTransactionsLoading(false);
    };

    fetchTransactions();
  }, [firestore, user, events, areEventsLoading]);
  
  const isLoading = areEventsLoading || isTransactionsLoading;

  const totalRevenue = transactions
    .filter((t) => t.status === 'Success')
    .reduce((sum, t) => sum + t.amount, 0);

  const successfulTransactionsCount = transactions.filter(
    (t) => t.status === 'Success'
  ).length;

  const eventsCount = events?.length ?? 0;

  const monthlyRevenue = transactions.reduce((acc, transaction) => {
    if (transaction.status === 'Success') {
      const month = transaction.date.toLocaleString('default', { month: 'short' });
      if (!acc[month]) {
        acc[month] = { month: month, revenue: 0 };
      }
      acc[month].revenue += transaction.amount;
    }
    return acc;
  }, {} as Record<string, { month: string; revenue: number }>);
  
  const chartData = Object.values(monthlyRevenue);

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header pageTitle="Dashboard" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <StatsCards
          totalRevenue={totalRevenue}
          totalTransactions={successfulTransactionsCount}
          eventsCount={eventsCount}
          isLoading={isLoading}
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="lg:col-span-4">
            <CardHeader>
              <CardTitle>Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <OverviewChart data={chartData} isLoading={isLoading} />
            </CardContent>
          </Card>
          <div className="lg:col-span-3">
            <RecentTransactions
              transactions={transactions}
              isLoading={isLoading}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
