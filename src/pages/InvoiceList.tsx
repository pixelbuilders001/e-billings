import React, { useState } from 'react';
import { Invoice } from '../types';
import { Search, Eye, Copy, Filter, Plus, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface InvoiceListProps {
  invoices: Invoice[];
  onViewInvoice: (invoice: Invoice) => void;
  onDuplicateAsNew: (invoice: Invoice) => void;
  onNewInvoice: () => void;
}

export const InvoiceList: React.FC<InvoiceListProps> = ({
  invoices,
  onViewInvoice,
  onDuplicateAsNew,
  onNewInvoice,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'finalized' | 'cancelled'>('all');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'unpaid' | 'partially_paid'>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filteredInvoices = invoices.filter(inv => {
    if (statusFilter !== 'all' && inv.status !== statusFilter) return false;
    if (paymentFilter !== 'all' && inv.paymentStatus !== paymentFilter) return false;
    if (!search.trim()) return true;

    const q = search.toLowerCase();
    return (
      inv.invoiceNumber.toLowerCase().includes(q) ||
      inv.customerSnapshot.name.toLowerCase().includes(q) ||
      inv.customerSnapshot.phone.toLowerCase().includes(q) ||
      inv.invoiceDate.includes(q)
    );
  });

  const totalInvoices = filteredInvoices.length;
  const totalPages = Math.max(1, Math.ceil(totalInvoices / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalInvoices);
  const paginatedInvoices = filteredInvoices.slice(startIndex, endIndex);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white/80 backdrop-blur-xl p-5 rounded-2xl border border-gold/25 shadow-card">
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-950 to-brand-900 text-gold flex items-center justify-center border border-gold/40 shadow-xs">
            <Filter className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight font-serif">
              Invoice Ledger & History
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Comprehensive registry of customer bills, tax summaries, and cloud sync status.
            </p>
          </div>
        </div>

        <button
          onClick={onNewInvoice}
          className="flex items-center space-x-2 px-5 py-3 bg-gradient-to-r from-gold via-amber-400 to-yellow-300 hover:from-amber-400 hover:to-gold text-brand-950 rounded-xl text-xs font-black shadow-gold-glow hover:shadow-lg transition cursor-pointer active-press border border-yellow-200/50"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Create New Bill</span>
        </button>
      </div>

      <div className="luxury-card p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-card flex flex-wrap items-center gap-4 text-xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search invoice number, customer name, or phone..."
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold focus:bg-white text-slate-900 font-medium transition"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-brand-900" />
          <span className="text-slate-700 font-bold">Status:</span>
          <select
            value={statusFilter}
            onChange={e => {
              setStatusFilter(e.target.value as any);
              setPage(1);
            }}
            className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-gold"
          >
            <option value="all">All Statuses</option>
            <option value="finalized">Finalized</option>
            <option value="draft">Draft</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-slate-700 font-bold">Payment:</span>
          <select
            value={paymentFilter}
            onChange={e => {
              setPaymentFilter(e.target.value as any);
              setPage(1);
            }}
            className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-gold"
          >
            <option value="all">All Payments</option>
            <option value="paid">Paid</option>
            <option value="partially_paid">Partially Paid</option>
            <option value="unpaid">Unpaid</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-slate-700 font-bold">Show:</span>
          <select
            value={pageSize}
            onChange={e => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-gold"
          >
            <option value={10}>10 / page</option>
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
          </select>
        </div>
      </div>

      <div className="luxury-card rounded-2xl border border-slate-200/80 shadow-card overflow-hidden">
        {totalInvoices === 0 ? (
          <div className="p-16 text-center text-slate-400 text-xs font-medium">
            No invoices found matching criteria.
          </div>
        ) : (
          <>
            {/* Mobile Native Card View (visible only on mobile) */}
            <div className="block md:hidden divide-y divide-slate-100">
              {paginatedInvoices.map(inv => {
                const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(inv.id);
                return (
                  <div 
                    key={inv.id} 
                    onClick={() => onViewInvoice(inv)}
                    className="p-4 active-press hover:bg-slate-50 transition cursor-pointer flex flex-col gap-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-brand-900 text-sm">{inv.invoiceNumber}</span>
                        {isUuid ? (
                          <span className="text-[9px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                            Cloud
                          </span>
                        ) : (
                          <span className="text-[9px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                            Local
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500 font-medium">{inv.invoiceDate}</span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-slate-900">{inv.customerSnapshot.name}</p>
                        <p className="text-[11px] text-slate-500 font-mono">{inv.customerSnapshot.phone}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-black text-slate-900 text-base">
                          ₹{inv.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </p>
                        <div className="flex items-center justify-end gap-1.5 mt-0.5">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                            inv.paymentStatus === 'paid'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            {inv.paymentStatus.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                      <span className="text-slate-500">
                        {inv.items?.length || 0} items • ₹{(inv.taxableTotal || 0).toLocaleString('en-IN')} Taxable
                      </span>
                      <div className="flex items-center space-x-2" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => onViewInvoice(inv)}
                          className="px-2.5 py-1 bg-brand-850 hover:bg-brand-950 text-white rounded-lg text-xs font-bold flex items-center space-x-1 shadow-2xs"
                        >
                          <Eye className="w-3 h-3 text-gold" />
                          <span>View Bill</span>
                        </button>
                        <button
                          onClick={() => onDuplicateAsNew(inv)}
                          title="Duplicate as new draft"
                          className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg active-press"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Full Data Table (visible md and up) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-600 border-b border-slate-200">
                    <th className="py-3.5 px-4 font-bold">Invoice #</th>
                    <th className="py-3.5 px-4 font-bold">Date</th>
                    <th className="py-3.5 px-4 font-bold">Customer</th>
                    <th className="py-3.5 px-4 font-bold text-right">Taxable (₹)</th>
                    <th className="py-3.5 px-4 font-bold text-right">Discount (₹)</th>
                    <th className="py-3.5 px-4 font-bold text-right">Tax / GST (₹)</th>
                    <th className="py-3.5 px-4 font-bold text-right">Grand Total (₹)</th>
                    <th className="py-3.5 px-4 font-bold text-center">Status</th>
                    <th className="py-3.5 px-4 font-bold text-center">Payment</th>
                    <th className="py-3.5 px-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedInvoices.map(inv => {
                    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(inv.id);
                    const taxAmount = (inv.cgstTotal || 0) + (inv.sgstTotal || 0) + (inv.igstTotal || 0);

                    return (
                    <tr key={inv.id} className="hover:bg-slate-50/70 transition duration-150">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-mono font-bold text-brand-900">{inv.invoiceNumber}</span>
                          {isUuid ? (
                            <span className="text-[9px] bg-blue-50 text-blue-700 border border-blue-200/80 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider" title="Synced from Supabase public.sales">
                              Cloud
                            </span>
                          ) : (
                            <span className="text-[9px] bg-amber-50 text-amber-700 border border-amber-200/80 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider" title="Local Store DB">
                              Local
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        {inv.invoiceDate}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-900">{inv.customerSnapshot.name}</p>
                        <p className="text-[11px] text-slate-500 font-mono">{inv.customerSnapshot.phone}</p>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-700">
                        ₹{inv.taxableTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-amber-800">
                        {inv.discountTotal > 0 ? (
                          <span>- ₹{inv.discountTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        ) : (
                          <span className="text-slate-400 font-normal">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-emerald-800">
                        {taxAmount > 0 ? (
                          <span>₹{taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        ) : (
                          <span className="text-slate-400 font-normal">₹0.00</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-black text-slate-900 text-sm">
                        ₹{inv.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                          inv.status === 'finalized'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : inv.status === 'draft'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                          inv.paymentStatus === 'paid'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : inv.paymentStatus === 'partially_paid'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {inv.paymentStatus.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => onViewInvoice(inv)}
                            className="px-3 py-1.5 bg-brand-850 hover:bg-brand-950 text-white rounded-lg text-xs font-bold flex items-center space-x-1 shadow-sm transition"
                          >
                            <Eye className="w-3.5 h-3.5 text-gold" />
                            <span>View</span>
                          </button>
                          <button
                            onClick={() => onDuplicateAsNew(inv)}
                            title="Duplicate as new draft"
                            className="p-1 hover:bg-gray-100 text-gray-600 rounded"
                          >
                            <Copy className="w-3.5 h-3.5" />
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

        {/* Pagination Bar */}
        {totalInvoices > 0 && (
          <div className="p-4 bg-slate-50/70 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 font-medium">
            <div>
              Showing <span className="font-bold text-slate-900">{startIndex + 1}</span> to{' '}
              <span className="font-bold text-slate-900">{endIndex}</span> of{' '}
              <span className="font-bold text-slate-900">{totalInvoices}</span> invoices
            </div>

            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => setPage(1)}
                disabled={safePage === 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-slate-700 transition"
                title="First Page"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-slate-700 transition"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-3.5 py-1 font-bold text-slate-800 bg-white border border-slate-200 rounded-lg shadow-2xs">
                Page {safePage} of {totalPages}
              </span>

              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-slate-700 transition"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={safePage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-slate-700 transition"
                title="Last Page"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
