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
  onGoToSettings: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  invoices,
  settings,
  onNewInvoice,
  onViewInvoice,
  onGoToSettings
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
      <div className="bg-gradient-to-r from-brand-900 via-brand-800 to-brand-900 rounded-2xl p-6 sm:p-8 text-ivory shadow-lg border border-gold/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center space-x-2 text-gold text-xs font-semibold uppercase tracking-wider mb-1">
            <span>Varanasi Heritage Handloom Billing</span>
            <span>•</span>
            <span>{settings.registrationStatus === 'registered' ? 'GST Tax Invoicing' : 'Retail Bill Mode'}</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-ivory">
            {settings.tradeName}
          </h1>
          <p className="text-xs sm:text-sm text-brand-200 mt-1 max-w-xl">
            {settings.address}, {settings.city} ({settings.state}) • GSTIN: {settings.gstin || 'Not Configured'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onNewInvoice}
            className="flex items-center space-x-2 px-5 py-3 rounded-xl bg-gold hover:bg-gold-light text-brand-950 font-bold text-sm shadow-md transition duration-150"
          >
            <PlusCircle className="w-5 h-5" />
            <span>Create New Invoice</span>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Sales */}
        <div className="bg-white rounded-xl p-5 border border-ivory-border shadow-sm">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Today's Sales</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-gray-900">
            ₹{todaySales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-gray-500 mt-1">
            {todayInvoices.length} invoices generated today
          </p>
        </div>

        {/* All-Time Invoiced */}
        <div className="bg-white rounded-xl p-5 border border-ivory-border shadow-sm">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Sales</span>
            <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-800 flex items-center justify-center">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-gray-900">
            ₹{totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-gray-500 mt-1">
            {finalizedInvoices.length} finalized invoices
          </p>
        </div>

        {/* Cash & Payments Collected */}
        <div className="bg-white rounded-xl p-5 border border-ivory-border shadow-sm">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Collected Total</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-emerald-800">
            ₹{totalCollected.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-gray-500 mt-1">
            Received via Cash / UPI / Card
          </p>
        </div>

        {/* Balance Due */}
        <div className="bg-white rounded-xl p-5 border border-ivory-border shadow-sm">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Balance Due</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-rose-800">
            ₹{totalBalanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-gray-500 mt-1">
            {pendingCount} invoices pending payment
          </p>
        </div>
      </div>

      {/* Recent Invoices Table */}
      <div className="bg-white rounded-xl border border-ivory-border shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900 font-serif">Recent Invoices</h2>
            <p className="text-xs text-gray-500">Latest customer bills and billing records</p>
          </div>
          <button
            onClick={onNewInvoice}
            className="text-xs font-semibold text-brand-800 hover:text-brand-950 flex items-center space-x-1"
          >
            <span>+ Quick Bill</span>
          </button>
        </div>

        {recentInvoices.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-xs">
            No invoices created yet. Click "Create New Invoice" to issue your first bill.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-gray-50 text-gray-600 border-b border-gray-200">
                  <th className="py-3 px-4 font-semibold">Invoice #</th>
                  <th className="py-3 px-4 font-semibold">Date</th>
                  <th className="py-3 px-4 font-semibold">Customer</th>
                  <th className="py-3 px-4 font-semibold text-right">Grand Total (₹)</th>
                  <th className="py-3 px-4 font-semibold text-center">Status</th>
                  <th className="py-3 px-4 font-semibold text-center">Payment</th>
                  <th className="py-3 px-4 font-semibold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentInvoices.map(inv => {
                  const statusBg = inv.status === 'finalized' ? 'bg-emerald-100 text-emerald-800' : inv.status === 'draft' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600';
                  const payBg = inv.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : inv.paymentStatus === 'partially_paid' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-rose-50 text-rose-700 border border-rose-200';
                  return (
                    <tr key={inv.id} className="hover:bg-brand-50/40 transition">
                      <td className="py-3 px-4 font-mono font-bold text-brand-900">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {inv.invoiceDate}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-gray-900">{inv.customerSnapshot.name}</p>
                        <p className="text-[11px] text-gray-500">{inv.customerSnapshot.phone}</p>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-gray-900">
                        ₹{inv.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${statusBg}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${payBg}`}>
                          {inv.paymentStatus.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => onViewInvoice(inv)}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-medium text-brand-800 hover:bg-brand-100/60 rounded-md transition"
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
        )}
      </div>
    </div>
  );
};
