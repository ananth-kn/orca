import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { SUPPORTED_LANGUAGES } from '../utils/translations';
import { Eye, EyeOff, AlertCircle, Check, Loader2, Globe, ChevronDown } from 'lucide-react';
import { t } from '../utils/translations';

type Mode = 'signin' | 'register' | 'forgot';

export const LoginScreen: React.FC = () => {
  const { setLanguage, setUserId, setUserProfile, setActiveTab } = useAppStore();
  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [language, setLanguageState] = useState('English');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);

  const lang = useAppStore((s) => s.language);
  const currentLang = useMemo(() => lang || 'English', [lang]);

  const selectedLangObj = useMemo(
    () => SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0],
    [language],
  );

  const handleLanguageChange = (langCode: string) => {
    setLanguageState(langCode);
    setLanguage(langCode);
    setLangDropdownOpen(false);
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setSuccess(null);
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const validatePhone = (p: string) => /^\d{10}$/.test(p.replace(/\D/g, ''));
  const validateForm = () => {
    if (!name.trim()) return t('login_error_required', currentLang);

    if (mode === 'forgot') {
      if (!phone.trim()) return t('login_error_required', currentLang);
      if (!validatePhone(phone)) return t('login_error_phone', currentLang);
    }

    if (mode === 'forgot' || mode === 'register') {
      if (!password || password.length < 6) return t('login_error_password', currentLang);
      if (password !== confirmPassword) return t('login_error_match', currentLang);
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
      const endpoint = `${API_BASE_URL}/api/user/login`;

      if (mode === 'forgot') {
        const res = await fetch(`${API_BASE_URL}/api/user/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim(), phone: phone.replace(/\D/g, ''), new_password: password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || t('forgot_error_server', currentLang));
        setSuccess(data.message || t('forgot_success', currentLang));
        setTimeout(() => {
          setMode('signin');
          setPassword('');
          setConfirmPassword('');
        }, 2000);
        setLoading(false);
        return;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          password: password || undefined,
          language: language,
          mode: mode === 'register' ? 'register' : 'login',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || t('login_error_backend', currentLang));
      }

      const savedLanguage = data.language || language;

      // Persist identity & set reactive store state so the app navigates instantly.
      setUserId(String(data.id));
      setLanguage(savedLanguage);
      setUserProfile({
        name: data.name,
        phone: data.phone || '',
        emergencyPhone: data.emergency_phone || '',
      });
      localStorage.setItem('orca_lang', savedLanguage);
      localStorage.setItem('orca_user_name', data.name);

      setSuccess(t('login_success', currentLang, { name: data.name, lang: savedLanguage }));

      setTimeout(() => {
        setActiveTab('home');
      }, 1000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('login_error_backend', currentLang);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const renderLanguageDropdown = () => (
    <div className="relative">
      <label className="block text-xs font-bold text-white/60 mb-1">{t('login_language', currentLang)}</label>
      <button
        type="button"
        onClick={() => setLangDropdownOpen(!langDropdownOpen)}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white flex items-center justify-between hover:bg-white/8 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Globe size={16} className="text-white/50" />
          <span className="text-sm">
            {selectedLangObj.nativeLabel}
            <span className="text-white/40 ml-1.5">({selectedLangObj.label})</span>
          </span>
        </div>
        <ChevronDown
          size={16}
          className={`text-white/50 transition-transform ${langDropdownOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {langDropdownOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setLangDropdownOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a2147] border border-white/10 rounded-xl shadow-2xl z-20 max-h-52 overflow-y-auto custom-scrollbar">
            {SUPPORTED_LANGUAGES.map((l) => {
              const isSelected = language === l.code;
              return (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => handleLanguageChange(l.code)}
                  className={`w-full px-4 py-2.5 text-left flex items-center justify-between text-sm transition-colors ${
                    isSelected
                      ? 'bg-blue-600/30 text-blue-300'
                      : 'text-white/80 hover:bg-white/5'
                  }`}
                >
                  <div>
                    <span className="font-medium">{l.nativeLabel}</span>
                    <span className="text-white/40 ml-1.5 text-xs">{l.label}</span>
                  </div>
                  {isSelected && <Check size={14} className="text-blue-400" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );

  /* ---- Sign In form (simple: name, phone, password only) ---- */
  const renderSignInForm = () => (
    <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-white/60">{t('login_name', currentLang)}</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('login_name_ph', currentLang)}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 outline-none focus:border-blue-400 transition-colors"
          required
          autoComplete="name"
        />
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-white/60">{t('login_password', currentLang)}</label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('login_password_ph', currentLang)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 outline-none focus:border-blue-400 pr-12 transition-colors"
            required
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 text-sm">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-300 text-sm">
          <Check size={16} />
          <span>{success}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 size={20} className="animate-spin" />
            <span>{t('login_btn_signin', currentLang)}</span>
          </>
        ) : (
          t('login_btn_signin', currentLang)
        )}
      </button>

      <p className="text-center text-[11px] text-white/40">{t('login_terms', currentLang)}</p>

      <div className="space-y-3 pt-1">
        <button
          type="button"
          onClick={() => {
            setMode('forgot');
            setError(null);
            setSuccess(null);
            setPassword('');
            setConfirmPassword('');
          }}
          className="w-full text-center text-xs text-white/50 hover:text-white"
        >
          {t('login_forgot', currentLang)}
        </button>

        <div className="flex items-center justify-center gap-1.5 text-sm">
          <span className="text-white/50">Don't have an account?</span>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
              setSuccess(null);
            }}
            className="text-blue-400 hover:text-blue-300 font-semibold"
          >
            {t('login_tab_register', currentLang)}
          </button>
        </div>
      </div>
    </form>
  );

  /* ---- Register form (full: name, phone, emergency, password, confirm, language) ---- */
  const renderRegisterForm = () => (
    <form onSubmit={handleSubmit} className="space-y-3" noValidate>
      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-white/60">{t('login_name', currentLang)}</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('login_name_ph', currentLang)}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 outline-none focus:border-blue-400 transition-colors"
          required
          autoComplete="name"
        />
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-white/60">{t('login_password', currentLang)}</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('login_password_ph', currentLang)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white placeholder-white/40 outline-none focus:border-blue-400 pr-10 text-sm transition-colors"
              required
              autoComplete="new-password"
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-white/60">{t('login_confirm_password', currentLang)}</label>
          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t('login_confirm_password', currentLang)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white placeholder-white/40 outline-none focus:border-blue-400 pr-10 text-sm transition-colors"
              required
              autoComplete="new-password"
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
            >
              {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
      </div>

      {renderLanguageDropdown()}

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 text-sm">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-300 text-sm">
          <Check size={16} />
          <span>{success}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 size={20} className="animate-spin" />
            <span>{t('login_btn_register', currentLang)}</span>
          </>
        ) : (
          t('login_btn_register', currentLang)
        )}
      </button>

      <p className="text-center text-[11px] text-white/40">{t('login_terms', currentLang)}</p>

      <div className="flex items-center justify-center gap-1.5 text-sm pt-1">
        <span className="text-white/50">Already have an account?</span>
        <button
          type="button"
          onClick={() => {
            setMode('signin');
            setError(null);
            setSuccess(null);
            setPassword('');
            setConfirmPassword('');
          }}
          className="text-blue-400 hover:text-blue-300 font-semibold"
        >
          {t('login_tab_signin', currentLang)}
        </button>
      </div>
    </form>
  );

  /* ---- Forgot password form ---- */
  const renderForgotForm = () => (
    <form onSubmit={handleSubmit} className="space-y-3" noValidate>
      <p className="text-center text-sm text-white/60">{t('forgot_desc', currentLang)}</p>

      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-white/60">{t('forgot_name', currentLang)}</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('forgot_name_ph', currentLang)}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 outline-none focus:border-blue-400 transition-colors"
          required
          autoComplete="name"
        />
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-white/60">{t('forgot_phone', currentLang)}</label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder={t('forgot_phone_ph', currentLang)}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 outline-none focus:border-blue-400 transition-colors"
          required
          autoComplete="tel"
          maxLength={10}
        />
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-white/60">{t('forgot_new_password', currentLang)}</label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('forgot_new_password_ph', currentLang)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 outline-none focus:border-blue-400 pr-12 transition-colors"
            required
            autoComplete="new-password"
            minLength={6}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-white/60">{t('login_confirm_password', currentLang)}</label>
        <div className="relative">
          <input
            type={showConfirmPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder={t('login_confirm_password', currentLang)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 outline-none focus:border-blue-400 pr-12 transition-colors"
            required
            autoComplete="new-password"
            minLength={6}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
          >
            {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 text-sm">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-300 text-sm">
          <Check size={16} />
          <span>{success}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 size={20} className="animate-spin" />
            <span>{t('forgot_btn', currentLang)}</span>
          </>
        ) : (
          t('forgot_btn', currentLang)
        )}
      </button>

      <button
        type="button"
        onClick={() => {
          setMode('signin');
          setError(null);
          setSuccess(null);
          setPassword('');
          setConfirmPassword('');
        }}
        className="w-full text-center text-xs text-white/50 hover:text-white pt-1"
      >
        {t('forgot_back', currentLang)}
      </button>
    </form>
  );

  return (
    <div className="min-h-screen h-screen bg-[#0f1535] text-white flex flex-col overflow-hidden">
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="min-h-full flex flex-col items-center justify-center p-4 py-8">
          {/* Header with orca branding */}
          <div className="text-center space-y-2.5 mb-6">
            <h1 className="text-5xl font-black tracking-[0.25em] text-white uppercase">
              orca
            </h1>
            <p className="text-sm text-white/65 max-w-xs mx-auto leading-snug">
              {t('login_subtitle', currentLang)}
            </p>
          </div>

          {/* Card */}
          <div className="w-full max-w-md bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl">
            {/* Tab switcher */}
            <div className="flex gap-1 bg-white/5 rounded-xl p-1" role="tablist">
              <button
                role="tab"
                aria-selected={mode === 'signin'}
                onClick={() => {
                  if (mode === 'forgot') return;
                  switchMode('signin');
                }}
                className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold transition-colors ${
                  mode === 'signin'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                {t('login_tab_signin', currentLang)}
              </button>
              <button
                role="tab"
                aria-selected={mode === 'register'}
                onClick={() => {
                  if (mode === 'forgot') return;
                  switchMode('register');
                }}
                className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold transition-colors ${
                  mode === 'register'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                {t('login_tab_register', currentLang)}
              </button>
            </div>

            {/* Form content */}
            {mode === 'signin' && renderSignInForm()}
            {mode === 'register' && renderRegisterForm()}
            {mode === 'forgot' && renderForgotForm()}
          </div>
        </div>
      </div>

      {/* Decorative wave at bottom */}
      <div className="pointer-events-none shrink-0">
        <svg viewBox="0 0 1440 80" className="w-full h-16 text-blue-600/10" preserveAspectRatio="none">
          <path
            d="M0,40 C360,80 720,0 1080,40 C1260,60 1380,50 1440,40 L1440,80 L0,80 Z"
            fill="currentColor"
          />
          <path
            d="M0,55 C360,75 720,35 1080,55 C1260,65 1380,60 1440,55 L1440,80 L0,80 Z"
            fill="currentColor"
            fillOpacity="0.5"
          />
        </svg>
      </div>
    </div>
  );
};
