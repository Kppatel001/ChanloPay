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
 * Shape of a transaction document as stored in Firestore. Kept in sync with
 * the objects written by the guest payment page and the manual-entry form.
 * `transactionDate` is an ISO string; it is mapped to `Transaction.date` on read.
 */
export type TransactionDoc = {
  name: string;
  village?: string;
  mobile?: string;
  relationship?: string;
  blessing?: string;
  email: string;
  amount: number;
  transactionDate: string;
  status: TransactionStatus;
  type: TransactionType | string;
  paymentMethod?: string;
  receiptQrCode?: string;
  eventId?: string;
};

export type Event = {
  id?: string;
  hostId: string;
  eventName: string;
  eventDate: string; // ISO string
  location: string;
  qrCode: string;
  createdAt?: FieldValue;
};

export type Host = {
  id: string;
  email: string;
  name?: string;
  mobile?: string;
  upi?: string;
  registrationDate?: string;
  kycVerified?: boolean;
};