'use client';

import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { StatsCards } from '@/components/dashboard/stats-cards';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { OverviewChart } from '@/components/dashboard/overview-chart';
import { RecentTransactions } from '@/components/dashboard/recent-transactions';
import { useUser } from '@/firebase';
import { useHostData } from '@/hooks/use-host-data';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as ChartTooltip,
} from 'recharts';
import { CalendarPlus, ReceiptText, BarChart3, QrCode, Share2, Sparkles } from 'lucide-react';

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const quickActions = [
  { href: '/events', label: 'Create Event', icon: CalendarPlus },
  { href: '/events', label: 'Event QR', icon: QrCode },
  { href: '/transactions', label: 'Payment History', icon: ReceiptText },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/events', label: 'Share Event', icon: Share2 },
];

export default function DashboardPage() {
  const { user } = useUser();
  const { events, transactions, isLoading } = useHostData();

  const successful = transactions.filter((t) => t.status === 'Success');
  const totalRevenue = successful.reduce((s, t) => s + t.amount, 0);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayCollection = successful
    .filter((t) => t.date >= startOfToday)
    .reduce((s, t) => s + t.amount, 0);

  // Monthly revenue keyed YYYY-MM, chronological
  const monthly = successful.reduce((acc, t) => {
    const d = t.date;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
    if (!acc[key]) acc[key] = { key, month: label, revenue: 0 };
    acc[key].revenue += t.amount;
    return acc;
  }, {} as Record<string, { key: string; month: string; revenue: number }>);
  const chartData = Object.values(monthly).sort((a, b) => a.key.localeCompare(b.key)).map(({ month, revenue }) => ({ month, revenue }));

  // Gift-type breakdown
  const breakdown = successful.reduce((acc, t) => {
    const type = t.type || 'Gift';
    acc[type] = (acc[type] || 0) + t.amount;
    return acc;
  }, {} as Record<string, number>);
  const pieData = Object.entries(breakdown).map(([name, value]) => ({ name, value }));

  // Per-event progress (relative to top event)
  const perEvent = events
    .map((e) => {
      const evTxns = successful.filter((t) => t.eventId === e.id);
      return { id: e.id, name: e.eventName, total: evTxns.reduce((s, t) => s + t.amount, 0), count: evTxns.length };
    })
    .sort((a, b) => b.total - a.total);
  const topTotal = perEvent[0]?.total || 1;

  const firstName = user?.email?.split('@')[0] ?? 'Host';

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header pageTitle="Dashboard" />
      <main className="flex flex-1 flex-col gap-6 p-4 md:p-8">
        {/* Welcome banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-[hsl(351_55%_22%)] p-6 text-primary-foreground shadow-soft">
          <div className="relative z-10">
            <p className="text-xs uppercase tracking-[0.2em] text-secondary/90 font-bold flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" /> Welcome back
            </p>
            <h2 className="mt-1 font-headline text-2xl md:text-3xl font-bold capitalize">{firstName}</h2>
            <p className="mt-1 text-sm text-primary-foreground/80 max-w-lg">
              Here&apos;s how your events are performing. Create an event, share the QR, and watch the blessings come in.
            </p>
          </div>
          <QrCode className="absolute -right-6 -bottom-6 h-40 w-40 text-secondary/15" />
        </div>

        <StatsCards
          todayCollection={todayCollection}
          totalRevenue={totalRevenue}
          totalGuests={successful.length}
          activeEvents={events.length}
          isLoading={isLoading}
        />

        {/* Quick actions */}
        <div>
          <h3 className="mb-3 font-headline text-lg font-semibold">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {quickActions.map((a) => (
              <Button
                key={a.label}
                asChild
                variant="outline"
                className="h-auto flex-col gap-2 py-4 border-secondary/30 hover:border-primary/40 hover:bg-primary/5 shadow-sm"
              >
                <Link href={a.href}>
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <a.icon className="h-5 w-5" />
                  </span>
                  <span className="text-xs font-semibold text-center">{a.label}</span>
                </Link>
              </Button>
            ))}
          </div>
        </div>

        {/* Charts */}
        <div className="grid gap-4 lg:grid-cols-7">
          <Card className="lg:col-span-4 shadow-soft border-secondary/20">
            <CardHeader>
              <CardTitle>Collection Overview</CardTitle>
              <CardDescription>Monthly growth of contributions.</CardDescription>
            </CardHeader>
            <CardContent>
              <OverviewChart data={chartData} isLoading={isLoading} />
            </CardContent>
          </Card>

          <Card className="lg:col-span-3 shadow-soft border-secondary/20">
            <CardHeader>
              <CardTitle>Contribution Breakdown</CardTitle>
              <CardDescription>By gift category.</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              {isLoading ? (
                <div className="flex h-full items-center justify-center text-muted-foreground">Loading...</div>
              ) : pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} innerRadius={60} outerRadius={85} paddingAngle={4} dataKey="value">
                      {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <ChartTooltip formatter={(v) => `₹${v}`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground text-sm">No breakdown data yet.</div>
              )}
            </CardContent>
       