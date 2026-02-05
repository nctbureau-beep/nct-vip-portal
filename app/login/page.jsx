'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [profileId, setProfileId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const profile = searchParams.get('profile');
    if (profile) setProfileId(profile.toUpperCase());
    const token = localStorage.getItem('nct_token');
    if (token) router.push('/dashboard');
  }, [searchParams, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId, password }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error);
        setLoading(false);
        return;
      }

      localStorage.setItem('nct_token', data.token);
      localStorage.setItem('nct_profile', JSON.stringify(data.profile));
      router.push('/dashboard');
    } catch (err) {
      setError('حدث خطأ في الاتصال');
      setLoading(false);
    }
  };

  const profileFromUrl = searchParams.get('profile');

  return (
    <>
      <div className="text-center mb-6">
        <img src="https://lh3.googleusercontent.com/d/16mvURK3b4RO5d_1TDVN7u9kup5Yl4Gw7" alt="NCT" className="w-20 h-20 mx-auto rounded-2xl shadow-lg mb-4" onError={(e) => e.target.style.display='none'} />
        <h1 className="text-2xl font-bold text-slate-800">بوابة العملاء المميزين</h1>
        <p className="text-slate-500 text-sm mt-1">VIP Customer Portal</p>
      </div>

      {profileId && (
        <div className="flex justify-center mb-4">
          <span className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-400 text-white px-4 py-1.5 rounded-full text-sm font-semibold shadow-md">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm0 3a1 1 0 011-1h12a1 1 0 110 2H6a1 1 0 01-1-1z"/></svg>
            {profileId}
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {!profileFromUrl && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">رقم العضوية</label>
            <input type="text" value={profileId} onChange={(e) => setProfileId(e.target.value.toUpperCase())} placeholder="NCTV-10" className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl bg-slate-50 text-lg font-mono tracking-wider text-left" dir="ltr" disabled={loading} />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">كلمة المرور</label>
          <div className="relative">
            <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value.toUpperCase())} placeholder={showPassword ? "ABC12345" : "••••••••"} className="w-full px-4 py-3 pe-12 border-2 border-slate-200 rounded-xl bg-slate-50 text-lg font-mono tracking-wider text-left placeholder:text-slate-300" dir="ltr" disabled={loading} />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              {showPassword ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
            <span>{error}</span>
          </div>
        )}

        <button type="submit" disabled={loading || !profileId || !password} className="w-full py-4 bg-gradient-to-r from-slate-800 to-slate-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
          {loading ? (<><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>جاري التحقق...</span></>) : (<><span>تسجيل الدخول</span><svg className="w-5 h-5 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg></>)}
        </button>
      </form>

      <div className="mt-6 pt-6 border-t border-slate-100 text-center">
        <p className="text-slate-400 text-sm mb-3">تحتاج مساعدة؟</p>
        <a href="https://wa.me/9647735500707" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          تواصل عبر واتساب
        </a>
        <p className="text-slate-400 text-xs mt-2" dir="ltr">+964 773 550 0707</p>
      </div>
    </>
  );
}

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-8 h-8 border-3 border-slate-200 border-t-amber-500 rounded-full animate-spin" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #1a365d 100%)',
    }}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-amber-500/5 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 animate-fadeIn">
        <Suspense fallback={<LoadingFallback />}>
          <LoginForm />
        </Suspense>
      </div>

      <div className="absolute bottom-4 text-center text-white/50 text-xs">
        <p>© 2026 National Company for Translation</p>
      </div>
    </div>
  );
}
