export type Transaction = {
  id: string;
  name: string;
  email: string;
  amount: number;
  date: Date;
  status: 'Success' | 'Pending' | 'Failed';
  type: 'Gift' | 'Donation' | 'Service';
};

export type Event = {
  id: string;
  name:string;
  date: Date;
  location: string;
  qrCodeValue: string;
};
