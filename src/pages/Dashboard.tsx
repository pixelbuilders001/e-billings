import { Invoice, StoreSettings } from '../types';
import { 
  IndianRupee, 
  Clock, 
  CheckCircle, 
  PlusCircle, 
  Eye, 
  TrendingUp,
  AlertCircle,
  FileEdit
} from 'lucide-react';

interface DashboardProps {
  invoices: Invoice[];
  settings: StoreSettings;
  onNewInvoice: () => void;
  onViewInvoice: (invoice: Invoice) => void;
  onEditDraft?: (invoice: Invoice) => void;
  onGoToSettings?: () => void;
  showKpis?: boolean;
  showRecentList?: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({
  invoices,
  settings,
  onNewInvoice,
  onViewInvoice,
  onEditDraft,
  onGoToSettings,
  showKpis = true,
  showRecentList = true
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const todayInvoices = invoices.filter(inv => inv.invoiceDate === todayStr && inv.status !== 'cancelled');
  const finalizedInvoices = invoices.filter(inv => inv.status === 'finalized');

  const todaySales = todayInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
  const totalSales = finalizedInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
  const totalCollected = finalizedInvoices.reduce((sum, inv) => sum + inv.paidTotal, 0);
  const totalBalanceDue = finalizedInvoices.reduce((sum, inv) => sum + inv.balanceDue, 0);

  const pendingCount = invoices.filter(inv => inv.paymentStatus !== 'paid' && inv.status === 'finalized').length;
  const recentInvoices = invoices.slice(0, 6);
  const avgOrderValue = finalizedInvoices.length > 0 ? Math.round(totalSales / finalizedInvoices.length) : 0;

  // Time-aware greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Executive Welcome Banner with Heritage Luxury Feel */}
      <div className="bg-gradient-to-r from-brand-950 via-brand-900 to-[#30000B] rounded-3xl p-6 sm:p-8 text-white shadow-luxury-lg border border-gold/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
        {/* Ambient Glows & Silk Weave Pattern */}
        <div className="absolute right-0 top-0 w-96 h-96 bg-gold/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 -bottom-20 w-80 h-80 bg-brand-700/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(#D4AF37_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />

        <div className="relative z-10 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-gold text-xs font-bold uppercase tracking-widest flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>{greeting} • Counter Terminal Online</span>
            </span>
            <span className="text-white/30">•</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-gold/20 text-gold border border-gold/30 font-semibold">
              {settings.registrationStatus === 'registered' ? 'GST Tax Invoicing Active' : 'Retail Bill Counter'}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white font-serif">
            {settings.tradeName}
          </h1>
          
          <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-brand-200/90 mt-2 font-normal">
            <span>{settings.address}, {settings.city} ({settings.state})</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <span className="text-slate-400">GSTIN:</span>
              <span className="font-mono font-bold text-amber-200 bg-black/30 px-1.5 py-0.5 rounded border border-white/10">
                {settings.gstin || 'Not Configured'}
              </span>
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 relative z-10">
          <button
            onClick={onNewInvoice}
            className="flex items-center space-x-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-gold via-amber-400 to-yellow-300 hover:from-amber-300 hover:to-gold text-brand-950 font-black text-xs sm:text-sm shadow-gold-glow hover:shadow-xl transition duration-150 cursor-pointer active-press border border-yellow-200/50"
          >
            <PlusCircle className="w-5 h-5 stroke-[2.5]" />
            <span>Create New Bill</span>
            <span className="text-[10px] bg-brand-950/20 px-1.5 py-0.5 rounded font-mono font-bold ml-1">F2</span>
          </button>
        </div>
      </div>

      {/* Compliance / Setup Notification if unregistered or missing GSTIN */}
      {settings.registrationStatus === 'registered' && !settings.gstin && (
        <div className="bg-amber-50/90 border border-amber-300 rounded-2xl p-4 flex items-center justify-between gap-4 text-xs text-amber-950 shadow-xs">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="font-extrabold text-sm">GSTIN Setup Required for Tax Invoices</p>
              <p className="text-amber-800 mt-0.5 font-medium">
                Your store is currently configured for Registered GST Invoicing, but the GSTIN is missing. Update your profile in Settings.
              </p>
            </div>
          </div>
          <button
            onClick={onGoToSettings}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs shadow-xs transition cursor-pointer shrink-0"
          >
            Go to Settings
          </button>
        </div>
      )}

      {/* High-Impact Key Metrics Cards */}
      {showKpis && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Today's Sales */}
          <div className="luxury-card luxury-card-hover rounded-2xl p-5 border border-slate-200/80 transition-all">
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Today's Sales</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-2xs">
                <TrendingUp className="w-4 h-4 stroke-[2.5]" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold font-serif text-slate-900 tracking-tight tabular-nums">
              ₹{todaySales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="text-[11px] text-slate-600 font-semibold">
                  {todayInvoices.length} invoices generated
                </span>
              </div>
              <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                Today
              </span>
            </div>
          </div>

          {/* All-Time Invoiced & AOV */}
          <div className="luxury-card luxury-card-hover rounded-2xl p-5 border border-slate-200/80 transition-all">
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Sales Volume</span>
              <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-900 flex items-center justify-center border border-brand-200/60 shadow-2xs">
                <IndianRupee className="w-4 h-4 stroke-[2.5]" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold font-serif text-brand-950 tracking-tight tabular-nums">
              ₹{totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
              <span className="text-[11px] text-slate-600 font-semibold">
                {finalizedInvoices.length} finalized bills
              </span>
              <span className="text-[10px] bg-brand-50 text-brand-900 font-bold px-2 py-0.5 rounded-full border border-brand-200" title="Average Order Value">
                AOV: ₹{avgOrderValue.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Cash & Payments Collected */}
          <div className="luxury-card luxury-card-hover rounded-2xl p-5 border border-slate-200/80 transition-all">
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Collected</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-2xs">
                <CheckCircle className="w-4 h-4 stroke-[2.5]" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold font-serif text-emerald-800 tracking-tight tabular-nums">
              ₹{totalCollected.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
              <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Cash • UPI • Card
              </span>
              <span className="text-[10px] text-slate-500 font-mono font-medium">
                {totalSales > 0 ? Math.round((totalCollected / totalSales) * 100) : 100}% Clear
              </span>
            </div>
          </div>

          {/* Balance Due / Receivables */}
          <div className="luxury-card luxury-card-hover rounded-2xl p-5 border border-slate-200/80 transition-all">
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Outstanding Balance</span>
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 shadow-2xs">
                <Clock className="w-4 h-4 stroke-[2.5]" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold font-serif text-rose-700 tracking-tight tabular-nums">
              ₹{totalBalanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                <span className="text-[11px] text-rose-700 font-semibold">
                  {pendingCount} invoices pending
                </span>
              </div>
              <span className="text-[10px] bg-rose-50 text-rose-700 font-bold px-2 py-0.5 rounded-full border border-rose-200">
                Actionable
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Recent Invoices Ledger with Visual Polish */}
      {showRecentList && (
        <div className="luxury-card rounded-2xl border border-slate-200/80 shadow-card overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50/80 to-white">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-6 bg-brand-900 rounded-full"></div>
              <div>
                <h2 className="text-base font-extrabold text-slate-900 tracking-tight font-serif">Recent Invoices</h2>
                <p className="text-xs text-slate-500 font-medium">Latest customer bills and billing records</p>
              </div>
            </div>
            <button
              onClick={onNewInvoice}
              className="text-xs font-bold text-brand-950 hover:text-brand-900 flex items-center space-x-1.5 px-3.5 py-2 bg-gradient-to-r from-gold/20 to-amber-200/40 hover:from-gold/30 hover:to-amber-200/60 border border-gold/40 rounded-xl transition cursor-pointer active-press shadow-2xs"
            >
              <PlusCircle className="w-3.5 h-3.5 text-brand-950" />
              <span>+ Quick Bill</span>
            </button>
          </div>

          {recentInvoices.length === 0 ? (
            <div className="p-16 text-center text-slate-400 space-y-3">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-brand-50 text-brand-800 flex items-center justify-center border border-brand-100">
                <IndianRupee className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-slate-600">No invoices generated yet</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Ready to bill your first customer? Click "+ Quick Bill" or press [F2] to open the billing counter.
              </p>
            </div>
          ) : (
            <>
              {/* Mobile Cards for Recent Invoices */}
              <div className="block md:hidden divide-y divide-slate-100">
                {recentInvoices.map(inv => {
                  const payBg = inv.paymentStatus === 'paid' 
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                    : inv.paymentStatus === 'partially_paid' 
                    ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                    : 'bg-rose-50 text-rose-700 border border-rose-200';
                  
                  return (
                    <div
                      key={inv.id}
                      onClick={() => onViewInvoice(inv)}
                      className="p-4 active-press hover:bg-slate-50/80 transition cursor-pointer flex flex-col gap-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-brand-900 text-xs bg-brand-50 px-2 py-0.5 rounded border border-brand-200/50">
                          {inv.invoiceNumber}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium">{inv.invoiceDate}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-8 h-8 rounded-full bg-brand-900 text-gold flex items-center justify-center font-bold text-xs">
                            {inv.customerSnapshot.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{inv.customerSnapshot.name}</p>
                            <p className="text-[11px] text-slate-500 font-mono">{inv.customerSnapshot.phone}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-serif font-bold text-slate-900 text-sm tabular-nums">
                            ₹{inv.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </p>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${payBg}`}>
                            {inv.paymentStatus.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 text-slate-600 border-b border-slate-200/80">
                      <th className="py-3.5 px-4 font-bold uppercase tracking-wider text-[11px]">Invoice #</th>
                      <th className="py-3.5 px-4 font-bold uppercase tracking-wider text-[11px]">Date</th>
                      <th className="py-3.5 px-4 font-bold uppercase tracking-wider text-[11px]">Customer</th>
                      <th className="py-3.5 px-4 font-bold uppercase tracking-wider text-[11px] text-right">Grand Total (₹)</th>
                      <th className="py-3.5 px-4 font-bold uppercase tracking-wider text-[11px] text-center">Status</th>
                      <th className="py-3.5 px-4 font-bold uppercase tracking-wider text-[11px] text-center">Payment</th>
                      <th className="py-3.5 px-4 font-bold uppercase tracking-wider text-[11px] text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentInvoices.map(inv => {
                      const statusBg = inv.status === 'finalized' 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                        : inv.status === 'draft' 
                        ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                        : 'bg-slate-100 text-slate-600 border border-slate-200';
                      const payBg = inv.paymentStatus === 'paid' 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                        : inv.paymentStatus === 'partially_paid' 
                        ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                        : 'bg-rose-50 text-rose-700 border border-rose-200';
                      
                      return (
                        <tr key={inv.id} className="hover:bg-amber-50/30 transition duration-150">
                          <td className="py-3.5 px-4 font-mono font-bold text-brand-900">
                            <span className="bg-brand-50/80 px-2 py-1 rounded-md border border-brand-200/50">
                              {inv.invoiceNumber}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 font-medium">
                            {inv.invoiceDate}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center space-x-2.5">
                              <div className="w-7 h-7 rounded-full bg-brand-900 text-gold flex items-center justify-center font-bold text-[11px]">
                                {inv.customerSnapshot.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900">{inv.customerSnapshot.name}</p>
                                <p className="text-[11px] text-slate-500 font-mono">{inv.customerSnapshot.phone}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right font-serif font-bold text-slate-900 text-sm tabular-nums">
                            ₹{inv.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusBg}`}>
                              {inv.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${payBg}`}>
                              {inv.paymentStatus.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center space-x-1.5">
                              {inv.status === 'draft' && onEditDraft && (
                                <button
                                  onClick={() => onEditDraft(inv)}
                                  className="inline-flex items-center space-x-1 px-2.5 py-1.5 text-xs font-bold text-brand-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 rounded-xl transition active-press cursor-pointer shadow-2xs"
                                  title="Edit and complete billing for this draft"
                                >
                                  <FileEdit className="w-3.5 h-3.5" />
                                  <span>Edit</span>
                                </button>
                              )}
                              <button
                                onClick={() => onViewInvoice(inv)}
                                className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold text-brand-950 bg-gradient-to-r from-gold/15 to-amber-200/30 hover:from-gold/30 hover:to-amber-200/50 border border-gold/40 rounded-xl transition active-press cursor-pointer shadow-2xs"
                              >
                                <Eye className="w-3.5 h-3.5 text-brand-900" />
                                <span>View</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Store Showcase Image when KPIs and Recent Invoices are both turned off */}
      {!showKpis && !showRecentList && (
        <div className="bg-white rounded-3xl overflow-hidden border border-slate-200/80 shadow-md">
          <div className="relative aspect-[4/3] md:aspect-[16/9] max-h-[640px] w-full bg-slate-100 flex items-center justify-center overflow-hidden group">
            <img
              src="/store_pic.webp"
              alt={settings.tradeName || 'Store Front'}
              className="w-full h-full object-cover object-center group-hover:scale-[1.01] transition-transform duration-500"
            />
            {/* Elegant overlay at the bottom */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent p-6 sm:p-8 text-white flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight drop-shadow font-serif">
                  {settings.tradeName}
                </h3>
                <p className="text-xs sm:text-sm text-amber-200/90 font-medium drop-shadow mt-0.5">
                  Banarasi Sarees • Wedding Collections • Silk Sarees • Designer Sarees
                </p>
              </div>
              <button
                onClick={onNewInvoice}
                className="self-start sm:self-auto flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-gold to-amber-300 hover:from-amber-300 hover:to-gold text-brand-950 font-black text-xs shadow-lg transition active-press cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create New Bill</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
