import {
  DiscountType,
  InvoiceCalculationResult,
  InvoiceItem,
  PricingMode,
  RegistrationStatus,
  RoundOffRule,
  SupplyType,
  TaxRateBreakdown
} from '../types';

/**
 * Decimal-safe arithmetic helper functions working with integers (paise).
 * Avoids binary floating-point roundoff issues.
 */
export function toPaise(rupees: number): number {
  return Math.round((rupees || 0) * 100);
}

export function toRupees(paise: number): number {
  return Number((paise / 100).toFixed(2));
}

export interface CalculateLineItemInput {
  id?: string;
  productId?: string;
  description: string;
  hsnCode: string;
  qty: number;
  unit?: string;
  unitPrice: number;
  discountType: DiscountType;
  discountValue: number;
  gstRate: number;
}

export interface CalculateInvoiceParams {
  items: CalculateLineItemInput[];
  sellerStateCode: string;
  placeOfSupplyCode: string;
  sellerRegistrationStatus: RegistrationStatus;
  pricingMode: PricingMode;
  billDiscountType?: DiscountType;
  billDiscountValue?: number;
  roundOffRule?: RoundOffRule;
}

/**
 * Pure calculation function for line items, taxes, discounts, and round-offs.
 */
export function calculateInvoice(params: CalculateInvoiceParams): InvoiceCalculationResult {
  const {
    items: rawItems,
    sellerStateCode,
    placeOfSupplyCode,
    sellerRegistrationStatus,
    pricingMode,
    billDiscountType = 'percentage',
    billDiscountValue = 0,
    roundOffRule = 'nearest_rupee'
  } = params;

  const isRegisteredTaxInvoice = sellerRegistrationStatus === 'registered';
  const cleanSellerCode = (sellerStateCode || '').trim().padStart(2, '0');
  const cleanPosCode = (placeOfSupplyCode || cleanSellerCode).trim().padStart(2, '0');
  const supplyType: SupplyType = cleanSellerCode === cleanPosCode ? 'intra_state' : 'inter_state';

  // Step 1: Pre-calculate gross values and item-level discounts
  interface PreItem {
    raw: CalculateLineItemInput;
    grossPaise: number;
    itemDiscPaise: number;
    baseAfterItemDiscPaise: number;
  }

  const preItems: PreItem[] = rawItems.map(item => {
    const qty = Math.max(0, item.qty || 0);
    const unitPricePaise = toPaise(Math.max(0, item.unitPrice || 0));
    const grossPaise = Math.round(qty * unitPricePaise);

    let itemDiscPaise = 0;
    const discVal = Math.max(0, item.discountValue || 0);

    if (item.discountType === 'percentage') {
      const clampedPercent = Math.min(100, discVal);
      itemDiscPaise = Math.round((grossPaise * clampedPercent) / 100);
    } else {
      // fixed amount discount capped at gross line value
      itemDiscPaise = Math.min(grossPaise, toPaise(discVal));
    }

    const baseAfterItemDiscPaise = Math.max(0, grossPaise - itemDiscPaise);

    return {
      raw: item,
      grossPaise,
      itemDiscPaise,
      baseAfterItemDiscPaise
    };
  });

  // Step 2: Calculate total bill-level discount in paise
  const totalBaseAfterItemDiscPaise = preItems.reduce((acc, p) => acc + p.baseAfterItemDiscPaise, 0);
  let totalBillDiscPaise = 0;

  const cleanBillDiscVal = Math.max(0, billDiscountValue || 0);
  if (cleanBillDiscVal > 0 && totalBaseAfterItemDiscPaise > 0) {
    if (billDiscountType === 'percentage') {
      const clampedPercent = Math.min(100, cleanBillDiscVal);
      totalBillDiscPaise = Math.round((totalBaseAfterItemDiscPaise * clampedPercent) / 100);
    } else {
      totalBillDiscPaise = Math.min(totalBaseAfterItemDiscPaise, toPaise(cleanBillDiscVal));
    }
  }

  // Step 3: Allocate bill-level discount proportionally across items (paise-precise)
  let allocatedSoFarPaise = 0;
  const processedItems: InvoiceItem[] = preItems.map((p, idx) => {
    let allocatedBillDiscPaise = 0;
    if (totalBillDiscPaise > 0 && totalBaseAfterItemDiscPaise > 0) {
      if (idx === preItems.length - 1) {
        // Last item absorbs any rounding difference to ensure exact penny match
        allocatedBillDiscPaise = Math.max(0, totalBillDiscPaise - allocatedSoFarPaise);
      } else {
        const ratio = p.baseAfterItemDiscPaise / totalBaseAfterItemDiscPaise;
        allocatedBillDiscPaise = Math.round(totalBillDiscPaise * ratio);
        allocatedSoFarPaise += allocatedBillDiscPaise;
      }
    }

    const netLineBasePaise = Math.max(0, p.baseAfterItemDiscPaise - allocatedBillDiscPaise);
    const gstRate = isRegisteredTaxInvoice ? Math.max(0, p.raw.gstRate || 0) : 0;

    let taxablePaise = 0;
    let cgstPaise = 0;
    let sgstPaise = 0;
    let igstPaise = 0;
    let lineTotalPaise = 0;

    if (!isRegisteredTaxInvoice || gstRate === 0) {
      // Unregistered or Nil-tax supply: line total is just the net line base
      taxablePaise = netLineBasePaise;
      lineTotalPaise = netLineBasePaise;
    } else if (pricingMode === 'inclusive') {
      // Tax-inclusive pricing: netLineBasePaise already includes GST
      // taxable = netLineBase / (1 + rate/100)
      taxablePaise = Math.round(netLineBasePaise / (1 + gstRate / 100));
      const totalTaxPaise = netLineBasePaise - taxablePaise;

      if (supplyType === 'intra_state') {
        cgstPaise = Math.floor(totalTaxPaise / 2);
        sgstPaise = totalTaxPaise - cgstPaise;
      } else {
        igstPaise = totalTaxPaise;
      }
      lineTotalPaise = netLineBasePaise;
    } else {
      // Tax-exclusive pricing: netLineBasePaise is taxable value
      taxablePaise = netLineBasePaise;
      const totalTaxPaise = Math.round((taxablePaise * gstRate) / 100);

      if (supplyType === 'intra_state') {
        cgstPaise = Math.floor(totalTaxPaise / 2);
        sgstPaise = totalTaxPaise - cgstPaise;
      } else {
        igstPaise = totalTaxPaise;
      }
      lineTotalPaise = taxablePaise + cgstPaise + sgstPaise + igstPaise;
    }

    const totalItemDiscPaise = p.itemDiscPaise + allocatedBillDiscPaise;

    return {
      id: p.raw.id || `item-${idx + 1}`,
      productId: p.raw.productId,
      description: p.raw.description,
      hsnCode: (p.raw.hsnCode || '').trim(),
      qty: Math.max(0, p.raw.qty || 0),
      unit: p.raw.unit || 'Nos',
      unitPrice: toRupees(toPaise(p.raw.unitPrice || 0)),
      discountType: p.raw.discountType,
      discountValue: p.raw.discountValue,
      grossLineValue: toRupees(p.grossPaise),
      itemDiscountAmount: toRupees(p.itemDiscPaise),
      allocatedBillDiscountAmount: toRupees(allocatedBillDiscPaise),
      netDiscountAmount: toRupees(totalItemDiscPaise),
      taxableValue: toRupees(taxablePaise),
      gstRate,
      cgstAmount: toRupees(cgstPaise),
      sgstAmount: toRupees(sgstPaise),
      igstAmount: toRupees(igstPaise),
      lineTotal: toRupees(lineTotalPaise)
    };
  });

  // Step 4: Aggregate invoice-level totals
  const subtotalPaise = preItems.reduce((acc, p) => acc + p.grossPaise, 0);
  const totalItemDiscPaise = preItems.reduce((acc, p) => acc + p.itemDiscPaise, 0);
  const totalDiscountPaise = totalItemDiscPaise + totalBillDiscPaise;

  const taxableTotalPaise = processedItems.reduce((acc, item) => acc + toPaise(item.taxableValue), 0);
  const cgstTotalPaise = processedItems.reduce((acc, item) => acc + toPaise(item.cgstAmount), 0);
  const sgstTotalPaise = processedItems.reduce((acc, item) => acc + toPaise(item.sgstAmount), 0);
  const igstTotalPaise = processedItems.reduce((acc, item) => acc + toPaise(item.igstAmount), 0);
  const taxTotalPaise = cgstTotalPaise + sgstTotalPaise + igstTotalPaise;

  const rawGrandTotalPaise = processedItems.reduce((acc, item) => acc + toPaise(item.lineTotal), 0);

  let roundOffPaise = 0;
  let grandTotalPaise = rawGrandTotalPaise;

  if (roundOffRule === 'nearest_rupee') {
    // Round to nearest 100 paise (nearest Rupee)
    const roundedPaise = Math.round(rawGrandTotalPaise / 100) * 100;
    roundOffPaise = roundedPaise - rawGrandTotalPaise;
    grandTotalPaise = roundedPaise;
  }

  // Step 5: Rate-wise tax breakdown summary
  const rateMap = new Map<number, TaxRateBreakdown>();

  for (const item of processedItems) {
    if (!isRegisteredTaxInvoice && item.gstRate === 0) continue;
    
    const existing = rateMap.get(item.gstRate) || {
      rate: item.gstRate,
      taxableAmount: 0,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
      totalTax: 0
    };

    existing.taxableAmount = toRupees(toPaise(existing.taxableAmount) + toPaise(item.taxableValue));
    existing.cgstAmount = toRupees(toPaise(existing.cgstAmount) + toPaise(item.cgstAmount));
    existing.sgstAmount = toRupees(toPaise(existing.sgstAmount) + toPaise(item.sgstAmount));
    existing.igstAmount = toRupees(toPaise(existing.igstAmount) + toPaise(item.igstAmount));
    existing.totalTax = toRupees(
      toPaise(existing.cgstAmount) + toPaise(existing.sgstAmount) + toPaise(existing.igstAmount)
    );

    rateMap.set(item.gstRate, existing);
  }

  const rateBreakdown = Array.from(rateMap.values()).sort((a, b) => a.rate - b.rate);

  return {
    items: processedItems,
    subtotal: toRupees(subtotalPaise),
    totalItemDiscount: toRupees(totalItemDiscPaise),
    billDiscountAmount: toRupees(totalBillDiscPaise),
    totalDiscount: toRupees(totalDiscountPaise),
    taxableTotal: toRupees(taxableTotalPaise),
    cgstTotal: toRupees(cgstTotalPaise),
    sgstTotal: toRupees(sgstTotalPaise),
    igstTotal: toRupees(igstTotalPaise),
    taxTotal: toRupees(taxTotalPaise),
    roundOff: toRupees(roundOffPaise),
    grandTotal: toRupees(grandTotalPaise),
    rateBreakdown,
    supplyType,
    isRegisteredTaxInvoice
  };
}
