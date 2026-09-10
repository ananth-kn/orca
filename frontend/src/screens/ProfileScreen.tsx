import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import {
  Globe,
  User,
  Wifi,
  WifiOff,
  Bell,
  LogOut,
  Info,
  Phone,
  ChevronDown,
  LifeBuoy,
} from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '../utils/translations';
import {
  SOS_CONTACTS,
  readSosContact,
  writeSosContact,
  type SosContact,
} from '../utils/sos';

function readStored(key: string, fallback = ''): string {
  if (typeof window === 'undefined') return fallback;
  return window.localStorage.getItem(key) || fallback;
}
function writeStored(key: string, value: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, value);
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`relative shrink-0 rounded-full transition-colors ${on ? 'bg-emerald-500' : 'bg-white/15'}`}
      style={{ width: 44, height: 24 }}
    >
      <span
        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${on ? 'left-[20px]' : 'left-0.5'}`}
      />
    </button>
  );
}

export const ProfileScreen: React.FC = () => {
  const { language, setLanguage, isOffline, setOffline } = useAppStore();

  // Profile fields
  const [name, setName] = useState(() => readStored('orca_name', 'Fishing Crew'));
  const [email, setEmail] = useState(() => readStored('orca_email', ''));
  const [phone, setPhone] = useState(() => readStored('orca_phone', ''));
  const [saved, setSaved] = useState(false);

  // SOS emergency number
  const [sosContact, setSosContact] = useState<SosContact>(() => readSosContact());

  // Emergency contact
  const [emergencyName, setEmergencyName] = useState(() => readStored('orca_emer_name', ''));
  const [emergencyRelation, setEmergencyRelation] = useState(() => readStored('orca_emer_relation', ''));
  const [emergencyPhone, setEmergencyPhone] = useState(() => readStored('orca_emer_phone', ''));

  // Toggles
  const [sosAlert, setSosAlert] = useState(() => readStored('orca_sos_alert', '1') === '1');
  const [notifications, setNotifications] = useState(true);

  const handleSaveProfile = () => {
    writeStored('orca_name', name);
    writeStored('orca_email', email);
    writeStored('orca_phone', phone);
    writeStored('orca_emer_name', emergencyName);
    writeStored('orca_emer_relation', emergencyRelation);
    writeStored('orca_emer_phone', emergencyPhone);
    writeStored('orca_sos_alert', sosAlert ? '1' : '0');
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  const handleSignOut = () => {
    ['orca_user_id', 'orca_lang', 'orca_name', 'orca_email', 'orca_phone',
     'orca_emer_name', 'orca_emer_relation', 'orca_emer_phone'].forEach((k) =>
      window.localStorage.removeItem(k)
    );
    window.dispatchEvent(new CustomEvent('orca:login-ok'));
  };

  const inputCls =
    'w-full bg-white/[0.05] border border-white/10 rounded-xl px-3.5 py-2.5 text-white text-sm placeholder-white/30 outline-none focus:border-sky-400/60 focus:bg-white/[0.07]';

  const cardCls = 'bg-white/[0.04] border border-white/[0.08] rounded-2xl overflow-hidden';
  const sectionTitleCls = 'flex items-center gap-2.5 px-4 pt-4 pb-1';
  const sectionBodyCls = 'px-4 pb-4 space-y-3';

  return (
    <div className="min-h-full pb-24 px-4 sm:px-6 max-w-xl mx-auto bg-[#0f1535] text-white select-none">

      {/* ── Profile Header ────────────────────────────── */}
      <div className="flex items-center gap-4 px-1 pt-6 pb-5">
        <div className="w-14 h-14 rounded-full bg-[#1565C0] flex items-center justify-center text-xl font-bold shrink-0">
          {name.trim().charAt(0).toUpperCase() || 'U'}
        </div>
        <div className="min-w-0">
          <h1 className="text-lg font-bold truncate">{name}</h1>
          <p className="text-xs text-white/45 truncate">
            {email || 'No email added'}
            {phone ? ` · ${phone}` : ''}
          </p>
        </div>
      </div>

      {/* ── Edit Profile ──────────────────────────────── */}
      <div className={`${cardCls} mb-3`}>
        <div className={sectionTitleCls}>
          <User size={16} className="text-white/50" />
          <h2 className="text-sm font-bold">Edit Profile</h2>
        </div>
        <div className={sectionBodyCls}>
          <div>
            <label className="text-[11px] font-semibold text-white/50 block mb-1">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-white/50 block mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-white/50 block mb-1">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 00000 00000"
              className={inputCls}
            />
          </div>
          <button
            onClick={handleSaveProfile}
            className="w-full bg-[#1565C0] hover:bg-[#1976D2] text-white font-semibold text-sm py-2.5 rounded-xl active:scale-[0.98] transition-transform"
          >
            {saved ? 'Saved' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* ── SOS & Emergency ───────────────────────────── */}
      <div className={`${cardCls} mb-3`}>
        <div className={sectionTitleCls}>
          <LifeBuoy size={16} className="text-red-400/70" />
          <h2 className="text-sm font-bold">SOS & Emergency</h2>
        </div>
        <div className={sectionBodyCls}>

          {/* SOS Number selector (dropdown) */}
          <div>
            <label className="text-[11px] font-semibold text-white/50 block mb-1">SOS Number</label>
            <div className="relative">
              <select
                value={sosContact.id}
                onChange={(e) => {
                  const chosen = SOS_CONTACTS.find((c) => c.id === e.target.value);
                  if (chosen) {
                    setSosContact(chosen);
                    writeSosContact(chosen.id);
                  }
                }}
                className="w-full appearance-none bg-white/[0.05] border border-white/10 rounded-xl pl-3.5 pr-10 py-2.5 text-white text-sm outline-none transition-colors focus:border-sky-400/60 focus:bg-white/[0.07] cursor-pointer"
              >
                {SOS_CONTACTS.map((c) => (
                  <option key={c.id} value={c.id} className="bg-[#0f1535] text-white">
                    {c.label} — {c.number}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40" />
            </div>
            {sosContact.description && (
              <p className="text-[11px] text-white/40 mt-1">{sosContact.description}</p>
            )}
          </div>

          {/* Quick-call button */}
          <a
            href={`tel:${sosContact.number}`}
            className="w-full bg-red-600/80 hover:bg-red-600 active:scale-[0.98] transition-all rounded-xl py-3 flex items-center justify-center gap-2 text-white font-bold text-sm border border-red-500/20"
          >
            <Phone size={16} />
            Call {sosContact.label}
          </a>

          {/* Divider */}
          <div className="border-t border-white/[0.06]" />

          {/* Emergency Contact fields */}
          <div>
            <label className="text-[11px] font-semibold text-white/50 block mb-1">Emergency Contact Name</label>
            <input
              type="text"
              value={emergencyName}
              onChange={(e) => setEmergencyName(e.target.value)}
              placeholder="Contact name"
              className={inputCls}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-semibold text-white/50 block mb-1">Relation</label>
              <input
                type="text"
                value={emergencyRelation}
                onChange={(e) => setEmergencyRelation(e.target.value)}
                placeholder="Father / Spouse"
                className={inputCls}
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-white/50 block mb-1">Phone</label>
              <input
                type="tel"
                value={emergencyPhone}
                onChange={(e) => setEmergencyPhone(e.target.value)}
                placeholder="+91 00000 00000"
                className={inputCls}
              />
            </div>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="text-sm text-white/70">Alert this contact on SOS</span>
            <Toggle on={sosAlert} onClick={() => setSosAlert((v) => !v)} />
          </div>
        </div>
      </div>

      {/* ── Preferences (Offline + Notifications) ────── */}
      <div className={`${cardCls} mb-3`}>
        <div className="flex items-center justify-between px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            {isOffline ? <WifiOff size={16} className="text-amber-400" /> : <Wifi size={16} className="text-emerald-400" />}
            <div>
              <div className="text-sm font-bold">Offline Mode</div>
              <div className="text-[11px] text-white/40">Use cached data beyond cellular range</div>
            </div>
          </div>
          <Toggle on={isOffline} onClick={() => setOffline(!isOffline)} />
        </div>
        <div className="border-t border-white/[0.06]" />
        <div className="flex items-center justify-between px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <Bell size={16} className="text-white/50" />
            <span className="text-sm font-bold">Marine Notifications</span>
          </div>
          <Toggle on={notifications} onClick={() => setNotifications((v) => !v)} />
        </div>
      </div>

      {/* ── Language ──────────────────────────────────── */}
      <div className={`${cardCls} mb-3`}>
        <div className={sectionTitleCls}>
          <Globe size={16} className="text-white/50" />
          <h2 className="text-sm font-bold">Language</h2>
        </div>
        <div className={`${sectionBodyCls} pt-2`}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {SUPPORTED_LANGUAGES.map((l) => {
              const isSelected = language === l.code;
              return (
                <button
                  key={l.code}
                  onClick={() => setLanguage(l.code)}
                  className={`px-3 py-2 rounded-xl border text-left text-xs font-semibold ${
                    isSelected
                      ? 'bg-[#1565C0] border-[#1565C0] text-white'
                      : 'bg-white/[0.04] border-white/10 text-white/70 hover:bg-white/[0.08]'
                  }`}
                >
                  {l.nativeLabel}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── About ─────────────────────────────────────── */}
      <div className={`${cardCls} mb-3`}>
        <div className="flex items-center gap-2.5 px-4 py-3.5">
          <Info size={16} className="text-white/50" />
          <div>
            <div className="text-sm font-bold">ORCA Marine</div>
            <div className="text-[11px] text-white/40">Smart India Hackathon ISRO 26176</div>
          </div>
        </div>
      </div>

      {/* ── Sign out ──────────────────────────────────── */}
      <button
        onClick={handleSignOut}
        className="w-full bg-red-500/10 hover:bg-red-500/20 border border-red-400/30 rounded-2xl py-3 flex items-center justify-center gap-2 text-red-300 font-semibold text-sm mb-4 active:scale-[0.98] transition-transform"
      >
        <LogOut size={16} />
        Sign Out
      </button>
    </div>
  );
};
