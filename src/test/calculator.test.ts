import { describe, it, expect } from 'vitest';
import { calculateInvoice, toPaise, toRupees } from '../engine/calculator';
import { numberToWordsIndian } from '../engine/numberToWords';

describe('Calculator Engine Unit Tests', () => {
  it('converts between paise and rupees precisely', () => {
    expect(toPaise(12.34)).toBe(1234);
    expect(toRupees(1234)).toBe(12.34);
    expect(toRupees(100)).toBe(1.00);
    expect(toPaise(0.05)).toBe(5);
  });

  it('calculates single item without discount (Intra-state, 5% GST, exclusive pricing)', () => {
    const result = calculateInvoice({
      items: [{
        description: 'Banarasi Katan Silk Saree',
        hsnCode: '5007',
        qty: 1,
        unitPrice: 10000,
        discountType: 'percentage',
        discountValue: 0,
        gstRate: 5
      }],
      sellerStateCode: '09', // Uttar Pradesh
      placeOfSupplyCode: '09', // Uttar Pradesh
      sellerRegistrationStatus: 'registered',
      pricingMode: 'exclusive',
      roundOffRule: 'nearest_rupee'
    });

    expect(result.subtotal).toBe(10000);
    expect(result.totalDiscount).toBe(0);
    expect(result.taxableTotal).toBe(10000);
    expect(result.supplyType).toBe('intra_state');
    // 5% of 10000 is 500 total tax (250 CGST + 250 SGST)
    expect(result.cgstTotal).toBe(250);
    expect(result.sgstTotal).toBe(250);
    expect(result.igstTotal).toBe(0);
    expect(result.taxTotal).toBe(500);
    expect(result.grandTotal).toBe(10500);
  });

  it('calculates single item with percentage discount', () => {
    const result = calculateInvoice({
      items: [{
        description: 'Banarasi Georgette Saree',
        hsnCode: '5007',
        qty: 1,
        unitPrice: 10000,
        discountType: 'percentage',
        discountValue: 10, // 10% off -> 1000 discount
        gstRate: 5
      }],
      sellerStateCode: '09',
      placeOfSupplyCode: '09',
      sellerRegistrationStatus: 'registered',
      pricingMode: 'exclusive'
    });

    expect(result.subtotal).toBe(10000);
    expect(result.totalDiscount).toBe(1000);
    expect(result.taxableTotal).toBe(9000);
    // 5% of 9000 = 450 (225 CGST + 225 SGST)
    expect(result.cgstTotal).toBe(225);
    expect(result.sgstTotal).toBe(225);
    expect(result.grandTotal).toBe(9450);
  });

  it('calculates fixed discount capped at line value', () => {
    const result = calculateInvoice({
      items: [{
        description: 'Cotton Silk Saree',
        hsnCode: '5208',
        qty: 1,
        unitPrice: 2000,
        discountType: 'fixed',
        discountValue: 2500, // exceeds 2000, should cap to 2000
        gstRate: 5
      }],
      sellerStateCode: '09',
      placeOfSupplyCode: '09',
      sellerRegistrationStatus: 'registered',
      pricingMode: 'exclusive'
    });

    expect(result.subtotal).toBe(2000);
    expect(result.totalDiscount).toBe(2000);
    expect(result.taxableTotal).toBe(0);
    expect(result.taxTotal).toBe(0);
    expect(result.grandTotal).toBe(0);
  });

  it('calculates inter-state supply (IGST)', () => {
    const result = calculateInvoice({
      items: [{
        description: 'Tanchoi Silk Saree',
        hsnCode: '5007',
        qty: 1,
        unitPrice: 15000,
        discountType: 'percentage',
        discountValue: 0,
        gstRate: 5
      }],
      sellerStateCode: '09', // Uttar Pradesh
      placeOfSupplyCode: '27', // Maharashtra
      sellerRegistrationStatus: 'registered',
      pricingMode: 'exclusive'
    });

    expect(result.supplyType).toBe('inter_state');
    expect(result.cgstTotal).toBe(0);
    expect(result.sgstTotal).toBe(0);
    expect(result.igstTotal).toBe(750); // 5% IGST on 15000
    expect(result.grandTotal).toBe(15750);
  });

  it('calculates tax-inclusive pricing correctly (back-calculates taxable value and tax)', () => {
    // 10500 inclusive of 5% tax -> taxable = 10500 / 1.05 = 10000, tax = 500
    const result = calculateInvoice({
      items: [{
        description: 'Jangla Banarasi Saree',
        hsnCode: '5007',
        qty: 1,
        unitPrice: 10500,
        discountType: 'percentage',
        discountValue: 0,
        gstRate: 5
      }],
      sellerStateCode: '09',
      placeOfSupplyCode: '09',
      sellerRegistrationStatus: 'registered',
      pricingMode: 'inclusive'
    });

    expect(result.subtotal).toBe(10500);
    expect(result.taxableTotal).toBe(10000);
    expect(result.cgstTotal).toBe(250);
    expect(result.sgstTotal).toBe(250);
    expect(result.taxTotal).toBe(500);
    expect(result.grandTotal).toBe(10500);
  });

  it('calculates tax-inclusive pricing with discount and inter-state IGST', () => {
    // 2 sarees @ 10,000 each = 20,000 retail price (inclusive of 5% GST).
    // 10% item discount = 2,000 off. Net retail payable = 18,000.
    // Grand total MUST be 18,000. GST must be back-calculated inside 18,000, not added on top!
    // 18,000 / 1.05 = 17,142.86 taxable value. IGST = 18,000 - 17,142.86 = 857.14
    const result = calculateInvoice({
      items: [{
        description: 'Pure Katan Silk Kadwa Saree',
        hsnCode: '5007',
        qty: 2,
        unitPrice: 10000,
        discountType: 'percentage',
        discountValue: 10,
        gstRate: 5
      }],
      sellerStateCode: '09', // UP
      placeOfSupplyCode: '27', // Maharashtra (inter-state)
      sellerRegistrationStatus: 'registered',
      pricingMode: 'inclusive'
    });

    expect(result.subtotal).toBe(20000);
    expect(result.totalDiscount).toBe(2000);
    expect(result.grandTotal).toBe(18000); // Does NOT add tax on top of 18,000!
    expect(result.taxableTotal).toBe(17142.86);
    expect(result.cgstTotal).toBe(0);
    expect(result.sgstTotal).toBe(0);
    expect(result.igstTotal).toBe(857.14);
    expect(result.taxTotal).toBe(857.14);
    // taxableTotal + taxTotal equals exactly 18000
    expect(Number((result.taxableTotal + result.taxTotal).toFixed(2))).toBe(18000);
  });

  it('handles unregistered seller mode (Retail Bill without charging GST)', () => {
    const result = calculateInvoice({
      items: [{
        description: 'Banarasi Dupatta',
        hsnCode: '5007',
        qty: 2,
        unitPrice: 2500,
        discountType: 'percentage',
        discountValue: 10, // 500 off
        gstRate: 5 // should be ignored for unregistered
      }],
      sellerStateCode: '09',
      placeOfSupplyCode: '09',
      sellerRegistrationStatus: 'unregistered',
      pricingMode: 'exclusive'
    });

    expect(result.isRegisteredTaxInvoice).toBe(false);
    expect(result.subtotal).toBe(5000);
    expect(result.totalDiscount).toBe(500);
    expect(result.taxableTotal).toBe(4500);
    expect(result.cgstTotal).toBe(0);
    expect(result.sgstTotal).toBe(0);
    expect(result.igstTotal).toBe(0);
    expect(result.taxTotal).toBe(0);
    expect(result.grandTotal).toBe(4500);
  });

  it('allocates bill-level discount proportionally across items with different rates', () => {
    const result = calculateInvoice({
      items: [
        {
          description: 'Item A (5% GST)',
          hsnCode: '5007',
          qty: 1,
          unitPrice: 4000,
          discountType: 'percentage',
          discountValue: 0,
          gstRate: 5
        },
        {
          description: 'Item B (12% GST)',
          hsnCode: '6214',
          qty: 1,
          unitPrice: 6000,
          discountType: 'percentage',
          discountValue: 0,
          gstRate: 12
        }
      ],
      sellerStateCode: '09',
      placeOfSupplyCode: '09',
      sellerRegistrationStatus: 'registered',
      pricingMode: 'exclusive',
      billDiscountType: 'fixed',
      billDiscountValue: 1000 // 1000 total discount split 40%:60% -> 400 on Item A, 600 on Item B
    });

    expect(result.subtotal).toBe(10000);
    expect(result.billDiscountAmount).toBe(1000);
    expect(result.totalDiscount).toBe(1000);

    // Item A: 4000 - 400 = 3600 taxable @ 5% -> 180 tax (90 CGST + 90 SGST)
    const itemA = result.items[0];
    expect(itemA.allocatedBillDiscountAmount).toBe(400);
    expect(itemA.taxableValue).toBe(3600);
    expect(itemA.cgstAmount).toBe(90);
    expect(itemA.sgstAmount).toBe(90);

    // Item B: 6000 - 600 = 5400 taxable @ 12% -> 648 tax (324 CGST + 324 SGST)
    const itemB = result.items[1];
    expect(itemB.allocatedBillDiscountAmount).toBe(600);
    expect(itemB.taxableValue).toBe(5400);
    expect(itemB.cgstAmount).toBe(324);
    expect(itemB.sgstAmount).toBe(324);

    expect(result.taxTotal).toBe(828); // 180 + 648
    expect(result.grandTotal).toBe(9828); // 9000 + 828
  });

  it('calculates round-off properly to nearest rupee', () => {
    // 1 item: price 100.50, 5% tax = 5.025 -> total 105.525
    const result = calculateInvoice({
      items: [{
        description: 'Matching Silk Border',
        hsnCode: '5007',
        qty: 1,
        unitPrice: 100.50,
        discountType: 'percentage',
        discountValue: 0,
        gstRate: 5
      }],
      sellerStateCode: '09',
      placeOfSupplyCode: '09',
      sellerRegistrationStatus: 'registered',
      pricingMode: 'exclusive',
      roundOffRule: 'nearest_rupee'
    });

    // 100.50 * 0.05 = 5.03 tax. Line total = 105.53. Round to 106.00. Round-off = +0.47
    expect(result.grandTotal).toBe(Math.round(result.subtotal + result.taxTotal));
    expect(result.roundOff).toBe(Number((result.grandTotal - (result.subtotal + result.taxTotal)).toFixed(2)));
  });
});

describe('Number to Indian Words Converter', () => {
  it('converts various amounts to Indian words correctly', () => {
    expect(numberToWordsIndian(0)).toBe('Zero Rupees Only');
    expect(numberToWordsIndian(10500)).toBe('Ten Thousand Five Hundred Rupees Only');
    expect(numberToWordsIndian(125000)).toBe('One Lakh Twenty Five Thousand Rupees Only');
    expect(numberToWordsIndian(2500000)).toBe('Twenty Five Lakh Rupees Only');
    expect(numberToWordsIndian(10000000)).toBe('One Crore Rupees Only');
    expect(numberToWordsIndian(150450.75)).toBe('One Lakh Fifty Thousand Four Hundred Fifty Rupees and Seventy Five Paise Only');
  });
});
