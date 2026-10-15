import { 
  FileText, 
  PlusCircle, 
  Package, 
  Users, 
  LayoutDashboard,
  LogOut
} from 'lucide-react';
import type { RegistrationStatus, LocalDisplayPreferences } from '../types';

import { AuthUser } from '../store/useAuthStore';

export type NavTab = 'dashboard' | 'new-invoice' | 'invoices' | 'products' | 'customers' | 'settings';

interface NavbarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  storeName?: string;
  registrationStatus?: RegistrationStatus;
  user?: AuthUser | null;
  onLogout?: () => void;
  displayPrefs?: LocalDisplayPreferences;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  storeName,
  registrationStatus,
  user,
  onLogout,
  displayPrefs
}) => {
  const prefs: LocalDisplayPreferences = {
    showDashboard: true,
    showDashboardKpis: true,
    showDashboardRecentInvoices: true,
    showInvoicesTab: true,
    showCatalogueTab: true,
    showCustomersTab: true,
    ...displayPrefs
  };

  return (
    <>
      {/* Top Luxury Executive Header */}
      <header className="bg-gradient-to-r from-brand-950 via-brand-900 to-brand-950 text-ivory border-b border-gold/20 sticky top-0 z-40 shadow-luxury no-print pt-safe backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand Logo & Boutique Identifier */}
            <div 
              onClick={() => onSelectTab('settings')} 
              title="Click to open Boutique Settings"
              className="flex items-center space-x-3 cursor-pointer group select-none shrink-0 active-press"
            >
              <div className="relative">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gold to-amber-500 flex items-center justify-center text-brand-950 font-black text-xs shadow-gold-glow group-hover:scale-105 transition-all duration-300 ring-2 ring-gold/40">
                  <span className="font-serif font-black tracking-tighter text-sm">B2P</span>
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-brand-950 animate-pulse"></span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-extrabold tracking-tight text-white group-hover:text-gold transition-colors">
                    BillToPrint
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-gold/15 text-gold border border-gold/30">
                    POS Suite
                  </span>
                </div>
                <span className="text-[10px] text-amber-200/70 truncate max-w-[170px] sm:max-w-xs font-medium">
                  {storeName || 'Shree Banarasi Sarees'} • {registrationStatus === 'registered' ? 'GST Tax Invoicing' : 'Retail POS'}
                </span>
              </div>
            </div>

            {/* Desktop Navigation Links with Editorial Luxury Polish */}
            <nav className="hidden md:flex items-center space-x-1.5">
              {prefs.showDashboard && (
                <button
                  onClick={() => onSelectTab('dashboard')}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer active-press ${
                    currentTab === 'dashboard'
                      ? 'bg-gold/15 text-gold border border-gold/40 shadow-xs'
                      : 'text-brand-100/75 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>Dashboard</span>
                </button>
              )}

              <button
                onClick={() => onSelectTab('new-invoice')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-150 shadow-md cursor-pointer active-press ${
                  currentTab === 'new-invoice'
                    ? 'bg-gradient-to-r from-gold via-amber-400 to-gold text-brand-950 ring-2 ring-gold/50 shadow-gold-glow scale-[1.02]'
                    : 'bg-gradient-to-r from-gold/90 to-amber-400/90 text-brand-950 hover:from-gold hover:to-amber-400 hover:shadow-lg'
                }`}
              >
                <PlusCircle className="w-4 h-4 text-brand-950" />
                <span>New Bill</span>
                <span className="text-[10px] bg-brand-950/20 px-1 py-0.2 rounded font-mono font-bold">F2</span>
              </button>

              {prefs.showInvoicesTab && (
                <button
                  onClick={() => onSelectTab('invoices')}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer active-press ${
                    currentTab === 'invoices'
                      ? 'bg-gold/15 text-gold border border-gold/40 shadow-xs'
                      : 'text-brand-100/75 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Invoices</span>
                </button>
              )}

              {prefs.showCatalogueTab && (
                <button
                  onClick={() => onSelectTab('products')}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer active-press ${
                    currentTab === 'products'
                      ? 'bg-gold/15 text-gold border border-gold/40 shadow-xs'
                      : 'text-brand-100/75 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>Catalogue</span>
                </button>
              )}

              {prefs.showCustomersTab && (
                <button
                  onClick={() => onSelectTab('customers')}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer active-press ${
                    currentTab === 'customers'
                      ? 'bg-gold/15 text-gold border border-gold/40 shadow-xs'
                      : 'text-brand-100/75 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Clients</span>
                </button>
              )}

              {/* User Session & Logout */}
              {user && (
                <div className="flex items-center pl-3 ml-2 border-l border-white/15 space-x-2.5">
                  <div className="w-7 h-7 rounded-lg bg-gold/20 border border-gold/30 flex items-center justify-center text-gold font-bold text-[11px]">
                    {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <span className="text-[11px] text-brand-200/90 font-medium truncate max-w-[120px] hidden xl:inline">
                    {user.email}
                  </span>

                  {onLogout && (
                    <button
                      onClick={onLogout}
                      title="Sign Out of POS"
                      className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs text-brand-200/70 hover:text-rose-200 hover:bg-rose-950/40 border border-transparent hover:border-rose-800/40 transition-colors cursor-pointer active-press"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span className="text-xs">Exit</span>
                    </button>
                  )}
                </div>
              )}
            </nav>

            {/* Mobile Top Bar Right: Compact New Bill Shortcut + Logout */}
            <div className="flex md:hidden items-center space-x-2">
              <button
                onClick={() => onSelectTab('new-invoice')}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-gold to-amber-400 text-brand-950 font-black text-xs shadow-md active-press cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>New Bill</span>
              </button>
              {onLogout && (
                <button
                  onClick={onLogout}
                  title="Sign Out"
                  className="p-2 rounded-xl text-brand-200/80 hover:text-white hover:bg-white/10 active-press cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Native App Floating Island Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-3 left-3 right-3 z-40 bg-brand-950/95 backdrop-blur-xl border border-gold/30 rounded-2xl shadow-luxury-lg pb-safe no-print">
        <div className="flex items-center justify-around h-16 px-2">
          {prefs.showDashboard && (
            <button
              onClick={() => onSelectTab('dashboard')}
              className={`flex-1 flex flex-col items-center justify-center py-1 transition-all active-press ${
                currentTab === 'dashboard'
                  ? 'text-gold font-bold'
                  : 'text-amber-100/50 hover:text-amber-100'
              }`}
            >
              <div className={`p-1.5 rounded-xl transition-all ${currentTab === 'dashboard' ? 'bg-gold/20 text-gold border border-gold/40' : ''}`}>
                <LayoutDashboard className="w-4 h-4" />
              </div>
              <span className="text-[10px] tracking-tight mt-0.5">Home</span>
            </button>
          )}

          {prefs.showInvoicesTab && (
            <button
              onClick={() => onSelectTab('invoices')}
              className={`flex-1 flex flex-col items-center justify-center py-1 transition-all active-press ${
                currentTab === 'invoices'
                  ? 'text-gold font-bold'
                  : 'text-amber-100/50 hover:text-amber-100'
              }`}
            >
              <div className={`p-1.5 rounded-xl transition-all ${currentTab === 'invoices' ? 'bg-gold/20 text-gold border border-gold/40' : ''}`}>
                <FileText className="w-4 h-4" />
              </div>
              <span className="text-[10px] tracking-tight mt-0.5">Bills</span>
            </button>
          )}

          {/* Central Prominent Floating Action Button for New Bill */}
          <div className="flex-1 flex justify-center -mt-6">
            <button
              onClick={() => onSelectTab('new-invoice')}
              className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-gold via-amber-400 to-yellow-300 text-brand-950 flex items-center justify-center shadow-gold-glow active-press border-2 border-brand-950 ring-2 ring-gold/60 cursor-pointer"
            >
              <PlusCircle className="w-6 h-6 stroke-[2.5]" />
            </button>
          </div>

          {prefs.showCatalogueTab && (
            <button
              onClick={() => onSelectTab('products')}
              className={`flex-1 flex flex-col items-center justify-center py-1 transition-all active-press ${
                currentTab === 'products'
                  ? 'text-gold font-bold'
                  : 'text-amber-100/50 hover:text-amber-100'
              }`}
            >
              <div className={`p-1.5 rounded-xl transition-all ${currentTab === 'products' ? 'bg-gold/20 text-gold border border-gold/40' : ''}`}>
                <Package className="w-4 h-4" />
              </div>
              <span className="text-[10px] tracking-tight mt-0.5">Catalogue</span>
            </button>
          )}

          {prefs.showCustomersTab && (
            <button
              onClick={() => onSelectTab('customers')}
              className={`flex-1 flex flex-col items-center justify-center py-1 transition-all active-press ${
                currentTab === 'customers'
                  ? 'text-gold font-bold'
                  : 'text-amber-100/50 hover:text-amber-100'
              }`}
            >
              <div className={`p-1.5 rounded-xl transition-all ${currentTab === 'customers' ? 'bg-gold/20 text-gold border border-gold/40' : ''}`}>
                <Users className="w-4 h-4" />
              </div>
              <span className="text-[10px] tracking-tight mt-0.5">Clients</span>
            </button>
          )}
        </div>
      </div>
    </>
  );
};
