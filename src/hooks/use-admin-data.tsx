'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { useUser, useFirestore } from '@/firebase';
import type { Host } from '@/lib/types';
import { isAdmin } from '@/lib/admin';

export interface AdminHostRow {
  id: string;
  name?: string;
  email?: string;
  mobile?: string;
  upi?: string;
  eventCount: number;
  txnCount: number;
  totalCollected: number;
}

export interface AdminData {
  hosts: AdminHostRow[];
  totalHosts: number;
  totalEvents: number;
  totalTransactions: number;
  totalCollected: number;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

const EMPTY: Omit<AdminData, 'refresh'> = {
  hosts: [],
  totalHosts: 0,
  totalEvents: 0,
  totalTransactions: 0,
  totalCollected: 0,
  isLoading: true,
  error: null,
};

/**
 * Platform-wide aggregation for the admin dashboard: every host, their event
 * count, guest/transaction count and total collection. Only runs for admins;
 * the Firestore rules also enforce that only an admin can read across hosts.
 */
export function useAdminData(): AdminData {
  const { user } = useUser();
  const firestore = useFirestore();
  const [state, setState] = useState<Omit<AdminData, 'refresh'>>(EMPTY);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!user || !firestore) return;
    if (!isAdmin(user.email)) {
      setState({ ...EMPTY, isLoading: false, error: 'Not authorized.' });
      return;
    }

    let cancelled = false;
    const run = async () => {
      setState((s) => ({ ...s, isLoading: true, error: null }));
      try {
        const hostsSnap = await getDocs(collection(firestore, 'hosts'));
        const rows: AdminHostRow[] = [];
        let totalEvents = 0;
        let totalTransactions = 0;
        let totalCollected = 0;

        await Promise.all(
          hostsSnap.docs.map(async (hostDoc) => {
            const h = hostDoc.data() as Host;
            const eventsSnap = await getDocs(
              collection(firestore, `hosts/${hostDoc.id}/events`)
            );

            let txnCount = 0;
            let collected = 0;
            await Promise.all(
              eventsSnap.docs.map(async (ev) => {
                const txnSnap = await getDocs(
                  collection(firestore, `hosts/${hostDoc.id}/events/${ev.id}/transactions`)
                );
                txnSnap.forEach((t) => {
                  const d = t.data();
                  txnCount += 1;
                  if ((d.status || 'Success') === 'Success') {
                    collected += d.amount || 0;
                  }
                });
              })
            );

            totalEvents += eventsSnap.size;
            totalTransactions += txnCount;
            totalCollected += collected;

            rows.push({
              id: hostDoc.id,
              name: h.name,
              email: h.email,
              mobile: h.mobile,
              upi: h.upi,
              eventCount: eventsSnap.size,
              txnCount,
              totalCollected: collected,
            });
          })
        );

        if (!cancelled) {
          setState({
            hosts: rows.sort((a, b) => b.totalCollected - a.totalCollected),
            totalHosts: hostsSnap.size,
            totalEvents,
            totalTransactions,
            totalCollected,
            isLoading: false,
            error: null,
          });
        }
      } catch (e: any) {
        console.error('useAdminData error:', e);
        if (!cancelled) {
          setState((s) => ({
            ...s,
            isLoading: false,
            error:
              e?.message ||
              'Failed to load admin data. Make sure the updated Firestore rules are deployed.',
          }));
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [user, firestore, nonce]);

  return { ...state, refresh: () => setNonce((n) => n + 1) };
}
