import { Invoice, StoreSettings } from '../types';
import { 
  IndianRupee, 
  Clock, 
  CheckCircle, 
  PlusCircle, 
  Eye, 
  TrendingUp,
  AlertCircle
} from 'lucide-react';

interface DashboardProps {
  invoices: Invoice[];
  settings: StoreSettings;
  onNewInvoice: () => void;
  onViewInvoice: (invoice: Invoice) => void;
  onGoToSettings?: () => void;
  showKpis?: boolean;
  showRecentList?: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({
  invoices,
  settings,
  onNewInvoice,
  onViewInvoice,
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-brand-900 via-brand-850 to-brand-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-gold/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center space-x-2 text-gold text-xs font-bold uppercase tracking-wider mb-1.5">
            <span>BillToPrint Enterprise Suite</span>
            <span>•</span>
            <span className="text-amber-200">{settings.registrationStatus === 'registered' ? 'GST Tax Invoicing' : 'Retail Bill Mode'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            {settings.tradeName}
          </h1>
          <p className="text-xs sm:text-sm text-brand-200/90 mt-1 max-w-xl font-normal">
            {settings.address}, {settings.city} ({settings.state}) • GSTIN: <span className="font-mono font-semibold text-white">{settings.gstin || 'Not Configured'}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 relative z-10">
          <button
            onClick={onNewInvoice}
            className="flex items-center space-x-2 px-5 py-3 rounded-xl bg-gradient-to-r from-gold to-amber-300 hover:from-amber-300 hover:to-gold text-brand-950 font-extrabold text-sm shadow-lg hover:shadow-xl transition duration-150 cursor-pointer active:scale-98"
          >
            <PlusCircle className="w-5 h-5" />
            <span>Create New Bill</span>
          </button>
        </div>
      </div>

      {/* Compliance / Setup Notification if unregistered or missing GSTIN */}
      {settings.registrationStatus === 'registered' && !settings.gstin && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-center justify-between gap-4 text-xs text-amber-900">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div>
              <p className="font-bold">GSTIN Required for Registered Tax Invoicing</p>
              <p className="text-amber-700 mt-0.5">
                Your store is in Registered mode, but GSTIN is blank. Update store profile in Settings.
              </p>
            </div>
          </div>
          <button
            onClick={onGoToSettings}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium whitespace-nowrap"
          >
            Settings
          </button>
        </div>
      )}

      {/* Key Metrics Cards */}
      {showKpis && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Today's Sales */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition duration-200">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Today's Sales</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black font-mono text-slate-900 tracking-tight">
              ₹{todaySales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <p className="text-[11px] text-slate-500 font-medium">
                {todayInvoices.length} invoices generated today
              </p>
            </div>
          </div>

          {/* All-Time Invoiced */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition duration-200">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Sales</span>
              <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-800 flex items-center justify-center border border-brand-100">
                <IndianRupee className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black font-mono text-slate-900 tracking-tight">
              ₹{totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-600"></span>
              <p className="text-[11px] text-slate-500 font-medium">
                {finalizedInvoices.length} finalized invoices
              </p>
            </div>
          </div>

          {/* Cash & Payments Collected */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition duration-200">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Collected Total</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                <CheckCircle className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black font-mono text-emerald-700 tracking-tight">
              ₹{totalCollected.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <p className="text-[11px] text-slate-500 font-medium">
                Received via Cash / UPI / Card
              </p>
            </div>
          </div>

          {/* Balance Due */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition duration-200">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Balance Due</span>
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black font-mono text-rose-700 tracking-tight">
              ₹{totalBalanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
              <p className="text-[11px] text-slate-500 font-medium">
                {pendingCount} invoices pending payment
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Recent Invoices Table */}
      {showRecentList && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Recent Invoices</h2>
            <p className="text-xs text-slate-500 font-medium">Latest customer bills and billing records</p>
          </div>
          <button
            onClick={onNewInvoice}
            className="text-xs font-bold text-brand-800 hover:text-brand-950 flex items-center space-x-1.5 px-3 py-1.5 bg-brand-50 hover:bg-brand-100/70 rounded-lg transition"
          >
            <span>+ Quick Bill</span>
          </button>
        </div>

        {recentInvoices.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs font-medium">
            No invoices created yet. Click "Create New Bill" to issue your first invoice.
          </div>
        ) : (
          <>
            {/* Mobile Cards for Recent Invoices */}
            <div className="block md:hidden divide-y divide-slate-100">
              {recentInvoices.map(inv => {
                const payBg = inv.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : inv.paymentStatus === 'partially_paid' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-rose-50 text-rose-700 border border-rose-200';
                return (
                  <div
                    key={inv.id}
                    onClick={() => onViewInvoice(inv)}
                    className="p-4 active-press hover:bg-slate-50 transition cursor-pointer flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-brand-900 text-xs">{inv.invoiceNumber}</span>
                      <span className="text-[11px] text-slate-500 font-medium">{inv.invoiceDate}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-slate-900">{inv.customerSnapshot.name}</p>
                        <p className="text-[11px] text-slate-500 font-mono">{inv.customerSnapshot.phone}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-black text-slate-900 text-sm">
                          ₹{inv.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </p>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${payBg}`}>
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
                  <tr className="bg-slate-50/80 text-slate-600 border-b border-slate-200">
                    <th className="py-3.5 px-4 font-bold">Invoice #</th>
                    <th className="py-3.5 px-4 font-bold">Date</th>
                    <th className="py-3.5 px-4 font-bold">Customer</th>
                    <th className="py-3.5 px-4 font-bold text-right">Grand Total (₹)</th>
                    <th className="py-3.5 px-4 font-bold text-center">Status</th>
                    <th className="py-3.5 px-4 font-bold text-center">Payment</th>
                    <th className="py-3.5 px-4 font-bold text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentInvoices.map(inv => {
                    const statusBg = inv.status === 'finalized' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : inv.status === 'draft' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-slate-100 text-slate-600';
                    const payBg = inv.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : inv.paymentStatus === 'partially_paid' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-rose-50 text-rose-700 border border-rose-200';
                    return (
                      <tr key={inv.id} className="hover:bg-slate-50/60 transition duration-150">
                        <td className="py-3.5 px-4 font-mono font-bold text-brand-900">
                          {inv.invoiceNumber}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {inv.invoiceDate}
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-900">{inv.customerSnapshot.name}</p>
                          <p className="text-[11px] text-slate-500 font-mono">{inv.customerSnapshot.phone}</p>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-black text-slate-900">
                          ₹{inv.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${statusBg}`}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${payBg}`}>
                            {inv.paymentStatus.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => onViewInvoice(inv)}
                            className="inline-flex items-center space-x-1 px-3 py-1 text-xs font-bold text-brand-900 bg-brand-50 hover:bg-brand-100 border border-brand-200/60 rounded-lg transition active-press cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View</span>
                          </button>
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
