import { useState, useEffect } from 'react';
import { 
  StoreSettings, 
  Product, 
  Customer, 
  Invoice 
} from './types';
import { 
  initDatabase, 
  getStoreSettings, 
  getAllProducts, 
  getAllCustomers, 
  getAllInvoices 
} from './db';
import { Navbar, NavTab } from './components/Navbar';
import { Dashboard } from './pages/Dashboard';
import { NewInvoice } from './pages/NewInvoice';
import { InvoiceDocument } from './components/InvoiceDocument';
import { InvoiceList } from './pages/InvoiceList';
import { ProductsManager } from './pages/ProductsManager';
import { CustomersManager } from './pages/CustomersManager';
import { SettingsPage } from './pages/SettingsPage';
import { Loader2 } from 'lucide-react';

export function App() {
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  
  // Selected invoice for preview/print
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  // Draft to edit/duplicate
  const [editingDraft, setEditingDraft] = useState<Invoice | null>(null);

  const loadData = async () => {
    try {
      await initDatabase();
      const [s, p, c, inv] = await Promise.all([
        getStoreSettings(),
        getAllProducts(),
        getAllCustomers(),
        getAllInvoices()
      ]);
      setSettings(s);
      setProducts(p);
      setCustomers(c);
      setInvoices(inv);
    } catch (err) {
      console.error('Failed to load local DB data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleInvoiceCreated = async (newInvoice: Invoice) => {
    await loadData();
    setViewingInvoice(newInvoice);
  };

  const handleDuplicateInvoice = (invoice: Invoice) => {
    // Duplicate creates a draft without the old invoice number
    const draftCopy: Invoice = {
      ...invoice,
      id: `draft-${Date.now()}`,
      invoiceNumber: `DRAFT-${Date.now().toString().slice(-4)}`,
      status: 'draft',
      createdAt: new Date().toISOString()
    };
    setEditingDraft(draftCopy);
    setViewingInvoice(null);
    setCurrentTab('new-invoice');
  };

  if (loading || !settings) {
    return (
      <div className="min-h-screen bg-brand-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-brand-800 text-gold flex items-center justify-center font-serif text-xl font-bold animate-pulse">
            श्री
          </div>
          <div className="flex items-center space-x-2 text-brand-900 text-sm font-semibold">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Loading Shree Banarasi Sarees Invoicing...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FCFBF7] text-gray-900 flex flex-col font-sans">
      {/* Top Navbar */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={tab => {
          setViewingInvoice(null);
          if (tab === 'new-invoice') {
            setEditingDraft(null);
          }
          setCurrentTab(tab);
        }}
        storeName={settings.tradeName}
        registrationStatus={settings.registrationStatus}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-12">
        {viewingInvoice ? (
          <InvoiceDocument
            invoice={viewingInvoice}
            onBack={() => setViewingInvoice(null)}
          />
        ) : (
          <>
            {currentTab === 'dashboard' && (
              <Dashboard
                invoices={invoices}
                settings={settings}
                onNewInvoice={() => {
                  setEditingDraft(null);
                  setCurrentTab('new-invoice');
                }}
                onViewInvoice={inv => setViewingInvoice(inv)}
                onGoToSettings={() => setCurrentTab('settings')}
              />
            )}

            {currentTab === 'new-invoice' && (
              <NewInvoice
                settings={settings}
                products={products}
                customers={customers}
                initialDraft={editingDraft}
                onInvoiceCreated={handleInvoiceCreated}
                onRefreshData={loadData}
              />
            )}

            {currentTab === 'invoices' && (
              <InvoiceList
                invoices={invoices}
                onViewInvoice={inv => setViewingInvoice(inv)}
                onDuplicateAsNew={handleDuplicateInvoice}
                onNewInvoice={() => {
                  setEditingDraft(null);
                  setCurrentTab('new-invoice');
                }}
              />
            )}

            {currentTab === 'products' && (
              <ProductsManager
                products={products}
                settings={settings}
                onRefresh={loadData}
              />
            )}

            {currentTab === 'customers' && (
              <CustomersManager
                customers={customers}
                onRefresh={loadData}
              />
            )}

            {currentTab === 'settings' && (
              <SettingsPage
                settings={settings}
                onRefresh={loadData}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default App;
