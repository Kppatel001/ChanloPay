
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
import { collection, query, getDocs, where } from 'firebase/firestore';
import type { Event, Transaction } from '@/lib/types';
import { Wallet2, ShieldCheck, TrendingUp } from 'lucide-react';

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
                    collection(firestore, `hosts/${user.uid}/events/${event.id}/transactions`),
                    where("status", "==", "Success")
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

  const totalCollected = transactions.reduce((sum, t) => sum + t.amount, 0);
  const eventsCount = events?.length ?? 0;

  // Wallet Logic: Only show balance for events where withdrawal HAS NOT been requested
  const walletBalance = events?.reduce((acc, event) => {
      if (event.withdrawalRequested) return acc;
      const eventTotal = transactions
        .filter(t => t.eventName === event.eventName)
        .reduce((sum, t) => sum + t.amount, 0);
      return acc + eventTotal;
  }, 0) || 0;

  // Chart Data
  const monthlyRevenue = transactions.reduce((acc, transaction) => {
    const month = transaction.date.toLocaleString('default', { month: 'short' });
    if (!acc[month]) acc[month] = { month: month, revenue: 0 };
    acc[month].revenue += transaction.amount;
    return acc;
  }, {} as Record<string, { month: string; revenue: number }>);
  const chartData = Object.values(monthlyRevenue);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header pageTitle="Platform Dashboard" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-primary text-primary-foreground border-none shadow-xl shadow-primary/20 overflow-hidden relative">
                <div className="absolute top-0 right-0 p-2 opacity-10">
                    <Wallet2 className="h-24 w-24" />
                </div>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold uppercase tracking-wider opacity-80 flex items-center gap-2 text-primary-foreground">
                        <Wallet2 className="h-4 w-4" />
                        Wallet Balance
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-black">{formatCurrency(walletBalance)}</div>
                    <p className="text-[10px] mt-2 opacity-70 flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3" />
                        Secured by ChanloPay Platform
                    </p>
                </CardContent>
            </Card>

            <Card className="border-primary/10 shadow-md">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Total Lifetime
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(totalCollected)}</div>
                </CardContent>
            </Card>

            <Card className="border-primary/10 shadow-md">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Active Events</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{eventsCount}</div>
                </CardContent>
            </Card>

            <Card className="border-primary/10 shadow-md">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Fee Rate</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-primary">2.0%</div>
                </CardContent>
            </Card>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="lg:col-span-4 border-primary/10">
            <CardHeader>
              <CardTitle>Collection Growth</CardTitle>
              <CardDescription>Monthly platform collection trends.</CardDescription>
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
