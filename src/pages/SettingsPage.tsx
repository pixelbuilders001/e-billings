import React, { useState } from 'react';
import { StoreSettings, RegistrationStatus, PricingMode, RoundOffRule, LocalDisplayPreferences } from '../types';
import { saveStoreSettings, exportDatabaseBackup, restoreDatabaseBackup, clearLocalDummyData, DEFAULT_DISPLAY_PREFERENCES } from '../db';
import { INDIAN_STATES } from '../engine/indianStates';
import { 
  Save, 
  Download, 
  Upload, 
  AlertTriangle, 
  ShieldCheck, 
  Check, 
  Cloud, 
  Loader2, 
  Trash2,
  Sliders,
  LayoutDashboard,
  BarChart3,
  ListFilter,
  FileText,
  Package,
  Users,
  RotateCcw,
  HardDrive
} from 'lucide-react';

interface SettingsPageProps {
  settings: StoreSettings;
  onRefresh: () => void;
  displayPrefs: LocalDisplayPreferences;
  onUpdateDisplayPrefs: (prefs: LocalDisplayPreferences) => void;
}

interface ToggleSwitchProps {
  enabled: boolean;
  onChange: (val: boolean) => void;
  label: string;
  description: string;
  icon?: React.ReactNode;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  enabled,
  onChange,
  label,
  description,
  icon
}) => {
  return (
    <div
      onClick={() => onChange(!enabled)}
      className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer select-none shadow-xs ${
        enabled
          ? 'bg-emerald-50/60 border-emerald-300/80 hover:bg-emerald-50'
          : 'bg-slate-50 border-slate-200 hover:bg-slate-100/80'
      }`}
    >
      <div className="flex items-start space-x-3.5 pr-3">
        {icon && (
          <div
            className={`p-2 rounded-xl shrink-0 transition-colors ${
              enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
            }`}
          >
            {icon}
          </div>
        )}
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-extrabold text-slate-900">{label}</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                enabled ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-700'
              }`}
            >
              {enabled ? 'Visible' : 'Hidden'}
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium leading-relaxed mt-0.5">{description}</p>
        </div>
      </div>

      {/* Prominent iOS-Style Toggle Switch */}
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={e => {
          e.stopPropagation();
          onChange(!enabled);
        }}
        className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
          enabled ? 'bg-emerald-600' : 'bg-slate-300'
        }`}
      >
        <span
          aria-hidden="true"
          className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
            enabled ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
};

export const SettingsPage: React.FC<SettingsPageProps> = ({ 
  settings, 
  onRefresh,
  displayPrefs,
  onUpdateDisplayPrefs
}) => {
  const [activeTab, setActiveTab] = useState<'visibility' | 'business' | 'backup' | 'all'>('visibility');
  const [formData, setFormData] = useState<StoreSettings>({ ...settings });
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [backupStatus, setBackupStatus] = useState<string | null>(null);

  const prefs: LocalDisplayPreferences = {
    ...DEFAULT_DISPLAY_PREFERENCES,
    ...displayPrefs
  };

  const handleChange = (field: keyof StoreSettings, val: any) => {
    setFormData(prev => ({ ...prev, [field]: val }));
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg(null);
    try {
      await saveStoreSettings(formData);
      setSavedSuccess(true);
      onRefresh();
      setTimeout(() => setSavedSuccess(false), 3500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update store settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportBackup = async () => {
    try {
      const json = await exportDatabaseBackup();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ShreeBanarasiSarees_Backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    }
  };

  const handleFileRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('WARNING: Restoring will overwrite all existing local invoices, products, and customer records with data from the backup file. Proceed?')) {
      return;
    }

    const reader = new FileReader();
    reader.onload = async event => {
      const content = event.target?.result as string;
      if (!content) return;
      const res = await restoreDatabaseBackup(content);
      if (res.success) {
        setBackupStatus(res.message);
        onRefresh();
      } else {
        alert(res.message);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Luxury Settings Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white/80 backdrop-blur-xl p-5 rounded-2xl border border-gold/25 shadow-card">
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-950 to-brand-900 text-gold flex items-center justify-center border border-gold/40 shadow-xs">
            <Sliders className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight font-serif">
                Boutique Console & Settings
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <Cloud className="w-3 h-3 text-emerald-600" />
                Cloud Synced
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Store profiles, GST rules, invoice prefixes, feature toggles, and offline backups.
            </p>
          </div>
        </div>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-3 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab('visibility')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer shadow-xs active-press ${
            activeTab === 'visibility'
              ? 'bg-gradient-to-r from-brand-950 to-brand-900 text-gold ring-2 ring-gold/40 shadow-md border border-gold/30'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Page & Feature Visibility</span>
          <span className="px-1.5 py-0.5 bg-amber-100 text-amber-900 text-[9px] font-black rounded-full uppercase">Device Local</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('business')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer shadow-xs active-press ${
            activeTab === 'business'
              ? 'bg-gradient-to-r from-brand-950 to-brand-900 text-gold ring-2 ring-gold/40 shadow-md border border-gold/30'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Cloud className="w-4 h-4 text-emerald-500" />
          <span>Store & GST Tax Settings</span>
          <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-black rounded-full uppercase">Cloud Synced</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('backup')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer shadow-xs active-press ${
            activeTab === 'backup'
              ? 'bg-gradient-to-r from-brand-950 to-brand-900 text-gold ring-2 ring-gold/40 shadow-md border border-gold/30'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Data Backup & Restore</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer active-press ${
            activeTab === 'all'
              ? 'bg-slate-900 text-white'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Show All
        </button>
      </div>

      {/* SECTION: LOCAL DEVICE PAGE & VISIBILITY CONTROLS (INDEXEDDB) */}
      {(activeTab === 'visibility' || activeTab === 'all') && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border-2 border-brand-800/10 shadow-lg text-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 gap-3">
            <div>
              <div className="flex items-center space-x-2 text-slate-900 font-extrabold text-base tracking-tight">
                <Sliders className="w-5 h-5 text-brand-900" />
                <span>Local Device Page & Feature Visibility</span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Toggle tabs and metrics on or off for this specific device. Stored locally in IndexedDB.
              </p>
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-200 shadow-2xs">
                <HardDrive className="w-3.5 h-3.5 text-amber-600" />
                IndexedDB (Local Only)
              </span>
              <button
                type="button"
                onClick={() => onUpdateDisplayPrefs(DEFAULT_DISPLAY_PREFERENCES)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 rounded-xl transition active-press cursor-pointer border border-slate-200"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>Reset Defaults</span>
              </button>
            </div>
          </div>

          {/* Main Navigation Pages */}
          <div className="space-y-3 pt-1">
            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
              <span>Main Navigation Pages (Show / Hide)</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <ToggleSwitch
                enabled={prefs.showDashboard}
                onChange={val => onUpdateDisplayPrefs({ ...prefs, showDashboard: val })}
                label="Dashboard Page"
                description="Show or hide the Dashboard tab in top/bottom navigation."
                icon={<LayoutDashboard className="w-5 h-5" />}
              />

              <ToggleSwitch
                enabled={prefs.showInvoicesTab}
                onChange={val => onUpdateDisplayPrefs({ ...prefs, showInvoicesTab: val })}
                label="Invoices Page"
                description="Historical bills, invoice search, and print archives."
                icon={<FileText className="w-5 h-5" />}
              />

              <ToggleSwitch
                enabled={prefs.showCatalogueTab}
                onChange={val => onUpdateDisplayPrefs({ ...prefs, showCatalogueTab: val })}
                label="Catalogue / Saree Inventory"
                description="Product catalog, saree inventory browser, and prices."
                icon={<Package className="w-5 h-5" />}
              />

              <ToggleSwitch
                enabled={prefs.showCustomersTab}
                onChange={val => onUpdateDisplayPrefs({ ...prefs, showCustomersTab: val })}
                label="Customers Directory"
                description="Client records, contact phonebook, and loyalty points."
                icon={<Users className="w-5 h-5" />}
              />
            </div>
          </div>

          {/* Dashboard Components */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
              <span>Dashboard Inside Components (Show / Hide)</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <ToggleSwitch
                enabled={prefs.showDashboardKpis}
                onChange={val => onUpdateDisplayPrefs({ ...prefs, showDashboardKpis: val })}
                label="Dashboard KPI Metrics"
                description="Today's sales, total invoiced, collections, and balance due summary cards."
                icon={<BarChart3 className="w-5 h-5" />}
              />

              <ToggleSwitch
                enabled={prefs.showDashboardRecentInvoices}
                onChange={val => onUpdateDisplayPrefs({ ...prefs, showDashboardRecentInvoices: val })}
                label="Dashboard Recent Bills List"
                description="The recent sales and invoices list displayed on the dashboard."
                icon={<ListFilter className="w-5 h-5" />}
              />
            </div>
          </div>
        </div>
      )}

      {/* Tax Guardrail Notice from PRD */}
      {(activeTab === 'business' || activeTab === 'all') && (
        <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 flex items-start gap-3.5 text-xs text-amber-900 shadow-2xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-950">Statutory Tax Compliance Notice</p>
            <p className="text-amber-800/90 mt-0.5 leading-relaxed">
              GST rates, HSN codes, and invoice structures are configurable. Before production billing, verify your GSTIN registration status, saree HSN codes, and applicable tax rates with your chartered accountant.
            </p>
          </div>
        </div>
      )}

      {savedSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-emerald-900 flex items-center space-x-2 text-xs font-bold shadow-2xs animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>Store settings saved to Supabase cloud and applied successfully across all devices!</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-rose-900 flex items-center space-x-2 text-xs font-bold shadow-2xs">
          <AlertTriangle className="w-4 h-4 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Settings Form */}
      {(activeTab === 'business' || activeTab === 'all') && (
        <form onSubmit={handleSaveSettings} className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-sm space-y-6 text-xs">
        {/* Section 1: Business Identity */}
        <div>
          <h2 className="text-sm font-bold text-brand-900 uppercase tracking-wider font-serif border-b pb-2 mb-4">
            1. Store Identity & Location
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Trade Name (Brand Name) *</label>
              <input
                type="text"
                required
                value={formData.tradeName}
                onChange={e => handleChange('tradeName', e.target.value)}
                className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-brand-700"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-1">Legal Entity Name *</label>
              <input
                type="text"
                required
                value={formData.legalName}
                onChange={e => handleChange('legalName', e.target.value)}
                className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-brand-700"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-gray-700 font-semibold mb-1">Store Address *</label>
              <input
                type="text"
                required
                value={formData.address}
                onChange={e => handleChange('address', e.target.value)}
                className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-1">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={e => handleChange('city', e.target.value)}
                className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-1">State & State Code *</label>
              <select
                value={formData.stateCode}
                onChange={e => {
                  const st = INDIAN_STATES.find(s => s.code === e.target.value);
                  handleChange('stateCode', e.target.value);
                  if (st) handleChange('state', st.name);
                }}
                className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs"
              >
                {INDIAN_STATES.map(s => (
                  <option key={s.code} value={s.code}>{s.code} - {s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-1">Phone Number *</label>
              <input
                type="text"
                required
                value={formData.phone}
                onChange={e => handleChange('phone', e.target.value)}
                className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-1">Email Address</label>
              <input
                type="email"
                value={formData.email}
                onChange={e => handleChange('email', e.target.value)}
                className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs"
              />
            </div>
          </div>
        </div>

        {/* Section 2: GST & Registration Mode */}
        <div>
          <h2 className="text-sm font-bold text-brand-900 uppercase tracking-wider font-serif border-b pb-2 mb-4">
            2. GST Registration & Tax Behavior
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Store GST Status *</label>
              <select
                value={formData.registrationStatus}
                onChange={e => handleChange('registrationStatus', e.target.value as RegistrationStatus)}
                className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs font-semibold"
              >
                <option value="registered">GST Registered (Tax Invoices with CGST/SGST/IGST)</option>
                <option value="unregistered">Unregistered / Composition (Retail Bill / Cash Memo, 0% Tax)</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-1">Store GSTIN (Required if Registered)</label>
              <input
                type="text"
                value={formData.gstin}
                onChange={e => handleChange('gstin', e.target.value.toUpperCase())}
                placeholder="09AABCU9603R1ZM"
                className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs font-mono uppercase"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-1">Catalogue Pricing Mode *</label>
              <select
                value={formData.pricingMode}
                onChange={e => handleChange('pricingMode', e.target.value as PricingMode)}
                className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs"
              >
                <option value="exclusive">Tax-Exclusive (GST added on top of selling price)</option>
                <option value="inclusive">Tax-Inclusive (Selling price already includes GST)</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-1">Rounding Rule *</label>
              <select
                value={formData.roundOffRule}
                onChange={e => handleChange('roundOffRule', e.target.value as RoundOffRule)}
                className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs"
              >
                <option value="nearest_rupee">Round to Nearest Rupee (Recommended Indian Retail)</option>
                <option value="none">Exact Paise (No Rounding)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 3: Invoice Numbering Sequence */}
        <div>
          <h2 className="text-sm font-bold text-brand-900 uppercase tracking-wider font-serif border-b pb-2 mb-4">
            3. Invoice Numbering & Sequence
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Invoice Prefix *</label>
              <input
                type="text"
                required
                value={formData.invoicePrefix}
                onChange={e => handleChange('invoicePrefix', e.target.value)}
                placeholder="SBS/2026-27/"
                className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs font-mono"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                E.g. "SBS/2026-27/" yields SBS/2026-27/1001
              </p>
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-1">Next Sequence Number *</label>
              <input
                type="number"
                min="1"
                required
                value={formData.nextSequence}
                onChange={e => handleChange('nextSequence', Number(e.target.value) || 1)}
                className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs font-mono font-bold"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Terms & Footer */}
        <div>
          <h2 className="text-sm font-bold text-brand-900 uppercase tracking-wider font-serif border-b pb-2 mb-4">
            4. Terms, Conditions & Invoice Footer
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Terms & Conditions</label>
              <textarea
                rows={3}
                value={formData.termsAndConditions}
                onChange={e => handleChange('termsAndConditions', e.target.value)}
                className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-1">Footer Tagline</label>
              <input
                type="text"
                value={formData.footerText}
                onChange={e => handleChange('footerText', e.target.value)}
                className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-100">
          <button
            type="submit"
            disabled={isSaving}
            className={`flex items-center space-x-2 px-6 py-2.5 bg-gradient-to-r from-brand-800 to-brand-900 hover:from-brand-900 hover:to-brand-950 text-white rounded-xl font-bold text-xs shadow-md hover:shadow-lg transition cursor-pointer ${
              isSaving ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 text-gold animate-spin" />
            ) : (
              <Save className="w-4 h-4 text-gold" />
            )}
            <span>{isSaving ? 'Saving to Cloud...' : 'Save Configuration'}</span>
          </button>
        </div>
      </form>
      )}

      {/* Section: Data Backup & Restore */}
      {(activeTab === 'backup' || activeTab === 'all') && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-sm text-xs space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3 text-slate-900 font-bold text-sm uppercase tracking-wider">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <span>Local Store Data Backup & Restore</span>
          </div>

          <p className="text-slate-600 leading-relaxed font-medium">
            Invoices and client records are stored safely in local IndexedDB. You can export regular JSON snapshots or restore previous backups onto another workstation.
          </p>

          {backupStatus && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl font-semibold">
              {backupStatus}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleExportBackup}
              className="flex items-center space-x-2 px-5 py-2.5 bg-brand-850 hover:bg-brand-950 text-white rounded-xl font-bold shadow-sm transition cursor-pointer"
            >
              <Download className="w-4 h-4 text-gold" />
              <span>Export Full JSON Backup</span>
            </button>

            <label className="flex items-center space-x-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 rounded-xl font-bold border border-slate-200 cursor-pointer transition">
              <Upload className="w-4 h-4 text-slate-500" />
              <span>Restore Backup File</span>
              <input
                type="file"
                accept=".json"
                onChange={handleFileRestore}
                className="hidden"
              />
            </label>

            <button
              type="button"
              onClick={async () => {
                if (confirm('Clear all local IndexedDB cache? All products and sales will be read directly from live Supabase.')) {
                  await clearLocalDummyData();
                  setBackupStatus('All local IndexedDB dummy stores wiped successfully. Using live Supabase data.');
                  onRefresh();
                }
              }}
              className="flex items-center space-x-2 px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-bold border border-rose-200 transition cursor-pointer active-press"
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>Wipe Local Cache Data</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
