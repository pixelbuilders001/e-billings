import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://vzqlsawxvvyvsstyzzff.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_6chwvgIpbfCpeEZrkS9VYg_IO__zSpY';

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export interface InventoryItem {
  id: string;
  saree_name: string;
  category: string;
  fabric: string;
  color: string;
  purchase_price: number;
  selling_price: number;
  stock: number;
  rack_no?: string | null;
  barcode?: string | null;
  status: string;
  created_at?: string;
  created_by?: string | null;
  updated_by?: string | null;
  category_id?: string | null;
  sku?: string | null;
  description?: string | null;
  mrp?: number | null;
  discount_amount?: number | null;
  discount_percentage?: number | null;
  occasion?: string | null;
  hsn_code?: string | null;
  design_code?: string | null;
  gst_rate: number;
  price_includes_gst: boolean;
  has_blouse?: boolean | null;
  product_tag?: string | null;
}

export interface PaginatedResult<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Searches the Supabase public.inventory table with full pagination and count support.
 * Searches across: id, saree_name, product_tag, barcode, sku, category, fabric, color.
 */
export async function getPaginatedInventory(
  searchTerm: string = '',
  page: number = 1,
  pageSize: number = 25
): Promise<PaginatedResult<InventoryItem>> {
  const cleanTerm = searchTerm.trim();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('inventory')
    .select('*', { count: 'exact' });

  if (cleanTerm) {
    const filter = `id.ilike.%${cleanTerm}%,saree_name.ilike.%${cleanTerm}%,sku.ilike.%${cleanTerm}%,category.ilike.%${cleanTerm}%,color.ilike.%${cleanTerm}%,fabric.ilike.%${cleanTerm}%,design_code.ilike.%${cleanTerm}%,occasion.ilike.%${cleanTerm}%`;
    query = query.or(filter);
  }

  // Order by created_at descending or saree_name ascending
  const { data, count, error } = await query
    .order('saree_name', { ascending: true })
    .range(from, to);

  if (error) {
    console.warn('Supabase getPaginatedInventory error:', error.message);
    return {
      data: [],
      count: 0,
      page,
      pageSize,
      totalPages: 0
    };
  }

  const totalCount = count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    data: (data as InventoryItem[]) || [],
    count: totalCount,
    page,
    pageSize,
    totalPages
  };
}

/**
 * Quick search for billing counter dropdown with configurable limit (default 25)
 */
export async function searchInventory(searchTerm: string, limit: number = 25): Promise<InventoryItem[]> {
  const result = await getPaginatedInventory(searchTerm, 1, limit);
  return result.data;
}

/**
 * Fetches all inventory records using automatic paging in batches of 1,000
 * until the complete dataset is retrieved.
 */
export async function fetchAllInventory(onProgress?: (loaded: number, total: number) => void): Promise<InventoryItem[]> {
  const allItems: InventoryItem[] = [];
  const batchSize = 1000;
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const to = from + batchSize - 1;
    const { data, count, error } = await supabase
      .from('inventory')
      .select('*', { count: 'exact' })
      .order('id', { ascending: true })
      .range(from, to);

    if (error) {
      console.warn('Error fetching all inventory:', error.message);
      break;
    }

    if (data && data.length > 0) {
      allItems.push(...(data as InventoryItem[]));
      if (onProgress && count) {
        onProgress(allItems.length, count);
      }
    }

    if (!data || data.length < batchSize || (count && allItems.length >= count)) {
      hasMore = false;
    } else {
      from += batchSize;
    }
  }

  return allItems;
}

/**
 * Inserts or updates an item in the Supabase inventory table
 */
export async function saveInventoryItem(item: Partial<InventoryItem>): Promise<{ data: any; error: any }> {
  return await supabase
    .from('inventory')
    .upsert(item)
    .select();
}

// ================= CUSTOMERS SUPABASE OPERATIONS =================

export interface SupabaseCustomer {
  id: string;
  name: string;
  mobile: string;
  address?: string | null;
  city?: string | null;
  created_at?: string;
  created_by?: string | null;
  updated_by?: string | null;
  loyalty_member_code?: string | null;
  loyalty_pin_hash?: string | null;
  loyalty_points_balance?: number | null;
  loyalty_tier?: string | null;
  failed_pin_attempts?: number | null;
  pin_locked_until?: string | null;
}

export async function fetchSupabaseCustomers(): Promise<SupabaseCustomer[]> {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.warn('Supabase fetchCustomers error:', error.message);
      return [];
    }
    return (data as SupabaseCustomer[]) || [];
  } catch (err) {
    console.warn('Failed to fetch customers from Supabase:', err);
    return [];
  }
}

export async function findSupabaseCustomerByPhone(phone: string): Promise<SupabaseCustomer | null> {
  const cleanPhone = phone.trim().replace(/\D/g, '');
  if (!cleanPhone || cleanPhone.length < 5) return null;

  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .or(`mobile.eq.${cleanPhone},mobile.ilike.%${cleanPhone}%`)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn('Supabase findCustomerByPhone error:', error.message);
      return null;
    }
    return data as SupabaseCustomer | null;
  } catch (err) {
    console.warn('Failed to lookup customer by phone in Supabase:', err);
    return null;
  }
}

export async function saveSupabaseCustomer(customer: Partial<SupabaseCustomer>): Promise<{ data: SupabaseCustomer | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('customers')
      .upsert(customer)
      .select()
      .single();

    return { data: data as SupabaseCustomer, error };
  } catch (err) {
    return { data: null, error: err };
  }
}

export async function deleteSupabaseCustomer(id: string): Promise<{ error: any }> {
  try {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id);

    return { error };
  } catch (err) {
    return { error: err };
  }
}

// ================= ADDONS SUPABASE OPERATIONS =================

export interface SupabaseAddon {
  id: string;
  name: string;
  category: string;
  purchase_price: number;
  selling_price: number;
  stock: number;
  status: 'active' | 'inactive';
  created_at?: string;
  updated_at?: string;
}

export async function fetchSupabaseAddons(): Promise<SupabaseAddon[]> {
  try {
    const { data, error } = await supabase
      .from('addons')
      .select('*')
      .eq('status', 'active')
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.warn('Supabase fetchAddons error:', error.message);
      return [];
    }
    return (data as SupabaseAddon[]) || [];
  } catch (err) {
    console.warn('Failed to fetch addons from Supabase:', err);
    return [];
  }
}

// ================= SALES & SALE ITEMS SUPABASE OPERATIONS =================

export interface SupabaseSaleItem {
  id?: string;
  sale_id?: string;
  saree_id: string;
  quantity: number;
  selling_price: number;
  inventory?: {
    saree_name?: string;
    sku?: string;
    hsn_code?: string;
    category?: string;
    color?: string;
    fabric?: string;
    mrp?: number | null;
    selling_price?: number | null;
    discount_amount?: number | null;
    discount_percentage?: number | null;
  } | null;
}

export interface SupabaseSale {
  id: string;
  customer_id?: string | null;
  total_amount: number;
  profit: number;
  created_at: string;
  created_by?: string | null;
  updated_by?: string | null;
  salesperson_id?: string | null;
  commission_earned?: number | null;
  invoice_number?: string | null;
  payment_mode?: string | null;
  discount_amount?: number | null;
  discount_percentage?: number | null;
  is_gst_applied: boolean;
  gst_rate: number;
  taxable_amount: number;
  cgst_rate: number;
  cgst_amount: number;
  sgst_rate: number;
  sgst_amount: number;
  igst_rate: number;
  igst_amount: number;
  total_gst: number;
  loyalty_points_redeemed?: number | null;
  loyalty_points_earned?: number | null;
  amount_paid?: number | null;
  due_amount?: number | null;
  payment_status?: string | null;
  due_date?: string | null;
  customers?: SupabaseCustomer | null;
  sale_items?: SupabaseSaleItem[];
}

export async function fetchSupabaseSales(): Promise<SupabaseSale[]> {
  try {
    const { data, error } = await supabase
      .from('sales')
      .select(`
        *,
        customers (*),
        sale_items (
          id,
          sale_id,
          saree_id,
          quantity,
          selling_price,
          inventory (
            saree_name,
            sku,
            hsn_code,
            category,
            color,
            fabric,
            mrp,
            selling_price,
            discount_amount,
            discount_percentage
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase fetchSales error:', error.message);
      return [];
    }
    return (data as SupabaseSale[]) || [];
  } catch (err) {
    console.warn('Failed to fetch sales from Supabase:', err);
    return [];
  }
}

export interface SupabaseStaff {
  id: string;
  name: string;
  phone?: string;
  commission_rate: number;
  is_active: boolean;
}

export async function fetchSupabaseStaff(): Promise<SupabaseStaff[]> {
  try {
    const { data, error } = await supabase
      .from('staff')
      .select('id, name, phone, commission_rate, is_active')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      console.warn('Supabase fetchSupabaseStaff error:', error.message);
      return [];
    }
    return (data as SupabaseStaff[]) || [];
  } catch (err) {
    console.warn('Failed to fetch staff from Supabase:', err);
    return [];
  }
}

/**
 * Resolves an inventory item ID from public.inventory.
 * NEVER inserts non-sarees or add-ons into public.inventory.
 */
export async function resolveInventorySareeId(item: {
  id?: string;
  name: string;
}): Promise<string | null> {
  const cleanId = (item.id || '').trim();

  // If ID starts with 'addon-', it is strictly an add-on, not a saree!
  if (cleanId.startsWith('addon-')) {
    return null;
  }

  // If ID is provided, verify whether it exists in public.inventory
  if (cleanId) {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('id')
        .eq('id', cleanId)
        .maybeSingle();
      if (!error && data?.id) {
        return data.id;
      }
    } catch {
      // Continue
    }
  }

  // Check if an existing saree in public.inventory matches this exact name
  const cleanName = (item.name || '').trim();
  if (cleanName) {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('id')
        .ilike('saree_name', cleanName)
        .limit(1)
        .maybeSingle();
      if (!error && data?.id) {
        return data.id;
      }
    } catch {
      // Continue
    }
  }

  return null;
}

/**
 * Removes any mistakenly auto-created addon or non-saree entries from public.inventory.
 */
export async function cleanupNonSareeInventoryItems(): Promise<{ count: number; error: any }> {
  try {
    const { data: mistakenlyAdded, error: findErr } = await supabase
      .from('inventory')
      .select('id, saree_name')
      .or('saree_name.ilike.%Blouse Piece%,saree_name.ilike.%Petticoat%,saree_name.ilike.%Fall & Pico%,category.eq.General,category.eq.Blouse,category.eq.Petticoat');

    if (findErr) {
      return { count: 0, error: findErr };
    }

    if (mistakenlyAdded && mistakenlyAdded.length > 0) {
      const idsToDelete = mistakenlyAdded.map(item => item.id);
      const { error: delErr } = await supabase
        .from('inventory')
        .delete()
        .in('id', idsToDelete);

      if (delErr) {
        console.warn('Error deleting non-saree items from inventory:', delErr);
        return { count: 0, error: delErr };
      }
      return { count: mistakenlyAdded.length, error: null };
    }

    return { count: 0, error: null };
  } catch (err) {
    console.warn('Exception during inventory cleanup:', err);
    return { count: 0, error: err };
  }
}

/**
 * Records an add-on sale in public.addon_sales and decrements stock in public.addons.
 * Keeps public.inventory completely untouched.
 */
export async function recordSupabaseAddonSale(addonSale: {
  addon_id: string;
  addon_name: string;
  category?: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  customer_name?: string;
  payment_method?: string;
}): Promise<void> {
  try {
    const cleanId = addonSale.addon_id.replace(/^addon-/, '');

    // 1. Decrement stock in public.addons
    const { data: addonRow } = await supabase
      .from('addons')
      .select('stock')
      .eq('id', cleanId)
      .maybeSingle();

    if (addonRow && typeof addonRow.stock === 'number') {
      const newStock = Math.max(0, addonRow.stock - addonSale.quantity);
      await supabase
        .from('addons')
        .update({ stock: newStock })
        .eq('id', cleanId);
    }

    // 2. Record in public.addon_sales ledger
    await supabase
      .from('addon_sales')
      .insert([{
        addon_id: cleanId,
        addon_name: addonSale.addon_name,
        category: addonSale.category || 'Other',
        quantity: addonSale.quantity,
        unit_price: addonSale.unit_price,
        total_amount: addonSale.total_amount,
        customer_name: addonSale.customer_name || 'Walk-in Customer',
        payment_method: addonSale.payment_method || 'Cash'
      }]);
  } catch (err) {
    console.warn('Error recording addon sale in Supabase:', err);
  }
}

export interface CreateSaleInput {
  sale: Omit<SupabaseSale, 'id' | 'created_at' | 'customers' | 'sale_items'>;
  items: {
    saree_id: string;
    quantity: number;
    selling_price: number;
  }[];
}

export async function createSupabaseSale(input: CreateSaleInput): Promise<{ data: SupabaseSale | null; error: any }> {
  try {
    // 1. Insert into sales table
    const { data: saleData, error: saleError } = await supabase
      .from('sales')
      .insert([input.sale])
      .select()
      .single();

    if (saleError || !saleData) {
      return { data: null, error: saleError };
    }

    // 2. Insert items if any and decrement stock
    if (input.items && input.items.length > 0) {
      const itemsToInsert = input.items.map(item => ({
        sale_id: saleData.id,
        saree_id: item.saree_id,
        quantity: item.quantity,
        selling_price: item.selling_price
      }));

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(itemsToInsert);

      if (itemsError) {
        console.warn('Warning: sale created but error inserting sale_items:', itemsError.message);
      } else {
        // Auto-decrement inventory stock to stay consistent with saree-react-admin
        for (const item of input.items) {
          try {
            const { data: invRow } = await supabase
              .from('inventory')
              .select('stock')
              .eq('id', item.saree_id)
              .maybeSingle();

            if (invRow && typeof invRow.stock === 'number') {
              const newStock = Math.max(0, invRow.stock - item.quantity);
              await supabase
                .from('inventory')
                .update({ stock: newStock, updated_by: input.sale.created_by || 'admin' })
                .eq('id', item.saree_id);
            }
          } catch (stkErr) {
            console.warn('Stock update notice:', stkErr);
          }
        }
      }
    }

    return { data: saleData as SupabaseSale, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

/**
 * Converts a Supabase sale record (with joined customer and sale_items)
 * into the application's Invoice domain model for viewing, printing, and PDF generation.
 */
export function convertSupabaseSaleToInvoice(
  sale: SupabaseSale,
  settings: any
): any {
  const customerName = sale.customers?.name || 'Walk-in Retail Customer';
  const customerMobile = sale.customers?.mobile || '9999999999';
  const customerAddress = sale.customers?.address || 'Varanasi';
  const customerCity = sale.customers?.city || 'Varanasi';

  const customerSnapshot = {
    id: sale.customer_id || ('cust-' + sale.id),
    name: customerName,
    phone: customerMobile,
    billingAddress: customerAddress,
    city: customerCity,
    state: 'Uttar Pradesh',
    stateCode: '09',
    loyaltyMemberCode: sale.customers?.loyalty_member_code || null,
    loyaltyPointsBalance: sale.customers?.loyalty_points_balance || 0,
    loyaltyTier: sale.customers?.loyalty_tier || 'Silver',
    createdAt: sale.customers?.created_at || sale.created_at
  };

  const invoiceDate = sale.created_at ? sale.created_at.split('T')[0] : new Date().toISOString().split('T')[0];

  const totalAmount = Number(sale.total_amount) || 0;
  let discountAmount = Number(sale.discount_amount) || 0;
  let discountPercentage = Number(sale.discount_percentage) || 0;
  const isGstApplied = Boolean(sale.is_gst_applied);
  const gstRate = Number(sale.gst_rate) || 0;

  const rawItems = sale.sale_items || [];

  // When discount was missing in earlier sales data, apply standard 20% discount on rate or MRP
  if (discountAmount === 0 && discountPercentage === 0) {
    let computedGross = 0;
    if (rawItems.length > 0) {
      rawItems.forEach(item => {
        const qty = item.quantity || 1;
        const itemMrp = Number(item.inventory?.mrp || 0);
        const itemSellingPrice = Number(item.selling_price) || 0;
        const baseRate = itemMrp > 0 ? itemMrp : itemSellingPrice;
        computedGross += qty * baseRate;
      });
    }

    if (computedGross > 0) {
      discountPercentage = 20;
      discountAmount = parseFloat((computedGross * 0.20).toFixed(2));
    } else if (totalAmount > 0) {
      // 20% discount on total rate: gross / 0.80 = base, discount = 20%
      discountPercentage = 20;
      const grossBase = parseFloat((totalAmount / 0.80).toFixed(2));
      discountAmount = parseFloat((grossBase * 0.20).toFixed(2));
    }
  }

  let cgstAmount = Number(sale.cgst_amount) || 0;
  let sgstAmount = Number(sale.sgst_amount) || 0;
  let igstAmount = Number(sale.igst_amount) || 0;
  let totalGst = Number(sale.total_gst) || 0;

  // If totalGst is recorded but split amounts are 0 (e.g. intra-state default)
  if (isGstApplied && totalGst > 0 && cgstAmount === 0 && sgstAmount === 0 && igstAmount === 0) {
    cgstAmount = parseFloat((totalGst / 2).toFixed(2));
    sgstAmount = parseFloat((totalGst / 2).toFixed(2));
  } else if (isGstApplied && (cgstAmount > 0 || sgstAmount > 0 || igstAmount > 0) && totalGst === 0) {
    totalGst = cgstAmount + sgstAmount + igstAmount;
  }

  // Calculate taxable amount
  let taxableAmount = Number(sale.taxable_amount) || 0;
  if (taxableAmount === 0) {
    if (isGstApplied && totalGst > 0) {
      taxableAmount = parseFloat((totalAmount - totalGst).toFixed(2));
    } else if (isGstApplied && gstRate > 0) {
      taxableAmount = parseFloat((totalAmount / (1 + gstRate / 100)).toFixed(2));
      totalGst = parseFloat((totalAmount - taxableAmount).toFixed(2));
      cgstAmount = parseFloat((totalGst / 2).toFixed(2));
      sgstAmount = parseFloat((totalGst / 2).toFixed(2));
    } else {
      taxableAmount = totalAmount;
    }
  }

  const isInterState = igstAmount > 0;
  const effectiveSupplyType = isInterState ? 'inter_state' : 'intra_state';

  // Calculate gross subtotal before discount
  const grossSubtotal = totalAmount + discountAmount;

  const items = rawItems.length > 0 ? rawItems.map((item, idx) => {
    const sareeName = item.inventory?.saree_name || item.saree_id || `Saree Item ${idx + 1}`;
    const qty = item.quantity || 1;
    const itemMrp = Number(item.inventory?.mrp || 0);
    const itemSellingPrice = Number(item.selling_price) || 0;
    const baseRate = itemMrp > 0 ? itemMrp : itemSellingPrice;
    const grossLineValue = qty * baseRate;

    // Allocate line discount proportionally if bill discount exists
    const lineDiscount = grossSubtotal > 0 && discountAmount > 0
      ? parseFloat(((grossLineValue / grossSubtotal) * discountAmount).toFixed(2))
      : 0;

    const netLine = Math.max(0, grossLineValue - lineDiscount);

    let lineTaxable = netLine;
    let lineCgst = 0;
    let lineSgst = 0;
    let lineIgst = 0;

    if (isGstApplied && gstRate > 0) {
      lineTaxable = parseFloat((netLine / (1 + gstRate / 100)).toFixed(2));
      const lineTax = parseFloat((netLine - lineTaxable).toFixed(2));
      if (isInterState) {
        lineIgst = lineTax;
      } else {
        lineCgst = parseFloat((lineTax / 2).toFixed(2));
        lineSgst = parseFloat((lineTax / 2).toFixed(2));
      }
    }

    return {
      id: item.id || `item-${idx}`,
      productId: item.saree_id,
      description: sareeName,
      hsnCode: item.inventory?.hsn_code || '5007',
      qty,
      unit: 'Nos',
      unitPrice: baseRate,
      discountType: 'percentage' as const,
      discountValue: discountPercentage || 20,
      grossLineValue,
      itemDiscountAmount: lineDiscount,
      allocatedBillDiscountAmount: 0,
      netDiscountAmount: lineDiscount,
      taxableValue: lineTaxable,
      gstRate: gstRate,
      cgstAmount: lineCgst,
      sgstAmount: lineSgst,
      igstAmount: lineIgst,
      lineTotal: netLine
    };
  }) : [{
    id: `item-${sale.id}`,
    productId: sale.id,
    description: 'Banarasi Traditional Saree',
    hsnCode: '5007',
    qty: 1,
    unit: 'Nos',
    unitPrice: grossSubtotal,
    discountType: 'percentage' as const,
    discountValue: discountPercentage || 20,
    grossLineValue: grossSubtotal,
    itemDiscountAmount: discountAmount,
    allocatedBillDiscountAmount: 0,
    netDiscountAmount: discountAmount,
    taxableValue: taxableAmount,
    gstRate: gstRate,
    cgstAmount: cgstAmount,
    sgstAmount: sgstAmount,
    igstAmount: igstAmount,
    lineTotal: totalAmount
  }];

  const paidTotal = sale.amount_paid !== null && sale.amount_paid !== undefined
    ? Number(sale.amount_paid)
    : (sale.payment_status === 'paid' ? totalAmount : 0);

  const balanceDue = sale.due_amount !== null && sale.due_amount !== undefined
    ? Number(sale.due_amount)
    : Math.max(0, totalAmount - paidTotal);

  let paymentStatus: 'paid' | 'partially_paid' | 'unpaid' = 'paid';
  if (sale.payment_status === 'unpaid' || sale.payment_status === 'due') {
    paymentStatus = 'unpaid';
  } else if (sale.payment_status === 'partially_paid' || balanceDue > 0) {
    paymentStatus = 'partially_paid';
  }

  const rateBreakdown = isGstApplied ? [{
    rate: gstRate,
    taxableAmount,
    cgstAmount,
    sgstAmount,
    igstAmount,
    totalTax: totalGst
  }] : [];

  return {
    id: sale.id,
    invoiceNumber: sale.invoice_number || `SBS-${sale.id.slice(0, 8).toUpperCase()}`,
    invoiceDate,
    status: 'finalized',
    sellerSnapshot: { ...settings },
    customerId: sale.customer_id,
    customerSnapshot,
    placeOfSupplyState: isInterState ? 'Other State' : 'Uttar Pradesh',
    placeOfSupplyCode: isInterState ? '99' : '09',
    supplyType: effectiveSupplyType,
    isRegisteredTaxInvoice: isGstApplied,
    pricingMode: 'inclusive',
    items,
    billDiscountType: discountPercentage > 0 ? 'percentage' : 'fixed',
    billDiscountValue: discountPercentage > 0 ? discountPercentage : discountAmount,
    subtotal: grossSubtotal,
    discountTotal: discountAmount,
    taxableTotal: taxableAmount,
    cgstTotal: cgstAmount,
    sgstTotal: sgstAmount,
    igstTotal: igstAmount,
    roundOff: 0,
    grandTotal: totalAmount,
    rateBreakdown,
    amountInWords: '',
    payments: paidTotal > 0 ? [{
      id: `pay-${sale.id}`,
      date: invoiceDate,
      amount: paidTotal,
      method: (sale.payment_mode === 'cash' ? 'Cash' : sale.payment_mode === 'upi' ? 'UPI' : 'Card') as any,
    }] : [],
    paidTotal,
    balanceDue,
    paymentStatus,
    createdAt: sale.created_at,
    updatedAt: sale.created_at
  };
}

// ================= STORE SETTINGS SUPABASE OPERATIONS =================

export interface SupabaseStoreSettingsRow {
  id: string;
  trade_name: string;
  legal_name: string;
  address: string;
  city: string;
  state: string;
  state_code: string;
  phone: string;
  email: string;
  gstin: string;
  registration_status: 'registered' | 'unregistered';
  logo_url?: string | null;
  invoice_prefix: string;
  next_sequence: number;
  pricing_mode: 'exclusive' | 'inclusive';
  default_gst_rate: number;
  supported_gst_rates: number[];
  round_off_rule: 'nearest_rupee' | 'none';
  supported_payment_methods: string[];
  footer_text: string;
  terms_and_conditions: string;
  created_at?: string;
  updated_at?: string;
}

export function mapRowToStoreSettings(row: SupabaseStoreSettingsRow): any {
  return {
    id: row.id || 'store-default',
    tradeName: row.trade_name || 'billtoprint',
    legalName: row.legal_name || 'BillToPrint Retail Private Limited',
    address: row.address || '',
    city: row.city || 'Varanasi',
    state: row.state || 'Uttar Pradesh',
    stateCode: row.state_code || '09',
    phone: row.phone || '',
    email: row.email || '',
    gstin: row.gstin || '',
    registrationStatus: row.registration_status || 'registered',
    logoUrl: row.logo_url || undefined,
    invoicePrefix: row.invoice_prefix || 'B2P/2026-27/',
    nextSequence: Number(row.next_sequence) || 1001,
    pricingMode: row.pricing_mode || 'inclusive',
    defaultGstRate: Number(row.default_gst_rate) || 5,
    supportedGstRates: Array.isArray(row.supported_gst_rates) ? row.supported_gst_rates : [0, 5, 12, 18, 28],
    roundOffRule: row.round_off_rule || 'nearest_rupee',
    supportedPaymentMethods: (Array.isArray(row.supported_payment_methods) ? row.supported_payment_methods : ['Cash', 'UPI', 'Card', 'Bank Transfer', 'Other']) as any,
    footerText: row.footer_text || '',
    termsAndConditions: row.terms_and_conditions || ''
  };
}

export function mapStoreSettingsToRow(settings: any): Partial<SupabaseStoreSettingsRow> {
  return {
    id: settings.id || 'store-default',
    trade_name: settings.tradeName,
    legal_name: settings.legalName,
    address: settings.address,
    city: settings.city,
    state: settings.state,
    state_code: settings.stateCode,
    phone: settings.phone,
    email: settings.email,
    gstin: settings.gstin,
    registration_status: settings.registrationStatus,
    logo_url: settings.logoUrl || null,
    invoice_prefix: settings.invoicePrefix,
    next_sequence: settings.nextSequence,
    pricing_mode: settings.pricingMode,
    default_gst_rate: settings.defaultGstRate,
    supported_gst_rates: settings.supportedGstRates,
    round_off_rule: settings.roundOffRule,
    supported_payment_methods: settings.supportedPaymentMethods,
    footer_text: settings.footerText,
    terms_and_conditions: settings.termsAndConditions
  };
}

export async function fetchStoreSettingsFromSupabase(): Promise<any | null> {
  try {
    const { data, error } = await supabase
      .from('store_settings')
      .select('*')
      .eq('id', 'store-default')
      .maybeSingle();

    if (error) {
      console.warn('Supabase fetchStoreSettings warning/error:', error.message);
      return null;
    }

    if (!data) return null;
    return mapRowToStoreSettings(data as SupabaseStoreSettingsRow);
  } catch (err) {
    console.warn('Failed to query store_settings from Supabase:', err);
    return null;
  }
}

export async function saveStoreSettingsToSupabase(settings: any): Promise<{ error: any }> {
  try {
    const row = mapStoreSettingsToRow(settings);
    const { error } = await supabase
      .from('store_settings')
      .upsert(row, { onConflict: 'id' });

    if (error) {
      console.error('Supabase saveStoreSettings error:', error);
      return { error };
    }
    return { error: null };
  } catch (err) {
    console.error('Exception in saveStoreSettingsToSupabase:', err);
    return { error: err };
  }
}

export async function allocateNextInvoiceNumberFromSupabase(): Promise<string | null> {
  try {
    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');

    for (let attempt = 0; attempt < 5; attempt++) {
      const randPart = Math.floor(1000 + Math.random() * 9000);
      const candidate = `INV-${datePart}-${randPart}`;

      // Check if invoice number is already taken in Supabase sales
      const { data, error } = await supabase
        .from('sales')
        .select('id')
        .eq('invoice_number', candidate)
        .maybeSingle();

      if (!error && !data) {
        return candidate;
      }
    }

    const randPart = Math.floor(1000 + Math.random() * 9000);
    return `INV-${datePart}-${randPart}`;
  } catch (err) {
    console.warn('Error allocating sequence from Supabase:', err);
    return null;
  }
}


