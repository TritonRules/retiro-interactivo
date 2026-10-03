import type { z } from 'zod';

export const PRICE_FLAG_MONTHS: number;
export const PRICE_MAX_MONTHS: number;
export const AGGREGATOR_HOSTS: readonly string[];

export type InfoSourceType = 'official' | 'venue' | 'google';

export interface ServicePhone {
  display: string;
  tel: string;
  sourceType: InfoSourceType;
}

export interface ServiceHours {
  openingHours?: string;
  text?: string;
  sourceType: InfoSourceType;
  sourceUrl?: string;
  checkedAt: string;
  mayVary?: boolean;
  note?: string;
}

export interface ServicePriceItem {
  item: string;
  price: number;
  note?: string;
}

export interface ServicePrices {
  sourceType: 'official' | 'venue';
  validYear?: number;
  sourceDate: string;
  checkedAt: string;
  sourceLabel: string;
  sourceUrl: string;
  currency: 'EUR';
  items: ServicePriceItem[];
  details?: string;
}

export interface ServiceStatus {
  value: 'temporarily-closed';
  sourceType: InfoSourceType;
  checkedAt: string;
  note?: string;
}

export interface ServiceInfo {
  id: string;
  name?: string;
  phone?: ServicePhone;
  website?: string;
  menuUrl?: string;
  hours?: ServiceHours;
  prices?: ServicePrices;
  status?: ServiceStatus;
  highlights?: string[];
  notes?: string;
}

export interface ServiceInfoDataset {
  description: string;
  updatedAt: string;
  services: ServiceInfo[];
}

export type PriceFreshness = 'fresh' | 'aging' | 'expired';

export const serviceInfoSchema: z.ZodType<ServiceInfo>;
export const serviceInfoDatasetSchema: z.ZodType<ServiceInfoDataset>;

export function monthsBetween(from: string, to: string): number;
export function todayIso(now?: Date): string;
export function formatDateEs(value: string): string;
export function formatEuros(value: number): string;
export function priceFreshness(prices: ServicePrices, today: string): PriceFreshness;
export function statusIsCurrent(status: ServiceStatus, today: string): boolean;
export const SOURCE_TYPE_LABEL: Record<InfoSourceType, string>;
