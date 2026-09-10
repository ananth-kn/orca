import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import {
  AlertTriangle,
  X,
  Phone,
  Radio,
  Share2,
  Copy,
  Check,
} from 'lucide-react';
import { readSosContact } from '../utils/sos';

export const SOSModal: React.FC = () => {
  const { isSOSOpen, setSOSOpen, location } = useAppStore();
  const [copied, setCopied] = useState(false);

  if (!isSOSOpen || !location) return null;

  // Read the currently selected SOS contact each render so it always reflects profile settings
  const sos = readSosContact();

  const lat = location.lat.toFixed(4);
  const lng = location.lng.toFixed(4);
  const coordsStr = `${lat}° N, ${lng}° E`;

  const copyCoords = () => {
    navigator.clipboard?.writeText(coordsStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const smsUri = `sms:${sos.number}?body=MAYDAY%20DISTRESS%20CALL%20-%20Vessel:%20Matsya%20Sagar%20IND-KA-04.%20Position:%20${lat}N,%20${lng}E.%20Require%20Immediate%20Assistance!`;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200 select-none">
      <div className="bg-[#450A0A] border-2 border-[#EF4444] text-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar animate-in slide-in-from-bottom-6">

        {/* HEADER */}
        <div className="flex items-center justify-between pb-3 border-b border-[#EF4444]/40">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#DC2626] flex items-center justify-center text-white shadow-[0_0_15px_rgba(220,38,38,0.8)] animate-pulse">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-wider uppercase">
                EMERGENCY SOS
              </h2>
              <p className="text-xs text-[#FCA5A5] font-bold">
                {sos.label} — {sos.number}
              </p>
            </div>
          </div>

          <button
            onClick={() => setSOSOpen(false)}
            className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* 1. CURRENT GPS COORDINATES CARD */}
        <div className="bg-[#1C0404] border border-[#EF4444]/50 rounded-2xl p-4 text-center space-y-2 shadow-inner">
          <span className="text-[10px] font-black tracking-widest text-[#FCA5A5] uppercase block">
            Your Exact GPS Coordinates (WGS-84)
          </span>
          <div className="font-mono font-black text-2xl sm:text-3xl text-white tracking-wider">
            {coordsStr}
          </div>
          <button
            onClick={copyCoords}
            className="inline-flex items-center space-x-1.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold px-4 py-1.5 rounded-full transition active:scale-95 shadow"
          >
            {copied ? <Check size={14} className="text-[#86EFAC]" /> : <Copy size={14} />}
            <span>{copied ? 'Coordinates Copied!' : 'Copy GPS Coordinates'}</span>
          </button>
        </div>

        {/* 2. DIRECT ONE-TAP CALL (uses selected SOS number) */}
        <a
          href={`tel:${sos.number}`}
          className="w-full bg-[#DC2626] hover:bg-[#B91C1C] active:scale-95 p-4 rounded-2xl border border-white/30 flex items-center justify-between transition shadow-lg text-white"
        >
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-xl bg-white text-[#DC2626] flex items-center justify-center font-black">
              <Phone size={24} />
            </div>
            <div>
              <div className="font-black text-base sm:text-lg leading-tight">
                CALL {sos.label.toUpperCase()}
              </div>
              <div className="text-xs text-red-100">{sos.description ?? 'Tap to call'}</div>
            </div>
          </div>
          <span className="font-mono text-2xl font-black">{sos.number}</span>
        </a>

        {/* 3. DISPATCH SMS BUTTON (uses selected SOS number) */}
        <a
          href={smsUri}
          className="w-full bg-[#7F1D1D] hover:bg-[#991B1B] active:scale-95 p-3.5 rounded-2xl border border-[#EF4444]/50 flex items-center justify-center space-x-2 transition shadow text-white font-black text-sm"
        >
          <Share2 size={18} />
          <span>SEND EMERGENCY SMS WITH GPS</span>
        </a>

        {/* 4. VHF CHANNEL 16 MAYDAY SCRIPT */}
        <div className="bg-[#1C0404] border border-[#EF4444]/40 rounded-2xl p-4 space-y-2">
          <div className="flex items-center space-x-2 text-xs font-black text-[#FCA5A5] uppercase tracking-wider">
            <Radio size={16} className="text-[#EF4444]" />
            <span>Read aloud on VHF Radio (Channel 16):</span>
          </div>

          <div className="bg-black/50 p-3 rounded-xl font-mono text-xs text-red-100 space-y-1.5 border border-red-900 leading-relaxed">
            <p className="text-[#FDE68A] font-bold">"MAYDAY, MAYDAY, MAYDAY."</p>
            <p>"THIS IS BOAT <strong>MATSYA SAGAR IND-KA-04</strong>."</p>
            <p>"OUR POSITION IS <strong>{coordsStr}</strong>."</p>
            <p>"WE REQUIRE IMMEDIATE COAST GUARD ASSISTANCE. OVER."</p>
          </div>
        </div>

        {/* CANCEL / CLOSE BUTTON */}
        <button
          onClick={() => setSOSOpen(false)}
          className="w-full bg-white/20 hover:bg-white/30 text-white font-black text-sm py-3.5 rounded-2xl border border-white/20 transition active:scale-95 uppercase tracking-wider"
        >
          Cancel & Close SOS
        </button>

      </div>
    </div>
  );
};
