import React, { useState } from 'react';
import QRCode from 'react-qr-code';
import { Smartphone, Link as LinkIcon, Check, X, Wifi } from 'lucide-react';

interface RemoteScannerModalProps {
  sessionId: string;
  isOpen: boolean;
  onClose: () => void;
  isConnected: boolean;
}

export const RemoteScannerModal: React.FC<RemoteScannerModalProps> = ({
  sessionId,
  isOpen,
  onClose,
  isConnected,
}) => {
  const [copied, setCopied] = useState(false);
  const scannerUrl = `https://barcode-scanner-dun.vercel.app?sessionId=${sessionId}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(scannerUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl border border-slate-200 shadow-2xl overflow-hidden p-6 relative animate-sheet-up sm:animate-none">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">Link Mobile Barcode Scanner</h3>
              <p className="text-[11px] text-slate-500">Scan QR with your phone camera to pair</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-5 p-4 bg-slate-50 rounded-xl border border-slate-200/80 mb-4">
          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs shrink-0">
            <QRCode value={scannerUrl} size={124} />
          </div>

          <div className="flex-1 flex flex-col justify-between space-y-3 w-full">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Session Channel</p>
              <p className="text-xl font-black font-mono text-brand-900 tracking-wider">
                {sessionId}
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
                <span className="text-[11px] font-semibold text-slate-600">
                  {isConnected ? 'Realtime Connected' : 'Waiting for connection...'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopy}
              className="w-full py-2 px-3 border border-slate-200 bg-white hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5 transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <LinkIcon className="w-3.5 h-3.5 text-slate-500" />}
              <span>{copied ? 'Link Copied!' : 'Copy Scanner Link'}</span>
            </button>
          </div>
        </div>

        <div className="bg-brand-50/60 p-3 rounded-xl border border-brand-100 text-xs text-brand-900 space-y-1 mb-4">
          <p className="font-bold flex items-center gap-1">
            <Wifi className="w-3.5 h-3.5 text-brand-700" />
            How Remote Scanning Works:
          </p>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Open the link on any smartphone camera. Scanned barcodes instantly add items to this invoice ticket with zero typing.
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 bg-gradient-to-r from-brand-800 to-brand-900 hover:from-brand-900 hover:to-brand-950 text-white rounded-xl text-xs font-bold transition shadow-sm"
        >
          Done
        </button>
      </div>
    </div>
  );
};
