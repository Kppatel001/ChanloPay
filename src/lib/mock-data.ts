import type { Event, Transaction } from '@/lib/types';

export const transactions: Transaction[] = [
  {
    id: 'txn_001',
    name: 'Olivia Martin',
    email: 'olivia.martin@email.com',
    amount: 150.0,
    date: new Date('2024-07-22T10:30:00Z'),
    status: 'Success',
    type: 'Gift',
  },
  {
    id: 'txn_002',
    name: 'Jackson Lee',
    email: 'jackson.lee@email.com',
    amount: 75.5,
    date: new Date('2024-07-21T15:45:00Z'),
    status: 'Success',
    type: 'Gift',
  },
  {
    id: 'txn_003',
    name: 'Isabella Nguyen',
    email: 'isabella.nguyen@email.com',
    amount: 200.0,
    date: new Date('2024-07-20T09:00:00Z'),
    status: 'Success',
    type: 'Donation',
  },
  {
    id: 'txn_004',
    name: 'William Kim',
    email: 'will.kim@email.com',
    amount: 50.0,
    date: new Date('2024-07-19T18:20:00Z'),
    status: 'Pending',
    type: 'Gift',
  },
  {
    id: 'txn_005',
    name: 'Sofia Davis',
    email: 'sofia.davis@email.com',
    amount: 100.0,
    date: new Date('2024-07-18T12:10:00Z'),
    status: 'Success',
    type: 'Service',
  },
  {
    id: 'txn_006',
    name: 'Liam Brown',
    email: 'liam.brown@email.com',
    amount: 300.0,
    date: new Date('2024-06-15T11:00:00Z'),
    status: 'Success',
    type: 'Gift',
  },
  {
    id: 'txn_007',
    name: 'Ava Jones',
    email: 'ava.jones@email.com',
    amount: 25.0,
    date: new Date('2024-06-10T14:00:00Z'),
    status: 'Failed',
    type: 'Gift',
  },
];

export const events: Event[] = [];

const successfulTransactions = transactions.filter(
  (t) => t.status === 'Success'
);
const totalRevenueValue = successfulTransactions.reduce(
  (sum, t) => sum + t.amount,
  0
);

export const analyticsData = {
  totalRevenue: totalRevenueValue,
  totalTransactions: successfulTransactions.length,
  revenueByGiftType: [],
  monthlyRevenue: [
    { month: 'Jan', revenue: 6500 },
    { month: 'Feb', revenue: 5900 },
    { month: 'Mar', revenue: 8000 },
    { month: 'Apr', revenue: 8100 },
    { month: 'May', revenue: 5600 },
    { month: 'Jun', revenue: 9200 },
    { month: 'Jul', revenue: 11500 },
    { month: 'Aug', revenue: 7800 },
    { month: 'Sep', revenue: 9500 },
    { month: 'Oct', revenue: 12000 },
    { month: 'Nov', revenue: 15000 },
    { month: 'Dec', revenue: 18500 },
  ],
};
