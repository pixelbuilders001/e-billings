import React, { useState, useEffect, useRef } from 'react';
import { 
  StoreSettings, 
  Product, 
  Customer, 
  DiscountType, 
  PaymentMethod,
  Invoice,
  PaymentRecord,
  PricingMode
} from '../types';
import { INDIAN_STATES } from '../engine/indianStates';
import { calculateInvoice } from '../engine/calculator';
import { numberToWordsIndian } from '../engine/numberToWords';
import { allocateNextInvoiceNumber, saveInvoice } from '../db';
import { searchInventory, InventoryItem } from '../db/supabaseClient';
import { 
  Search, 
  Plus, 
  Trash2, 
  UserPlus, 
  CheckCircle, 
  AlertCircle, 
  Save, 
  Receipt,
  Database,
  Cloud,
  Loader2,
  Tag
} from 'lucide-react';

interface NewInvoiceProps {
  settings: StoreSettings;
  products: Product[];
  customers: Customer[];
  onInvoiceCreated: (invoice: Invoice) => void;
  onRefreshData?: () => void;
  initialDraft?: Invoice | null;
}

interface WorkingItem {
  id: string;
  productId?: string;
  description: string;
  hsnCode: string;
  qty: number;
  unit: string;
  unitPrice: number;
  discountType: DiscountType;
  discountValue: number;
  gstRate: number;
}

export const NewInvoice: React.FC<NewInvoiceProps> = ({
  settings,
  products,
  customers,
  onInvoiceCreated,
  initialDraft
}) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    initialDraft?.customerId || customers[0]?.id || 'cust-walkin'
  );
  const [customerName, setCustomerName] = useState(initialDraft?.customerSnapshot?.name || 'Walk-in Retail Customer');
  const [customerPhone, setCustomerPhone] = useState(initialDraft?.customerSnapshot?.phone || '');
  const [customerAddress, setCustomerAddress] = useState(initialDraft?.customerSnapshot?.billingAddress || 'Varanasi Store Counter');
  const [customerGstin, setCustomerGstin] = useState(initialDraft?.customerSnapshot?.gstin || '');
  
  const [posStateCode, setPosStateCode] = useState<string>(
    initialDraft?.placeOfSupplyCode || settings.stateCode || '09'
  );

  const [items, setItems] = useState<WorkingItem[]>(
    initialDraft?.items?.map(it => ({
      id: it.id,
      productId: it.productId,
      description: it.description,
      hsnCode: it.hsnCode,
      qty: it.qty,
      unit: it.unit || 'Nos',
      unitPrice: it.unitPrice,
      discountType: it.discountType,
      discountValue: it.discountValue,
      gstRate: it.gstRate
    })) || [
      {
        id: 'row-1',
        description: '',
        hsnCode: '5007',
        qty: 1,
        unit: 'Nos',
        unitPrice: 0,
        discountType: 'percentage',
        discountValue: 0,
        gstRate: settings.defaultGstRate || 5
      }
    ]
  );

  const [billDiscountType, setBillDiscountType] = useState<DiscountType>(
    initialDraft?.billDiscountType || 'percentage'
  );
  const [billDiscountValue, setBillDiscountValue] = useState<number>(
    initialDraft?.billDiscountValue || 0
  );

  const [pricingMode, setPricingMode] = useState<PricingMode>(
    initialDraft?.pricingMode || settings.pricingMode || 'inclusive'
  );

  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [paymentRef, setPaymentRef] = useState<string>('');
  const [notes] = useState<string>(initialDraft?.notes || '');

  // Fast Product Search state (Supabase + Local)
  const [searchQuery, setSearchQuery] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [supabaseResults, setSupabaseResults] = useState<InventoryItem[]>([]);
  const [isSearchingSupabase, setIsSearchingSupabase] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Debounced search on Supabase public.inventory
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSupabaseResults([]);
      setIsSearchingSupabase(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingSupabase(true);
      try {
        const results = await searchInventory(searchQuery.trim(), 15);
        setSupabaseResults(results);
      } catch (err) {
        console.warn('Supabase search failed:', err);
      } finally {
        setIsSearchingSupabase(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleCustomerSelect = (id: string) => {
    setSelectedCustomerId(id);
    const found = customers.find(c => c.id === id);
    if (found) {
      setCustomerName(found.name);
      setCustomerPhone(found.phone);
      setCustomerAddress(found.billingAddress);
      setCustomerGstin(found.gstin || '');
      setPosStateCode(found.stateCode || settings.stateCode);
    }
  };

  const addItemRow = () => {
    setItems(prev => [
      ...prev,
      {
        id: 'row-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        description: '',
        hsnCode: '5007',
        qty: 1,
        unit: 'Nos',
        unitPrice: 0,
        discountType: 'percentage',
        discountValue: 0,
        gstRate: settings.defaultGstRate || 5
      }
    ]);
  };

  const removeItemRow = (id: string) => {
    if (items.length === 1) {
      setItems([{
        id: 'row-1',
        description: '',
        hsnCode: '5007',
        qty: 1,
        unit: 'Nos',
        unitPrice: 0,
        discountType: 'percentage',
        discountValue: 0,
        gstRate: settings.defaultGstRate || 5
      }]);
      return;
    }
    setItems(items.filter(it => it.id !== id));
  };

  const updateItemRow = (id: string, updates: Partial<WorkingItem>) => {
    setItems(items.map(it => it.id === id ? { ...it, ...updates } : it));
  };

  // Add Product from Local Catalogue
  const handleSelectProduct = (prod: Product) => {
    const emptyIndex = items.findIndex(it => !it.description && it.unitPrice === 0);
    const unitRate = prod.mrp ? Number(prod.mrp) : (prod.sellingPrice || 0);
    const newItem: WorkingItem = {
      id: 'row-' + Date.now(),
      productId: prod.id,
      description: prod.name,
      hsnCode: prod.hsnCode || '5007',
      qty: 1,
      unit: prod.unit || 'Nos',
      unitPrice: unitRate,
      discountType: 'percentage',
      discountValue: prod.discountPercentage ? Number(prod.discountPercentage) : 0,
      gstRate: prod.gstRate ?? (settings.defaultGstRate || 5)
    };

    if (emptyIndex !== -1) {
      const copy = [...items];
      copy[emptyIndex] = newItem;
      setItems(copy);
    } else {
      setItems(prev => [...prev, newItem]);
    }

    setSearchQuery('');
    setShowProductDropdown(false);
  };

  // Add Item from Supabase Inventory table
  const handleSelectSupabaseItem = (inv: InventoryItem) => {
    const emptyIndex = items.findIndex(it => !it.description && it.unitPrice === 0);
    const descParts = [inv.saree_name];
    if (inv.color) descParts.push(inv.color);
    if (inv.fabric) descParts.push(inv.fabric);

    const unitRate = inv.mrp ? Number(inv.mrp) : (Number(inv.selling_price) || 0);

    const newItem: WorkingItem = {
      id: 'row-' + Date.now(),
      productId: inv.id,
      description: descParts.join(' - '),
      hsnCode: inv.hsn_code || '5007',
      qty: 1,
      unit: 'Nos',
      unitPrice: unitRate,
      discountType: inv.discount_percentage ? 'percentage' : 'fixed',
      discountValue: inv.discount_percentage ? Number(inv.discount_percentage) : (Number(inv.discount_amount) || 0),
      gstRate: inv.gst_rate !== undefined && inv.gst_rate !== null ? Number(inv.gst_rate) : (settings.defaultGstRate || 5)
    };

    if (emptyIndex !== -1) {
      const copy = [...items];
      copy[emptyIndex] = newItem;
      setItems(copy);
    } else {
      setItems(prev => [...prev, newItem]);
    }

    setSearchQuery('');
    setShowProductDropdown(false);
  };

  // Filter local products by name, SKU, barcode, category, productTag, or ID
  const filteredLocalProducts = products.filter(p => {
    if (!searchQuery.trim()) return false;
    const q = searchQuery.toLowerCase();
    return (
      p.id.toLowerCase().includes(q) ||
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.barcode.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      (p.productTag && p.productTag.toLowerCase().includes(q))
    );
  }).slice(0, 8);

  const calcResult = calculateInvoice({
    items: items.map(it => ({
      id: it.id,
      productId: it.productId,
      description: it.description || 'Saree',
      hsnCode: it.hsnCode,
      qty: it.qty,
      unit: it.unit,
      unitPrice: it.unitPrice,
      discountType: it.discountType,
      discountValue: it.discountValue,
      gstRate: it.gstRate
    })),
    sellerStateCode: settings.stateCode,
    placeOfSupplyCode: posStateCode,
    sellerRegistrationStatus: settings.registrationStatus,
    pricingMode: pricingMode,
    billDiscountType,
    billDiscountValue,
    roundOffRule: settings.roundOffRule
  });

  useEffect(() => {
    if (calcResult.grandTotal > 0 && paymentAmount === 0 && !initialDraft) {
      setPaymentAmount(calcResult.grandTotal);
    }
  }, [calcResult.grandTotal]);

  const selectedPosState = INDIAN_STATES.find(s => s.code === posStateCode);

  const validateInvoice = (): boolean => {
    setErrorMessage(null);

    const validItems = items.filter(it => it.description.trim() && it.qty > 0 && it.unitPrice > 0);
    if (validItems.length === 0) {
      setErrorMessage('Please add at least one valid product line with description, quantity, and price.');
      return false;
    }

    if (settings.registrationStatus === 'registered') {
      for (const it of validItems) {
        if (!it.hsnCode || it.hsnCode.trim().length === 0) {
          setErrorMessage('HSN code missing for ' + it.description + '. GST rules require an HSN code.');
          return false;
        }
      }
    }

    return true;
  };

  const handleSaveInvoice = async (finalize: boolean) => {
    if (!validateInvoice()) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      let invNumber = initialDraft?.invoiceNumber;
      if (!invNumber || (initialDraft && initialDraft.status === 'draft' && finalize)) {
        if (finalize) {
          invNumber = await allocateNextInvoiceNumber();
        } else {
          invNumber = 'DRAFT-' + Date.now().toString().slice(-6);
        }
      }

      const selectedCustomerObj: Customer = {
        id: selectedCustomerId || ('cust-' + Date.now()),
        name: customerName || 'Walk-in Retail Customer',
        phone: customerPhone || '9999999999',
        billingAddress: customerAddress || 'Varanasi',
        state: selectedPosState?.name || 'Uttar Pradesh',
        stateCode: posStateCode,
        gstin: customerGstin || undefined,
        createdAt: new Date().toISOString()
      };

      const paidSoFar = paymentAmount > 0 ? paymentAmount : 0;
      const balanceDue = Math.max(0, calcResult.grandTotal - paidSoFar);
      
      let payStatus: 'unpaid' | 'partially_paid' | 'paid' = 'unpaid';
      if (paidSoFar >= calcResult.grandTotal) {
        payStatus = 'paid';
      } else if (paidSoFar > 0) {
        payStatus = 'partially_paid';
      }

      const payments: PaymentRecord[] = paidSoFar > 0 ? [
        {
          id: 'pay-' + Date.now(),
          date: new Date().toISOString(),
          amount: paidSoFar,
          method: paymentMethod,
          reference: paymentRef || undefined
        }
      ] : [];

      const fullInvoice: Invoice = {
        id: initialDraft?.id || ('inv-' + Date.now()),
        invoiceNumber: invNumber,
        invoiceDate: new Date().toISOString().split('T')[0],
        status: finalize ? 'finalized' : 'draft',
        sellerSnapshot: { ...settings },
        customerId: selectedCustomerId,
        customerSnapshot: selectedCustomerObj,
        placeOfSupplyState: selectedPosState?.name || 'Uttar Pradesh',
        placeOfSupplyCode: posStateCode,
        supplyType: calcResult.supplyType,
        isRegisteredTaxInvoice: calcResult.isRegisteredTaxInvoice,
        pricingMode: pricingMode,
        items: calcResult.items,
        billDiscountType,
        billDiscountValue,
        subtotal: calcResult.subtotal,
        discountTotal: calcResult.totalDiscount,
        taxableTotal: calcResult.taxableTotal,
        cgstTotal: calcResult.cgstTotal,
        sgstTotal: calcResult.sgstTotal,
        igstTotal: calcResult.igstTotal,
        roundOff: calcResult.roundOff,
        grandTotal: calcResult.grandTotal,
        rateBreakdown: calcResult.rateBreakdown,
        amountInWords: numberToWordsIndian(calcResult.grandTotal),
        payments,
        paidTotal: paidSoFar,
        balanceDue,
        paymentStatus: payStatus,
        notes,
        createdAt: initialDraft?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await saveInvoice(fullInvoice);
      onInvoiceCreated(fullInvoice);
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Failed to save invoice: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-serif font-bold text-brand-900 flex items-center gap-2">
            <Receipt className="w-6 h-6 text-brand-700" />
            Fast Billing Counter
          </h1>
          <p className="text-xs text-gray-500">
            Search sarees from Supabase Inventory or Local Catalogue by ID, Name, Product Tag, or Barcode.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPricingMode((m: PricingMode) => m === 'inclusive' ? 'exclusive' : 'inclusive')}
            title="Click to toggle pricing mode"
            className="text-xs px-3 py-1.5 rounded bg-amber-50 hover:bg-amber-100 border border-gold/60 text-brand-900 font-medium transition cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            <span>Pricing:</span>
            <strong className="underline decoration-gold">
              {pricingMode === 'inclusive' ? 'GST Included in Price' : 'Tax Exclusive (+GST)'}
            </strong>
            <span className="text-[10px] text-amber-700 bg-amber-200/60 px-1 rounded">Switch</span>
          </button>
          <span className={`text-xs px-2.5 py-1.5 rounded font-medium ${
            settings.registrationStatus === 'registered'
              ? 'bg-emerald-50 border border-emerald-300 text-emerald-800'
              : 'bg-gray-100 border border-gray-300 text-gray-700'
          }`}>
            Mode: <strong>{settings.registrationStatus === 'registered' ? 'Tax Invoice' : 'Retail Bill (Non-GST)'}</strong>
          </span>
        </div>
      </div>

      {errorMessage && (
        <div className="mb-6 p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-600" />
          <div>
            <p className="font-semibold text-sm">Validation Error</p>
            <p className="text-xs mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 space-y-6">
          {/* Quick Product Search & Scan Bar */}
          <div className="bg-white p-4 rounded-xl border border-ivory-border shadow-sm relative">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-brand-800">
                Quick Saree Search & Barcode Scan
              </label>
              <div className="flex items-center space-x-2 text-[11px] text-gray-500">
                <span className="flex items-center gap-1 text-emerald-700 font-medium">
                  <Cloud className="w-3.5 h-3.5" /> Supabase Live
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-gray-600">
                  <Database className="w-3.5 h-3.5" /> Local Catalogue
                </span>
              </div>
            </div>
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search by ID, Saree Name, Product Tag, SKU, or Scan Barcode..."
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setShowProductDropdown(true);
                }}
                onFocus={() => setShowProductDropdown(true)}
                className="w-full pl-10 pr-10 py-2.5 text-sm bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-700 focus:outline-none"
              />
              {isSearchingSupabase && (
                <Loader2 className="w-4 h-4 absolute right-3 top-3.5 text-brand-600 animate-spin" />
              )}
            </div>

            {/* Dropdown Results (Supabase + Local) */}
            {showProductDropdown && searchQuery.trim() && (
              <div className="absolute z-20 left-4 right-4 mt-1 bg-white border border-gray-300 rounded-lg shadow-xl max-h-80 overflow-y-auto divide-y divide-gray-100">
                {/* 1. Supabase Inventory Matches */}
                {supabaseResults.length > 0 && (
                  <div>
                    <div className="bg-emerald-50/80 px-3 py-1.5 text-[11px] font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1 border-b border-emerald-100">
                      <Cloud className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Supabase Storefront Products ({supabaseResults.length})</span>
                    </div>
                    {supabaseResults.map(inv => (
                      <div
                        key={inv.id}
                        onClick={() => handleSelectSupabaseItem(inv)}
                        className="p-3 hover:bg-emerald-50/50 cursor-pointer flex items-center justify-between text-xs transition border-b border-gray-50 last:border-b-0"
                      >
                        <div className="space-y-0.5">
                          <p className="font-bold text-gray-900 flex items-center gap-2">
                            {inv.saree_name}
                            {inv.design_code && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-amber-100 text-amber-900 rounded text-[10px] font-semibold">
                                <Tag className="w-2.5 h-2.5" />
                                {inv.design_code}
                              </span>
                            )}
                          </p>
                          <p className="text-gray-500 text-[11px]">
                            ID: <span className="font-mono text-gray-700 font-semibold">{inv.id}</span>
                            {inv.sku && <span> • SKU: <span className="font-mono">{inv.sku}</span></span>}
                            {inv.category && <span> • {inv.category}</span>}
                            {inv.fabric && <span> • {inv.fabric}</span>}
                            {inv.color && <span> • {inv.color}</span>}
                            {inv.mrp ? <span> • MRP: ₹{inv.mrp}</span> : null}
                            {inv.discount_percentage ? <span> • Disc: {inv.discount_percentage}%</span> : null}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0 ml-3">
                          <p className="font-bold font-mono text-brand-900 text-sm">
                            ₹{Number(inv.selling_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </p>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                            inv.stock > 0 ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'
                          }`}>
                            Stock: {inv.stock ?? 0}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 2. Local Catalogue Matches */}
                {filteredLocalProducts.length > 0 && (
                  <div>
                    <div className="bg-brand-50/80 px-3 py-1.5 text-[11px] font-bold text-brand-900 uppercase tracking-wider flex items-center gap-1 border-b border-brand-100">
                      <Database className="w-3.5 h-3.5 text-brand-700" />
                      <span>Local Store Catalogue ({filteredLocalProducts.length})</span>
                    </div>
                    {filteredLocalProducts.map(prod => (
                      <div
                        key={prod.id}
                        onClick={() => handleSelectProduct(prod)}
                        className="p-3 hover:bg-brand-50/50 cursor-pointer flex items-center justify-between text-xs transition border-b border-gray-50 last:border-b-0"
                      >
                        <div className="space-y-0.5">
                          <p className="font-bold text-gray-900 flex items-center gap-2">
                            {prod.name}
                            {prod.productTag && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-amber-100 text-amber-900 rounded text-[10px] font-semibold">
                                <Tag className="w-2.5 h-2.5" />
                                {prod.productTag}
                              </span>
                            )}
                          </p>
                          <p className="text-gray-500 text-[11px]">
                            SKU: <span className="font-mono text-gray-700">{prod.sku}</span> | HSN: {prod.hsnCode} | GST: {prod.gstRate}%
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0 ml-3">
                          <p className="font-bold font-mono text-brand-900 text-sm">
                            ₹{prod.sellingPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </p>
                          <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-semibold">
                            Stock: {prod.stockQty ?? 'N/A'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {supabaseResults.length === 0 && filteredLocalProducts.length === 0 && !isSearchingSupabase && (
                  <div className="p-4 text-center text-xs text-gray-500">
                    No matching saree found for "{searchQuery}". You can enter manual line details below.
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-ivory-border shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-brand-50/30">
              <h2 className="text-sm font-bold text-brand-900 uppercase tracking-wider">
                Invoice Line Items ({items.length})
              </h2>
              <button
                type="button"
                onClick={addItemRow}
                className="flex items-center space-x-1 text-xs font-semibold px-3 py-1.5 bg-brand-800 text-white hover:bg-brand-900 rounded-lg transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Row</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 border-b border-gray-200">
                    <th className="py-2.5 px-3 min-w-[200px]">Description</th>
                    <th className="py-2.5 px-2 w-20 text-center">HSN</th>
                    <th className="py-2.5 px-2 w-16 text-center">Qty</th>
                    <th className="py-2.5 px-2 w-24 text-right">Unit Rate (₹)</th>
                    <th className="py-2.5 px-2 w-28 text-center">Discount</th>
                    {settings.registrationStatus === 'registered' && (
                      <th className="py-2.5 px-2 w-20 text-center">GST %</th>
                    )}
                    <th className="py-2.5 px-3 w-28 text-right">Line Total (₹)</th>
                    <th className="py-2.5 px-2 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {items.map((item, idx) => {
                    const computedLine = calcResult.items[idx];
                    return (
                      <tr key={item.id} className="hover:bg-gray-50/50">
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            placeholder="e.g. Banarasi Katan Silk"
                            value={item.description}
                            onChange={e => updateItemRow(item.id, { description: e.target.value })}
                            className="w-full p-1.5 bg-gray-50 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-brand-700 focus:bg-white"
                          />
                        </td>

                        <td className="py-2 px-2 text-center">
                          <input
                            type="text"
                            value={item.hsnCode}
                            placeholder="5007"
                            onChange={e => updateItemRow(item.id, { hsnCode: e.target.value })}
                            className="w-full p-1.5 text-center font-mono bg-gray-50 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-brand-700 focus:bg-white"
                          />
                        </td>

                        <td className="py-2 px-2 text-center">
                          <input
                            type="number"
                            min="1"
                            value={item.qty || ''}
                            onChange={e => updateItemRow(item.id, { qty: Number(e.target.value) || 0 })}
                            className="w-full p-1.5 text-center font-bold bg-gray-50 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-brand-700 focus:bg-white"
                          />
                        </td>

                        <td className="py-2 px-2 text-right">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice || ''}
                            onChange={e => updateItemRow(item.id, { unitPrice: Number(e.target.value) || 0 })}
                            className="w-full p-1.5 text-right font-mono bg-gray-50 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-brand-700 focus:bg-white"
                          />
                        </td>

                        <td className="py-2 px-2">
                          <div className="flex items-center space-x-1">
                            <input
                              type="number"
                              min="0"
                              value={item.discountValue || ''}
                              placeholder="0"
                              onChange={e => updateItemRow(item.id, { discountValue: Number(e.target.value) || 0 })}
                              className="w-16 p-1.5 text-right font-mono bg-gray-50 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-brand-700 focus:bg-white"
                            />
                            <button
                              type="button"
                              onClick={() => updateItemRow(item.id, { discountType: item.discountType === 'percentage' ? 'fixed' : 'percentage' })}
                              className="px-1.5 py-1 bg-gray-200 hover:bg-gray-300 rounded text-[10px] font-bold text-gray-700"
                              title="Toggle percentage or fixed amount"
                            >
                              {item.discountType === 'percentage' ? '%' : '₹'}
                            </button>
                          </div>
                        </td>

                        {settings.registrationStatus === 'registered' && (
                          <td className="py-2 px-2 text-center">
                            <select
                              value={item.gstRate}
                              onChange={e => updateItemRow(item.id, { gstRate: Number(e.target.value) })}
                              className="w-full p-1.5 font-mono bg-gray-50 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-brand-700 focus:bg-white"
                            >
                              {settings.supportedGstRates.map(r => (
                                <option key={r} value={r}>{r}%</option>
                              ))}
                            </select>
                          </td>
                        )}

                        <td className="py-2 px-3 text-right font-mono font-bold text-brand-900">
                          ₹{computedLine ? computedLine.lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}
                        </td>

                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeItemRow(item.id)}
                            className="text-gray-400 hover:text-rose-600 transition"
                            title="Remove line"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-200 flex flex-wrap items-center justify-between gap-4 text-xs">
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-gray-700">Special Bill Discount:</span>
                <input
                  type="number"
                  min="0"
                  value={billDiscountValue || ''}
                  placeholder="0"
                  onChange={e => setBillDiscountValue(Number(e.target.value) || 0)}
                  className="w-24 p-1.5 bg-white border border-gray-300 rounded text-xs font-mono text-right"
                />
                <div className="flex rounded border border-gray-300 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setBillDiscountType('percentage')}
                    className={`px-2 py-1 text-xs font-semibold ${billDiscountType === 'percentage' ? 'bg-brand-800 text-white' : 'bg-white text-gray-700'}`}
                  >
                    %
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillDiscountType('fixed')}
                    className={`px-2 py-1 text-xs font-semibold ${billDiscountType === 'fixed' ? 'bg-brand-800 text-white' : 'bg-white text-gray-700'}`}
                  >
                    ₹ Flat
                  </button>
                </div>
              </div>

              {calcResult.billDiscountAmount > 0 && (
                <div className="text-amber-800 font-semibold font-mono">
                  Allocated across lines: - ₹{calcResult.billDiscountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-ivory-border shadow-sm text-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-brand-900 uppercase tracking-wider flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-brand-700" />
                Customer & Destination State
              </h3>

              <select
                value={selectedCustomerId}
                onChange={e => handleCustomerSelect(e.target.value)}
                className="p-1.5 bg-gray-50 border border-gray-300 rounded text-xs max-w-xs"
              >
                <option value="cust-walkin">Walk-in Retail Customer</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-gray-600 font-medium mb-1">Customer Name</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-brand-700"
                />
              </div>

              <div>
                <label className="block text-gray-600 font-medium mb-1">Phone Number</label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  placeholder="10-digit mobile"
                  className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-brand-700"
                />
              </div>

              <div>
                <label className="block text-gray-600 font-medium mb-1">Customer GSTIN (Optional B2B)</label>
                <input
                  type="text"
                  value={customerGstin}
                  onChange={e => setCustomerGstin(e.target.value.toUpperCase())}
                  placeholder="e.g. 09AAECV1234K1ZB"
                  className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs font-mono uppercase focus:ring-1 focus:ring-brand-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-gray-600 font-medium mb-1">Billing Address</label>
                <input
                  type="text"
                  value={customerAddress}
                  onChange={e => setCustomerAddress(e.target.value)}
                  className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-brand-700"
                />
              </div>

              <div>
                <label className="block text-gray-600 font-medium mb-1">
                  Place of Supply (Determines CGST/SGST vs IGST)
                </label>
                <select
                  value={posStateCode}
                  onChange={e => setPosStateCode(e.target.value)}
                  className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-brand-700"
                >
                  {INDIAN_STATES.map(st => (
                    <option key={st.code} value={st.code}>
                      {st.code} - {st.name} {st.code === settings.stateCode ? '(Store Local State)' : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-500 mt-1">
                  Tax Treatment: <strong className="text-brand-900">{calcResult.supplyType === 'intra_state' ? 'Intra-State (CGST + SGST)' : 'Inter-State (IGST)'}</strong>
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-20">
          <div className="bg-white p-5 rounded-xl border border-ivory-border shadow-md">
            <h3 className="font-bold text-brand-900 uppercase tracking-wider text-xs border-b border-gray-200 pb-2 mb-4">
              Bill Summary
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>{pricingMode === 'inclusive' ? 'Total MRP / Retail Value:' : 'Gross Subtotal:'}</span>
                <span className="font-mono font-medium">₹{calcResult.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>

              {calcResult.totalDiscount > 0 && (
                <div className="flex justify-between text-amber-800">
                  <span>Total Discount:</span>
                  <span className="font-mono font-medium">- ₹{calcResult.totalDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              )}

              <div className="flex justify-between text-gray-700 font-medium pt-2 border-t border-gray-100">
                <span>Taxable Value:</span>
                <span className="font-mono">₹{calcResult.taxableTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>

              {settings.registrationStatus === 'registered' ? (
                <>
                  {calcResult.supplyType === 'intra_state' ? (
                    <>
                      <div className="flex justify-between text-gray-600">
                        <span>CGST Amount{pricingMode === 'inclusive' ? ' (Included)' : ''}:</span>
                        <span className="font-mono">₹{calcResult.cgstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>SGST Amount{pricingMode === 'inclusive' ? ' (Included)' : ''}:</span>
                        <span className="font-mono">₹{calcResult.sgstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between text-gray-600">
                      <span>IGST Amount{pricingMode === 'inclusive' ? ' (Included)' : ''}:</span>
                      <span className="font-mono">₹{calcResult.igstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}

                  {pricingMode === 'inclusive' && (
                    <div className="text-[10px] text-gray-500 bg-gray-50 p-1.5 rounded border border-gray-100 text-center italic">
                      * GST is included in product price. Not added on top.
                    </div>
                  )}
                </>
              ) : (
                <div className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
                  Unregistered mode: No GST calculated or collected.
                </div>
              )}

              {calcResult.roundOff !== 0 && (
                <div className="flex justify-between text-gray-500">
                  <span>Round Off:</span>
                  <span className="font-mono">{calcResult.roundOff > 0 ? ('+ ₹' + calcResult.roundOff.toFixed(2)) : ('- ₹' + Math.abs(calcResult.roundOff).toFixed(2))}</span>
                </div>
              )}

              <div className="flex justify-between items-baseline pt-3 border-t-2 border-brand-800 text-brand-900">
                <span className="font-bold text-sm uppercase">Total Payable:</span>
                <span className="font-bold font-mono text-2xl text-brand-900">
                  ₹{calcResult.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="p-2.5 bg-brand-50/60 rounded text-[11px] text-gray-700 italic border border-brand-100">
                {numberToWordsIndian(calcResult.grandTotal)}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200">
              <h4 className="font-bold text-gray-800 uppercase tracking-wider text-[11px] mb-2">
                Payment Collection
              </h4>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-gray-600 mb-1">Amount Received (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={paymentAmount || ''}
                    onChange={e => setPaymentAmount(Number(e.target.value) || 0)}
                    className="w-full p-2 bg-gray-50 border border-gray-300 rounded font-mono font-bold text-sm text-gray-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-gray-600 mb-1">Method</label>
                    <select
                      value={paymentMethod}
                      onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                      className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs"
                    >
                      {settings.supportedPaymentMethods.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-600 mb-1">Reference / UPI ID</label>
                    <input
                      type="text"
                      placeholder="e.g. UPI Ref"
                      value={paymentRef}
                      onChange={e => setPaymentRef(e.target.value)}
                      className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center p-2 rounded bg-gray-50 text-xs">
                  <span className="text-gray-600">Balance Due:</span>
                  <span className="font-bold font-mono text-brand-800">
                    ₹{Math.max(0, calcResult.grandTotal - (paymentAmount || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <button
                type="button"
                disabled={isSubmitting || calcResult.grandTotal <= 0}
                onClick={() => handleSaveInvoice(true)}
                className="w-full py-3 px-4 bg-brand-800 hover:bg-brand-900 text-white rounded-xl font-bold text-sm shadow-md flex items-center justify-center space-x-2 transition disabled:opacity-50"
              >
                <CheckCircle className="w-5 h-5 text-gold" />
                <span>{isSubmitting ? 'Finalizing Invoice...' : 'Finalize & Generate Bill'}</span>
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSaveInvoice(false)}
                className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition"
              >
                <Save className="w-4 h-4 text-gray-500" />
                <span>Save as Draft</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
