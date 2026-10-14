import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, AlertCircle, X } from 'lucide-react';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (decodedText: string) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({ isOpen, onClose, onScan }) => {
  const [error, setError] = useState<string | null>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      const timer = setTimeout(async () => {
        try {
          const instance = new Html5Qrcode('camera-reader');
          html5QrCodeRef.current = instance;

          const config = {
            fps: 10,
            qrbox: { width: 250, height: 150 },
            aspectRatio: 1.0,
          };

          let hasScanned = false;
          await instance.start(
            { facingMode: 'environment' },
            config,
            (decodedText) => {
              if (hasScanned) return;
              hasScanned = true;
              onScan(decodedText);
              onClose();
            },
            undefined // ignore scanning errors
          );
        } catch (err: any) {
          console.error('Failed to start barcode scanner:', err);
          setError(err?.message || 'Could not access camera. Ensure camera permissions are granted.');
        }
      }, 400);

      return () => {
        clearTimeout(timer);
        if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
          html5QrCodeRef.current.stop()
            .then(() => html5QrCodeRef.current?.clear())
            .catch(err => console.error('Failed to stop scanner:', err));
        }
      };
    }
  }, [isOpen, onScan, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl border border-slate-200 shadow-2xl overflow-hidden p-6 relative animate-sheet-up sm:animate-none">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-800 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">Live Camera Barcode Scanner</h3>
              <p className="text-[11px] text-slate-500">Scan product barcode or QR label</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="w-full relative">
          <div
            id="camera-reader"
            className="w-full overflow-hidden rounded-xl border border-slate-200 bg-black min-h-[280px]"
          />

          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 p-6 text-center rounded-xl">
              <AlertCircle className="w-9 h-9 text-rose-500 mb-2" />
              <p className="text-white text-xs font-medium mb-3">{error}</p>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-white text-slate-900 font-bold text-xs rounded-lg hover:bg-slate-100"
              >
                Close
              </button>
            </div>
          )}
        </div>

        {!error && (
          <p className="mt-3 text-center text-xs text-slate-500 italic font-medium">
            Align barcode or QR code inside the viewfinder
          </p>
        )}

        <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
