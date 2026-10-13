export type RegistrationStatus = 'registered' | 'unregistered';
export type PricingMode = 'exclusive' | 'inclusive';
export type RoundOffRule = 'nearest_rupee' | 'none';
export type SupplyType = 'intra_state' | 'inter_state';
export type DiscountType = 'percentage' | 'fixed';
export type InvoiceStatus = 'draft' | 'finalized' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'partially_paid' | 'paid';
export type PaymentMethod = 'Cash' | 'UPI' | 'Card' | 'Bank Transfer' | 'Other';

export interface StoreSettings {
  id: string;
  tradeName: string;
  legalName: string;
  address: string;
  city: string;
  state: string;
  stateCode: string; // e.g. "09" for Uttar Pradesh
  phone: string;
  email: string;
  gstin: string;
  registrationStatus: RegistrationStatus;
  logoUrl?: string;
  invoicePrefix: string; // e.g. "SBS/2026-27/"
  nextSequence: number; // e.g. 1
  pricingMode: PricingMode;
  defaultGstRate: number; // e.g. 5
  supportedGstRates: number[]; // e.g. [0, 5, 12, 18, 28]
  roundOffRule: RoundOffRule;
  supportedPaymentMethods: PaymentMethod[];
  footerText: string;
  termsAndConditions: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  category: string;
  fabric: string;
  colour: string;
  hsnCode: string;
  unit: string; // e.g. "Nos", "Mtr", "Set"
  sellingPrice: number; // in Rupees
  gstRate: number; // in % (e.g. 5)
  active: boolean;
  stockQty?: number;
  productTag?: string;
  rackNo?: string;
  mrp?: number;
  discountPercentage?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  billingAddress: string;
  city?: string;
  state: string;
  stateCode: string; // 2 digit code
  gstin?: string;
  businessName?: string;
  notes?: string;
  loyaltyMemberCode?: string | null;
  loyaltyPointsBalance?: number;
  loyaltyTier?: string;
  createdAt: string;
}

export interface InvoiceItem {
  id: string;
  productId?: string;
  description: string;
  hsnCode: string;
  qty: number;
  unit: string;
  unitPrice: number; // Base selling price
  discountType: DiscountType;
  discountValue: number; // e.g. 10 (%) or 500 (fixed)
  
  // Computed values
  grossLineValue: number; // qty * unitPrice
  itemDiscountAmount: number;
  allocatedBillDiscountAmount: number;
  netDiscountAmount: number;
  taxableValue: number;
  gstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  lineTotal: number;
}

export interface PaymentRecord {
  id: string;
  invoiceId?: string;
  date: string;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  note?: string;
}

export interface TaxRateBreakdown {
  rate: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTax: number;
}

export interface InvoiceCalculationResult {
  items: InvoiceItem[];
  subtotal: number; // sum of gross values
  totalItemDiscount: number;
  billDiscountAmount: number;
  totalDiscount: number;
  taxableTotal: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  taxTotal: number;
  roundOff: number;
  grandTotal: number;
  rateBreakdown: TaxRateBreakdown[];
  supplyType: SupplyType;
  isRegisteredTaxInvoice: boolean;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string; // YYYY-MM-DD
  status: InvoiceStatus;
  
  // Snapshots
  sellerSnapshot: StoreSettings;
  customerId?: string;
  customerSnapshot: Customer;
  
  placeOfSupplyState: string;
  placeOfSupplyCode: string;
  supplyType: SupplyType;
  isRegisteredTaxInvoice: boolean;
  pricingMode: PricingMode;
  
  items: InvoiceItem[];
  
  billDiscountType: DiscountType;
  billDiscountValue: number;
  
  subtotal: number;
  discountTotal: number;
  taxableTotal: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  roundOff: number;
  grandTotal: number;
  rateBreakdown?: TaxRateBreakdown[];
  amountInWords: string;
  
  payments: PaymentRecord[];
  paidTotal: number;
  balanceDue: number;
  paymentStatus: PaymentStatus;
  
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
