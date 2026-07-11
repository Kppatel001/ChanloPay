import { FieldValue } from 'firebase/firestore';

export type TransactionStatus = 'Success' | 'Pending' | 'Failed';
export type TransactionType = 'Gift' | 'Donation' | 'Service';

/**
 * View model used throughout the UI. `date` is a real Date object, derived
 * from the stored `transactionDate` ISO string when reading from Firestore.
 */
export type Transaction = {
  id: string;
  name: string;
  email: string;
  village?: string;
  mobile?: string;
  relationship?: string;
  blessing?: string;
  amount: number;
  date: Date;
  status: TransactionStatus;
  type: TransactionType;
  eventName?: string;
  eventId?: string;
  paymentMethod?: string;
  receiptQrCode?: string;
};

/**
 * Shape o