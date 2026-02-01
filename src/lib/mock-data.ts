import type { Event, Transaction } from '@/lib/types';

export const transactions: Transaction[] = [];

export const events: Event[] = [];

export const analyticsData = {
  totalRevenue: 0,
  totalTransactions: 0,
  revenueByGiftType: [],
  monthlyRevenue: [
    { month: 'Jan', revenue: 0 },
    { month: 'Feb', revenue: 0 },
    { month: 'Mar', revenue: 0 },
    { month: 'Apr', revenue: 0 },
    { month: 'May', revenue: 0 },
    { month: 'Jun', revenue: 0 },
    { month: 'Jul', revenue: 0 },
    { month: 'Aug', revenue: 0 },
    { month: 'Sep', revenue: 0 },
    { month: 'Oct', revenue: 0 },
    { month: 'Nov', revenue: 0 },
    { month: 'Dec', revenue: 0 },
  ],
};
