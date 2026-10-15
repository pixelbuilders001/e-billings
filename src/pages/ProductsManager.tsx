import React, { useState, useEffect } from 'react';
import { Product, StoreSettings } from '../types';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  X, 
  Download, 
  Cloud, 
  Database, 
  RefreshCw,
  Tag,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Package
} from 'lucide-react';
import { saveProduct, deleteProduct } from '../db';
import { 
  getPaginatedInventory, 
  saveInventoryItem, 
  fetchAllInventory,
  InventoryItem 
} from '../db/supabaseClient';

interface ProductsManagerProps {
  products: Product[];
  settings: StoreSettings;
  onRefresh: () => void;
}

export const ProductsManager: React.FC<ProductsManagerProps> = ({
  products,
  settings,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<'supabase' | 'local'>('supabase');
  const [search, setSearch] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingSupabaseItem, setEditingSupabaseItem] = useState<InventoryItem | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Pagination state for Supabase
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [supabaseInventory, setSupabaseInventory] = useState<InventoryItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loadingSupabase, setLoadingSupabase] = useState(false);
  const [isExportingAll, setIsExportingAll] = useState(false);
  const [supabaseSyncMessage, setSupabaseSyncMessage] = useState<string | null>(null);

  // Form states matching Supabase schema
  const [formId, setFormId] = useState('');
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Katan Silk');
  const [formFabric, setFormFabric] = useState('Pure Mulberry Silk');
  const [formColor, setFormColor] = useState('');
  const [formPurchasePrice, setFormPurchasePrice] = useState<number>(0);
  const [formSellingPrice, setFormSellingPrice] = useState<number>(0);
  const [formMrp, setFormMrp] = useState<number>(0);
  const [formDiscountPercentage, setFormDiscountPercentage] = useState<number>(0);
  const [formStock, setFormStock] = useState<number>(5);
  const [formBarcode, setFormBarcode] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formHsn, setFormHsn] = useState('5007');
  const [formGstRate, setFormGstRate] = useState<number>(settings.defaultGstRate || 5);
  const [formProductTag, setFormProductTag] = useState('');
  const [formDescription, setFormDescription] = useState('');

  // Load paginated data from Supabase
  const loadSupabasePage = async (page = 1, size = pageSize, query = search) => {
    setLoadingSupabase(true);
    try {
      const res = await getPaginatedInventory(query, page, size);
      setSupabaseInventory(res.data);
      setTotalCount(res.count);
      setTotalPages(res.totalPages);
      setCurrentPage(res.page);
    } catch (err: any) {
      console.warn('Error loading Supabase items:', err.message);
    } finally {
      setLoadingSupabase(false);
    }
  };

  // Reset page when search or pageSize changes
  useEffect(() => {
    setCurrentPage(1);
    loadSupabasePage(1, pageSize, search);
  }, [search, pageSize]);

  // Handle page navigation
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
    loadSupabasePage(newPage, pageSize, search);
  };

  // Filter local products
  const filteredLocalProducts = products.filter(p => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.id.toLowerCase().includes(q) ||
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.barcode.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.hsnCode.includes(q) ||
      (p.productTag && p.productTag.toLowerCase().includes(q))
    );
  });

  const handleStartCreate = () => {
    setIsCreating(true);
    setEditingProduct(null);
    setEditingSupabaseItem(null);
    const newId = `SBS-INV-${Date.now().toString().slice(-6)}`;
    setFormId(newId);
    setFormName('');
    setFormCategory('Katan Silk');
    setFormFabric('Pure Mulberry Silk');
    setFormColor('');
    setFormPurchasePrice(0);
    setFormSellingPrice(0);
    setFormMrp(0);
    setFormDiscountPercentage(0);
    setFormStock(5);
    setFormBarcode(newId);
    setFormSku(newId);
    setFormHsn('5007');
    setFormGstRate(settings.defaultGstRate || 5);
    setFormProductTag('Bridal / Handloom');
    setFormDescription('');
  };

  const handleStartEditSupabase = (inv: InventoryItem) => {
    setEditingSupabaseItem(inv);
    setEditingProduct(null);
    setIsCreating(false);
    setFormId(inv.id);
    setFormName(inv.saree_name);
    setFormCategory(inv.category);
    setFormFabric(inv.fabric);
    setFormColor(inv.color);
    setFormPurchasePrice(Number(inv.purchase_price) || 0);
    setFormSellingPrice(Number(inv.selling_price) || 0);
    setFormMrp(Number(inv.mrp) || Number(inv.selling_price) || 0);
    setFormDiscountPercentage(Number(inv.discount_percentage) || 0);
    setFormStock(Number(inv.stock) || 0);
    setFormBarcode(inv.barcode || '');
    setFormSku(inv.sku || '');
    setFormHsn(inv.hsn_code || '5007');
    setFormGstRate(Number(inv.gst_rate) || 5);
    setFormProductTag(inv.product_tag || '');
    setFormDescription(inv.description || '');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || formSellingPrice <= 0) {
      alert('Please enter saree name and selling price.');
      return;
    }

    const payload: Partial<InventoryItem> = {
      id: formId.trim() || `SBS-${Date.now()}`,
      saree_name: formName.trim(),
      category: formCategory.trim(),
      fabric: formFabric.trim(),
      color: formColor.trim(),
      purchase_price: formPurchasePrice,
      selling_price: formSellingPrice,
      mrp: formMrp || formSellingPrice,
      discount_percentage: formDiscountPercentage || 0,
      discount_amount: formMrp > formSellingPrice ? (formMrp - formSellingPrice) : 0,
      stock: formStock,
      barcode: formBarcode.trim() || formId.trim(),
      status: 'active',
      sku: formSku.trim() || formId.trim(),
      description: formDescription.trim() || null,
      hsn_code: formHsn.trim() || '5007',
      gst_rate: formGstRate,
      price_includes_gst: true,
      product_tag: formProductTag.trim() || null
    };

    // 1. Save to Supabase inventory table
    const { error } = await saveInventoryItem(payload);
    if (error) {
      alert(`Supabase save error: ${error.message}`);
    } else {
      setSupabaseSyncMessage(`Successfully saved ${formName} to Supabase inventory.`);
      setTimeout(() => setSupabaseSyncMessage(null), 3000);
    }

    // 2. Also save to local IDB as Product so offline billing works seamlessly
    const localProduct: Product = {
      id: payload.id!,
      name: payload.saree_name!,
      sku: payload.sku || payload.id!,
      barcode: payload.barcode || payload.id!,
      category: payload.category || 'Katan Silk',
      fabric: payload.fabric || '',
      colour: payload.color || '',
      hsnCode: payload.hsn_code || '5007',
      unit: 'Nos',
      sellingPrice: payload.selling_price!,
      mrp: payload.mrp || payload.selling_price!,
      discountPercentage: payload.discount_percentage || 0,
      gstRate: payload.gst_rate || 5,
      active: true,
      stockQty: payload.stock || 0,
      productTag: payload.product_tag || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await saveProduct(localProduct);

    setIsCreating(false);
    setEditingSupabaseItem(null);
    setEditingProduct(null);
    loadSupabasePage(currentPage, pageSize, search);
    onRefresh();
  };

  const handleDeleteLocal = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}" from local catalogue?`)) {
      await deleteProduct(id);
      onRefresh();
    }
  };

  // Export complete data as CSV (fetches full inventory)
  const handleExportFullCSV = async () => {
    setIsExportingAll(true);
    try {
      let listToExport: any[] = [];
      if (activeTab === 'supabase') {
        listToExport = await fetchAllInventory();
      } else {
        listToExport = products;
      }

      const headers = ['ID', 'Saree Name', 'Category', 'Fabric', 'Color', 'Barcode', 'Tag', 'HSN', 'MRP', 'Discount %', 'Selling Price', 'GST Rate', 'Stock'];
      
      const rows = listToExport.map((item: any) => [
        `"${item.id}"`,
        `"${(item.saree_name || item.name || '').replace(/"/g, '""')}"`,
        `"${item.category || ''}"`,
        `"${item.fabric || ''}"`,
        `"${item.color || item.colour || ''}"`,
        `"${item.barcode || ''}"`,
        `"${item.product_tag || item.productTag || ''}"`,
        `"${item.hsn_code || item.hsnCode || '5007'}"`,
        item.mrp || item.selling_price || item.sellingPrice || 0,
        item.discount_percentage || item.discountPercentage || 0,
        item.selling_price || item.sellingPrice || 0,
        item.gst_rate !== undefined ? item.gst_rate : item.gstRate,
        item.stock !== undefined ? item.stock : (item.stockQty || 0)
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `SBS_Complete_Inventory_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setIsExportingAll(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Luxury Catalogue Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white/80 backdrop-blur-xl p-5 rounded-2xl border border-gold/25 shadow-card">
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-950 to-brand-900 text-gold flex items-center justify-center border border-gold/40 shadow-xs">
            <Package className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight font-serif">
                Saree Inventory & Catalogue
              </h1>
              <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-2 py-0.5 rounded-full font-bold">
                {totalCount.toLocaleString()} SKUs Active
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Live cloud sync with Supabase public.inventory, weave classifications, and silk mark tags.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => loadSupabasePage(currentPage, pageSize, search)}
            title="Refresh inventory"
            className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs shadow-2xs transition cursor-pointer active-press"
          >
            <RefreshCw className={`w-4 h-4 ${loadingSupabase ? 'animate-spin text-brand-700' : 'text-slate-600'}`} />
          </button>
          
          <button
            onClick={handleExportFullCSV}
            disabled={isExportingAll}
            className="flex items-center space-x-1.5 px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold shadow-2xs transition disabled:opacity-50 cursor-pointer active-press"
          >
            {isExportingAll ? <Loader2 className="w-4 h-4 animate-spin text-brand-700" /> : <Download className="w-4 h-4 text-slate-600" />}
            <span>{isExportingAll ? 'Exporting...' : 'Export CSV'}</span>
          </button>

          <button
            onClick={handleStartCreate}
            className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-gold via-amber-400 to-yellow-300 hover:from-amber-400 hover:to-gold text-brand-950 rounded-xl text-xs font-black shadow-gold-glow hover:shadow-lg transition cursor-pointer active-press border border-yellow-200/50"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Saree SKU</span>
          </button>
        </div>
      </div>

      {supabaseSyncMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-950 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs animate-fade-in">
          <Cloud className="w-4 h-4 text-emerald-600" />
          <span>{supabaseSyncMessage}</span>
        </div>
      )}

      {/* Segmented Luxury Tabs */}
      <div className="flex border-b border-slate-200 space-x-6 text-xs font-bold">
        <button
          onClick={() => setActiveTab('supabase')}
          className={`pb-3 flex items-center space-x-2 transition cursor-pointer relative ${
            activeTab === 'supabase'
              ? 'text-brand-950 font-black'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Cloud className="w-4 h-4 text-emerald-600" />
          <span>Cloud Database ({totalCount.toLocaleString()} items)</span>
          {activeTab === 'supabase' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('local')}
          className={`pb-3 flex items-center space-x-2 transition cursor-pointer relative ${
            activeTab === 'local'
              ? 'text-brand-950 font-black'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Database className="w-4 h-4 text-brand-750" />
          <span>Local Cache ({products.length} items)</span>
          {activeTab === 'local' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold rounded-full" />
          )}
        </button>
      </div>

      {/* Product Edit / Create Modal or Form */}
      {(isCreating || editingSupabaseItem || editingProduct) && (
        <form onSubmit={handleSave} className="bg-white p-6 rounded-xl border border-gold/40 shadow-md space-y-4 text-xs">
          <div className="flex items-center justify-between border-b pb-3">
            <h2 className="text-sm font-bold text-brand-900 uppercase tracking-wider font-serif flex items-center gap-2">
              <Cloud className="w-4 h-4 text-emerald-600" />
              <span>{isCreating ? 'Add Saree to public.inventory' : `Edit Saree: ${formId}`}</span>
            </h2>
            <button
              type="button"
              onClick={() => { setIsCreating(false); setEditingSupabaseItem(null); setEditingProduct(null); }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Inventory ID (Primary Key) *</label>
              <input
                type="text"
                required
                value={formId}
                onChange={e => setFormId(e.target.value)}
                placeholder="e.g. SBS-KAT-101"
                className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs font-mono font-bold"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-gray-700 font-semibold mb-1">Saree Name *</label>
              <input
                type="text"
                required
                value={formName}
                onChange={e => setFormName(e.target.value)}
                placeholder="e.g. Pure Katan Silk Kadwa Saree"
                className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-brand-700"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-1">Product Tag (Searchable)</label>
              <input
                type="text"
                value={formProductTag}
                onChange={e => setFormProductTag(e.target.value)}
                placeholder="e.g. Bridal, Festive, Summer"
                className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Category / Weave</label>
              <input
                type="text"
                value={formCategory}
                onChange={e => setFormCategory(e.target.value)}
                placeholder="Katan Silk, Jangla, Tanchoi"
                className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-1">Fabric</label>
              <input
                type="text"
                value={formFabric}
                onChange={e => setFormFabric(e.target.value)}
                placeholder="Pure Mulberry Silk"
                className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-1">Color / Shade</label>
              <input
                type="text"
                value={formColor}
                onChange={e => setFormColor(e.target.value)}
                placeholder="Crimson Red, Antique Gold"
                className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-1">MRP (₹)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formMrp || ''}
                onChange={e => {
                  const mrpVal = Number(e.target.value) || 0;
                  setFormMrp(mrpVal);
                  if (mrpVal > 0 && formSellingPrice > 0 && mrpVal >= formSellingPrice) {
                    const disc = ((mrpVal - formSellingPrice) / mrpVal) * 100;
                    setFormDiscountPercentage(Number(disc.toFixed(2)));
                  }
                }}
                placeholder="e.g. 15000"
                className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs font-mono font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 pt-1">
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Discount (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formDiscountPercentage || ''}
                onChange={e => {
                  const disc = Number(e.target.value) || 0;
                  setFormDiscountPercentage(disc);
                  if (formMrp > 0 && disc > 0) {
                    const discountedPrice = formMrp * (1 - disc / 100);
                    setFormSellingPrice(Number(discountedPrice.toFixed(2)));
                  }
                }}
                placeholder="0"
                className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-1">Barcode</label>
              <input
                type="text"
                value={formBarcode}
                onChange={e => setFormBarcode(e.target.value)}
                className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-1">HSN Code *</label>
              <input
                type="text"
                required
                value={formHsn}
                onChange={e => setFormHsn(e.target.value)}
                placeholder="5007"
                className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-1">Selling Price (₹) *</label>
              <input
                type="number"
                min="1"
                step="0.01"
                required
                value={formSellingPrice || ''}
                onChange={e => setFormSellingPrice(Number(e.target.value) || 0)}
                className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs font-mono font-bold text-gray-900"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-1">GST Rate (%)</label>
              <select
                value={formGstRate}
                onChange={e => setFormGstRate(Number(e.target.value))}
                className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs font-mono"
              >
                {settings.supportedGstRates.map(r => (
                  <option key={r} value={r}>{r}%</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-1">Stock Qty</label>
              <input
                type="number"
                min="0"
                value={formStock || ''}
                onChange={e => setFormStock(Number(e.target.value) || 0)}
                className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-xs font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t">
            <button
              type="button"
              onClick={() => { setIsCreating(false); setEditingSupabaseItem(null); setEditingProduct(null); }}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-brand-800 text-white font-bold rounded-lg hover:bg-brand-900 flex items-center space-x-1.5"
            >
              <Cloud className="w-4 h-4 text-emerald-400" />
              <span>Save Saree</span>
            </button>
          </div>
        </form>
      )}

      {/* Search Input & Pagination Controls Bar */}
      <div className="bg-white p-4 rounded-xl border border-ivory-border shadow-sm flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by ID, Saree Name, Product Tag, Color, or Barcode..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-10 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-700"
          />
          {loadingSupabase && (
            <Loader2 className="w-4 h-4 absolute right-3 top-2.5 text-brand-600 animate-spin" />
          )}
        </div>

        {activeTab === 'supabase' && (
          <div className="flex items-center space-x-3 text-xs text-gray-600">
            <div className="flex items-center space-x-1.5">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={e => setPageSize(Number(e.target.value))}
                className="p-1.5 bg-gray-50 border border-gray-300 rounded text-xs"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <span className="text-gray-400">|</span>

            <span>
              Page <strong>{totalPages === 0 ? 0 : currentPage}</strong> of <strong>{totalPages}</strong> ({totalCount} total items)
            </span>

            <div className="flex items-center space-x-1">
              <button
                onClick={() => handlePageChange(1)}
                disabled={currentPage <= 1 || loadingSupabase}
                title="First Page"
                className="p-1.5 rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronsLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1 || loadingSupabase}
                title="Previous Page"
                className="p-1.5 rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages || loadingSupabase}
                title="Next Page"
                className="p-1.5 rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage >= totalPages || loadingSupabase}
                title="Last Page"
                className="p-1.5 rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronsRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Table View */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {activeTab === 'supabase' ? (
          <div>
            {/* Mobile View for Products */}
            <div className="block md:hidden divide-y divide-slate-100">
              {supabaseInventory.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs font-medium">
                  {loadingSupabase ? 'Fetching items from Supabase...' : 'No inventory items found.'}
                </div>
              ) : (
                supabaseInventory.map(inv => (
                  <div key={inv.id} className="p-4 space-y-2 bg-white active-press">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 pr-2">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            {inv.id}
                          </span>
                          {inv.product_tag && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
                              {inv.product_tag}
                            </span>
                          )}
                        </div>
                        <p className="font-bold text-slate-900 text-xs">{inv.saree_name}</p>
                        <p className="text-[11px] text-slate-500">{inv.category} • {inv.fabric}</p>
                      </div>

                      <button
                        onClick={() => handleStartEditSupabase(inv)}
                        className="p-1.5 text-slate-500 hover:text-brand-900 bg-slate-50 rounded-lg active-press"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        (inv.stock ?? 0) <= 2 ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        Stock: {inv.stock ?? 0}
                      </span>
                      <div className="text-right">
                        <span className="font-mono font-black text-sm text-brand-900">
                          ₹{Number(inv.selling_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                        {inv.mrp && Number(inv.mrp) > Number(inv.selling_price) && (
                          <span className="text-[11px] text-slate-400 line-through ml-1.5">
                            ₹{Number(inv.mrp).toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-emerald-50/70 text-emerald-900 border-b border-emerald-200">
                    <th className="py-3 px-4 font-semibold">ID / Barcode</th>
                    <th className="py-3 px-4 font-semibold">Saree Details</th>
                    <th className="py-3 px-3 font-semibold">Tag</th>
                    <th className="py-3 px-2 font-semibold text-center">HSN</th>
                    <th className="py-3 px-3 font-semibold text-right">MRP</th>
                    <th className="py-3 px-2 font-semibold text-center">Disc %</th>
                    <th className="py-3 px-3 font-semibold text-right">Selling Price</th>
                    <th className="py-3 px-2 font-semibold text-center">GST %</th>
                    <th className="py-3 px-2 font-semibold text-center">Stock</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {supabaseInventory.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-gray-500">
                        {loadingSupabase ? 'Fetching items from Supabase...' : 'No inventory items found. Click "Add Saree" to create new inventory.'}
                      </td>
                    </tr>
                  ) : (
                    supabaseInventory.map(inv => (
                      <tr key={inv.id} className="hover:bg-emerald-50/20 transition">
                        <td className="py-3 px-4 font-mono text-gray-700">
                          <p className="font-bold text-gray-900">{inv.id}</p>
                          {inv.barcode && <p className="text-[10px] text-gray-400">{inv.barcode}</p>}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-bold text-gray-900">{inv.saree_name}</p>
                          <p className="text-[11px] text-gray-500">
                            {inv.category} • {inv.fabric} {inv.color && `• ${inv.color}`}
                          </p>
                        </td>
                        <td className="py-3 px-3">
                          {inv.product_tag ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 text-[11px] font-medium">
                              <Tag className="w-3 h-3" />
                              {inv.product_tag}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-2 text-center font-mono text-gray-700">
                          {inv.hsn_code || '5007'}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-gray-500">
                          {inv.mrp ? `₹${Number(inv.mrp).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                        </td>
                        <td className="py-3 px-2 text-center font-mono">
                          {inv.discount_percentage ? (
                            <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 font-bold text-[11px]">
                              {Number(inv.discount_percentage)}%
                            </span>
                          ) : (
                            <span className="text-gray-400">0%</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-brand-900 text-sm">
                          ₹{Number(inv.selling_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-2 text-center font-mono">
                          {inv.gst_rate}%
                        </td>
                        <td className="py-3 px-2 text-center font-mono">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            (inv.stock ?? 0) <= 2 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {inv.stock ?? 0}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleStartEditSupabase(inv)}
                            className="p-1.5 text-gray-500 hover:text-brand-800 hover:bg-gray-100 rounded"
                            title="Edit product"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Pagination Bar */}
            {totalPages > 1 && (
              <div className="p-3.5 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-xs text-gray-600">
                <div>
                  Showing <strong>{(currentPage - 1) * pageSize + 1}</strong> to <strong>{Math.min(currentPage * pageSize, totalCount)}</strong> of <strong>{totalCount}</strong> sarees
                </div>
                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage <= 1 || loadingSupabase}
                    className="px-2.5 py-1 bg-white border border-gray-300 rounded font-medium hover:bg-gray-100 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span className="px-2 font-medium">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages || loadingSupabase}
                    className="px-2.5 py-1 bg-white border border-gray-300 rounded font-medium hover:bg-gray-100 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-gray-50 text-gray-600 border-b border-gray-200">
                  <th className="py-3 px-4 font-semibold">Saree Name</th>
                  <th className="py-3 px-3 font-semibold">ID / SKU</th>
                  <th className="py-3 px-3 font-semibold">Tag</th>
                  <th className="py-3 px-2 font-semibold text-center">HSN</th>
                  <th className="py-3 px-3 text-right font-semibold">MRP</th>
                  <th className="py-3 px-2 text-center font-semibold">Disc %</th>
                  <th className="py-3 px-3 text-right font-semibold">Selling Price</th>
                  <th className="py-3 px-2 font-semibold text-center">GST %</th>
                  <th className="py-3 px-2 font-semibold text-center">Stock</th>
                  <th className="py-3 px-4 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLocalProducts.map(prod => (
                  <tr key={prod.id} className="hover:bg-brand-50/30 transition">
                    <td className="py-3 px-4">
                      <p className="font-bold text-gray-900">{prod.name}</p>
                      <p className="text-[11px] text-gray-500">{prod.fabric} • {prod.colour}</p>
                    </td>
                    <td className="py-3 px-3 font-mono text-gray-700">
                      <p>{prod.sku}</p>
                      <p className="text-[10px] text-gray-400">{prod.barcode}</p>
                    </td>
                    <td className="py-3 px-3">
                      {prod.productTag ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 text-[11px] font-medium">
                          <Tag className="w-3 h-3" />
                          {prod.productTag}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-center font-mono text-gray-700">
                      {prod.hsnCode}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-gray-500">
                      {prod.mrp ? `₹${prod.mrp.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                    </td>
                    <td className="py-3 px-2 text-center font-mono">
                      {prod.discountPercentage ? (
                        <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 font-bold text-[11px]">
                          {prod.discountPercentage}%
                        </span>
                      ) : (
                        <span className="text-gray-400">0%</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-brand-900 text-sm">
                      ₹{prod.sellingPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-2 text-center font-mono">
                      {prod.gstRate}%
                    </td>
                    <td className="py-3 px-2 text-center font-mono">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        (prod.stockQty ?? 0) <= 2 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {prod.stockQty ?? 0}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleDeleteLocal(prod.id, prod.name)}
                        className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                        title="Delete product"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
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
