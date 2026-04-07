
import { FieldValue } from 'firebase/firestore';

export type Transaction = {
  id: string;
  name: string;
  email: string;
  mobile?: string;
  village?: string;
  amount: number;
  date: Date;
  status: 'Success' | 'Pending' | 'Failed';
  type: 'Gift' | 'Donation' | 'Service';
  eventName?: string;
  eventId?: string;
  paymentMethod?: string;
  receiptQrCode?: string;
  receiptStatus?: 'Sent' | 'Failed' | 'Pending';
  receiptId?: string;
  integrityHash?: string;
  language?: 'en' | 'gu' | 'hi';
};

export type Event = {
  id?: string;
  hostId: string;
  eventName: string;
  eventDate: string; // ISO string
  location: string;
  qrCode: string;
  createdAt?: FieldValue;
  withdrawalRequested?: boolean;
};

export type Host = {
  id: string;
  email: string;
  name?: string;
  mobile?: string;
  upi?: string;
  registrationDate?: string;
  kycVerified?: boolean;
  plan?: 'Free' | 'Silver' | 'Gold' | 'Diamond';
  policiesAccepted?: boolean;
  policiesAcceptedAt?: string;
};

export type WithdrawalRequest = {
  id: string;
  hostId: string;
  hostName: string;
  eventId: string;
  eventName: string;
  totalAmount: number;
  platformFee: number;
  payoutAmount: number;
  status: 'Pending Review' | 'Processing' | 'Completed' | 'Rejected';
  requestDate: string;
  processedDate?: string;
  hostUpi: string;
};
