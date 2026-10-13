import React, { useState } from 'react';
import { StoreSettings, RegistrationStatus, PricingMode, RoundOffRule } from '../types';
import { saveStoreSettings, exportDatabaseBackup, restoreDatabaseBackup } from '../db';
import { INDIAN_STATES } from '../engine/indianStates';
import { Save, Download, Upload, AlertTriangle, ShieldCheck, Check } from 'lucide-react';

interface SettingsPageProps {
  settings: StoreSettings;
  onRefresh: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ settings, onRefresh }) => {
  const [formData, setFormData] = useState<StoreSettings>({ ...settings });
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [backupStatus, setBackupStatus] = useState<string | null>(null);

  const handleChange = (field: keyof StoreSettings, val: any) => {
    setFormData(prev => ({ ...prev, [field]: val }));
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveStoreSettings(formData);
    setSavedSuccess(true);
    onRefresh();
    setTimeout(() => setSavedSuccess(false), 3000);
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
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
          System & Business Settings
        </h1>
        <p className="text-xs text-slate-500 font-medium mt-1">
          Configure business details, GST compliance, invoice numbering prefixes, and pricing policies.
        </p>
      </div>

      {/* Tax Guardrail Notice from PRD */}
      <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 flex items-start gap-3.5 text-xs text-amber-900 shadow-2xs">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-amber-950">Statutory Tax Compliance Notice</p>
          <p className="text-amber-800/90 mt-0.5 leading-relaxed">
            GST rates, HSN codes, and invoice structures are configurable. Before production billing, verify your GSTIN registration status, saree HSN codes, and applicable tax rates with your chartered accountant.
          </p>
        </div>
      </div>

      {savedSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-emerald-900 flex items-center space-x-2 text-xs font-bold shadow-2xs animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>Store settings updated and applied successfully!</span>
        </div>
      )}

      {/* Main Settings Form */}
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
            className="flex items-center space-x-2 px-6 py-2.5 bg-gradient-to-r from-brand-800 to-brand-900 hover:from-brand-900 hover:to-brand-950 text-white rounded-xl font-bold text-xs shadow-md hover:shadow-lg transition cursor-pointer"
          >
            <Save className="w-4 h-4 text-gold" />
            <span>Save Configuration</span>
          </button>
        </div>
      </form>

      {/* Section 5: Data Backup & Restore */}
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
        </div>
      </div>
    </div>
  );
};
