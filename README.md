# Shree Banarasi Sarees - Invoicing & Billing Application

A fast, dependable, production-minded Point-of-Sale (POS) and Invoicing web application custom-built for **Shree Banarasi Sarees** (Varanasi, Uttar Pradesh) following the product requirements in `Shree_Banarasi_Sarees_Invoicing_App_PRD.pdf`.

Built with **React 18**, **Vite**, **TypeScript**, **Tailwind CSS**, and **IndexedDB**.

---

## ✨ Features & Architecture

### 1. Pure Tested GST Calculation Engine (`src/engine/calculator.ts`)
- **Paise-precise integer arithmetic**: Eliminates binary floating-point rounding issues when calculating taxable amounts, discounts, and GST breakdowns.
- **Intra-State (CGST + SGST) vs Inter-State (IGST)**: Automatic tax routing based on Seller State Code (`09` for UP) and Buyer Place of Supply (POS).
- **Proportional Bill-Level Discount Allocation**: Spreads lump-sum or % bill discounts proportionately across line items with different GST rates, ensuring legal tax liability per line is accurate down to the paisa.
- **Tax-Inclusive & Tax-Exclusive Pricing**: Back-calculates taxable values and tax splits accurately for tax-inclusive pricing.
- **Unregistered Seller Mode (Retail Bill / Cash Memo)**: Transparently removes GST computation, generating clean Retail Bills without tax collection.
- **Round-off to Nearest Rupee**: Configurable round-off rule with exact positive/negative round-off adjustments shown clearly.
- **Indian Numbering System Words (`src/engine/numberToWords.ts`)**: Generates exact currency in words format (e.g., `One Lakh Twenty Five Thousand Rupees and Fifty Paise Only`).

### 2. Fast Billing Counter Workflow (`src/pages/NewInvoice.tsx`)
- Instant saree search by **Name**, **SKU**, or **Barcode / Keyboard Scanner**.
- Add products and adjust quantities and item-level discounts in seconds.
- Place of Supply dropdown with all 36 Indian States and Union Territories.
- Quick customer selector with instant "Walk-in Retail Customer" default.
- Payment recording supporting **Cash**, **UPI**, **Card**, and **Bank Transfer** with automatic balance tracking.
- Draft vs. Finalize flow preventing duplicate invoice numbering on double-clicks.

### 3. Pixel-Perfect A4 Printable & PDF Invoicing (`src/components/InvoiceDocument.tsx`)
- Banarasi luxury aesthetic (Royal Maroon `#800020`, Ivory base `#FCFBF7`, Gold `#D4AF37`).
- Formatted strictly for A4 portrait with `@media print` CSS.
- One-click browser **Print**, **Download PDF** (via client-side `jsPDF` + `html2canvas`), and native device **Share**.
- Includes complete seller profile, customer details, HSN codes, rate-wise tax summary table, amount in words, payment record, terms, and authorized signatory box.

### 4. Live Supabase Inventory & Offline Resilience (`src/db/`)
- **Direct Supabase Integration**: Syncs with Supabase table `public.inventory` with full pagination (10, 25, 50, 100 rows), search across saree name, category, fabric, color, tag, or barcode, and real-time total counts.
- **Catalogue Views**: Displays **MRP (₹)** and **Discount Percentage (%)** directly in inventory tables.
- **Billing Workflow**: Automatically populates line item **Unit Rate (₹)** with the item's **MRP** and auto-applies pre-configured product discounts.
- **IndexedDB Fallback**: Powered by **IndexedDB** (`idb`), keeping offline resilience, local product caching, and customer registries intact without quota restrictions.
- **One-click JSON Backup Export & Restore**: Safe offline backups and cross-device migration.
- **Complete Inventory CSV Export**: Exports the full catalogue including MRP, Discount %, and GST rates for Excel/accounting reconciliation.
- **Pre-seeded Weaves**: Authentic Banarasi saree weaves (Katan Silk Kadwa, Jangla Bridal, Tanchoi, Kora Organza, Georgette).

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm or yarn

### Installation
```bash
# Clone or navigate to the project directory
cd e-invoice

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:5173` in your browser.

---

## 🧪 Running Unit Tests

The calculation engine includes a dedicated Vitest test suite covering 10+ tax calculation scenarios, discount allocations, round-offs, and Indian words conversion:

```bash
npm test
```

To run once:
```bash
npx vitest run
```

---

## 📦 Production Build & Deployment

To build an optimized production bundle:
```bash
npm run build
```

The output will be in the `dist/` directory.

### Deploying to Static Hosts:
- **Cloudflare Pages / Netlify / Vercel**:
  - Build command: `npm run build`
  - Output directory: `dist`
- No server or database required for single-store offline/local usage.

---

## ⚠️ Important GST & Tax Compliance Notice

> **Compliance Guardrail**: HSN codes, GST rates, invoice prefixes, and registration modes are completely user-configurable in the **Settings** tab. The store owner or manager must confirm applicable saree HSN classifications (e.g. 5007 / 5208 / 6214) and GST rates with a qualified Chartered Accountant before issuing live tax invoices to customers.
