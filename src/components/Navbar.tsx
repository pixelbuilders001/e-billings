import React from 'react';
import { 
  FileText, 
  PlusCircle, 
  Package, 
  Users, 
  Settings, 
  LayoutDashboard 
} from 'lucide-react';
import { RegistrationStatus } from '../types';

export type NavTab = 'dashboard' | 'new-invoice' | 'invoices' | 'products' | 'customers' | 'settings';

interface NavbarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  storeName: string;
  registrationStatus: RegistrationStatus;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  storeName,
  registrationStatus
}) => {
  return (
    <header className="bg-brand-800 text-ivory border-b border-gold/30 sticky top-0 z-40 shadow-md no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Store Identity */}
          <div 
            onClick={() => onSelectTab('dashboard')} 
            className="flex items-center space-x-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-full bg-gold/20 border border-gold flex items-center justify-center text-gold font-serif font-bold text-lg shadow-inner">
              श्री
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-serif text-lg sm:text-xl font-bold tracking-wide text-ivory group-hover:text-gold transition-colors">
                  {storeName || 'Shree Banarasi Sarees'}
                </span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  registrationStatus === 'registered' 
                    ? 'bg-emerald-900/80 text-emerald-200 border border-emerald-500/50' 
                    : 'bg-amber-900/80 text-amber-200 border border-amber-500/50'
                }`}>
                  {registrationStatus === 'registered' ? 'GST Registered' : 'Retail Bill Mode'}
                </span>
              </div>
              <p className="text-xs text-brand-200 hidden sm:block">
                Heritage Handcrafted Varanasi Sarees • Invoicing & Billing
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto py-2">
            <button
              onClick={() => onSelectTab('dashboard')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${
                currentTab === 'dashboard'
                  ? 'bg-brand-900 text-gold border border-gold/40 shadow-sm'
                  : 'text-brand-100 hover:bg-brand-700/60 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span className="hidden md:inline">Dashboard</span>
            </button>

            <button
              onClick={() => onSelectTab('new-invoice')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-md text-xs sm:text-sm font-semibold transition-all ${
                currentTab === 'new-invoice'
                  ? 'bg-gold text-brand-950 shadow-md font-bold'
                  : 'bg-brand-700 text-gold hover:bg-gold hover:text-brand-950'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>New Bill</span>
            </button>

            <button
              onClick={() => onSelectTab('invoices')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${
                currentTab === 'invoices'
                  ? 'bg-brand-900 text-gold border border-gold/40 shadow-sm'
                  : 'text-brand-100 hover:bg-brand-700/60 hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Invoices</span>
            </button>

            <button
              onClick={() => onSelectTab('products')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${
                currentTab === 'products'
                  ? 'bg-brand-900 text-gold border border-gold/40 shadow-sm'
                  : 'text-brand-100 hover:bg-brand-700/60 hover:text-white'
              }`}
            >
              <Package className="w-4 h-4" />
              <span className="hidden sm:inline">Catalogue</span>
            </button>

            <button
              onClick={() => onSelectTab('customers')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${
                currentTab === 'customers'
                  ? 'bg-brand-900 text-gold border border-gold/40 shadow-sm'
                  : 'text-brand-100 hover:bg-brand-700/60 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Customers</span>
            </button>

            <button
              onClick={() => onSelectTab('settings')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${
                currentTab === 'settings'
                  ? 'bg-brand-900 text-gold border border-gold/40 shadow-sm'
                  : 'text-brand-100 hover:bg-brand-700/60 hover:text-white'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span className="hidden lg:inline">Settings</span>
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};
