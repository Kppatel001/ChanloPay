'use client';

import { Header } from '@/components/layout/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useUser } from '@/firebase';
import { isAdmin } from '@/lib/admin';
import { useAdminData } from '@/hooks/use-admin-data';
import {
  ShieldAlert, Users, CalendarDays, IndianRupee, Receipt, RefreshCw, Loader2, ShieldCheck,
} from 'lucide-react';

const inr = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

export default function AdminPage() {
  const { user, isUserLoading } = useUser();
  const admin = isAdmin(user?.email);
  const { hosts, totalHosts, totalEvents, totalTransactions, totalCollected, isLoading, error, refresh } =
    useAdminData();

  if (isUserLoading) {
    return (
      <div className="flex min-h-screen w-full flex-col">
        <Header pageTitle="Admin" />
        <main className="flex flex-1 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  // Access gate — non-admins never see platform data.
  if (!admin) {
    return (
      <div className="flex min-h-screen w-full flex-col">
        <Header pageTitle="Admin" />
        <main className="flex flex-1 items-center justify-center p-6">
          <Card className="max-w-md shadow-soft border-destructive/30">
            <CardHeader className="text-center">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <CardTitle>Admin access only</CardTitle>
              <CardDescription>
                You are signed in as {user?.email ?? 'a guest'}. This area is restricted to platform
                administrators.
              </CardDescription>
            </CardHeader>
          </Card>
        </main>
      </div>
    );
  }

  const stats = [
    { label: 'Total Hosts', value: String(totalHosts), icon: Users, tint: 'bg-primary/10 text-primary' },
    { label: 'Total Events', value: String(totalEvents), icon: CalendarDays, tint: 'bg-navy/10 text-navy' },
    { label: 'Total Guests', value: String(totalTransactions), icon: Receipt, tint: 'bg-secondary/20 text-secondary-foreground' },
    { label: 'Platform Collection', value: inr(totalCollected), icon: IndianRupee, tint: 'bg-success/10 text-success' },
  ];

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header pageTitle="Admin" />
      <main className="flex flex-1 flex-col gap-6 p-4 md:p-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-headline text-xl font-semibold">Platform Administration</h2>
              <p className="text-xs text-muted-foreground">Signed in as {user?.email}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={refresh} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {error && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-4 text-sm text-destructive">{error}</CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((c) => (
            <Card key={c.label} className="shadow-soft border-secondary/20">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{c.label}</p>
                  <p className="mt-1.5 text-2xl font-bold font-headline">{isLoading ? '—' : c.value}</p>
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
            <CardTitle>All Hosts</CardTitle>
            <CardDescription>Every registered host and their activity.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Host</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>UPI ID</TableHead>
                    <TableHead className="text-center">Events</TableHead>
                    <TableHead className="text-center">Guests</TableHead>
                    <TableHead className="text-right">Collected</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : hosts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        No hosts found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    hosts.map((h) => (
                      <TableRow key={h.id}>
                        <TableCell className="font-medium">
                          {h.name || <span className="text-muted-foreground italic">No name</span>}
                          {!h.upi && <Badge variant="outline" className="ml-2 text-[10px]">Setup incomplete</Badge>}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{h.email || '—'}</TableCell>
                        <TableCell className="font-mono text-xs">{h.upi || '—'}</TableCell>
                        <TableCell className="text-center">{h.eventCount}</TableCell>
                        <TableCell className="text-center">{h.txnCount}</TableCell>
                        <TableCell className="text-right font-semibold text-primary">{inr(h.totalCollected)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
