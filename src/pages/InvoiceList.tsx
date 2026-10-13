import React, { useState } from 'react';
import { Invoice } from '../types';
import { Search, Eye, Copy, Filter, Plus } from 'lucide-react';

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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-serif font-bold text-brand-900">
            Invoice History & Bills
          </h1>
          <p className="text-xs text-gray-500">
            Search, view, print, or duplicate finalized and draft invoices.
          </p>
        </div>

        <button
          onClick={onNewInvoice}
          className="flex items-center space-x-2 px-4 py-2.5 bg-brand-800 hover:bg-brand-900 text-white rounded-xl text-xs font-bold shadow transition"
        >
          <Plus className="w-4 h-4 text-gold" />
          <span>New Invoice</span>
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-ivory-border shadow-sm flex flex-wrap items-center gap-4 text-xs">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by invoice number, customer name, phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-700"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-gray-600 font-medium">Status:</span>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="p-2 bg-gray-50 border border-gray-300 rounded-lg"
          >
            <option value="all">All Statuses</option>
            <option value="finalized">Finalized</option>
            <option value="draft">Draft</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-gray-600 font-medium">Payment:</span>
          <select
            value={paymentFilter}
            onChange={e => setPaymentFilter(e.target.value as any)}
            className="p-2 bg-gray-50 border border-gray-300 rounded-lg"
          >
            <option value="all">All Payments</option>
            <option value="paid">Paid</option>
            <option value="partially_paid">Partially Paid</option>
            <option value="unpaid">Unpaid</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-ivory-border shadow-sm overflow-hidden">
        {filteredInvoices.length === 0 ? (
          <div className="p-12 text-center text-gray-500 text-xs">
            No invoices found matching criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-gray-50 text-gray-600 border-b border-gray-200">
                  <th className="py-3 px-4 font-semibold">Invoice #</th>
                  <th className="py-3 px-4 font-semibold">Date</th>
                  <th className="py-3 px-4 font-semibold">Customer</th>
                  <th className="py-3 px-4 font-semibold text-right">Taxable</th>
                  <th className="py-3 px-4 font-semibold text-right">Grand Total (₹)</th>
                  <th className="py-3 px-4 font-semibold text-center">Status</th>
                  <th className="py-3 px-4 font-semibold text-center">Payment</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredInvoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-brand-50/30 transition">
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
                    <td className="py-3 px-4 text-right font-mono text-gray-700">
                      ₹{inv.taxableTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-gray-900">
                      ₹{inv.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        inv.status === 'finalized'
                          ? 'bg-emerald-100 text-emerald-800'
                          : inv.status === 'draft'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        inv.paymentStatus === 'paid'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : inv.paymentStatus === 'partially_paid'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {inv.paymentStatus.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          onClick={() => onViewInvoice(inv)}
                          className="px-2.5 py-1 bg-brand-800 hover:bg-brand-900 text-white rounded text-xs font-semibold flex items-center space-x-1"
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
