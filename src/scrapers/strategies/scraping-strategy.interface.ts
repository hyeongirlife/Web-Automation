export interface ScrapingStrategy<T = any, R = any> {
  execute(credentials: T): Promise<R>;
}

export interface AccountData {
  accountNumber: string;
  balance: number;
  currency: string;
  lastUpdated: Date;
  transactions?: Transaction[];
}

export interface Transaction {
  date: Date;
  description: string;
  amount: number;
  balance: number;
  type: 'credit' | 'debit';
}
