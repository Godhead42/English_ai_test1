import { useState } from 'react';
import { motion } from 'framer-motion';
import { GraduationCap, Mail, Lock, User, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';
import API_BASE_URL from '../apiConfig';
import { t, type Lang } from '../i18n';

interface AuthPageProps {
  onAuth: (token: string, user: { id: number; email: string; name: string; level: string }) => void;
  onBack?: () => void;
  lang: Lang;
}

export default function AuthPage({ onAuth, onBack, lang }: AuthPageProps) {
  const urlParams = new URLSearchParams(window.location.search);
  const initialToken = urlParams.get('token');
  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'reset'>(initialToken ? 'reset' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    
    if (mode === 'reset' && password !== confirmPassword) {
      setError(t('auth.passwords_mismatch', lang));
      return;
    }

    setLoading(true);

    let url = `${API_BASE_URL}/api/auth/login`;
    let body: any = {};

    if (mode === 'login') {
      body = { email, password };
    } else if (mode === 'register') {
      url = `${API_BASE_URL}/api/auth/register`;
      body = { email, password, name };
    } else if (mode === 'forgot') {
      url = `${API_BASE_URL}/api/auth/forgot-password`;
      body = { email };
    } else if (mode === 'reset') {
      url = `${API_BASE_URL}/api/auth/reset-password`;
      body = { token: initialToken, new_password: password };
    }

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || (lang === 'ru' ? 'Что-то пошло не так' : 'Something went wrong'));
        return;
      }

      if (mode === 'forgot') {
        setMessage(t('auth.forgot_success', lang));
      } else if (mode === 'reset') {
        setMessage(t('auth.reset_success', lang));
        setMode('login');
        setPassword('');
        setConfirmPassword('');
        // Clean URL
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('token');
        window.history.replaceState({}, '', newUrl);
      } else {
        onAuth(data.token, data.user);
      }
    } catch {
      setError(lang === 'ru' ? 'Не удалось подключиться к серверу.' : 'Could not connect to server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden text-slate-100 font-sans">
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-brand-600/20 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/20 blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-panel max-w-md w-full p-8 md:p-10 relative z-10 border border-white/10 shadow-2xl rounded-3xl"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-400 to-blue-600 flex items-center justify-center shadow-lg shadow-brand-500/30 mb-4">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">AI English Coach</h1>
          <p className="text-slate-400 text-sm mt-1">
            {lang === 'ru' ? 'Улучшайте произношение с ИИ' : 'Improve your pronunciation with AI'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm text-center">
            {error}
          </div>
        )}
        
        {message && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm text-center">
            {message}
          </div>
        )}

        {(mode === 'login' || mode === 'register') && (
          <div className="flex bg-white/5 rounded-xl p-1 mb-6">
            <button
              onClick={() => { setMode('login'); setError(''); setMessage(''); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold tracking-wide transition-all ${
                mode === 'login'
                  ? 'bg-brand-500 text-slate-950 shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t('auth.login_tab', lang)}
            </button>
            <button
              onClick={() => { setMode('register'); setError(''); setMessage(''); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold tracking-wide transition-all ${
                mode === 'register'
                  ? 'bg-brand-500 text-slate-950 shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t('auth.register_tab', lang)}
            </button>
          </div>
        )}

        {mode === 'forgot' && (
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-white mb-2">{t('auth.forgot_title', lang)}</h2>
            <p className="text-sm text-slate-400">{t('auth.forgot_subtitle', lang)}</p>
          </div>
        )}

        {mode === 'reset' && (
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-white mb-2">{t('auth.reset_title', lang)}</h2>
            <p className="text-sm text-slate-400">{t('auth.reset_subtitle', lang)}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'forgot' && (
            <>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder={t('auth.email', lang)} required
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white focus:outline-none focus:border-brand-500/50 transition-colors placeholder-slate-500"
                />
              </div>
              <button
                type="submit" disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-500 to-blue-600 hover:from-brand-400 hover:to-blue-500 text-white font-bold text-sm tracking-wide shadow-xl shadow-brand-500/20 hover:shadow-brand-500/40 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('auth.forgot_btn', lang)}
              </button>
            </>
          )}

          {mode === 'reset' && (
            <>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder={t('auth.new_password', lang)} required minLength={4}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white focus:outline-none focus:border-brand-500/50 transition-colors placeholder-slate-500"
                />
              </div>
              <div className="relative mt-4">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  placeholder={t('auth.confirm_password', lang)} required minLength={4}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white focus:outline-none focus:border-brand-500/50 transition-colors placeholder-slate-500"
                />
              </div>
              <button
                type="submit" disabled={loading}
                className="w-full py-3 rounded-xl mt-4 bg-gradient-to-r from-brand-500 to-blue-600 hover:from-brand-400 hover:to-blue-500 text-white font-bold text-sm tracking-wide shadow-xl shadow-brand-500/20 hover:shadow-brand-500/40 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('auth.reset_btn', lang)}
              </button>
            </>
          )}

          {(mode === 'login' || mode === 'register') && (
            <>
              {mode === 'register' && (
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text" value={name} onChange={e => setName(e.target.value)}
                    placeholder={t('auth.name', lang)} required
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white focus:outline-none focus:border-brand-500/50 transition-colors placeholder-slate-500"
                  />
                </div>
              )}
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder={t('auth.email', lang)} required
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white focus:outline-none focus:border-brand-500/50 transition-colors placeholder-slate-500"
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder={t('auth.password', lang)} required minLength={4}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white focus:outline-none focus:border-brand-500/50 transition-colors placeholder-slate-500"
                />
              </div>
              <button
                type="submit" disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-500 to-blue-600 hover:from-brand-400 hover:to-blue-500 text-white font-bold text-sm tracking-wide shadow-xl shadow-brand-500/20 hover:shadow-brand-500/40 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    {mode === 'login' ? t('auth.login_btn', lang) : t('auth.register_btn', lang)}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </>
          )}
        </form>

        {mode === 'login' && (
          <div className="mt-4 text-center">
            <button
              onClick={() => { setMode('forgot'); setError(''); setMessage(''); }}
              className="text-xs text-brand-300 hover:text-white transition-colors hover:underline"
            >
              {t('auth.forgot', lang)}
            </button>
          </div>
        )}
        
        {(mode === 'forgot' || mode === 'reset') && (
           <div className="mt-4 text-center">
             <button
               onClick={() => {
                 setMode('login');
                 setError('');
                 setMessage('');
                 const newUrl = new URL(window.location.href);
                 newUrl.searchParams.delete('token');
                 window.history.replaceState({}, '', newUrl);
               }}
               className="text-xs text-brand-300 hover:text-white transition-colors hover:underline flex items-center justify-center gap-1 mx-auto"
             >
               <ArrowLeft className="w-3 h-3" />
               {t('auth.forgot_back', lang)}
             </button>
           </div>
        )}

        {onBack && (
          <button
            onClick={onBack}
            className="w-full mt-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 text-sm font-medium hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('auth.back', lang)}
          </button>
        )}
      </motion.div>
    </div>
  );
}
