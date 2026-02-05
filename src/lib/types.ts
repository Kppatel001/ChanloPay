import { FieldValue } from 'firebase/firestore';

export type Transaction = {
  id: string;
  name: string;
  email: string;
  village?: string;
  amount: number;
  date: Date;
  status: 'Success' | 'Pending' | 'Failed';
  type: 'Gift' | 'Donation' | 'Service';
  eventName?: string;
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
};
