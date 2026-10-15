import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { StoreSettings, Product, Customer, Invoice, LocalDisplayPreferences } from '../types';
import { INITIAL_STORE_SETTINGS } from './seedData';
import { 
  fetchStoreSettingsFromSupabase, 
  saveStoreSettingsToSupabase, 
  allocateNextInvoiceNumberFromSupabase 
} from './supabaseClient';

interface ShreeSareesDB extends DBSchema {
  settings: {
    key: string;
    value: StoreSettings;
  };
  products: {
    key: string;
    value: Product;
    indexes: { 'by-sku': string; 'by-name': string; 'by-barcode': string };
  };
  customers: {
    key: string;
    value: Customer;
    indexes: { 'by-phone': string; 'by-name': string };
  };
  invoices: {
    key: string;
    value: Invoice;
    indexes: { 'by-invoice-number': string; 'by-date': string; 'by-status': string };
  };
}

const DB_NAME = 'ShreeBanarasiSarees_DB';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<ShreeSareesDB>> | null = null;

export async function getDB(): Promise<IDBPDatabase<ShreeSareesDB>> {
  if (!dbPromise) {
    dbPromise = openDB<ShreeSareesDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Settings store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'id' });
        }
        // Products store
        if (!db.objectStoreNames.contains('products')) {
          const prodStore = db.createObjectStore('products', { keyPath: 'id' });
          prodStore.createIndex('by-sku', 'sku');
          prodStore.createIndex('by-name', 'name');
          prodStore.createIndex('by-barcode', 'barcode');
        }
        // Customers store
        if (!db.objectStoreNames.contains('customers')) {
          const custStore = db.createObjectStore('customers', { keyPath: 'id' });
          custStore.createIndex('by-phone', 'phone');
          custStore.createIndex('by-name', 'name');
        }
        // Invoices store
        if (!db.objectStoreNames.contains('invoices')) {
          const invStore = db.createObjectStore('invoices', { keyPath: 'id' });
          invStore.createIndex('by-invoice-number', 'invoiceNumber');
          invStore.createIndex('by-date', 'invoiceDate');
          invStore.createIndex('by-status', 'status');
        }
      }
    });
  }
  return dbPromise;
}

/**
 * Initializes database and cleans out any legacy dummy records
 */
export async function initDatabase(): Promise<void> {
  const db = await getDB();
  
  // Settings check
  const existingSettings = await db.get('settings', INITIAL_STORE_SETTINGS.id);
  if (!existingSettings) {
    await db.put('settings', INITIAL_STORE_SETTINGS);
  } else if (!existingSettings.pricingMode || existingSettings.pricingMode === 'exclusive') {
    // Migrate stored settings to inclusive pricing mode
    existingSettings.pricingMode = 'inclusive';
    await db.put('settings', existingSettings);
  }

  // Clean out any legacy dummy products from local IndexedDB
  const legacyProductIds = ['prod-1', 'prod-2', 'prod-3', 'prod-4', 'prod-5', 'prod-6'];
  for (const id of legacyProductIds) {
    await db.delete('products', id);
  }

  // Clean out any legacy dummy customers
  const legacyCustomerIds = ['cust-1', 'cust-2'];
  for (const id of legacyCustomerIds) {
    await db.delete('customers', id);
  }
}

/**
 * Clears all local IndexedDB stores (products, customers, invoices)
 */
export async function clearLocalDummyData(): Promise<void> {
  const db = await getDB();
  await db.clear('products');
  await db.clear('customers');
  await db.clear('invoices');
}

// ================= SETTINGS OPERATIONS =================
export async function getStoreSettings(): Promise<StoreSettings> {
  // 1. Try fetching live from Supabase store_settings table
  try {
    const remoteSettings = await fetchStoreSettingsFromSupabase();
    if (remoteSettings) {
      // Sync to local cache
      const db = await getDB();
      await db.put('settings', remoteSettings);
      return remoteSettings;
    }
  } catch (err) {
    console.warn('Could not load settings from Supabase, falling back to local cache:', err);
  }

  // 2. Fallback to local IndexedDB
  const db = await getDB();
  const settings = await db.get('settings', INITIAL_STORE_SETTINGS.id);
  return settings || INITIAL_STORE_SETTINGS;
}

export async function saveStoreSettings(settings: StoreSettings): Promise<void> {
  // 1. Save to local IndexedDB immediately
  const db = await getDB();
  await db.put('settings', settings);

  // 2. Persist to Supabase store_settings table
  try {
    const { error } = await saveStoreSettingsToSupabase(settings);
    if (error) {
      console.warn('Supabase store_settings sync warning:', error);
    }
  } catch (err) {
    console.warn('Failed to sync settings to Supabase:', err);
  }
}

// ================= PRODUCT OPERATIONS =================
export async function getAllProducts(): Promise<Product[]> {
  const db = await getDB();
  return db.getAll('products');
}

export async function getProductById(id: string): Promise<Product | undefined> {
  const db = await getDB();
  return db.get('products', id);
}

export async function saveProduct(product: Product): Promise<void> {
  const db = await getDB();
  await db.put('products', product);
}

export async function deleteProduct(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('products', id);
}

// ================= CUSTOMER OPERATIONS =================
export async function getAllCustomers(): Promise<Customer[]> {
  const db = await getDB();
  return db.getAll('customers');
}

export async function getCustomerById(id: string): Promise<Customer | undefined> {
  const db = await getDB();
  return db.get('customers', id);
}

export async function saveCustomer(customer: Customer): Promise<void> {
  const db = await getDB();
  await db.put('customers', customer);
}

export async function deleteCustomer(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('customers', id);
}

// ================= INVOICE OPERATIONS =================
export async function getAllInvoices(): Promise<Invoice[]> {
  const db = await getDB();
  const invoices = await db.getAll('invoices');
  // Sort descending by date/createdAt
  return invoices.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getInvoiceById(id: string): Promise<Invoice | undefined> {
  const db = await getDB();
  return db.get('invoices', id);
}

export async function saveInvoice(invoice: Invoice): Promise<void> {
  const db = await getDB();
  await db.put('invoices', invoice);
}

export async function deleteInvoice(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('invoices', id);
}

/**
 * Atomically generates invoice number matching format INV-YYYYMMDD-XXXX
 */
export async function allocateNextInvoiceNumber(): Promise<string> {
  // 1. Try Supabase for multi-device atomic sequence allocation
  try {
    const supaInvNum = await allocateNextInvoiceNumberFromSupabase();
    if (supaInvNum) {
      return supaInvNum;
    }
  } catch (err) {
    console.warn('Supabase invoice allocation failed, falling back to local generator:', err);
  }

  // 2. Fallback matching the same standard format
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randPart = Math.floor(1000 + Math.random() * 9000);
  return `INV-${datePart}-${randPart}`;
}

// ================= BACKUP & RESTORE =================
export interface BackupData {
  version: number;
  exportedAt: string;
  storeSettings: StoreSettings;
  products: Product[];
  customers: Customer[];
  invoices: Invoice[];
}

export async function exportDatabaseBackup(): Promise<string> {
  const settings = await getStoreSettings();
  const products = await getAllProducts();
  const customers = await getAllCustomers();
  const invoices = await getAllInvoices();

  const backup: BackupData = {
    version: DB_VERSION,
    exportedAt: new Date().toISOString(),
    storeSettings: settings,
    products,
    customers,
    invoices
  };

  return JSON.stringify(backup, null, 2);
}

export async function restoreDatabaseBackup(jsonString: string): Promise<{ success: boolean; message: string }> {
  try {
    const data = JSON.parse(jsonString) as BackupData;
    if (!data.storeSettings || !Array.isArray(data.products) || !Array.isArray(data.invoices)) {
      throw new Error('Invalid backup file structure.');
    }

    const db = await getDB();
    
    // Restore Settings
    await db.put('settings', data.storeSettings);

    // Clear and restore Products
    const prodTx = db.transaction('products', 'readwrite');
    await prodTx.store.clear();
    for (const p of data.products) {
      await prodTx.store.put(p);
    }
    await prodTx.done;

    // Clear and restore Customers
    if (Array.isArray(data.customers)) {
      const custTx = db.transaction('customers', 'readwrite');
      await custTx.store.clear();
      for (const c of data.customers) {
        await custTx.store.put(c);
      }
      await custTx.done;
    }

    // Clear and restore Invoices
    const invTx = db.transaction('invoices', 'readwrite');
    await invTx.store.clear();
    for (const inv of data.invoices) {
      await invTx.store.put(inv);
    }
    await invTx.done;

    return {
      success: true,
      message: `Restored ${data.products.length} products, ${data.customers?.length || 0} customers, and ${data.invoices.length} invoices successfully.`
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Restore failed: ${err.message || 'Unknown error'}`
    };
  }
}

// ================= LOCAL DISPLAY & VISIBILITY PREFERENCES (INDEXEDDB) =================
export const DEFAULT_DISPLAY_PREFERENCES: LocalDisplayPreferences = {
  showDashboard: true,
  showDashboardKpis: true,
  showDashboardRecentInvoices: true,
  showInvoicesTab: true,
  showCatalogueTab: true,
  showCustomersTab: true
};

const PREFERENCES_KEY = 'b2p_local_display_preferences';

export function getInitialDisplayPreferences(): LocalDisplayPreferences {
  try {
    const raw = localStorage.getItem(PREFERENCES_KEY);
    if (raw) {
      return { ...DEFAULT_DISPLAY_PREFERENCES, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.warn('Error reading display preferences from localStorage:', e);
  }
  return DEFAULT_DISPLAY_PREFERENCES;
}

export async function getLocalDisplayPreferences(): Promise<LocalDisplayPreferences> {
  // 1. Try IndexedDB 'settings' store
  try {
    const db = await getDB();
    const stored = await db.get('settings', 'local-display-preferences');
    if (stored) {
      const { id: _, ...prefs } = stored as any;
      return { ...DEFAULT_DISPLAY_PREFERENCES, ...prefs };
    }
  } catch (err) {
    console.warn('Could not read display preferences from IndexedDB:', err);
  }

  // 2. Fallback to localStorage
  return getInitialDisplayPreferences();
}

export async function saveLocalDisplayPreferences(prefs: LocalDisplayPreferences): Promise<void> {
  // Instant localStorage cache for synchronous render
  try {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(prefs));
  } catch (e) {
    console.warn('LocalStorage save failed:', e);
  }

  // Persistent IndexedDB save
  try {
    const db = await getDB();
    await db.put('settings', { id: 'local-display-preferences', ...prefs } as any);
  } catch (err) {
    console.warn('IndexedDB save display preferences failed:', err);
  }
}
