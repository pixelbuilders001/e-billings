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
      {/* Top Header - Minimal and clean on all viewports */}
      <header className="bg-brand-900/95 backdrop-blur-md text-ivory border-b border-brand-800/80 sticky top-0 z-40 shadow-xs no-print pt-safe">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Minimal Clean Logo & billtoprint name - Clicking opens Settings */}
            <div 
              onClick={() => onSelectTab('settings')} 
              title="Click to open Settings"
              className="flex items-center space-x-2.5 cursor-pointer group select-none shrink-0 active-press"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-gold to-amber-300 flex items-center justify-center text-brand-950 font-black text-xs shadow-md group-hover:scale-105 transition-transform duration-200">
                <span>B2P</span>
              </div>
              <span className={`text-sm font-bold tracking-tight transition-colors ${
                currentTab === 'settings' ? 'text-gold font-extrabold' : 'text-white group-hover:text-gold'
              }`}>
                billtoprint
              </span>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center space-x-1.5">
              {prefs.showDashboard && (
                <button
                  onClick={() => onSelectTab('dashboard')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer active-press ${
                    currentTab === 'dashboard'
                      ? 'bg-white/15 text-gold font-semibold shadow-2xs'
                      : 'text-brand-100/80 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>Dashboard</span>
                </button>
              )}

              <button
                onClick={() => onSelectTab('new-invoice')}
                className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer active-press ${
                  currentTab === 'new-invoice'
                    ? 'bg-gold text-brand-950 ring-2 ring-gold/40 font-black'
                    : 'bg-gold/90 text-brand-950 hover:bg-gold'
                }`}
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>New Bill</span>
              </button>

              {prefs.showInvoicesTab && (
                <button
                  onClick={() => onSelectTab('invoices')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer active-press ${
                    currentTab === 'invoices'
                      ? 'bg-white/15 text-gold font-semibold shadow-2xs'
                      : 'text-brand-100/80 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Invoices</span>
                </button>
              )}

              {prefs.showCatalogueTab && (
                <button
                  onClick={() => onSelectTab('products')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer active-press ${
                    currentTab === 'products'
                      ? 'bg-white/15 text-gold font-semibold shadow-2xs'
                      : 'text-brand-100/80 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>Catalogue</span>
                </button>
              )}

              {prefs.showCustomersTab && (
                <button
                  onClick={() => onSelectTab('customers')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer active-press ${
                    currentTab === 'customers'
                      ? 'bg-white/15 text-gold font-semibold shadow-2xs'
                      : 'text-brand-100/80 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Customers</span>
                </button>
              )}

              {/* User Session & Logout */}
              {user && (
                <div className="flex items-center pl-2 ml-1 border-l border-white/15 space-x-2">
                  <span className="text-[11px] text-brand-200/80 font-medium truncate max-w-[130px] hidden xl:inline">
                    {user.email}
                  </span>

                  {onLogout && (
                    <button
                      onClick={onLogout}
                      title="Sign Out"
                      className="flex items-center space-x-1 px-2 py-1 rounded-md text-xs text-brand-200/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer active-press"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span className="text-xs">Logout</span>
                    </button>
                  )}
                </div>
              )}
            </nav>

            {/* Mobile Top Bar Right: Compact New Bill Shortcut + Logout */}
            <div className="flex md:hidden items-center space-x-1.5">
              <button
                onClick={() => onSelectTab('new-invoice')}
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-gold text-brand-950 font-bold text-xs shadow-xs active-press cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>New Bill</span>
              </button>
              {onLogout && (
                <button
                  onClick={onLogout}
                  title="Sign Out"
                  className="p-1.5 rounded-lg text-brand-200/80 hover:text-white hover:bg-white/10 active-press cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Native App Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200/90 shadow-2xl pb-safe no-print">
        <div className="flex items-center justify-around h-15 px-2">
          {prefs.showDashboard && (
            <button
              onClick={() => onSelectTab('dashboard')}
              className={`flex-1 flex flex-col items-center justify-center py-1 transition-all active-press ${
                currentTab === 'dashboard'
                  ? 'text-brand-900 font-bold'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <div className={`p-1 rounded-xl transition-all ${currentTab === 'dashboard' ? 'bg-brand-50 text-brand-900' : ''}`}>
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
                  ? 'text-brand-900 font-bold'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <div className={`p-1 rounded-xl transition-all ${currentTab === 'invoices' ? 'bg-brand-50 text-brand-900' : ''}`}>
                <FileText className="w-4 h-4" />
              </div>
              <span className="text-[10px] tracking-tight mt-0.5">Bills</span>
            </button>
          )}

          {/* Central Prominent Action Button for New Bill */}
          <div className="flex-1 flex justify-center -mt-4">
            <button
              onClick={() => onSelectTab('new-invoice')}
              className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-900 to-brand-700 text-gold flex items-center justify-center shadow-lg active-press border-2 border-white ring-2 ring-brand-800/20 cursor-pointer"
            >
              <PlusCircle className="w-6 h-6" />
            </button>
          </div>

          {prefs.showCatalogueTab && (
            <button
              onClick={() => onSelectTab('products')}
              className={`flex-1 flex flex-col items-center justify-center py-1 transition-all active-press ${
                currentTab === 'products'
                  ? 'text-brand-900 font-bold'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <div className={`p-1 rounded-xl transition-all ${currentTab === 'products' ? 'bg-brand-50 text-brand-900' : ''}`}>
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
                  ? 'text-brand-900 font-bold'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <div className={`p-1 rounded-xl transition-all ${currentTab === 'customers' ? 'bg-brand-50 text-brand-900' : ''}`}>
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
