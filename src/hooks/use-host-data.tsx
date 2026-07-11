'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, query } from 'firebase/firestore';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import type { Event, Transaction } from '@/lib/types';

export interface HostData {
  events: (Event & { id: string })[];
  transactions: Transaction[];
  isLoading: boolean;
  refresh: () => void;
}

/**
 * Central hook that loads a host's events and all their transactions,
 * mapping the stored `transactionDate` string to a real `date` Date.
 * Shared by the dashboard, analytics and any other aggregate view.
 */
export function useHostData(): HostData {
  const { user } = useUser();
  const firestore = useFirestore();

  const eventsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, `hosts/${user.uid}/events`));
  }, [user, firestore]);

  const { data: eventsData, isLoading: eventsLoading } = useCollection<Event>(eventsQuery);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txnLoading, setTxnLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  const events = (eventsData as (Event & { id: string })[] | null) ?? [];

  useEffect(() => {
    if (!firestore || !user || eventsLoading) return;

    let cancelled = false;
    const run = async () => {
      setTxnLoading(true);
      if (events.length === 0) {
        if (!cancelled) { setTransactions([]); setTxnLoading(false); }
        return;
      }
      try {
        const all: Transaction[] = [];
        await Promise.all(
          events.map(async (event) => {
            if (!event.id) return;
            const snap = await getDocs(
              collection(firestore, `hosts/${user.uid}/events/${event.id}/transactions`)
            );
            snap.forEach((d) => {
              const data = d.data();
              all.push({
                id: d.id,
                amount: data.amount || 0,
                name: data.name || 'Guest',
                village: data.village || 'N/A',
                mobile: data.mobile,
                relationship: data.relationship,
                blessing: data.blessing,
                email: data.email || 'N/A',
                status: data.status || 'Success',
                type: data.type || 'Gift',
                date: data.transactionDate ? new Date(data.transactionDate) : new Date(),
                eventName: event.eventName,
                eventId: event.id,
                paymentMethod: data.paymentMethod,
                receiptQrCode: data.receiptQrCode,
              });
            });
          })
        );
        if (!cancelled) {
          setTransactions(all.sort((a, b) => b.date.getTime() - a.date.getTime()));
          setTxnLoading(false);
        }
      } catch (e) {
        console.error('useHostData: error fetching transactions', e);
        if (!cancelled) setTxnLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firestore, user, eventsLoading, eventsData, nonce]);

  return {
    events,
    transactions,
    isLoading: eventsLoading || txnLoading,
    refresh: () => setNonce((n) => n + 1),
  };
}
