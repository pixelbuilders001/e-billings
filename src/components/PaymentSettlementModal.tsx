import React, { useState, useMemo } from 'react';
import { Invoice, PaymentMethod } from '../types';
import { 
  CheckCircle2, 
  X, 
  Coins, 
  CreditCard, 
  QrCode, 
  ArrowRight,
  BadgePercent
} from 'lucide-react';

export interface SettlementResult {
  settledGrandTotal: number;
  amountPaid: number;
  dueAmount: number;
  waivedDiscountAmount: number; // additional round-off waived
  settlementType: 'waive_roundoff' | 'customer_due';
  paymentMethod: PaymentMethod;
}

interface PaymentSettlementModalProps {
  invoice: Invoice;
  isOpen: boolean;
  onClose: () => void;
  onConfirmSettlement: (result: SettlementResult) => Promise<void> | void;
}

export const PaymentSettlementModal: React.FC<PaymentSettlementModalProps> = ({
  invoice,
  isOpen,
  onClose,
  onConfirmSettlement
}) => {
  const originalTotal = invoice.grandTotal;
  const initialReceived = invoice.paidTotal && invoice.paidTotal > 0 ? invoice.paidTotal : originalTotal;

  const [receivedInput, setReceivedInput] = useState<string>(initialReceived.toString());
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(
    (invoice.payments?.[0]?.method as PaymentMethod) || 'cash'
  );
  const [settlementChoice, setSettlementChoice] = useState<'waive_roundoff' | 'customer_due'>('waive_roundoff');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Suggested rounded amounts
  const quickSuggestions = useMemo(() => {
    const list: { label: string; amount: number; diff: number }[] = [];
    const base = Math.floor(originalTotal);

    // If customer already gave a specific tender amount
    if (invoice.paidTotal && invoice.paidTotal > 0 && invoice.paidTotal !== originalTotal) {
      list.push({
        label: `₹${invoice.paidTotal} (Given)`,
        amount: invoice.paidTotal,
        diff: originalTotal - invoice.paidTotal
      });
    }

    // Exact
    list.push({ label: 'Exact', amount: originalTotal, diff: 0 });

    // Round down to nearest 10, 50 or 100
    const roundDown10 = Math.floor(base / 10) * 10;
    if (roundDown10 < base && base - roundDown10 <= 10) {
      list.push({ label: `₹${roundDown10}`, amount: roundDown10, diff: base - roundDown10 });
    }

    const roundDown50 = Math.floor(base / 50) * 50;
    if (roundDown50 < base && base - roundDown50 <= 50 && !list.some(s => s.amount === roundDown50)) {
      list.push({ label: `₹${roundDown50}`, amount: roundDown50, diff: base - roundDown50 });
    }

    const roundDown100 = Math.floor(base / 100) * 100;
    if (roundDown100 < base && base - roundDown100 <= 100 && !list.some(s => s.amount === roundDown100)) {
      list.push({ label: `₹${roundDown100}`, amount: roundDown100, diff: base - roundDown100 });
    }

    return list;
  }, [originalTotal]);

  if (!isOpen) return null;

  const receivedNum = parseFloat(receivedInput) || 0;
  const difference = originalTotal - receivedNum; // positive if received less

  const isReceivedLess = difference > 0.01;
  const isReceivedMore = difference < -0.01;
  const changeToReturn = isReceivedMore ? Math.abs(difference) : 0;

  const handleApplyPreset = (amt: number) => {
    setReceivedInput(amt.toString());
    if (amt < originalTotal) {
      setSettlementChoice('waive_roundoff');
    }
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      if (isReceivedLess) {
        if (settlementChoice === 'waive_roundoff') {
          // Customer paid less, difference is waived as a round-off discount
          // Total bill becomes what the customer actually paid
          await onConfirmSettlement({
            settledGrandTotal: receivedNum,
            amountPaid: receivedNum,
            dueAmount: 0,
            waivedDiscountAmount: difference,
            settlementType: 'waive_roundoff',
            paymentMethod: selectedMethod
          });
        } else {
          // Customer promised to pay difference later (genuine Due/Udhar)
          await onConfirmSettlement({
            settledGrandTotal: originalTotal,
            amountPaid: receivedNum,
            dueAmount: difference,
            waivedDiscountAmount: 0,
            settlementType: 'customer_due',
            paymentMethod: selectedMethod
          });
        }
      } else {
        // Customer paid exact or more (with change given)
        await onConfirmSettlement({
          settledGrandTotal: originalTotal,
          amountPaid: originalTotal,
          dueAmount: 0,
          waivedDiscountAmount: 0,
          settlementType: 'waive_roundoff',
          paymentMethod: selectedMethod
        });
      }
      onClose();
    } catch (err) {
      console.error('Error during settlement confirm:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 max-w-lg w-full overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-brand-950 to-slate-900 text-white p-5 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold/20 text-gold flex items-center justify-center border border-gold/30">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base tracking-tight text-white font-serif">
                  Tender &amp; Payment Settlement
                </h3>
                <span className="text-[10px] bg-gold/20 text-gold px-2 py-0.5 rounded-full font-mono font-bold border border-gold/30">
                  {invoice.invoiceNumber}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Customer: <strong className="text-white">{invoice.customerSnapshot?.name || 'Walk-in Customer'}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Bill Total Card */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <span className="text-xs uppercase font-extrabold tracking-wider text-slate-500 block">
                Invoice Total Amount
              </span>
              <span className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                ₹{originalTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-slate-500 block">Pricing</span>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md inline-block">
                Tax Inclusive (MRP)
              </span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              Payment Method Received
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'cash', label: 'Cash', icon: Coins },
                { id: 'upi', label: 'UPI / QR', icon: QrCode },
                { id: 'card', label: 'Card', icon: CreditCard },
                { id: 'bank_transfer', label: 'Bank', icon: ArrowRight },
              ].map(method => {
                const Icon = method.icon;
                const isSelected = selectedMethod === method.id;
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setSelectedMethod(method.id as PaymentMethod)}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 border transition cursor-pointer ${
                      isSelected
                        ? 'bg-brand-950 text-gold border-gold/40 shadow-xs ring-1 ring-gold/20'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{method.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actual Amount Tendered / Paid */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700">
                Actual Amount Customer Paid
              </label>
              <span className="text-[11px] text-slate-500">
                Cash in drawer / Bank transfer
              </span>
            </div>

            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-base">
                ₹
              </span>
              <input
                type="number"
                min="0"
                step="any"
                value={receivedInput}
                onChange={(e) => setReceivedInput(e.target.value)}
                placeholder="0"
                className="w-full pl-8 pr-4 py-2.5 bg-white border-2 border-slate-300 focus:border-brand-950 focus:ring-2 focus:ring-brand-950/10 rounded-xl text-lg font-mono font-black text-slate-900 transition outline-none"
              />
            </div>

            {/* Quick Suggestions / Rounding Pills */}
            {quickSuggestions.length > 1 && (
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Quick:
                </span>
                {quickSuggestions.map((sug, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyPreset(sug.amount)}
                    className={`text-xs px-2.5 py-1 rounded-lg border font-mono font-bold transition cursor-pointer ${
                      receivedNum === sug.amount
                        ? 'bg-amber-100 text-amber-950 border-amber-300 ring-1 ring-amber-400'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {sug.label} {sug.diff > 0 && <span className="text-[10px] text-emerald-700 font-sans">(-₹{sug.diff})</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Scenario A: Customer Paid LESS */}
          {isReceivedLess && (
            <div className="p-3.5 bg-amber-50/90 border border-amber-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-amber-950 flex items-center gap-1.5">
                  <BadgePercent className="w-4 h-4 text-amber-600" />
                  Difference: ₹{difference.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[11px] text-amber-800 font-semibold">
                  How should this difference be settled?
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {/* Option 1: Waive as Round-Off Discount (Recommended) */}
                <button
                  type="button"
                  onClick={() => setSettlementChoice('waive_roundoff')}
                  className={`text-left p-3 rounded-xl border transition flex items-start gap-3 cursor-pointer ${
                    settlementChoice === 'waive_roundoff'
                      ? 'bg-white border-emerald-500 shadow-sm ring-2 ring-emerald-500/20'
                      : 'bg-white/60 border-amber-200 hover:bg-white'
                  }`}
                >
                  <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 border ${
                    settlementChoice === 'waive_roundoff'
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : 'border-slate-300 bg-white'
                  }`}>
                    {settlementChoice === 'waive_roundoff' && <CheckCircle2 className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-slate-900">
                        Waive as Round-Off Discount (छूट - हिसाब चुकता)
                      </span>
                      <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded">
                        Recommended
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      Settle invoice total to <strong>₹{receivedNum.toLocaleString('en-IN')}</strong>. Outstanding due becomes <strong>₹0</strong>. Cash drawer matches sales report 100%.
                    </p>
                  </div>
                </button>

                {/* Option 2: Record as Genuine Customer Due */}
                <button
                  type="button"
                  onClick={() => setSettlementChoice('customer_due')}
                  className={`text-left p-3 rounded-xl border transition flex items-start gap-3 cursor-pointer ${
                    settlementChoice === 'customer_due'
                      ? 'bg-white border-amber-600 shadow-sm ring-2 ring-amber-600/20'
                      : 'bg-white/60 border-amber-200 hover:bg-white'
                  }`}
                >
                  <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 border ${
                    settlementChoice === 'customer_due'
                      ? 'border-amber-600 bg-amber-600 text-white'
                      : 'border-slate-300 bg-white'
                  }`}>
                    {settlementChoice === 'customer_due' && <CheckCircle2 className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-slate-900">
                        Keep as Customer Due (उधार - बाद में देंगे)
                      </span>
                      <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 bg-amber-100 text-amber-900 rounded">
                        Udhar
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      Customer promised to pay <strong>₹{difference.toLocaleString('en-IN')}</strong> later. Bill stays ₹{originalTotal.toLocaleString('en-IN')}, tracked under pending dues.
                    </p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Scenario B: Customer Paid MORE */}
          {isReceivedMore && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs">
              <div>
                <span className="font-extrabold text-emerald-950 block">
                  Change to Return to Customer:
                </span>
                <span className="text-[11px] text-emerald-700">
                  Return this change in cash
                </span>
              </div>
              <span className="text-xl font-black font-mono text-emerald-800">
                ₹{changeToReturn.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200/70 rounded-xl transition cursor-pointer"
          >
            Skip / Keep As Is
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="px-5 py-2.5 text-xs font-extrabold bg-gradient-to-r from-brand-950 to-brand-900 hover:from-black hover:to-brand-950 text-gold rounded-xl shadow-md border border-gold/40 flex items-center gap-2 transition cursor-pointer active:scale-95 disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>Saving...</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  Confirm Settlement ({settlementChoice === 'waive_roundoff' && isReceivedLess ? `₹${receivedNum}` : `₹${originalTotal}`})
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
