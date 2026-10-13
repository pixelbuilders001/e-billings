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
import { Login } from './pages/Login';
import { useAuth } from './store/useAuthStore';
import { 
  fetchSupabaseCustomers, 
  fetchSupabaseSales, 
  convertSupabaseSaleToInvoice 
} from './db/supabaseClient';
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

  const { user, isAuthenticated, isInitialized, logout } = useAuth();

  const loadData = async () => {
    try {
      await initDatabase();
      const [s, p, localCusts, localInvs, supaCusts, supaSales] = await Promise.all([
        getStoreSettings(),
        getAllProducts(),
        getAllCustomers(),
        getAllInvoices(),
        fetchSupabaseCustomers(),
        fetchSupabaseSales()
      ]);

      setSettings(s);
      setProducts(p);

      // Merge customers: Map Supabase customers to Customer type
      const mappedSupaCusts: Customer[] = supaCusts.map(sc => ({
        id: sc.id,
        name: sc.name,
        phone: sc.mobile,
        billingAddress: sc.address || 'Varanasi',
        city: sc.city || 'Varanasi',
        state: 'Uttar Pradesh',
        stateCode: '09',
        loyaltyMemberCode: sc.loyalty_member_code || null,
        loyaltyPointsBalance: sc.loyalty_points_balance || 0,
        loyaltyTier: sc.loyalty_tier || 'Silver',
        createdAt: sc.created_at || new Date().toISOString()
      }));

      // Combine customers avoiding duplicate phones/IDs
      const customerMap = new Map<string, Customer>();
      localCusts.forEach(c => customerMap.set(c.phone || c.id, c));
      mappedSupaCusts.forEach(c => customerMap.set(c.phone || c.id, c));
      setCustomers(Array.from(customerMap.values()));

      // Merge invoices: Map Supabase sales to Invoice type
      const mappedSupaInvoices: Invoice[] = supaSales.map(sale => 
        convertSupabaseSaleToInvoice(sale, s)
      );

      // Combine invoices avoiding duplicate invoice numbers or IDs
      const invoiceMap = new Map<string, Invoice>();
      localInvs.forEach(inv => invoiceMap.set(inv.invoiceNumber || inv.id, inv));
      mappedSupaInvoices.forEach(inv => invoiceMap.set(inv.invoiceNumber || inv.id, inv));

      const mergedInvoices = Array.from(invoiceMap.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setInvoices(mergedInvoices);
    } catch (err) {
      console.error('Failed to load data:', err);
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

  if (!isInitialized || loading || !settings) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-gold to-amber-300 flex items-center justify-center text-brand-950 font-black text-2xl shadow-2xl ring-4 ring-gold/20 animate-pulse">
            B2P
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-bold text-white tracking-tight">BillToPrint</h2>
            <div className="flex items-center justify-center space-x-2 text-amber-200/80 text-xs font-medium">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-gold" />
              <span>Synchronizing Cloud POS & Invoicing Records...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If user is not authenticated, render Login view
  if (!isAuthenticated) {
    return <Login storeName={settings.tradeName} />;
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
        user={user}
        onLogout={logout}
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
