import React from 'react';
import { AlertCircle, ArrowRight, X, Clock, Navigation } from 'lucide-react';

export default function AlertBanner({ banner, onDismiss, onFocusAlert }) {
  if (!banner) return null;

  return (
    <div className="bg-gradient-to-r from-rose-950 via-rose-900 to-red-900 border-b border-rose-500/40 text-white px-4 py-3 shadow-xl relative animate-in slide-in-from-top duration-300">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center p-2 rounded-xl bg-rose-500/30 text-rose-300 border border-rose-400/40 animate-pulse">
            <AlertCircle className="w-5 h-5 text-rose-300" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-400 rounded-full animate-ping" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-xs uppercase tracking-wider bg-rose-500/30 text-rose-200 px-2 py-0.5 rounded border border-rose-400/30">
                CRITICAL DISPATCH
              </span>
              <span className="text-xs text-rose-200/80">Automated AI Detection</span>
            </div>
            <p className="font-semibold text-sm sm:text-base text-white mt-0.5">
              {banner.message}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {banner.alert && (
            <button
              onClick={() => onFocusAlert(banner.alert)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-xs font-bold text-white transition hover:scale-105"
            >
              <Navigation className="w-3.5 h-3.5 text-cyan-300" />
              <span>Track on Map</span>
            </button>
          )}

          <button
            onClick={onDismiss}
            className="p-1.5 rounded-lg text-rose-300 hover:text-white hover:bg-white/10 transition"
            title="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
}
