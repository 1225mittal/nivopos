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
  logo_url?: string;
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
  hsn_code?: string;
  image_url?: string;
  category?: string;
  sub_category?: string;
  unit: 'pcs' | 'kg' | 'ltr' | 'pack' | 'box' | string;
  mrp: number;
  selling_price: number;
  purchase_price?: number;
  gst_rate: number;
  stock_qty: number;
  low_stock_alert: number;
  created_at?: string;
}

export interface Supplier {
  id?: string;
  store_id: string;
  name: string;
  gstin?: string | null;
  address?: string | null;
  contact?: string | null;
  phone?: string | null;
  email?: string | null;
  fssai?: string | null;
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
  receipt_url?: string;
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
export type ActiveTab = 'pos' | 'products' | 'purchase-bills' | 'sales' | 'settings';

export interface PurchaseBillItem {
  id?: string;
  name: string;
  qty: number;
  unit: string;
  purchase_price: number;
  selling_price?: number | null;
  gst_rate: number;
  total_amount: number;
  // Groq OCR enriched fields
  item_name?: string;
  hsn_code?: string;
  mrp?: number | null;
  purchase_rate?: number;
  discount?: number;
  price_without_tax?: number;
  price_after_tax?: number;
  quantity?: number;
  amount?: number;
  barcode?: string;
  image_url?: string;
  category?: string;
  sub_category?: string;
}

export interface PurchaseBillData {
  supplier_name: string;
  seller_name?: string;
  supplier_gstin?: string;
  gstin?: string;
  supplier_address?: string;
  address?: string;
  supplier_contact?: string;
  phone?: string;
  supplier_email?: string;
  supplier_fssai?: string;
  bill_number: string;
  invoice_number?: string;
  bill_date: string;
  invoice_date?: string;
  items: PurchaseBillItem[];
  subtotal: number;
  total_gst: number;
  tax_amount?: number;
  grand_total: number;
  total_amount?: number;
}

export interface PurchaseBillRecord {
  id?: string;
  store_id: string;
  supplier_name: string;
  supplier_gstin?: string;
  supplier_address?: string;
  supplier_contact?: string;
  supplier_email?: string;
  supplier_fssai?: string;
  bill_number: string;
  bill_date: string;
  subtotal: number;
  total_gst: number;
  grand_total: number;
  total_items?: number;
  total_units?: number;
  bill_photo_urls?: string[];
  items_json?: PurchaseBillItem[];
  created_at: string;
}
