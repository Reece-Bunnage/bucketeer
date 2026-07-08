import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});
const usdCents = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export const fmtUsd = (n: number) => usd.format(n);
export const fmtUsdExact = (n: number) => usdCents.format(n);

/** 'YYYY-MM' key for a 'YYYY-MM-DD' date string. */
export const monthKey = (date: string) => date.slice(0, 7);

export const currentMonthKey = () => new Date().toISOString().slice(0, 7);

export function monthLabel(key: string) {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}
