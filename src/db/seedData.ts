import { StoreSettings, Product, Customer } from '../types';

export const INITIAL_STORE_SETTINGS: StoreSettings = {
  id: 'store-default',
  tradeName: 'billtoprint',
  legalName: 'BillToPrint Retail Private Limited',
  address: 'D 37/45, Godowlia Crossing, Dashashwamedh Road',
  city: 'Varanasi',
  state: 'Uttar Pradesh',
  stateCode: '09',
  phone: '+91 98390 12345',
  email: 'contact@billtoprint.com',
  gstin: '09AABCU9603R1ZM',
  registrationStatus: 'registered',
  invoicePrefix: 'INV-',
  nextSequence: 1001,
  pricingMode: 'inclusive',
  defaultGstRate: 5,
  supportedGstRates: [0, 5, 12, 18, 28],
  roundOffRule: 'nearest_rupee',
  supportedPaymentMethods: ['Cash', 'UPI', 'Card', 'Bank Transfer', 'Other'],
  footerText: 'Thank you for choosing BillToPrint. Handcrafted with heritage in Varanasi.',
  termsAndConditions: '1. Goods once sold can be exchanged within 7 days in original condition with bill.\n2. No cash refunds.\n3. Subject to Varanasi Jurisdiction only.'
};

export const INITIAL_PRODUCTS: Product[] = [];

export const INITIAL_CUSTOMERS: Customer[] = [];

