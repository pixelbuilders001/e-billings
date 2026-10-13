import { 
  FileText, 
  PlusCircle, 
  Package, 
  Users, 
  Settings, 
  LayoutDashboard,
  LogOut
} from 'lucide-react';
import type { RegistrationStatus } from '../types';

import { AuthUser } from '../store/useAuthStore';

export type NavTab = 'dashboard' | 'new-invoice' | 'invoices' | 'products' | 'customers' | 'settings';

interface NavbarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  storeName?: string;
  registrationStatus?: RegistrationStatus;
  user?: AuthUser | null;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  user,
  onLogout
}) => {
  return (
    <header className="bg-brand-900 text-ivory border-b border-brand-800/80 sticky top-0 z-40 shadow-sm no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Minimal Clean Logo & billtoprint name */}
          <div 
            onClick={() => onSelectTab('dashboard')} 
            className="flex items-center space-x-2.5 cursor-pointer group select-none shrink-0"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-gold to-amber-300 flex items-center justify-center text-brand-950 font-black text-xs shadow-xs group-hover:scale-105 transition-transform duration-200">
              <span>B2P</span>
            </div>
            <span className="text-sm font-bold text-white tracking-tight group-hover:text-gold transition-colors">
              billtoprint
            </span>
          </div>

          {/* Clean Navigation Links with Smaller Font & Better Breathing Room */}
          <nav className="flex items-center space-x-1 sm:space-x-1.5 overflow-x-auto py-1">
            <button
              onClick={() => onSelectTab('dashboard')}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                currentTab === 'dashboard'
                  ? 'bg-white/15 text-gold font-semibold'
                  : 'text-brand-100/80 hover:bg-white/10 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Dashboard</span>
            </button>

            <button
              onClick={() => onSelectTab('new-invoice')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer ${
                currentTab === 'new-invoice'
                  ? 'bg-gold text-brand-950 ring-1 ring-gold/60'
                  : 'bg-gold/90 text-brand-950 hover:bg-gold'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>New Bill</span>
            </button>

            <button
              onClick={() => onSelectTab('invoices')}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                currentTab === 'invoices'
                  ? 'bg-white/15 text-gold font-semibold'
                  : 'text-brand-100/80 hover:bg-white/10 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Invoices</span>
            </button>

            <button
              onClick={() => onSelectTab('products')}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                currentTab === 'products'
                  ? 'bg-white/15 text-gold font-semibold'
                  : 'text-brand-100/80 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Catalogue</span>
            </button>

            <button
              onClick={() => onSelectTab('customers')}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                currentTab === 'customers'
                  ? 'bg-white/15 text-gold font-semibold'
                  : 'text-brand-100/80 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Customers</span>
            </button>

            <button
              onClick={() => onSelectTab('settings')}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                currentTab === 'settings'
                  ? 'bg-white/15 text-gold font-semibold'
                  : 'text-brand-100/80 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Settings</span>
            </button>

            {/* User Session & Logout */}
            {user && (
              <div className="flex items-center pl-2 ml-1 border-l border-white/15 space-x-1.5">
                <span className="text-[11px] text-brand-200/80 font-medium truncate max-w-[120px] hidden xl:inline">
                  {user.email}
                </span>

                {onLogout && (
                  <button
                    onClick={onLogout}
                    title="Sign Out"
                    className="flex items-center space-x-1 p-1.5 rounded-md text-xs text-brand-200/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span className="text-xs hidden sm:inline">Logout</span>
                  </button>
                )}
              </div>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};
