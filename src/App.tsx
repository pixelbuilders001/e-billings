import { useState, useEffect, useRef } from 'react';
import { 
  StoreSettings, 
  Product, 
  Customer, 
  Invoice,
  LocalDisplayPreferences
} from './types';
import { 
  initDatabase, 
  getStoreSettings, 
  getAllProducts, 
  getAllCustomers, 
  getAllInvoices,
  getInitialDisplayPreferences,
  getLocalDisplayPreferences,
  saveLocalDisplayPreferences,
  deleteInvoice
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
  fetchSupabaseAddonSales,
  convertSupabaseSaleToInvoice,
  cleanupNonSareeInventoryItems
} from './db/supabaseClient';
import { Loader2 } from 'lucide-react';

export function App() {
  const [loading, setLoading] = useState(true);
  const [displayPrefs, setDisplayPrefs] = useState<LocalDisplayPreferences>(getInitialDisplayPreferences);
  const [currentTab, setCurrentTab] = useState<NavTab>(() => {
    const initialPrefs = getInitialDisplayPreferences();
    return initialPrefs.showDashboard ? 'dashboard' : 'new-invoice';
  });
  
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  
  // Selected invoice for preview/print
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  // Draft to edit/duplicate
  const [editingDraft, setEditingDraft] = useState<Invoice | null>(null);

  const { user, isAuthenticated, isInitialized, logout } = useAuth();
  const loadCountRef = useRef(0);

  const loadData = async (showLoader = false) => {
    const currentReq = ++loadCountRef.current;
    if (showLoader) {
      setLoading(true);
    }
    try {
      await initDatabase();
      cleanupNonSareeInventoryItems();
      const [s, p, localCusts, localInvs, supaCusts, supaSales, supaAddonSales, prefs] = await Promise.all([
        getStoreSettings(),
        getAllProducts(),
        getAllCustomers(),
        getAllInvoices(),
        fetchSupabaseCustomers(),
        fetchSupabaseSales(),
        fetchSupabaseAddonSales(),
        getLocalDisplayPreferences()
      ]);

      // If a newer request was triggered while fetching, ignore this stale result
      if (currentReq !== loadCountRef.current) {
        return;
      }

      setSettings(s);
      setProducts(p);
      setDisplayPrefs(prefs);

      // If dashboard is hidden on initial load and currentTab is dashboard, redirect
      if (!prefs.showDashboard && currentTab === 'dashboard') {
        setCurrentTab('new-invoice');
      }

      // Merge customers: Map Supabase customers to Customer type
      const mappedSupaCusts: Customer[] = supaCusts.map(sc => ({
        id: sc.id,
        name: sc.name,
        phone: sc.mobile,
        billingAddress: sc.address || (s.address || 'Store Counter'),
        city: sc.city || s.city || 'Patna',
        state: s.state || 'Bihar',
        stateCode: s.stateCode || '10',
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

      // Merge invoices: Map Supabase sales to Invoice type with matching addons
      const mappedSupaInvoices: Invoice[] = supaSales.map(sale => 
        convertSupabaseSaleToInvoice(sale, s, supaAddonSales)
      );

      // Combine invoices: prioritize complete local item lists (including addons like blouse pieces, aster, fall & pico)
      const invoiceMap = new Map<string, Invoice>();
      localInvs.forEach(inv => invoiceMap.set(inv.invoiceNumber || inv.id, inv));
      mappedSupaInvoices.forEach(supaInv => {
        const key = supaInv.invoiceNumber || supaInv.id;
        const localInv = invoiceMap.get(key);
        if (localInv && localInv.items && localInv.items.length > supaInv.items.length) {
          // Preserve local invoice items which include add-ons (blouse pieces, aster/astar, fall & pico)
          invoiceMap.set(key, {
            ...supaInv,
            items: localInv.items,
            rateBreakdown: localInv.rateBreakdown?.length ? localInv.rateBreakdown : supaInv.rateBreakdown,
            subtotal: localInv.subtotal,
            grandTotal: localInv.grandTotal,
            discountTotal: localInv.discountTotal,
            taxableTotal: localInv.taxableTotal,
            amountInWords: localInv.amountInWords || supaInv.amountInWords
          });
        } else {
          invoiceMap.set(key, supaInv);
        }
      });

      const mergedInvoices = Array.from(invoiceMap.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setInvoices(mergedInvoices);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      if (currentReq === loadCountRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!isInitialized) return;
    loadData(true);
  }, [isInitialized, isAuthenticated]);

  const handleInvoiceCreated = async (newInvoice: Invoice) => {
    await loadData();
    setEditingDraft(null);
    setViewingInvoice(newInvoice);
  };

  const handleEditDraft = (invoice: Invoice) => {
    // Edit loads the existing draft directly into POS terminal
    setEditingDraft(invoice);
    setViewingInvoice(null);
    setCurrentTab('new-invoice');
  };

  const handleDeleteDraft = async (invoiceId: string) => {
    await deleteInvoice(invoiceId);
    if (editingDraft?.id === invoiceId) {
      setEditingDraft(null);
    }
    if (viewingInvoice?.id === invoiceId) {
      setViewingInvoice(null);
    }
    await loadData();
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

  const handleUpdateDisplayPrefs = async (newPrefs: LocalDisplayPreferences) => {
    setDisplayPrefs(newPrefs);
    await saveLocalDisplayPreferences(newPrefs);

    // If user hides currently active tab, redirect smoothly to new-invoice
    if (
      (currentTab === 'dashboard' && !newPrefs.showDashboard) ||
      (currentTab === 'invoices' && !newPrefs.showInvoicesTab) ||
      (currentTab === 'products' && !newPrefs.showCatalogueTab) ||
      (currentTab === 'customers' && !newPrefs.showCustomersTab)
    ) {
      setCurrentTab('new-invoice');
    }
  };

  if (!isInitialized || loading || !settings) {
    return (
      <div className="min-h-screen bg-[#1E0209] flex items-center justify-center p-4 relative overflow-hidden font-sans">
        <div className="absolute -top-32 -right-32 w-80 h-80 bg-gold/15 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-brand-700/25 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="flex flex-col items-center space-y-5 text-center relative z-10">
          <div className="w-18 h-18 rounded-2xl bg-gradient-to-br from-gold via-amber-400 to-yellow-300 flex items-center justify-center text-brand-950 font-black text-2xl shadow-gold-glow ring-4 ring-gold/30 animate-pulse">
            <span className="font-serif font-black text-3xl">B2P</span>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white tracking-tight font-serif">BillToPrint</h2>
            <div className="flex items-center justify-center space-x-2 text-amber-200/90 text-xs font-semibold">
              <Loader2 className="w-4 h-4 animate-spin text-gold" />
              <span>Synchronizing Boutique POS & Inventory Records...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If user is not authenticated, render Login view
  if (!isAuthenticated) {
    return (
      <Login 
        storeName={settings.tradeName} 
        onLoginSuccess={() => loadData(true)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-slate-900 flex flex-col font-sans">
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
        onLogout={async () => {
          await logout();
          setInvoices([]);
          setCustomers([]);
        }}
        displayPrefs={displayPrefs}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-24 md:pb-12">
        {viewingInvoice ? (
          <InvoiceDocument
            invoice={viewingInvoice}
            onBack={() => setViewingInvoice(null)}
            onEditDraft={handleEditDraft}
            onDeleteDraft={handleDeleteDraft}
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
                onEditDraft={handleEditDraft}
                onGoToSettings={() => setCurrentTab('settings')}
                showKpis={displayPrefs.showDashboardKpis}
                showRecentList={displayPrefs.showDashboardRecentInvoices}
              />
            )}

            {currentTab === 'new-invoice' && (
              <NewInvoice
                key={editingDraft?.id || 'new'}
                settings={settings}
                products={products}
                customers={customers}
                initialDraft={editingDraft}
                onCancelDraft={() => setEditingDraft(null)}
                onDeleteDraft={handleDeleteDraft}
                onInvoiceCreated={handleInvoiceCreated}
                onRefreshData={loadData}
              />
            )}

            {currentTab === 'invoices' && (
              <InvoiceList
                invoices={invoices}
                onViewInvoice={inv => setViewingInvoice(inv)}
                onEditDraft={handleEditDraft}
                onDeleteDraft={handleDeleteDraft}
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
                displayPrefs={displayPrefs}
                onUpdateDisplayPrefs={handleUpdateDisplayPrefs}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default App;
