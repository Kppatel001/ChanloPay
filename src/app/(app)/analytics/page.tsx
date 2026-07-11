'use client';

import { Header } from '@/components/layout/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useHostData } from '@/hooks/use-host-data';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, LineChart, Line,
} from 'recharts';
import { TrendingUp, Users, IndianRupee, Trophy } from 'lucide-react';

const inr = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
const axis = { stroke: 'hsl(var(--muted-foreground))', fontSize: 12, tickLine: false, axisLine: false };
const tooltipStyle = { borderRadius: '12px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', boxShadow: '0 8px 20px -8px rgba(0,0,0,0.2)' };

export default function AnalyticsPage() {
  const { transactions, isLoading } = useHostData();
  const s = transactions.filter((t) => t.status === 'Success');

  const total = s.reduce((a, t) => a + t.amount, 0);
  const avg = s.length ? Math.round(total / s.length) : 0;
  const highest = s.reduce((m, t) => Math.max(m, t.amount), 0);

  // Daily collection timeline (last 14 active days)
  const byDay = s.reduce((acc, t) => {
    const key = t.date.toISOString().slice(0, 10);
    acc[key] = (acc[key] || 0) + t.amount;
    return acc;
  }, {} as Record<string, number>);
  const timeline = Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14)
    .map(([date, amount]) => ({
      date: new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      amount,
    }));

  // Hourly distribution (0-23)
  const byHour = Array.from({ length: 24 }, (_, h) => ({ hour: `${h}`, amount: 0, count: 0 }));
  s.forEach((t) => { const h = t.date.getHours(); byHour[h].amount += t.amount; byHour[h].count += 1; });
  const hourly = byHour.filter((h) => h.count > 0);

  // Contribution amount buckets
  const buckets = [
    { label: '≤ ₹100', test: (a: number) => a <= 100 },
    { label: '₹101–500', test: (a: number) => a > 100 && a <= 500 },
    { label: '₹501–1k', test: (a: number) => a > 500 && a <= 1000 },
    { label: '₹1k–2k', test: (a: number) => a > 1000 && a <= 2000 },
    { label: '> ₹2k', test: (a: number) => a > 2000 },
  ].map((b) => ({ label: b.label, count: s.filter((t) => b.test(t.amount)).length }));

  // Top contributions
  const topContrib = [...s].sort((a, b) => b.amount - a.amount).slice(0, 5);

  const stat = [
    { label: 'Total Collection', value: inr(total), icon: IndianRupee, tint: 'text-primary bg-primary/10' },
    { label: 'Total Guests', value: String(s.length), icon: Users, tint: 'text-navy bg-navy/10' },
    { label: 'Average Gift', value: inr(avg), icon: TrendingUp, tint: 'text-success bg-success/10' },
    { label: 'Highest Gift', value: inr(highest), icon: Trophy, tint: 'text-secondary-foreground bg-secondary/20' },
  ];

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header pageTitle="Analytics" />
      <main className="flex flex-1 flex-col gap-6 p-4 md:p-8">
        {isLoading ? (
          <p className="text-muted-foreground">Loading analytics...</p>
        ) : s.length === 0 ? (
          <Card className="shadow-soft border-secondary/20">
            <CardContent className="flex h-48 flex-col items-center justify-center text-center text-muted-foreground">
              <TrendingUp className="mb-3 h-10 w-10 opacity-20" />
              <p className="font-medium">No data to analyze yet</p>
              <p className="text-sm">Once guests start paying, your insights will appear here.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {stat.map((c) => (
                <Card key={c.label} className="shadow-soft border-secondary/20">
                  <CardContent className="p-5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{c.label}</p>
                      <p className="mt-1.5 text-2xl font-bold font-headline">{c.value}</p>
                    </div>
                    <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${c.tint}`}>
                      <c.icon className="h-5 w-5" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="shadow-soft border-secondary/20">
              <CardHeader>
                <CardTitle>Collection Timeline</CardTitle>
                <CardDescription>Daily collection over recent active days.</CardDescription>
              </CardHeader>
              <CardContent className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timeline} margin={{ left: -10, right: 10 }}>
                    <defs>
                      <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="date" {...axis} />
                    <YAxis {...axis} tickFormatter={(v) => `₹${v}`} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v) => [inr(Number(v)), 'Collection']} />
                    <Area type="monotone" dataKey="amount" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#grad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="shadow-soft border-secondary/20">
                <CardHeader>
                  <CardTitle>Contribution Amounts</CardTitle>
                  <CardDescription>How many guests gave in each range.</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={buckets} margin={{ left: -10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="label" {...axis} />
                      <YAxis {...axis} allowDecimals={false} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v) => [v, 'Guests']} />
                      <Bar dataKey="count" fill="hsl(var(--chart-2))" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="shadow-soft border-secondary/20">
                <CardHeader>
                  <CardTitle>Hourly Collection</CardTitle>
                  <CardDescription>When contributions come in.</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={hourly} margin={{ left: -10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="hour" {...axis} tickFormatter={(h) => `${h}:00`} />
                      <YAxis {...axis} tickFormatter={(v) => `₹${v}`} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v) => [inr(Number(v)), 'Collection']} labelFormatter={(h) => `${h}:00`} />
                      <Line type="monotone" dataKey="amount" stroke="hsl(var(--chart-4))" strokeWidth={2.5} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card className="shadow-soft border-secondary/20">
              <CardHeader>
                <CardTitle>Top Contributions</CardTitle>
                <CardDescription>Your most generous guests.</CardDescription>
              </CardHeader>
              <CardContent className="divide-y divide-secondary/20">
                {topContrib.map((t, i) => (
                  <div key={t.id} className="flex items-center gap-3 py-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary/20 text-sm font-bold text-secondary-foreground">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{t.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{t.village} · {t.eventName}</p>
                    </div>
                    <span className="font-bold text-primary shrink-0">{inr(t.amount)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
