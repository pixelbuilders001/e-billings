import React, { useState } from 'react';
import { Customer } from '../types';
import { Plus, Search, Edit2, Trash2, X, MapPin, Phone } from 'lucide-react';
import { INDIAN_STATES } from '../engine/indianStates';
import { saveCustomer, deleteCustomer } from '../db';

interface CustomersManagerProps {
  customers: Customer[];
  onRefresh: () => void;
}

export const CustomersManager: React.FC<CustomersManagerProps> = ({
  customers,
  onRefresh,
}) => {
  const [search, setSearch] = useState('');
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [gstin, setGstin] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [stateCode, setStateCode] = useState('09');
  const [notes, setNotes] = useState('');

  const filteredCustomers = customers.filter(c => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q) ||
      (c.gstin && c.gstin.toLowerCase().includes(q)) ||
      (c.businessName && c.businessName.toLowerCase().includes(q))
    );
  });

  const handleStartCreate = () => {
    setIsCreating(true);
    setEditingCustomer(null);
    setName('');
    setPhone('');
    setEmail('');
    setBusinessName('');
    setGstin('');
    setBillingAddress('');
    setStateCode('09');
    setNotes('');
  };

  const handleStartEdit = (c: Customer) => {
    setEditingCustomer(c);
    setIsCreating(false);
    setName(c.name);
    setPhone(c.phone);
    setEmail(c.email || '');
    setBusinessName(c.businessName || '');
    setGstin(c.gstin || '');
    setBillingAddress(c.billingAddress);
    setStateCode(c.stateCode || '09');
    setNotes(c.notes || '');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      alert('Customer Name and Phone Number are required.');
      return;
    }

    const matchedState = INDIAN_STATES.find(s => s.code === stateCode);

    const newCust: Customer = {
      id: editingCustomer ? editingCustomer.id : `cust-${Date.now()}`,
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      businessName: businessName.trim() || undefined,
      gstin: gstin.trim().toUpperCase() || undefined,
      billingAddress: billingAddress.trim() || 'Varanasi',
      state: matchedState?.name || 'Uttar Pradesh',
      stateCode: stateCode,
      notes: notes.trim() || undefined,
      createdAt: editingCustomer ? editingCustomer.createdAt : new Date().toISOString()
    };

    await saveCustomer(newCust);
    setIsCreating(false);
    setEditingCustomer(null);
    onRefresh();
  };

  const handleDelete = async (id: string, customerName: string) => {
    if (confirm(`Delete customer "${customerName}"?`)) {
      await deleteCustomer(id);
      onRefresh();
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-serif font-bold text-brand-900">
            Customer Registry
          </h1>
          <p className="text-xs text-gray-500">
            Manage repeat retail buyers, bridal clients, and wholesale B2B accounts.
          </p>
        </div>

        <button
          onClick={handleStartCreate}
          className="flex items-center space-x-1.5 px-4 py-2 bg-brand-800 hover:bg-brand-900 text-white rounded-lg text-xs font-bold shadow-sm transition"
        >
          <Plus className="w-4 h-4 text-gold" />
          <span>New Customer</span>
        </button>
      </div>

      {(isCreating || editingCustomer) && (
        <form onSubmit={handleSave} className="bg-white p-6 rounded-xl border border-gold/40 shadow-md space-y-4 text-xs">
          <div className="flex items-center justify-between border-b pb-3">
            <h2 className="text-sm font-bold text-brand-900 uppercase tracking-wider font-serif">
              {isCreating ? 'Add Customer Profile' : `Edit Customer: ${editingCustomer?.name}`}
            </h2>
            <button
              type="button"
              onClick={() => { setIsCreating(false); setEditingCustomer(null); }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Customer / Contact Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Smt. Gayatri Devi"
                className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-brand-700"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-1">Mobile Phone *</label>
              <input
                type="text"
                required
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="98390XXXXX"
                className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-brand-700"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-1">Email Address (Optional)</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="customer@example.com"
                className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Business Name (B2B)</label>
              <input
                type="text"
                value={businessName}
                onChange={e => setBusinessName(e.target.value)}
                placeholder="Firm / Shop Name"
                className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-1">GSTIN (Optional)</label>
              <input
                type="text"
                value={gstin}
                onChange={e => setGstin(e.target.value.toUpperCase())}
                placeholder="09AAAAA0000A1Z5"
                className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs font-mono uppercase"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-1">State & State Code</label>
              <select
                value={stateCode}
                onChange={e => setStateCode(e.target.value)}
                className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs"
              >
                {INDIAN_STATES.map(s => (
                  <option key={s.code} value={s.code}>{s.code} - {s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Billing / Delivery Address</label>
              <input
                type="text"
                value={billingAddress}
                onChange={e => setBillingAddress(e.target.value)}
                placeholder="Street address, city"
                className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-1">Notes / Preferences</label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. Likes pastel Tanchoi, wedding in Dec"
                className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t">
            <button
              type="button"
              onClick={() => { setIsCreating(false); setEditingCustomer(null); }}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-brand-800 text-white font-bold rounded-lg hover:bg-brand-900"
            >
              Save Customer
            </button>
          </div>
        </form>
      )}

      {/* Search Input */}
      <div className="bg-white p-4 rounded-xl border border-ivory-border shadow-sm flex items-center text-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by customer name, phone number, firm name or GSTIN..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-700"
          />
        </div>
      </div>

      {/* Customers List */}
      <div className="bg-white rounded-xl border border-ivory-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-gray-50 text-gray-600 border-b border-gray-200">
                <th className="py-3 px-4 font-semibold">Customer Details</th>
                <th className="py-3 px-4 font-semibold">Contact</th>
                <th className="py-3 px-4 font-semibold">Location</th>
                <th className="py-3 px-4 font-semibold">B2B / GSTIN</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCustomers.map(cust => (
                <tr key={cust.id} className="hover:bg-brand-50/30 transition">
                  <td className="py-3 px-4">
                    <p className="font-bold text-gray-900">{cust.name}</p>
                    {cust.businessName && (
                      <p className="text-[11px] text-gray-600 font-medium">{cust.businessName}</p>
                    )}
                    {cust.notes && (
                      <p className="text-[10px] text-gray-400 italic mt-0.5">{cust.notes}</p>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-mono text-gray-800 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-gray-400" />
                      {cust.phone}
                    </p>
                    {cust.email && <p className="text-[11px] text-gray-500">{cust.email}</p>}
                  </td>
                  <td className="py-3 px-4">
                    <p className="text-gray-800 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-gray-400" />
                      {cust.state} ({cust.stateCode})
                    </p>
                    <p className="text-[11px] text-gray-500">{cust.billingAddress}</p>
                  </td>
                  <td className="py-3 px-4">
                    {cust.gstin ? (
                      <span className="font-mono text-[11px] font-bold text-brand-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        {cust.gstin}
                      </span>
                    ) : (
                      <span className="text-[11px] text-gray-400 italic">Unregistered Buyer</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleStartEdit(cust)}
                        className="p-1.5 text-gray-500 hover:text-brand-800 hover:bg-gray-100 rounded"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {cust.id !== 'cust-walkin' && (
                        <button
                          onClick={() => handleDelete(cust.id, cust.name)}
                          className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
