import React, { useState } from 'react';
import { Customer } from '../types';
import { Plus, Search, Edit2, Trash2, X, MapPin, Phone, Award } from 'lucide-react';
import { INDIAN_STATES } from '../engine/indianStates';
import { saveCustomer, deleteCustomer } from '../db';
import { saveSupabaseCustomer, deleteSupabaseCustomer } from '../db/supabaseClient';

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
      (c.businessName && c.businessName.toLowerCase().includes(q)) ||
      (c.loyaltyMemberCode && c.loyaltyMemberCode.toLowerCase().includes(q))
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

    const customerId = editingCustomer ? editingCustomer.id : `cust-${Date.now()}`;

    const newCust: Customer = {
      id: customerId,
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      businessName: businessName.trim() || undefined,
      gstin: gstin.trim().toUpperCase() || undefined,
      billingAddress: billingAddress.trim() || 'Varanasi',
      state: matchedState?.name || 'Uttar Pradesh',
      stateCode: stateCode,
      notes: notes.trim() || undefined,
      loyaltyMemberCode: editingCustomer?.loyaltyMemberCode,
      loyaltyPointsBalance: editingCustomer?.loyaltyPointsBalance,
      loyaltyTier: editingCustomer?.loyaltyTier,
      createdAt: editingCustomer ? editingCustomer.createdAt : new Date().toISOString()
    };

    // Save to local indexedDB
    await saveCustomer(newCust);

    // Save to Supabase public.customers table (if ID is UUID or create new record)
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(customerId);
      const supabasePayload: any = {
        name: newCust.name,
        mobile: newCust.phone,
        address: newCust.billingAddress,
        city: newCust.billingAddress.split(',').pop()?.trim() || 'Varanasi'
      };
      if (isUuid) {
        supabasePayload.id = customerId;
      }
      await saveSupabaseCustomer(supabasePayload);
    } catch (err) {
      console.warn('Could not sync customer to Supabase:', err);
    }

    setIsCreating(false);
    setEditingCustomer(null);
    onRefresh();
  };

  const handleDelete = async (id: string, customerName: string) => {
    if (confirm(`Delete customer "${customerName}"?`)) {
      await deleteCustomer(id);
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      if (isUuid) {
        try {
          await deleteSupabaseCustomer(id);
        } catch (err) {
          console.warn('Could not delete customer from Supabase:', err);
        }
      }
      onRefresh();
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Customer Directory & CRM
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Manage repeat clients, contact records, loyalty member tiers, and billing addresses.
          </p>
        </div>

        <button
          onClick={handleStartCreate}
          className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-brand-800 to-brand-900 hover:from-brand-900 hover:to-brand-950 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition cursor-pointer"
        >
          <Plus className="w-4 h-4 text-gold" />
          <span>Add New Customer</span>
        </button>
      </div>

      {(isCreating || editingCustomer) && (
        <form onSubmit={handleSave} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xl space-y-4 text-xs animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
              {isCreating ? 'Create Customer Profile' : `Edit Customer Profile: ${editingCustomer?.name}`}
            </h2>
            <button
              type="button"
              onClick={() => { setIsCreating(false); setEditingCustomer(null); }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Business Name (Optional)</label>
              <input
                type="text"
                value={businessName}
                onChange={e => setBusinessName(e.target.value)}
                placeholder="Firm / Shop Name"
                className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs"
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

          <div className="flex justify-end space-x-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => { setIsCreating(false); setEditingCustomer(null); }}
              className="px-4 py-2 border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-gradient-to-r from-brand-800 to-brand-900 hover:from-brand-900 hover:to-brand-950 text-white font-bold rounded-xl shadow-md transition cursor-pointer"
            >
              Save Customer Profile
            </button>
          </div>
        </form>
      )}

      {/* Search Input */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center text-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by customer name, phone number, or firm name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-700"
          />
        </div>
      </div>

      {/* Customers List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 text-slate-600 border-b border-slate-200">
                <th className="py-3.5 px-4 font-bold">Customer Details</th>
                <th className="py-3.5 px-4 font-bold">Contact</th>
                <th className="py-3.5 px-4 font-bold">Location</th>
                <th className="py-3.5 px-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.map(cust => (
                <tr key={cust.id} className="hover:bg-slate-50/70 transition duration-150">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-900">{cust.name}</p>
                      {cust.loyaltyTier && (
                        <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          cust.loyaltyTier === 'Gold'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : cust.loyaltyTier === 'Platinum'
                            ? 'bg-purple-50 text-purple-800 border border-purple-200'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          <Award className="w-2.5 h-2.5 text-amber-500" />
                          {cust.loyaltyTier} {cust.loyaltyPointsBalance ? `(${cust.loyaltyPointsBalance} pts)` : ''}
                        </span>
                      )}
                    </div>
                    {cust.businessName && (
                      <p className="text-[11px] text-gray-600 font-medium">{cust.businessName}</p>
                    )}
                    {cust.loyaltyMemberCode && (
                      <p className="text-[10px] text-brand-800 font-mono">Member: {cust.loyaltyMemberCode}</p>
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
