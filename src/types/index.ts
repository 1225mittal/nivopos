export type BusinessCategory =
  | 'Kirana & Grocery'
  | 'Departmental Store & Supermarket'
  | 'FMCG & Wholesale Distributor'
  | 'Dairy, Bakery & Fresh Produce'
  | 'Electronics, Mobile & Hardware'
  | 'Apparel, Footwear & Lifestyle'
  | 'Packaging & D2C Brand'
  | 'Pharmacy & Healthcare'
  | 'Restaurant & Cloud Kitchen'
  | 'Other Retail & Trading';

export const BUSINESS_CATEGORIES: BusinessCategory[] = [
  'Kirana & Grocery',
  'Departmental Store & Supermarket',
  'FMCG & Wholesale Distributor',
  'Dairy, Bakery & Fresh Produce',
  'Packaging & D2C Brand',
  'Electronics, Mobile & Hardware',
  'Apparel, Footwear & Lifestyle',
  'Pharmacy & Healthcare',
  'Restaurant & Cloud Kitchen',
  'Other Retail & Trading',
];

export interface StoreProfile {
  id: string;
  full_name?: string;
  business_name?: string;
  owner_name?: string;
  store_name?: string;
  phone?: string;
  email?: string;
  city?: string;
  business_type?: string;
  business_category?: string;
  role?: string;
  is_approved?: boolean;
  upi_id?: string;
  gstin?: string;
  store_address?: string;
  plan_name?: string;
  subscription_status?: string;
  billing_cycle?: string;
  next_renewal_date?: string;
  last_login_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Product {
  id: string;
  store_id: string;
  name: string;
  barcode?: string;
  category?: string;
  unit: 'pcs' | 'kg' | 'ltr' | 'pack' | 'box' | string;
  mrp: number;
  selling_price: number;
  gst_rate: number;
  stock_qty: number;
  low_stock_alert: number;
  created_at?: string;
}

export interface Invoice {
  id: string;
  store_id: string;
  invoice_number: string;
  customer_name?: string;
  customer_phone?: string;
  payment_mode: 'UPI QR' | 'Cash' | 'Card' | 'Udhar Khata' | string;
  subtotal: number;
  total_gst: number;
  discount_amount: number;
  grand_total: number;
  status: 'paid' | 'unpaid' | string;
  created_at: string;
  invoice_items?: InvoiceItem[];
}

export interface InvoiceItem {
  id?: string;
  invoice_id?: string;
  store_id: string;
  product_id?: string | null;
  product_name: string;
  qty: number;
  unit_price: number;
  gst_rate: number;
  gst_amount: number;
  line_total: number;
}

export interface HQAdmin {
  id?: string;
  user_id: string;
  is_active: boolean;
  email?: string;
  name?: string;
  created_at?: string;
}

export interface SubscriptionPayment {
  id: string;
  store_id?: string;
  store_name?: string;
  owner_name?: string;
  plan_purchased?: string;
  amount: number;
  transaction_id: string;
  payment_date: string;
  billing_cycle?: 'Free Beta' | 'Monthly' | 'Yearly' | string;
  status: 'success' | 'completed' | 'pending' | 'failed' | string;
  created_at?: string;
}

export type AuthMode = 'signin' | 'signup';
export type AuthMethod = 'phone' | 'email';
export type ActiveTab = 'pos' | 'products' | 'sales' | 'settings';
