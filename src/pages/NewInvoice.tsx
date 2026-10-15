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
import { 
  searchInventory, 
  InventoryItem, 
  createSupabaseSale, 
  saveSupabaseCustomer,
  fetchSupabaseAddons,
  SupabaseAddon,
  findSupabaseCustomerByPhone,
  fetchSupabaseStaff,
  SupabaseStaff,
  resolveInventorySareeId,
  recordSupabaseAddonSale,
  supabase
} from '../db/supabaseClient';
import { useAuth } from '../store/useAuthStore';
import { playBeep } from '../utils/audio';
import { BarcodeScannerModal } from '../components/BarcodeScannerModal';
import { RemoteScannerModal } from '../components/RemoteScannerModal';
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
  Tag,
  Sparkles,
  Phone,
  UserCheck,
  Camera,
  Smartphone,
  ScanLine
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
  purchasePrice?: number;
}

export const NewInvoice: React.FC<NewInvoiceProps> = ({
  settings,
  products,
  customers,
  onInvoiceCreated,
  initialDraft
}) => {
  const { user } = useAuth();
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

  // Fast Product Search state (Supabase + Local + Add-ons)
  const [searchQuery, setSearchQuery] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [supabaseResults, setSupabaseResults] = useState<InventoryItem[]>([]);
  const [isSearchingSupabase, setIsSearchingSupabase] = useState(false);
  const [availableAddons, setAvailableAddons] = useState<SupabaseAddon[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Barcode & Remote Scanner States
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
  const [isRemoteLinkOpen, setIsRemoteLinkOpen] = useState(false);
  const [isRemoteConnected, setIsRemoteConnected] = useState(false);
  const [scannerNotification, setScannerNotification] = useState<string | null>(null);

  // Session ID for Remote Scanner Room (matching sibling project)
  const [sessionId] = useState<string>(() => {
    const saved = localStorage.getItem('invoice_session_id');
    if (saved) return saved;
    const id = 'S-' + Math.random().toString(36).substring(2, 7).toUpperCase();
    localStorage.setItem('invoice_session_id', id);
    return id;
  });

  // Physical Barcode Scanner Hardware Keystroke Buffer
  const scannerBufferRef = useRef<{ text: string; lastTime: number }>({ text: '', lastTime: 0 });

  // Load available add-ons and active staff from Supabase on mount
  const [staffList, setStaffList] = useState<SupabaseStaff[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');

  useEffect(() => {
    fetchSupabaseAddons().then(addons => {
      setAvailableAddons(addons);
    });
    fetchSupabaseStaff().then(list => {
      setStaffList(list);
    });
  }, []);

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

  // State to track if customer was found / auto-filled
  const [customerLookupStatus, setCustomerLookupStatus] = useState<'idle' | 'searching' | 'existing' | 'new'>('idle');

  const handleCustomerPhoneChange = async (val: string) => {
    setCustomerPhone(val);
    const clean = val.trim().replace(/\D/g, '');

    // Reset indicator if phone is cleared or too short
    if (clean.length < 5) {
      setCustomerLookupStatus('idle');
      return;
    }

    // 1. First check loaded customers (local IndexedDB + already fetched Supabase customers)
    const existingCust = customers.find(c => {
      const cClean = (c.phone || '').trim().replace(/\D/g, '');
      return cClean === clean || (cClean.length >= 10 && clean.length >= 10 && cClean.slice(-10) === clean.slice(-10));
    });

    if (existingCust) {
      setSelectedCustomerId(existingCust.id);
      setCustomerName(existingCust.name);
      if (existingCust.billingAddress) setCustomerAddress(existingCust.billingAddress);
      if (existingCust.stateCode) setPosStateCode(existingCust.stateCode);
      setCustomerLookupStatus('existing');
      return;
    }

    // 2. If phone is at least 10 digits and not found locally, query Supabase directly
    if (clean.length >= 10) {
      setCustomerLookupStatus('searching');
      try {
        const remoteCust = await findSupabaseCustomerByPhone(clean);
        if (remoteCust) {
          setSelectedCustomerId(remoteCust.id);
          setCustomerName(remoteCust.name);
          if (remoteCust.address) setCustomerAddress(remoteCust.address);
          setCustomerLookupStatus('existing');
        } else {
          // First-time new customer
          setSelectedCustomerId('cust-new-' + Date.now());
          setCustomerLookupStatus('new');
        }
      } catch (err) {
        console.warn('Customer lookup error:', err);
        setCustomerLookupStatus('new');
      }
    } else {
      setCustomerLookupStatus('idle');
    }
  };

  const handleCustomerSelect = (id: string) => {
    setSelectedCustomerId(id);
    const found = customers.find(c => c.id === id);
    if (found) {
      setCustomerName(found.name);
      setCustomerPhone(found.phone);
      setCustomerAddress(found.billingAddress);
      setCustomerGstin(found.gstin || '');
      setPosStateCode(found.stateCode || settings.stateCode);
      setCustomerLookupStatus('existing');
    } else if (id === 'cust-walkin') {
      setCustomerName('Walk-in Retail Customer');
      setCustomerPhone('');
      setCustomerAddress('Varanasi Store Counter');
      setCustomerGstin('');
      setCustomerLookupStatus('idle');
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
      gstRate: inv.gst_rate !== undefined && inv.gst_rate !== null ? Number(inv.gst_rate) : (settings.defaultGstRate || 5),
      purchasePrice: Number(inv.purchase_price) || 0
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

  // Add Add-on Item (Blouse, Petticoat, Fall & Pico, etc.)
  const handleSelectAddon = (addon: SupabaseAddon) => {
    const emptyIndex = items.findIndex(it => !it.description && it.unitPrice === 0);
    const hsn = addon.category === 'Blouse' ? '6211' : addon.category === 'Petticoat' ? '6208' : '5208';
    const newItem: WorkingItem = {
      id: 'row-' + Date.now(),
      productId: `addon-${addon.id}`,
      description: `${addon.name} (${addon.category})`,
      hsnCode: hsn,
      qty: 1,
      unit: 'Nos',
      unitPrice: Number(addon.selling_price) || 0,
      discountType: 'percentage',
      discountValue: 0,
      gstRate: settings.defaultGstRate || 5,
      purchasePrice: Number(addon.purchase_price) || 0
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

  // Saree Code Match function matching sibling project
  const isSareeCodeMatch = (item: { id: string; barcode?: string | null; sku?: string | null }, rawCode: string): boolean => {
    if (!rawCode || !item) return false;
    const term = rawCode.trim().toLowerCase();
    if (!term) return false;

    const termWithoutS = term.startsWith('s') ? term.substring(1) : term;
    const termWithS = term.startsWith('s') ? term : 's' + term;

    const sId = (item.id || '').trim().toLowerCase();
    const sIdWithoutS = sId.startsWith('s') ? sId.substring(1) : sId;

    const sBarcode = (item.barcode || '').trim().toLowerCase();
    const sBarcodeWithoutS = sBarcode.startsWith('s') ? sBarcode.substring(1) : sBarcode;

    const sSku = (item.sku || '').trim().toLowerCase();

    return (
      sBarcode === term ||
      sBarcode === termWithS ||
      sBarcode === termWithoutS ||
      (sBarcodeWithoutS.length >= 3 && sBarcodeWithoutS === termWithoutS) ||
      sId === term ||
      sId === termWithS ||
      sId === termWithoutS ||
      (sIdWithoutS.length >= 3 && sIdWithoutS === termWithoutS) ||
      sSku === term ||
      (sSku.replace(/[-\s_]/g, '') === term.replace(/[-\s_]/g, ''))
    );
  };

  // Resolve scanned barcode against local catalogue & remote Supabase inventory
  const handleBarcodeResolved = async (barcodeText: string) => {
    const cleanCode = barcodeText.trim();
    if (!cleanCode) return;

    // 1. Check local products first
    const matchedLocal = products.find(p => isSareeCodeMatch(p, cleanCode));
    if (matchedLocal) {
      playBeep();
      handleSelectProduct(matchedLocal);
      setScannerNotification(`Scanned: ${matchedLocal.name}`);
      setTimeout(() => setScannerNotification(null), 3000);
      return;
    }

    // 2. Query Supabase storefront products
    try {
      const searchRes = await searchInventory(cleanCode, 5);
      const matchedRemote = searchRes.find(item => isSareeCodeMatch(item, cleanCode)) || searchRes[0];
      if (matchedRemote) {
        playBeep();
        handleSelectSupabaseItem(matchedRemote);
        setScannerNotification(`Scanned: ${matchedRemote.saree_name}`);
        setTimeout(() => setScannerNotification(null), 3000);
        return;
      }
    } catch (err) {
      console.warn('Barcode remote lookup failed:', err);
    }

    // 3. Fallback: Check add-ons
    const matchedAddon = availableAddons.find(a => 
      a.id.toLowerCase() === cleanCode.toLowerCase() || 
      a.name.toLowerCase().includes(cleanCode.toLowerCase())
    );
    if (matchedAddon) {
      playBeep();
      handleSelectAddon(matchedAddon);
      setScannerNotification(`Scanned Add-on: ${matchedAddon.name}`);
      setTimeout(() => setScannerNotification(null), 3000);
      return;
    }

    setScannerNotification(`No product found for barcode: ${cleanCode}`);
    setTimeout(() => setScannerNotification(null), 3500);
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

  // Filter matching add-ons from public.addons
  const filteredAddons = availableAddons.filter(a => {
    if (!searchQuery.trim()) return false;
    const q = searchQuery.toLowerCase();
    return a.name.toLowerCase().includes(q) || a.category.toLowerCase().includes(q);
  }).slice(0, 8);

  // Realtime Supabase broadcast subscription for Remote Scanner (Phone)
  useEffect(() => {
    const targetChannelName = `room:POS-${sessionId}`;
    console.log(`[POS Invoice] Connecting to Supabase Realtime channel: ${targetChannelName}`);

    const channel = supabase.channel(targetChannelName, {
      config: { broadcast: { self: false } }
    });

    channel
      .on('broadcast', { event: 'scan' }, (payload) => {
        console.log('[POS Invoice] Realtime broadcast scan received:', payload);
        const data = payload?.payload;
        const barcode = typeof data === 'string' ? data.trim() : (data?.barcode ? String(data.barcode).trim() : '');

        if (barcode) {
          handleBarcodeResolved(barcode);
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[POS Invoice] Supabase channel subscribed live!');
          setIsRemoteConnected(true);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setIsRemoteConnected(false);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, products, availableAddons, items]);

  // Hardware Barcode Scanner global listener (USB / Bluetooth barcode guns)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isOtherInputActive = activeEl && (
        (activeEl.tagName === 'INPUT' && activeEl !== searchInputRef.current) ||
        activeEl.tagName === 'TEXTAREA' ||
        (activeEl as HTMLElement).isContentEditable
      );

      const now = Date.now();
      const timeSinceLastKey = now - scannerBufferRef.current.lastTime;

      if (e.key === 'Enter') {
        const bufferText = scannerBufferRef.current.text.trim();
        const inputVal = (searchInputRef.current?.value || searchQuery || '').trim();
        const termToMatch = bufferText || (timeSinceLastKey < 80 ? inputVal : '');

        if (termToMatch.length >= 2) {
          e.preventDefault();
          e.stopPropagation();
          handleBarcodeResolved(termToMatch);
          setSearchQuery('');
          if (searchInputRef.current) searchInputRef.current.value = '';
          scannerBufferRef.current = { text: '', lastTime: 0 };
          return;
        }
        scannerBufferRef.current = { text: '', lastTime: 0 };
        return;
      }

      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (isOtherInputActive) {
          if (timeSinceLastKey < 60) {
            scannerBufferRef.current.text += e.key;
          } else {
            scannerBufferRef.current.text = e.key;
          }
        } else {
          if (timeSinceLastKey > 150) {
            scannerBufferRef.current.text = e.key;
          } else {
            scannerBufferRef.current.text += e.key;
          }
        }
        scannerBufferRef.current.lastTime = now;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown, true);
  }, [products, availableAddons, searchQuery, items]);

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

      let fullInvoice: Invoice = {
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

      // If finalizing, sync with Supabase public.sales and public.sale_items
      if (finalize) {
        try {
          // Ensure customer exists in Supabase
          let supabaseCustomerId = selectedCustomerId;
          const isCustomerUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(selectedCustomerId || '');
          
          if (!isCustomerUuid && customerPhone && customerName) {
            const { data: createdCust } = await saveSupabaseCustomer({
              name: customerName,
              mobile: customerPhone,
              address: customerAddress || 'Varanasi',
              city: 'Varanasi'
            });
            if (createdCust?.id) {
              supabaseCustomerId = createdCust.id;
              fullInvoice.customerId = createdCust.id;
              fullInvoice.customerSnapshot.id = createdCust.id;
            }
          }

          // Calculate profit matching admin panel logic
          let totalPurchaseCost = 0;
          for (const it of calcResult.items) {
            const matchingWorkItem = items.find(w => w.id === it.id);
            const pPrice = matchingWorkItem?.purchasePrice || 0;
            totalPurchaseCost += pPrice * it.qty;
          }
          const netProfit = Math.max(0, calcResult.subtotal - calcResult.totalDiscount - totalPurchaseCost);

          // Calculate salesperson commission
          const staffMember = staffList.find(s => s.id === selectedStaffId);
          const commissionEarned = staffMember && staffMember.commission_rate > 0
            ? Math.round((calcResult.subtotal * staffMember.commission_rate) / 100)
            : 0;

          // Build sales payload matching public.sales schema
          const salePayload: any = {
            invoice_number: invNumber,
            customer_id: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(supabaseCustomerId || '') ? supabaseCustomerId : null,
            total_amount: calcResult.grandTotal,
            profit: netProfit,
            payment_mode: (paymentMethod || 'cash').toLowerCase(),
            discount_amount: calcResult.totalDiscount,
            discount_percentage: billDiscountType === 'percentage' ? billDiscountValue : null,
            is_gst_applied: calcResult.isRegisteredTaxInvoice,
            gst_rate: calcResult.rateBreakdown?.[0]?.rate || 5,
            taxable_amount: calcResult.taxableTotal,
            cgst_rate: calcResult.supplyType === 'intra_state' ? (calcResult.rateBreakdown?.[0]?.rate || 5) / 2 : 0,
            cgst_amount: calcResult.cgstTotal,
            sgst_rate: calcResult.supplyType === 'intra_state' ? (calcResult.rateBreakdown?.[0]?.rate || 5) / 2 : 0,
            sgst_amount: calcResult.sgstTotal,
            igst_rate: calcResult.supplyType === 'inter_state' ? (calcResult.rateBreakdown?.[0]?.rate || 5) : 0,
            igst_amount: calcResult.igstTotal,
            total_gst: calcResult.taxTotal,
            amount_paid: paidSoFar,
            due_amount: balanceDue,
            payment_status: payStatus === 'paid' ? 'paid' : payStatus === 'partially_paid' ? 'partially_paid' : 'due',
            created_by: user?.email || 'admin',
            updated_by: user?.email || 'admin',
            salesperson_id: selectedStaffId || null,
            commission_earned: commissionEarned
          };

          // Process items: record add-ons in addon_sales and only link actual sarees in sale_items
          const sareeItemsPayload: { saree_id: string; quantity: number; selling_price: number }[] = [];

          for (const it of calcResult.items) {
            const isAddon = (it.productId || '').startsWith('addon-') || 
              availableAddons.some(a => a.id === it.productId || a.name.toLowerCase() === it.description.toLowerCase());

            if (isAddon) {
              // Record add-on in public.addon_sales and decrement public.addons stock (keeps inventory strictly for sarees)
              const cleanAddonId = (it.productId || '').replace(/^addon-/, '');
              const addonObj = availableAddons.find(a => a.id === cleanAddonId || a.name.toLowerCase() === it.description.toLowerCase());

              await recordSupabaseAddonSale({
                addon_id: addonObj?.id || cleanAddonId,
                addon_name: it.description,
                category: addonObj?.category || 'Other',
                quantity: it.qty,
                unit_price: it.unitPrice,
                total_amount: it.lineTotal,
                customer_name: customerName,
                payment_method: paymentMethod
              });
            } else {
              // Saree item: resolve existing ID from public.inventory
              const sareeId = await resolveInventorySareeId({
                id: it.productId,
                name: it.description
              });

              if (sareeId) {
                sareeItemsPayload.push({
                  saree_id: sareeId,
                  quantity: it.qty,
                  selling_price: it.unitPrice
                });
              }
            }
          }

          const { data: createdSale, error: saleErr } = await createSupabaseSale({
            sale: salePayload,
            items: sareeItemsPayload
          });

          if (!saleErr && createdSale?.id) {
            fullInvoice.id = createdSale.id;
          } else if (saleErr) {
            console.warn('Could not sync to Supabase sales table (offline or schema fallback):', saleErr.message);
          }
        } catch (syncErr) {
          console.warn('Error during Supabase sale creation:', syncErr);
        }
      }

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* High-Speed POS Terminal Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white/80 backdrop-blur-xl p-4 sm:p-5 rounded-2xl border border-gold/25 shadow-card">
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-950 to-brand-900 text-gold flex items-center justify-center border border-gold/40 shadow-xs">
            <Receipt className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight font-serif">
                POS Billing Terminal
              </h1>
              <span className="text-[10px] bg-emerald-50 text-emerald-700 font-extrabold px-2 py-0.5 rounded-full border border-emerald-200">
                Live Counter
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              High-speed billing counter with barcode scanner, live Supabase sync, and paise-accurate GST engine.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setPricingMode((m: PricingMode) => m === 'inclusive' ? 'exclusive' : 'inclusive')}
            title="Click to toggle pricing mode"
            className="text-xs px-3.5 py-2 rounded-xl bg-amber-50/90 hover:bg-amber-100/90 border border-amber-300/80 text-brand-950 font-bold transition cursor-pointer flex items-center gap-2 shadow-2xs active-press"
          >
            <span className="text-slate-600 font-normal">Pricing Mode:</span>
            <strong className="text-brand-950 font-black">
              {pricingMode === 'inclusive' ? 'GST Included (MRP)' : 'Tax Exclusive (+GST)'}
            </strong>
            <span className="text-[9px] text-amber-900 bg-amber-200/80 px-1.5 py-0.5 rounded uppercase tracking-wider font-extrabold">
              Switch
            </span>
          </button>

          <span className={`text-xs px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 shadow-2xs ${
            settings.registrationStatus === 'registered'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-slate-100 border border-slate-200 text-slate-700'
          }`}>
            <span className={`w-2 h-2 rounded-full ${settings.registrationStatus === 'registered' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
            <span>{settings.registrationStatus === 'registered' ? 'GST Tax Invoice' : 'Retail Bill (Non-GST)'}</span>
          </span>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3 shadow-xs animate-shake">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-600" />
          <div>
            <p className="font-extrabold text-sm">Validation Notice</p>
            <p className="text-xs mt-0.5 font-medium">{errorMessage}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 space-y-6">
          {/* Quick Product Search & Scan Bar */}
          <div className="luxury-card p-5 rounded-2xl border border-slate-200/80 shadow-card relative">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <Search className="w-4 h-4 text-brand-900" />
                <span>Search Sarees, Accessories & Barcodes</span>
              </label>
              
              <div className="flex items-center space-x-2 text-[11px] font-semibold text-slate-500">
                <span className="flex items-center gap-1 text-emerald-800 bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded-md">
                  <Cloud className="w-3 h-3 text-emerald-600" /> Live Inventory
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-purple-800 bg-purple-50 border border-purple-200/70 px-2 py-0.5 rounded-md">
                  <Sparkles className="w-3 h-3 text-purple-600" /> Add-ons ({availableAddons.length})
                </span>
              </div>
            </div>

            {/* Scanner Notification Banner */}
            {scannerNotification && (
              <div className="mb-3.5 p-3 rounded-xl bg-gradient-to-r from-brand-950 to-brand-900 text-gold flex items-center justify-between text-xs font-bold shadow-md border border-gold/40 animate-fade-in">
                <span className="flex items-center gap-2">
                  <ScanLine className="w-4 h-4 text-gold animate-pulse" />
                  <span>{scannerNotification}</span>
                </span>
                <span className="text-[10px] bg-gold/20 text-gold px-2 py-0.5 rounded uppercase tracking-wider font-extrabold">Item Added</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Type Saree name, weave (Katan, Organza, Jangla), SKU, or scan barcode..."
                  value={searchQuery}
                  onChange={e => {
                    setSearchQuery(e.target.value);
                    setShowProductDropdown(true);
                  }}
                  onFocus={() => setShowProductDropdown(true)}
                  className="w-full pl-11 pr-10 py-3 text-xs sm:text-sm bg-slate-50/80 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gold focus:border-gold focus:bg-white focus:outline-none transition font-medium"
                />
                {isSearchingSupabase && (
                  <Loader2 className="w-4 h-4 absolute right-3.5 top-3.5 text-brand-600 animate-spin" />
                )}
              </div>

              {/* Scanner Actions (Camera + Remote Phone) */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCameraScannerOpen(true)}
                  title="Scan with webcam / device camera"
                  className="px-4 py-3 bg-slate-100 hover:bg-slate-200/80 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-2 transition border border-slate-200 shadow-2xs cursor-pointer active-press shrink-0"
                >
                  <Camera className="w-4 h-4 text-brand-900" />
                  <span className="hidden sm:inline">Camera</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsRemoteLinkOpen(true)}
                  title="Link Phone Scanner via QR code"
                  className={`px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2 transition border shadow-xs cursor-pointer active-press shrink-0 ${
                    isRemoteConnected
                      ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                      : 'bg-gradient-to-r from-brand-950 to-brand-900 text-white border-gold/30 hover:shadow-md'
                  }`}
                >
                  <Smartphone className="w-4 h-4 text-gold" />
                  <span>Remote Scanner</span>
                  <span className={`w-2 h-2 rounded-full ${isRemoteConnected ? 'bg-emerald-500 animate-pulse' : 'bg-gold'}`} />
                </button>
              </div>
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

                {/* 3. Add-ons Matches (Blouse, Petticoat, Fall & Pico) */}
                {filteredAddons.length > 0 && (
                  <div>
                    <div className="bg-purple-50/80 px-3 py-1.5 text-[11px] font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1 border-b border-purple-100">
                      <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                      <span>Add-ons & Accessories ({filteredAddons.length})</span>
                    </div>
                    {filteredAddons.map(addon => (
                      <div
                        key={addon.id}
                        onClick={() => handleSelectAddon(addon)}
                        className="p-3 hover:bg-purple-50/50 cursor-pointer flex items-center justify-between text-xs transition border-b border-gray-50 last:border-b-0"
                      >
                        <div className="space-y-0.5">
                          <p className="font-bold text-gray-900 flex items-center gap-2">
                            {addon.name}
                            <span className="inline-flex items-center px-1.5 py-0.2 bg-purple-100 text-purple-800 rounded text-[10px] font-semibold">
                              {addon.category}
                            </span>
                          </p>
                          <p className="text-gray-500 text-[11px]">
                            Add-on Accessory • Available in Store Inventory
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0 ml-3">
                          <p className="font-bold font-mono text-brand-900 text-sm">
                            ₹{Number(addon.selling_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </p>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                            addon.stock > 0 ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'
                          }`}>
                            Stock: {addon.stock ?? 0}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {supabaseResults.length === 0 && filteredLocalProducts.length === 0 && filteredAddons.length === 0 && !isSearchingSupabase && (
                  <div className="p-4 text-center text-xs text-gray-500">
                    No matching saree or add-on found for "{searchQuery}". You can enter manual line details below.
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="luxury-card rounded-2xl border border-slate-200/80 shadow-card overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50/90 to-white">
              <h2 className="text-xs font-bold text-brand-950 uppercase tracking-wider flex items-center gap-2">
                <Receipt className="w-4 h-4 text-brand-900" />
                <span>Invoice Line Items ({items.length})</span>
              </h2>
              <button
                type="button"
                onClick={addItemRow}
                className="flex items-center space-x-1.5 text-xs font-bold px-3.5 py-2 bg-gradient-to-r from-brand-950 to-brand-900 hover:from-black hover:to-brand-950 text-white rounded-xl shadow-xs transition active-press cursor-pointer border border-gold/30"
              >
                <Plus className="w-3.5 h-3.5 text-gold" />
                <span>Add Saree / Item</span>
              </button>
            </div>

            {/* Mobile Native View for Line Items */}
            <div className="block md:hidden divide-y divide-slate-100">
              {items.map((item, idx) => {
                const computedLine = calcResult.items[idx];
                return (
                  <div key={item.id} className="p-4 space-y-3 bg-white">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Item #{idx + 1}</span>
                        <input
                          type="text"
                          placeholder="Item Description / Saree Name"
                          value={item.description}
                          onChange={e => updateItemRow(item.id, { description: e.target.value })}
                          className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-gold focus:outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItemRow(item.id)}
                        className="p-2.5 mt-4 text-slate-400 hover:text-rose-600 active-press rounded-xl hover:bg-rose-50 transition"
                        title="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Qty</label>
                        <input
                          type="number"
                          min="1"
                          value={item.qty || ''}
                          onChange={e => updateItemRow(item.id, { qty: Number(e.target.value) || 0 })}
                          className="w-full mt-0.5 p-2 text-center font-bold bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-gold focus:outline-none"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Rate (₹)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice || ''}
                          onChange={e => updateItemRow(item.id, { unitPrice: Number(e.target.value) || 0 })}
                          className="w-full mt-0.5 p-2 text-right font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-gold focus:outline-none tabular-nums"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Discount</label>
                        <div className="flex items-center space-x-1 mt-0.5">
                          <input
                            type="number"
                            min="0"
                            value={item.discountValue || ''}
                            placeholder="0"
                            onChange={e => updateItemRow(item.id, { discountValue: Number(e.target.value) || 0 })}
                            className="w-full p-2 text-right font-mono bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white tabular-nums"
                          />
                          <button
                            type="button"
                            onClick={() => updateItemRow(item.id, { discountType: item.discountType === 'percentage' ? 'fixed' : 'percentage' })}
                            className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700 active-press border border-slate-200"
                          >
                            {item.discountType === 'percentage' ? '%' : '₹'}
                          </button>
                        </div>
                      </div>

                      <div className="text-right flex flex-col justify-end">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Total</span>
                        <span className="font-serif font-bold text-base text-brand-950 mt-0.5 tabular-nums">
                          ₹{computedLine ? computedLine.lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-600 border-b border-slate-200/80">
                    <th className="py-3 px-4 min-w-[220px] font-bold uppercase tracking-wider text-[11px]">Saree / Description</th>
                    <th className="py-3 px-2 w-20 text-center font-bold uppercase tracking-wider text-[11px]">HSN</th>
                    <th className="py-3 px-2 w-16 text-center font-bold uppercase tracking-wider text-[11px]">Qty</th>
                    <th className="py-3 px-2 w-28 text-right font-bold uppercase tracking-wider text-[11px]">Rate (₹)</th>
                    <th className="py-3 px-2 w-32 text-center font-bold uppercase tracking-wider text-[11px]">Discount</th>
                    {settings.registrationStatus === 'registered' && (
                      <th className="py-3 px-2 w-20 text-center font-bold uppercase tracking-wider text-[11px]">GST %</th>
                    )}
                    <th className="py-3 px-4 w-32 text-right font-bold uppercase tracking-wider text-[11px]">Line Total (₹)</th>
                    <th className="py-3 px-2 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item, idx) => {
                    const computedLine = calcResult.items[idx];
                    return (
                      <tr key={item.id} className="hover:bg-amber-50/20 transition">
                        <td className="py-2.5 px-4">
                          <input
                            type="text"
                            placeholder="e.g. Banarasi Katan Silk"
                            value={item.description}
                            onChange={e => updateItemRow(item.id, { description: e.target.value })}
                            className="w-full p-2 bg-slate-50/80 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-gold focus:outline-none"
                          />
                        </td>

                        <td className="py-2.5 px-2 text-center">
                          <input
                            type="text"
                            value={item.hsnCode}
                            placeholder="5007"
                            onChange={e => updateItemRow(item.id, { hsnCode: e.target.value })}
                            className="w-full p-2 text-center font-mono bg-slate-50/80 border border-slate-200 rounded-xl text-xs focus:bg-white"
                          />
                        </td>

                        <td className="py-2.5 px-2 text-center">
                          <input
                            type="number"
                            min="1"
                            value={item.qty || ''}
                            onChange={e => updateItemRow(item.id, { qty: Number(e.target.value) || 0 })}
                            className="w-full p-2 text-center font-bold bg-slate-50/80 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-gold focus:outline-none"
                          />
                        </td>

                        <td className="py-2.5 px-2 text-right">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice || ''}
                            onChange={e => updateItemRow(item.id, { unitPrice: Number(e.target.value) || 0 })}
                            className="w-full p-2 text-right font-mono font-bold bg-slate-50/80 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-gold focus:outline-none tabular-nums"
                          />
                        </td>

                        <td className="py-2.5 px-2">
                          <div className="flex items-center space-x-1">
                            <input
                              type="number"
                              min="0"
                              value={item.discountValue || ''}
                              placeholder="0"
                              onChange={e => updateItemRow(item.id, { discountValue: Number(e.target.value) || 0 })}
                              className="w-full p-2 text-right font-mono bg-slate-50/80 border border-slate-200 rounded-xl text-xs focus:bg-white tabular-nums"
                            />
                            <button
                              type="button"
                              onClick={() => updateItemRow(item.id, { discountType: item.discountType === 'percentage' ? 'fixed' : 'percentage' })}
                              className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700 active-press border border-slate-200 shrink-0 cursor-pointer"
                              title="Toggle percentage or fixed amount"
                            >
                              {item.discountType === 'percentage' ? '%' : '₹'}
                            </button>
                          </div>
                        </td>

                        {settings.registrationStatus === 'registered' && (
                          <td className="py-2.5 px-2 text-center">
                            <select
                              value={item.gstRate}
                              onChange={e => updateItemRow(item.id, { gstRate: Number(e.target.value) })}
                              className="w-full p-2 text-center bg-slate-50/80 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white"
                            >
                              {settings.supportedGstRates.map(r => (
                                <option key={r} value={r}>{r}%</option>
                              ))}
                            </select>
                          </td>
                        )}

                        <td className="py-2.5 px-4 text-right font-serif font-bold text-brand-950 text-sm tabular-nums">
                          ₹{computedLine ? computedLine.lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}
                        </td>

                        <td className="py-2.5 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeItemRow(item.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition active-press cursor-pointer"
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

            {/* Special Bill-Level Discount Bar */}
            <div className="p-4 bg-gradient-to-r from-amber-50/60 to-slate-50/60 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-4 text-xs">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-slate-700">Special Bill Discount:</span>
                <input
                  type="number"
                  min="0"
                  value={billDiscountValue || ''}
                  placeholder="0"
                  onChange={e => setBillDiscountValue(Number(e.target.value) || 0)}
                  className="w-24 p-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-right shadow-2xs tabular-nums focus:ring-2 focus:ring-gold focus:outline-none"
                />
                <div className="flex rounded-xl border border-slate-200 bg-white p-0.5 shadow-2xs overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setBillDiscountType('percentage')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${billDiscountType === 'percentage' ? 'bg-brand-900 text-gold shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    %
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillDiscountType('fixed')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${billDiscountType === 'fixed' ? 'bg-brand-900 text-gold shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    ₹ Flat
                  </button>
                </div>
              </div>

              {calcResult.billDiscountAmount > 0 && (
                <div className="text-amber-900 font-bold font-mono bg-amber-100/70 border border-amber-300 px-3 py-1 rounded-lg text-xs tabular-nums">
                  Proportionately Allocated: - ₹{calcResult.billDiscountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              )}
            </div>
          </div>

          {/* Customer & Destination State Card */}
          <div className="luxury-card p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-card text-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3 gap-3">
              <h3 className="font-bold text-brand-950 uppercase tracking-wider text-xs flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-brand-900" />
                <span>Customer & Destination State</span>
              </h3>

              <div className="flex items-center space-x-2">
                <span className="text-slate-500 font-medium">Saved Client:</span>
                <select
                  value={selectedCustomerId}
                  onChange={e => handleCustomerSelect(e.target.value)}
                  className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs max-w-xs font-medium focus:ring-2 focus:ring-gold focus:outline-none"
                >
                  <option value="cust-walkin">Walk-in Retail Customer</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 font-bold mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-brand-900" />
                    Customer Mobile Number
                  </span>
                  {customerLookupStatus === 'searching' && (
                    <span className="text-[10px] text-brand-600 flex items-center gap-1 font-semibold">
                      <Loader2 className="w-3 h-3 animate-spin" /> Verifying...
                    </span>
                  )}
                  {customerLookupStatus === 'existing' && (
                    <span className="text-[10px] text-emerald-800 font-bold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <UserCheck className="w-3 h-3 text-emerald-600" /> Recognized VIP
                    </span>
                  )}
                  {customerLookupStatus === 'new' && (
                    <span className="text-[10px] text-blue-800 font-bold flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                      <Plus className="w-3 h-3 text-blue-600" /> New Customer
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={e => handleCustomerPhoneChange(e.target.value)}
                  placeholder="Enter 10-digit mobile number..."
                  className="w-full p-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-gold focus:bg-white font-mono font-medium tracking-wide"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1.5">
                  Customer Full Name
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="Customer Full Name"
                  className="w-full p-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-gold focus:bg-white font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-slate-700 font-bold mb-1.5">Billing Address</label>
                <input
                  type="text"
                  value={customerAddress}
                  onChange={e => setCustomerAddress(e.target.value)}
                  className="w-full p-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-gold focus:bg-white font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1.5">
                  Place of Supply (State Code)
                </label>
                <select
                  value={posStateCode}
                  onChange={e => setPosStateCode(e.target.value)}
                  className="w-full p-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-gold focus:bg-white font-medium"
                >
                  {INDIAN_STATES.map(st => (
                    <option key={st.code} value={st.code}>
                      {st.code} - {st.name} {st.code === settings.stateCode ? '(Store Origin: UP)' : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1.5 font-medium">
                  Tax routing: <strong className="text-brand-950 font-bold">{calcResult.supplyType === 'intra_state' ? 'Intra-State (CGST + SGST)' : 'Inter-State (IGST)'}</strong>
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-20">
          <div className="luxury-card p-5 sm:p-6 rounded-2xl border border-gold/30 shadow-luxury relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-gold via-amber-400 to-yellow-300 pointer-events-none" />

            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-bold text-brand-950 uppercase tracking-wider text-xs font-serif flex items-center gap-2">
                <span>Receipt Summary</span>
              </h3>
              <span className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                {pricingMode === 'inclusive' ? 'MRP Included' : '+ Tax Extra'}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between text-slate-600 font-medium">
                <span>{pricingMode === 'inclusive' ? 'Total MRP / Retail Value:' : 'Gross Subtotal:'}</span>
                <span className="font-mono font-bold text-slate-900 tabular-nums">₹{calcResult.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>

              {calcResult.totalDiscount > 0 && (
                <div className="flex justify-between text-amber-800 font-semibold bg-amber-50/60 px-2.5 py-1.5 rounded-lg border border-amber-200/60">
                  <span>Total Discount:</span>
                  <span className="font-mono tabular-nums">- ₹{calcResult.totalDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-700 font-medium pt-2 border-t border-slate-100">
                <span>Taxable Value:</span>
                <span className="font-mono font-bold text-slate-900 tabular-nums">₹{calcResult.taxableTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>

              {settings.registrationStatus === 'registered' ? (
                <div className="space-y-1.5 bg-slate-50/70 p-3 rounded-xl border border-slate-200/60">
                  {calcResult.supplyType === 'intra_state' ? (
                    <>
                      <div className="flex justify-between text-slate-600">
                        <span>CGST Tax{pricingMode === 'inclusive' ? ' (Included)' : ''}:</span>
                        <span className="font-mono font-semibold tabular-nums">₹{calcResult.cgstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>SGST Tax{pricingMode === 'inclusive' ? ' (Included)' : ''}:</span>
                        <span className="font-mono font-semibold tabular-nums">₹{calcResult.sgstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between text-slate-600">
                      <span>IGST Tax{pricingMode === 'inclusive' ? ' (Included)' : ''}:</span>
                      <span className="font-mono font-semibold tabular-nums">₹{calcResult.igstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}

                  {pricingMode === 'inclusive' && (
                    <div className="text-[10px] text-slate-500 pt-1 text-center italic border-t border-slate-200/50">
                      * GST is embedded inside product MRP.
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-[11px] text-amber-900 bg-amber-50 p-2.5 rounded-xl border border-amber-200 font-medium">
                  Retail Cash Memo: Unregistered non-tax invoice.
                </div>
              )}

              {calcResult.roundOff !== 0 && (
                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>Round Off:</span>
                  <span className="font-mono font-medium tabular-nums">{calcResult.roundOff > 0 ? ('+ ₹' + calcResult.roundOff.toFixed(2)) : ('- ₹' + Math.abs(calcResult.roundOff).toFixed(2))}</span>
                </div>
              )}

              {/* Master Grand Total Highlight */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-brand-950 via-brand-900 to-[#2A000A] text-white shadow-lg border border-gold/30 space-y-2">
                <div className="flex justify-between items-baseline">
                  <span className="font-bold text-xs uppercase tracking-widest text-amber-200/90">
                    Grand Total
                  </span>
                  <span className="text-[10px] font-mono text-gold bg-gold/15 px-2 py-0.5 rounded border border-gold/30">
                    PAISE-ACCURATE
                  </span>
                </div>

                <div className="text-3xl sm:text-4xl font-extrabold font-serif tracking-tight text-white tabular-nums">
                  ₹{calcResult.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>

                <p className="text-[11px] text-amber-100/80 italic font-normal leading-relaxed pt-1 border-t border-white/10">
                  {numberToWordsIndian(calcResult.grandTotal)}
                </p>
              </div>
            </div>

            {/* Payment Recording Matrix */}
            <div className="mt-5 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2.5">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                  Payment Collection
                </h4>
                {/* Instant Quick-Fill Full Amount Button */}
                <button
                  type="button"
                  onClick={() => setPaymentAmount(calcResult.grandTotal)}
                  className="text-[10px] font-bold text-brand-900 bg-brand-50 hover:bg-brand-100 px-2 py-0.5 rounded-md border border-brand-200 transition cursor-pointer active-press"
                >
                  Pay Full (₹{Math.round(calcResult.grandTotal)})
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Amount Received (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={paymentAmount || ''}
                    onChange={e => setPaymentAmount(Number(e.target.value) || 0)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-extrabold text-base text-slate-900 focus:bg-white focus:ring-2 focus:ring-gold focus:outline-none tabular-nums"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Payment Method</label>
                    <select
                      value={paymentMethod}
                      onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-gold focus:outline-none"
                    >
                      {settings.supportedPaymentMethods.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Reference / UTR</label>
                    <input
                      type="text"
                      placeholder="e.g. UPI / Card No."
                      value={paymentRef}
                      onChange={e => setPaymentRef(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-gold focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">Sales Attendant / Staff</label>
                  <select
                    value={selectedStaffId}
                    onChange={e => setSelectedStaffId(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-gold focus:outline-none"
                  >
                    <option value="">Direct Counter (Store Cashier)</option>
                    {staffList.map(st => (
                      <option key={st.id} value={st.id}>
                        {st.name} {st.commission_rate > 0 ? `(${st.commission_rate}% comm)` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Balance Due Pill */}
                <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                  <span className="text-slate-600 font-medium">Balance Due:</span>
                  <span className={`font-mono font-extrabold text-sm tabular-nums ${
                    (calcResult.grandTotal - (paymentAmount || 0)) > 0 ? 'text-rose-700' : 'text-emerald-700'
                  }`}>
                    ₹{Math.max(0, calcResult.grandTotal - (paymentAmount || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 space-y-2.5">
              <button
                type="button"
                disabled={isSubmitting || calcResult.grandTotal <= 0}
                onClick={() => handleSaveInvoice(true)}
                className="w-full py-4 px-4 bg-gradient-to-r from-gold via-amber-400 to-yellow-300 hover:from-amber-400 hover:to-gold text-brand-950 rounded-xl font-black text-sm shadow-gold-glow hover:shadow-xl flex items-center justify-center space-x-2 transition-all duration-150 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed active-press border border-yellow-200/60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-brand-950" />
                    <span>Finalizing & Printing Bill...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 stroke-[2.5]" />
                    <span>Finalize & Print Invoice</span>
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSaveInvoice(false)}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200/80 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition cursor-pointer disabled:opacity-50 active-press border border-slate-200"
              >
                {isSubmitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-500" />
                ) : (
                  <Save className="w-3.5 h-3.5 text-slate-500" />
                )}
                <span>Save as Draft</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Barcode & Remote Mobile Scanner Modals */}
      <BarcodeScannerModal
        isOpen={isCameraScannerOpen}
        onClose={() => setIsCameraScannerOpen(false)}
        onScan={handleBarcodeResolved}
      />

      <RemoteScannerModal
        sessionId={sessionId}
        isOpen={isRemoteLinkOpen}
        onClose={() => setIsRemoteLinkOpen(false)}
        isConnected={isRemoteConnected}
      />
    </div>
  );
};
