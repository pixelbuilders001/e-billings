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
 * Searches the Supabase public.storefront_products table with full pagination and count support.
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
    .from('storefront_products')
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
      .from('storefront_products')
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
 * Inserts or updates an item in the Supabase storefront_products table
 */
export async function saveInventoryItem(item: Partial<InventoryItem>): Promise<{ data: any; error: any }> {
  return await supabase
    .from('storefront_products')
    .upsert(item)
    .select();
}
