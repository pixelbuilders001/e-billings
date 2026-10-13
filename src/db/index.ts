import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { StoreSettings, Product, Customer, Invoice } from '../types';
import { INITIAL_STORE_SETTINGS, INITIAL_PRODUCTS, INITIAL_CUSTOMERS } from './seedData';

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
 * Initializes database with default seed data if empty
 */
export async function initDatabase(): Promise<void> {
  const db = await getDB();
  
  // Settings check
  const existingSettings = await db.get('settings', INITIAL_STORE_SETTINGS.id);
  if (!existingSettings) {
    await db.put('settings', INITIAL_STORE_SETTINGS);
  } else if (!existingSettings.pricingMode || existingSettings.pricingMode === 'exclusive') {
    // Migrate stored settings to inclusive pricing mode as requested
    existingSettings.pricingMode = 'inclusive';
    await db.put('settings', existingSettings);
  }

  // Products check
  const countProducts = await db.count('products');
  if (countProducts === 0) {
    const tx = db.transaction('products', 'readwrite');
    for (const prod of INITIAL_PRODUCTS) {
      await tx.store.put(prod);
    }
    await tx.done;
  }

  // Customers check
  const countCustomers = await db.count('customers');
  if (countCustomers === 0) {
    const tx = db.transaction('customers', 'readwrite');
    for (const cust of INITIAL_CUSTOMERS) {
      await tx.store.put(cust);
    }
    await tx.done;
  }
}

// ================= SETTINGS OPERATIONS =================
export async function getStoreSettings(): Promise<StoreSettings> {
  const db = await getDB();
  const settings = await db.get('settings', INITIAL_STORE_SETTINGS.id);
  return settings || INITIAL_STORE_SETTINGS;
}

export async function saveStoreSettings(settings: StoreSettings): Promise<void> {
  const db = await getDB();
  await db.put('settings', settings);
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
 * Atomically generates next sequence invoice number and updates settings sequence
 */
export async function allocateNextInvoiceNumber(): Promise<string> {
  const db = await getDB();
  const tx = db.transaction('settings', 'readwrite');
  const settings = (await tx.store.get(INITIAL_STORE_SETTINGS.id)) || INITIAL_STORE_SETTINGS;
  
  const seq = settings.nextSequence || 1001;
  const padLength = 4;
  const seqStr = String(seq).padStart(padLength, '0');
  const invoiceNumber = `${settings.invoicePrefix || 'SBS/2026-27/'}${seqStr}`;

  settings.nextSequence = seq + 1;
  await tx.store.put(settings);
  await tx.done;

  return invoiceNumber;
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
