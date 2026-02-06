'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { StatsCards } from '@/components/dashboard/stats-cards';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { OverviewChart } from '@/components/dashboard/overview-chart';
import { RecentTransactions } from '@/components/dashboard/recent-transactions';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, getDocs } from 'firebase/firestore';
import type { Event, Transaction } from '@/lib/types';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as ChartTooltip } from 'recharts';

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
      if (!areEventsLoading && (!events || events.length === 0)) {
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

      try {
        const allTransactions: Transaction[] = [];
        await Promise.all(
            events.map(async (event) => {
            if (event.id) {
                const transactionsQuery = query(
                collection(firestore, `hosts/${user.uid}/events/${event.id}/transactions`)
                );
                const querySnapshot = await getDocs(transactionsQuery);
                querySnapshot.forEach((doc) => {
                const data = doc.data();
                allTransactions.push({
                    id: doc.id,
                    amount: data.amount || 0,
                    name: data.name || 'Guest',
                    village: data.village || 'N/A',
                    email: data.email || 'N/A',
                    status: data.status || 'Success',
                    type: data.type || 'Gift',
                    date: data.transactionDate ? new Date(data.transactionDate) : new Date(),
                    eventName: event.eventName,
                });
                });
            }
            })
        );

        setTransactions(allTransactions.sort((a, b) => b.date.getTime() - a.date.getTime()));
      } catch (error) {
        console.error("Dashboard: Error fetching transactions:", error);
      } finally {
        setTransactionsLoading(false);
      }
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

  // Overview Chart Data (Revenue by Month)
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

  // Gift Type Breakdown Data
  const giftTypeBreakdown = transactions.reduce((acc, t) => {
    if (t.status === 'Success') {
      const type = t.type || 'Gift';
      acc[type] = (acc[type] || 0) + t.amount;
    }
    return acc;
  }, {} as Record<string, number>);

  const pieChartData = Object.entries(giftTypeBreakdown).map(([name, value]) => ({
    name,
    value,
  }));

  const COLORS = ['#9400D3', '#D30028', '#E6E0EB', '#4b5563'];

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
              <CardTitle>Revenue Overview</CardTitle>
              <CardDescription>Monthly growth of wedding contributions.</CardDescription>
            </CardHeader>
            <CardContent>
              <OverviewChart data={chartData} isLoading={isLoading} />
            </CardContent>
          </Card>
          
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Contribution Breakdown</CardTitle>
              <CardDescription>Revenue by gift type category.</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              {isLoading ? (
                <div className="flex h-full items-center justify-center">Loading...</div>
              ) : pieChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip 
                      formatter={(value) => `₹${value}`}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                  No breakdown data available.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-1">
          <RecentTransactions
            transactions={transactions}
            isLoading={isLoading}
          />
        </div>
      </main>
    </div>
  );
}