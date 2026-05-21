export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface Group {
  _id: string;
  name: string;
  description?: string;
  members: User[];
  createdBy: string;
}

export interface Split {
  userId: string;
  amount: number;
}

export interface Payer {
  userId: string;
  amount: number;
}

export interface Expense {
  id?: string;
  _id?: string;
  description: string;
  amount: number;
  date: string;
  payers: Payer[];
  splits: Split[];
  groupId?: string;
  type?: 'expense' | 'settlement';
  status?: 'active' | 'superseded' | 'deleted';
  supersededBy?: string;
  originalTxId?: string;
  previousHash?: string;
  hash?: string;
}

export interface Settlement {
  id?: string;
  _id?: string;
  from: string; // userId
  to: string; // userId
  amount: number;
  date: string;
}

export interface Balance {
  userId: string;
  amount: number; // positive means they are owed, negative means they owe
}
