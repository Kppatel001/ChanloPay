
'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/header';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, getDocs, doc, updateDoc, collectionGroup, orderBy, limit, where } from 'firebase/firestore';
import { 
  ShieldAlert, 
  Users, 
  Calendar, 
  IndianRupee, 
  ReceiptText, 
  AlertTriangle, 
  Settings as SettingsIcon,
  CheckCircle2,
  XCircle,
  Eye,
  Search,
  ArrowUpRight,
  TrendingUp,
  Activity,
  User as UserIcon
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { Host, Event, Transaction, WithdrawalRequest } from '@/lib/types';

export default function AdminPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState('overview');
  const [hosts, setHosts] = useState<Host[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Stats
  const [stats, setStats] = useState({
    totalCollections: 0,
    totalEvents: 0,
    totalUsers: 0,
    pendingWithdrawals: 0,
  });

  const fetchAdminData = async () => {
    if (!firestore || user?.email !== 'admin@chanlopay.com') return;
    setIsLoading(true);

    try {
      // Fetch Hosts
      const hostsSnap = await getDocs(collection(firestore, 'hosts'));
      const fetchedHosts = hostsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Host));
      setHosts(fetchedHosts);

      // Fetch All Events (using collectionGroup requires index, but we'll try)
      const eventsSnap = await getDocs(collectionGroup(firestore, 'events'));
      const fetchedEvents = eventsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Event));
      setEvents(fetchedEvents);

      // Fetch All Transactions
      const txSnap = await getDocs(collectionGroup(firestore, 'transactions'));
      const fetchedTx = txSnap.docs.map(d => {
        const data = d.data();
        return { 
          id: d.id, 
          ...data,
          date: data.transactionDate ? new Date(data.transactionDate) : new Date() 
        } as Transaction;
      });
      setTransactions(fetchedTx.sort((a, b) => b.date.getTime() - a.date.getTime()));

      // Fetch Withdrawals
      const withdrawSnap = await getDocs(collection(firestore, 'withdrawals'));
      const fetchedWithdrawals = withdrawSnap.docs.map(d => ({ id: d.id, ...d.data() } as WithdrawalRequest));
      setWithdrawals(fetchedWithdrawals.sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime()));

      // Calculate Stats
      const totalCol = fetchedTx.reduce((sum, tx) => sum + (tx.amount || 0), 0);
      setStats({
        totalCollections: totalCol,
        totalEvents: fetchedEvents.length,
        totalUsers: fetchedHosts.length,
        pendingWithdrawals: fetchedWithdrawals.filter(w => w.status === 'Pending Review').length,
      });

    } catch (error) {
      console.error("Admin: Error fetching global data:", error);
      toast({ variant: 'destructive', title: 'Admin Error', description: 'Failed to fetch global records.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [firestore, user]);

  const handleUpdateWithdrawal = async (id: string, status: WithdrawalRequest['status']) => {
    if (!firestore) return;
    try {
      await updateDoc(doc(firestore, 'withdrawals', id), { 
        status,
        processedDate: new Date().toISOString()
      });
      toast({ title: 'Status Updated', description: `Withdrawal marked as ${status}.` });
      fetchAdminData();
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update status.' });
    }
  };

  const handleVerifyManualTx = async (hostId: string, eventId: string, txId: string, verified: boolean) => {
    if (!firestore || !hostId || !eventId) return;
    try {
      const txRef = doc(firestore, `hosts/${hostId}/events/${eventId}/transactions`, txId);
      await updateDoc(txRef, { manualEntryVerified: verified });
      toast({ title: verified ? 'Verified' : 'Flagged', description: 'Transaction status updated.' });
      fetchAdminData();
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to verify transaction.' });
    }
  };

  if (user?.email !== 'admin@chanlopay.com') {
    return (
      <div className="flex h-screen flex-col items-center justify-center p-4 text-center bg-muted/10">
        <ShieldAlert className="h-20 w-20 text-destructive mb-4 animate-pulse" />
        <h1 className="text-3xl font-black mb-2 uppercase tracking-tighter">Access Forbidden</h1>
        <p className="text-muted-foreground max-w-md font-medium">
          Only authorized platform administrators can access the system management.
        </p>
      </div>
    );
  }

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/5">
      <Header pageTitle="Command Center" />
      <main className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-8">
        <div className="flex flex-col gap-2">
          <h2 className="text-4xl font-black tracking-tighter uppercase">Platform Control</h2>
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest">
            <Activity className="h-4 w-4" />
            Live System Monitoring
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-none shadow-xl bg-primary text-primary-foreground">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-widest opacity-80">Total Collections</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black">{formatCurrency(stats.totalCollections)}</div>
              <div className="flex items-center gap-1 mt-2 text-[10px] opacity-70">
                <TrendingUp className="h-3 w-3" />
                Across all registered events
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Active Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black">{stats.totalEvents}</div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Total Hosts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black">{stats.totalUsers}</div>
            </CardContent>
          </Card>
          <Card className={`border-none shadow-xl ${stats.pendingWithdrawals > 0 ? 'bg-amber-500 text-white' : 'bg-white text-foreground'}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-widest opacity-80">Pending Payouts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black">{stats.pendingWithdrawals}</div>
              <p className="text-[10px] font-bold mt-1">Requires Approval</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="bg-white border p-1 rounded-xl h-auto flex flex-wrap gap-1">
            <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-white font-bold py-2 px-4 rounded-lg">Overview</TabsTrigger>
            <TabsTrigger value="withdrawals" className="data-[state=active]:bg-primary data-[state=active]:text-white font-bold py-2 px-4 rounded-lg">Withdrawals</TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-primary data-[state=active]:text-white font-bold py-2 px-4 rounded-lg">Users</TabsTrigger>
            <TabsTrigger value="events" className="data-[state=active]:bg-primary data-[state=active]:text-white font-bold py-2 px-4 rounded-lg">Events</TabsTrigger>
            <TabsTrigger value="transactions" className="data-[state=active]:bg-primary data-[state=active]:text-white font-bold py-2 px-4 rounded-lg">All Logs</TabsTrigger>
            <TabsTrigger value="fraud" className="data-[state=active]:bg-primary data-[state=active]:text-white font-bold py-2 px-4 rounded-lg">Fraud Radar</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
             <Card>
               <CardHeader>
                 <CardTitle>System Logs</CardTitle>
                 <CardDescription>Recent global activity across the platform.</CardDescription>
               </CardHeader>
               <CardContent>
                 <div className="space-y-8">
                   {transactions.slice(0, 5).map(tx => (
                     <div key={tx.id} className="flex items-center gap-4">
                        <div className="bg-primary/10 p-2 rounded-full text-primary">
                          <IndianRupee className="h-4 w-4" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-bold leading-none">{tx.name} paid {formatCurrency(tx.amount)}</p>
                          <p className="text-xs text-muted-foreground">To event: {tx.eventName}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold">{tx.date.toLocaleDateString()}</p>
                          <Badge variant="outline" className="text-[10px] h-4 uppercase">{tx.paymentMethod}</Badge>
                        </div>
                     </div>
                   ))}
                 </div>
               </CardContent>
             </Card>
          </TabsContent>

          <TabsContent value="withdrawals">
            <Card>
              <CardHeader>
                <CardTitle>Payout Management</CardTitle>
                <CardDescription>Review and process host withdrawal requests.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Host / Event</TableHead>
                      <TableHead>Requested On</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Fee (2%)</TableHead>
                      <TableHead>Payout</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {withdrawals.map(w => (
                      <TableRow key={w.id}>
                        <TableCell>
                          <p className="font-bold">{w.hostName}</p>
                          <p className="text-[10px] text-muted-foreground uppercase">{w.eventName}</p>
                        </TableCell>
                        <TableCell className="text-xs">{new Date(w.requestDate).toLocaleDateString()}</TableCell>
                        <TableCell className="font-semibold">{formatCurrency(w.totalAmount)}</TableCell>
                        <TableCell className="text-destructive text-xs">-{formatCurrency(w.platformFee)}</TableCell>
                        <TableCell className="font-black text-primary">{formatCurrency(w.payoutAmount)}</TableCell>
                        <TableCell>
                          <Badge variant={w.status === 'Completed' ? 'default' : 'secondary'} className="text-[10px]">
                            {w.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          {w.status === 'Pending Review' && (
                            <>
                              <Button size="sm" className="h-8 bg-green-600 hover:bg-green-700" onClick={() => handleUpdateWithdrawal(w.id, 'Completed')}>
                                <CheckCircle2 className="h-3 w-3 mr-1" /> Approve
                              </Button>
                              <Button size="sm" variant="destructive" className="h-8" onClick={() => handleUpdateWithdrawal(w.id, 'Rejected')}>
                                <XCircle className="h-3 w-3 mr-1" /> Reject
                              </Button>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>Host Directory</CardTitle>
                <CardDescription>All registered event owners and their activity.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Host Name</TableHead>
                      <TableHead>Email / Phone</TableHead>
                      <TableHead>UPI ID</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {hosts.map(h => (
                      <TableRow key={h.id}>
                        <TableCell className="font-bold">{h.name || 'Unnamed Host'}</TableCell>
                        <TableCell>
                          <p className="text-xs font-medium">{h.email}</p>
                          <p className="text-xs text-muted-foreground">{h.mobile || 'No Mobile'}</p>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{h.upi || 'Not Set'}</TableCell>
                        <TableCell className="text-xs">{h.registrationDate ? new Date(h.registrationDate).toLocaleDateString() : 'N/A'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions">
            <Card>
              <CardHeader>
                <CardTitle>Global Ledger</CardTitle>
                <CardDescription>Live feed of all transactions across the platform.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payer</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Manual?</TableHead>
                      <TableHead>Verification</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map(tx => (
                      <TableRow key={tx.id}>
                        <TableCell>
                          <p className="font-bold">{tx.name}</p>
                          <p className="text-[10px] text-muted-foreground">{tx.village}</p>
                        </TableCell>
                        <TableCell className="text-xs">{tx.eventName}</TableCell>
                        <TableCell className="font-bold">{formatCurrency(tx.amount)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] uppercase">{tx.paymentMethod}</Badge>
                        </TableCell>
                        <TableCell>
                          {tx.isManualEntry ? <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">CASH</Badge> : <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">UPI</Badge>}
                        </TableCell>
                        <TableCell>
                          {tx.isManualEntry ? (
                            <div className="flex items-center gap-1">
                              {tx.manualEntryVerified ? (
                                <Badge className="bg-green-100 text-green-700">VERIFIED</Badge>
                              ) : (
                                <div className="flex gap-1">
                                  <Button size="icon" variant="ghost" className="h-6 w-6 text-green-600" onClick={() => handleVerifyManualTx(tx.hostId!, tx.eventId!, tx.id, true)}>
                                    <CheckCircle2 className="h-4 w-4" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => handleVerifyManualTx(tx.hostId!, tx.eventId!, tx.id, false)}>
                                    <AlertTriangle className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          ) : 'Auto'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fraud">
            <Card className="border-destructive/20 bg-destructive/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <ShieldAlert className="h-5 w-5" />
                  Fraud Radar
                </CardTitle>
                <CardDescription>Identifies high-risk transactions and suspicious patterns.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {transactions.filter(tx => tx.amount > 10000 || tx.isFlagged).map(tx => (
                    <div key={tx.id} className="bg-white border p-4 rounded-xl flex items-center justify-between border-destructive/30">
                      <div>
                        <div className="flex items-center gap-2">
                           <p className="font-black">{tx.name}</p>
                           <Badge variant="destructive" className="text-[9px]">HIGH AMOUNT</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Paid {formatCurrency(tx.amount)} to {tx.eventName}</p>
                      </div>
                      <Button variant="outline" size="sm" className="text-destructive border-destructive hover:bg-destructive/10">
                        Lock Record
                      </Button>
                    </div>
                  ))}
                  {transactions.filter(tx => tx.amount > 10000 || tx.isFlagged).length === 0 && (
                    <div className="text-center py-12 opacity-50">
                      <ShieldAlert className="h-12 w-12 mx-auto mb-2" />
                      <p className="font-bold">No High-Risk Patterns Detected</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
