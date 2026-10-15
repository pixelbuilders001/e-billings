import React from 'react';
import { Invoice } from '../types';
import { Printer, Download, Share2, Copy, Check, ArrowLeft } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { numberToWordsIndian } from '../engine/numberToWords';

interface InvoiceDocumentProps {
  invoice: Invoice;
  onBack?: () => void;
}

export const InvoiceDocument: React.FC<InvoiceDocumentProps> = ({ invoice, onBack }) => {
  const [copied, setCopied] = React.useState(false);
  const [downloading, setDownloading] = React.useState(false);
  const printRef = React.useRef<HTMLDivElement>(null);

  const isTaxInvoice = invoice.isRegisteredTaxInvoice;
  const seller = invoice.sellerSnapshot;
  const customer = invoice.customerSnapshot;

  const amountInWords = (invoice.amountInWords && invoice.amountInWords.trim().length > 0)
    ? invoice.amountInWords
    : numberToWordsIndian(invoice.grandTotal || 0);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyNumber = () => {
    navigator.clipboard.writeText(invoice.invoiceNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Invoice ${invoice.invoiceNumber}`,
          text: `Invoice ${invoice.invoiceNumber} from ${seller.tradeName} for ₹${invoice.grandTotal.toLocaleString('en-IN')}`,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Share error or canceled', err);
      }
    } else {
      handleCopyNumber();
      alert('Invoice number copied to clipboard! (Device sharing not supported on this browser)');
    }
  };

  const handleDownloadPDF = async () => {
    if (!printRef.current) return;
    setDownloading(true);
    try {
      const element = printRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`${invoice.invoiceNumber.replace(/\//g, '_')}.pdf`);
    } catch (err) {
      console.error('PDF generation failed', err);
      alert('Could not generate PDF. Please use browser Print to save as PDF.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6">
      {/* Top Action Toolbar (Hidden in Print) */}
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-4 bg-white/95 backdrop-blur-xl p-4 sm:p-5 rounded-2xl border border-gold/30 shadow-luxury">
        <div className="flex items-center space-x-3.5">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-xl transition cursor-pointer active-press border border-slate-200"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          )}
          <div>
            <span className="text-[10px] uppercase tracking-widest font-extrabold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/70">
              Tax Document
            </span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 font-mono flex items-center gap-2 mt-0.5">
              <span>{invoice.invoiceNumber}</span>
              <button
                onClick={handleCopyNumber}
                title="Copy Invoice Number"
                className="text-slate-400 hover:text-brand-900 p-1 rounded-md transition cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </h2>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handlePrint}
            className="flex items-center space-x-2 px-5 py-2.5 text-xs font-black text-brand-950 bg-gradient-to-r from-gold via-amber-400 to-yellow-300 hover:from-amber-400 hover:to-gold rounded-xl shadow-gold-glow hover:shadow-lg transition cursor-pointer active-press border border-yellow-200/60"
          >
            <Printer className="w-4 h-4 stroke-[2.5]" />
            <span>Print Invoice</span>
          </button>

          <button
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="flex items-center space-x-2 px-4 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-brand-950 to-brand-900 hover:from-black hover:to-brand-950 rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer active-press border border-gold/30"
          >
            <Download className="w-4 h-4 text-gold" />
            <span>{downloading ? 'Generating PDF...' : 'Download PDF'}</span>
          </button>

          <button
            onClick={handleShare}
            className="flex items-center space-x-1.5 px-3.5 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer active-press border border-slate-200"
          >
            <Share2 className="w-4 h-4 text-slate-600" />
            <span className="hidden sm:inline">Share</span>
          </button>
        </div>
      </div>

      {/* The Printable A4 Invoice Container */}
      <div 
        ref={printRef}
        className="bg-white text-gray-900 p-8 sm:p-10 shadow-lg rounded-xl border border-gray-200 print:shadow-none print:border-none print:p-0 print:m-0 print:rounded-none"
        style={{ minHeight: '280mm' }}
      >
        {/* Header: Brand, Title & Metadata */}
        <div className="border-b-2 border-brand-800 pb-5 mb-5 flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-brand-800 tracking-tight">
              {seller.tradeName}
            </h1>
            <p className="text-xs text-gray-600 font-medium">
              {seller.legalName}
            </p>
              <p className="text-xs text-gray-600 mt-1 max-w-sm">
                {seller.address}, {seller.city}, {seller.state} - Code: {seller.stateCode}
              </p>
              <div className="flex flex-wrap gap-x-4 text-xs text-gray-600 mt-1">
                <span><strong>Phone:</strong> {seller.phone}</span>
                {seller.email && <span><strong>Email:</strong> {seller.email}</span>}
              </div>
            {isTaxInvoice && seller.gstin && (
              <div className="mt-1.5 inline-block bg-amber-50 border border-gold/40 px-2 py-0.5 rounded text-xs font-mono font-bold text-brand-900">
                GSTIN: {seller.gstin}
              </div>
            )}
          </div>

          <div className="text-left sm:text-right flex flex-col justify-between">
            <div>
              <span className="inline-block px-3 py-1 rounded text-xs font-bold uppercase tracking-wider bg-brand-800 text-white">
                {isTaxInvoice ? 'TAX INVOICE' : 'RETAIL BILL / CASH MEMO'}
              </span>
              <p className="text-xs text-gray-500 mt-1 italic">
                {isTaxInvoice ? 'Original for Recipient' : 'Cash Bill'}
              </p>
            </div>
            
            <div className="mt-4 text-xs space-y-1">
              <div>
                <span className="text-gray-500">Invoice No:</span>{' '}
                <span className="font-mono font-bold text-sm text-gray-900">{invoice.invoiceNumber}</span>
              </div>
              <div>
                <span className="text-gray-500">Date:</span>{' '}
                <span className="font-medium">{new Date(invoice.invoiceDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              </div>
              <div>
                <span className="text-gray-500">Place of Supply:</span>{' '}
                <span className="font-medium">{invoice.placeOfSupplyState} ({invoice.placeOfSupplyCode})</span>
              </div>
              <div>
                <span className="text-gray-500">Supply Type:</span>{' '}
                <span className="font-medium capitalize">{invoice.supplyType === 'intra_state' ? 'Intra-State' : 'Inter-State'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Billed To / Recipient Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 p-3 bg-brand-50/50 rounded-lg border border-brand-100 text-xs">
          <div>
            <h3 className="font-bold text-brand-800 uppercase tracking-wider text-[11px] mb-1">
              Billed To (Buyer):
            </h3>
            <p className="font-bold text-sm text-gray-900">{customer.name}</p>
            {customer.businessName && (
              <p className="font-medium text-gray-700">{customer.businessName}</p>
            )}
            <p className="text-gray-600 mt-0.5">{customer.billingAddress}</p>
            <p className="text-gray-600">
              State: {customer.state} ({customer.stateCode})
            </p>
            <p className="text-gray-600 mt-0.5">Phone: {customer.phone}</p>
            {customer.gstin && (
              <p className="font-mono font-semibold text-brand-900 mt-1">
                Buyer GSTIN: {customer.gstin}
              </p>
            )}
          </div>

          <div className="border-t sm:border-t-0 sm:border-l border-brand-200/60 pt-2 sm:pt-0 sm:pl-4">
            <h3 className="font-bold text-brand-800 uppercase tracking-wider text-[11px] mb-1">
              Payment & Status:
            </h3>
            <p className="text-gray-700">
              <span className="text-gray-500">Payment Status:</span>{' '}
              <span className={`font-bold uppercase text-[11px] px-2 py-0.5 rounded ${
                invoice.paymentStatus === 'paid' 
                  ? 'bg-emerald-100 text-emerald-800' 
                  : invoice.paymentStatus === 'partially_paid'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-rose-100 text-rose-800'
              }`}>
                {invoice.paymentStatus.replace('_', ' ')}
              </span>
            </p>
            <p className="text-gray-700 mt-1">
              <span className="text-gray-500">Amount Paid:</span>{' '}
              <span className="font-bold text-gray-900">₹{invoice.paidTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </p>
            <p className="text-gray-700 mt-0.5">
              <span className="text-gray-500">Balance Due:</span>{' '}
              <span className="font-bold text-brand-800">₹{invoice.balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </p>
            {invoice.payments && invoice.payments.length > 0 && (
              <div className="mt-1 text-gray-600">
                <span>Method: </span>
                {invoice.payments.map(p => `${p.method} (₹${p.amount})`).join(', ')}
              </div>
            )}
          </div>
        </div>

        {/* Line Items Table */}
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-brand-800 text-ivory font-serif">
                <th className="py-2 px-2 text-center w-8">#</th>
                <th className="py-2 px-3">Description of Goods</th>
                <th className="py-2 px-2 text-center">HSN</th>
                <th className="py-2 px-2 text-center">Qty</th>
                <th className="py-2 px-2 text-right">Unit Rate</th>
                <th className="py-2 px-2 text-right">Discount</th>
                <th className="py-2 px-2 text-right">Taxable Val</th>
                {isTaxInvoice && (
                  <>
                    <th className="py-2 px-2 text-center">GST %</th>
                    <th className="py-2 px-2 text-right">Tax Amt</th>
                  </>
                )}
                <th className="py-2 px-3 text-right">Total (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {invoice.items.map((item, idx) => {
                const taxAmt = item.cgstAmount + item.sgstAmount + item.igstAmount;
                return (
                  <tr key={item.id || idx} className="hover:bg-gray-50/50">
                    <td className="py-2.5 px-2 text-center font-mono text-gray-500">{idx + 1}</td>
                    <td className="py-2.5 px-3">
                      <p className="font-semibold text-gray-900">{item.description}</p>
                      <p className="text-[11px] text-gray-500">{item.unit || 'Nos'}</p>
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono text-gray-600">{item.hsnCode || '-'}</td>
                    <td className="py-2.5 px-2 text-center font-bold text-gray-900">{item.qty}</td>
                    <td className="py-2.5 px-2 text-right font-mono">₹{item.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="py-2.5 px-2 text-right font-mono text-amber-800">
                      {item.netDiscountAmount > 0 ? `₹${item.netDiscountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono font-medium">₹{item.taxableValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    {isTaxInvoice && (
                      <>
                        <td className="py-2.5 px-2 text-center font-mono">{item.gstRate}%</td>
                        <td className="py-2.5 px-2 text-right font-mono">₹{taxAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </>
                    )}
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-gray-900">
                      ₹{item.lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Calculation Summary & Rate-wise Tax Table */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start mb-6">
          {/* Left Column: Tax Rate Summary (GST Registered) or Terms */}
          <div>
            {isTaxInvoice ? (
              <div className="border border-gray-200 rounded-lg p-3 bg-gray-50/70 text-xs">
                <h4 className="font-bold text-brand-900 uppercase tracking-wider text-[11px] mb-2">
                  Tax Breakdown by Rate:
                </h4>
                <table className="w-full text-left text-[11px]">
                  <thead>
                    <tr className="border-b border-gray-300 text-gray-600 font-semibold">
                      <th className="py-1">Rate</th>
                      <th className="py-1 text-right">Taxable</th>
                      {invoice.supplyType === 'intra_state' ? (
                        <>
                          <th className="py-1 text-right">CGST</th>
                          <th className="py-1 text-right">SGST</th>
                        </>
                      ) : (
                        <th className="py-1 text-right">IGST</th>
                      )}
                      <th className="py-1 text-right">Total Tax</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 font-mono">
                    {((invoice.rateBreakdown && invoice.rateBreakdown.length > 0) ? invoice.rateBreakdown : [
                      {
                        rate: invoice.items[0]?.gstRate || 0,
                        taxableAmount: invoice.taxableTotal,
                        cgstAmount: invoice.cgstTotal,
                        sgstAmount: invoice.sgstTotal,
                        igstAmount: invoice.igstTotal,
                        totalTax: invoice.cgstTotal + invoice.sgstTotal + invoice.igstTotal
                      }
                    ]).map(rb => (
                      <tr key={rb.rate}>
                        <td className="py-1">{rb.rate}%</td>
                        <td className="py-1 text-right">₹{rb.taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        {invoice.supplyType === 'intra_state' ? (
                          <>
                            <td className="py-1 text-right">₹{rb.cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            <td className="py-1 text-right">₹{rb.sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          </>
                        ) : (
                          <td className="py-1 text-right">₹{rb.igstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        )}
                        <td className="py-1 text-right font-bold text-brand-900">
                          ₹{rb.totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs text-amber-900">
                <p className="font-bold">Retail Bill Memo</p>
                <p className="text-[11px] text-amber-800 mt-1">
                  Issued under composition/unregistered dealer scheme. No tax charged from customer.
                </p>
              </div>
            )}

            {/* Amount in words */}
            <div className="mt-4 p-3 bg-brand-50 border border-brand-200 rounded-lg text-xs">
              <span className="font-bold text-brand-800 uppercase tracking-wider text-[10px] block">
                Total Amount in Words:
              </span>
              <p className="font-serif font-bold text-gray-900 mt-0.5 text-xs italic">
                {amountInWords}
              </p>
            </div>
          </div>

          {/* Right Column: Totals summary */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 text-xs space-y-2">
            <div className="flex justify-between text-gray-600">
              <span>{invoice.pricingMode === 'inclusive' ? 'Total MRP / Retail Value:' : 'Subtotal (Gross Value):'}</span>
              <span className="font-mono font-medium">₹{invoice.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>

            {invoice.discountTotal > 0 && (
              <div className="flex justify-between text-amber-800">
                <span>Total Discount:</span>
                <span className="font-mono font-medium">- ₹{invoice.discountTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            )}

            <div className="flex justify-between text-gray-700 font-medium pt-1 border-t border-gray-100">
              <span>Taxable Value:</span>
              <span className="font-mono">₹{invoice.taxableTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>

            {isTaxInvoice && invoice.supplyType === 'intra_state' && (
              <>
                <div className="flex justify-between text-gray-600">
                  <span>Central GST (CGST){invoice.pricingMode === 'inclusive' ? ' (Included)' : ''}:</span>
                  <span className="font-mono">₹{invoice.cgstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>State GST (SGST){invoice.pricingMode === 'inclusive' ? ' (Included)' : ''}:</span>
                  <span className="font-mono">₹{invoice.sgstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </>
            )}

            {isTaxInvoice && invoice.supplyType === 'inter_state' && (
              <div className="flex justify-between text-gray-600">
                <span>Integrated GST (IGST){invoice.pricingMode === 'inclusive' ? ' (Included)' : ''}:</span>
                <span className="font-mono">₹{invoice.igstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            )}

            {invoice.pricingMode === 'inclusive' && isTaxInvoice && (
              <div className="text-[10px] text-gray-500 bg-gray-50 p-1.5 rounded border border-gray-100 text-center italic">
                * Prices are inclusive of GST. Taxable value & tax back-calculated above.
              </div>
            )}

            {invoice.roundOff !== 0 && (
              <div className="flex justify-between text-gray-500">
                <span>Round Off:</span>
                <span className="font-mono">{invoice.roundOff > 0 ? `+ ₹${invoice.roundOff.toFixed(2)}` : `- ₹${Math.abs(invoice.roundOff).toFixed(2)}`}</span>
              </div>
            )}

            <div className="pt-2 border-t-2 border-brand-800">
              <div className="flex justify-between text-base font-bold text-brand-900">
                <span>Grand Total:</span>
                <span className="font-mono text-lg text-brand-900">
                  ₹{invoice.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <p className="text-right text-[11px] font-serif font-medium text-brand-950 italic mt-1 leading-snug">
                ({amountInWords})
              </p>
            </div>
          </div>
        </div>

        {/* Full-width Amount in Words Banner for complete PDF & Print visibility */}
        <div className="mb-6 p-3.5 bg-brand-50/80 border border-brand-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div>
            <span className="font-bold text-brand-900 uppercase tracking-wider text-[10px] block">
              Total Amount in Words (INR):
            </span>
            <p className="font-serif font-bold text-gray-950 text-sm italic mt-0.5">
              {amountInWords}
            </p>
          </div>
          <div className="text-left sm:text-right sm:border-l sm:border-brand-200 sm:pl-4 whitespace-nowrap">
            <span className="text-[10px] text-gray-500 uppercase tracking-wider block">Grand Total</span>
            <span className="font-mono font-bold text-brand-900 text-base">
              ₹{invoice.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Footer & Authorized Signatory */}
        <div className="border-t border-gray-200 pt-4 mt-6 grid grid-cols-1 sm:grid-cols-2 gap-6 items-end text-xs">
          <div>
            <h4 className="font-bold text-gray-700 uppercase tracking-wider text-[10px] mb-1">
              Terms & Conditions:
            </h4>
            <div className="text-[11px] text-gray-500 whitespace-pre-line leading-relaxed">
              {seller.termsAndConditions || 'Goods once sold cannot be returned. Handloom irregularities are a mark of authentic Banarasi craftsmanship.'}
            </div>
            {seller.footerText && (
              <p className="text-[10px] text-gray-400 mt-2 italic">{seller.footerText}</p>
            )}
          </div>

          <div className="text-right flex flex-col items-end">
            <p className="font-semibold text-gray-800 text-xs">
              For {seller.tradeName}
            </p>
            <div className="h-16 flex items-end">
              <div className="w-48 border-b border-gray-400 text-center pb-1 text-[11px] text-gray-500 italic">
                Authorised Signatory
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
