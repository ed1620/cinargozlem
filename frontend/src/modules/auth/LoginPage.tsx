import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/auth.store';
import { inputCls } from '../../components/ui';

export function LoginPage() {
  const login = useAuth((s) => s.login);
  const loading = useAuth((s) => s.loading);
  const navigate = useNavigate();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(username, password);
      navigate('/');
    } catch {
      setError('Kullanıcı adı veya şifre hatalı.');
    }
  };

  return (
    <div className="min-h-full grid place-items-center p-4 bg-gradient-to-br from-sage-dark via-ink to-ink">
      <form
        onSubmit={onSubmit}
        className="card-rise w-full max-w-sm bg-white rounded-2xl shadow-2xl p-8 space-y-5"
      >
        <div className="text-center">
          <img src="/logo.png" alt="Çınar Gözlem" className="h-16 w-auto object-contain mx-auto" />
          <p className="text-xs text-slate-500 mt-3">Kurumsal Yönetim Platformu</p>
        </div>

        {/* Alanlar uygulamanın geri kalanıyla aynı sınıfı kullanıyor: aynı
            görünen şey her yerde aynı davranmalı. */}
        <label className="block space-y-1">
          <span className="text-sm font-medium">Kullanıcı adı</span>
          <input
            className={inputCls}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoFocus
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">Şifre</span>
          <input
            type="password"
            className={inputCls}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>

        {/* role="alert" — hata yalnızca göze değil, ekran okuyucuya da
            duyurulur. Belirişi ani kesme değil, kısa bir geçiş. */}
        {error && (
          <div role="alert" className="card-rise text-sm text-red-600">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="press-feedback w-full bg-brand text-white rounded-md py-2 text-sm font-medium hover:bg-brand-dark active:bg-brand-dark disabled:opacity-60 disabled:active:scale-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
        >
          {loading ? 'Giriş yapılıyor…' : 'Giriş Yap'}
        </button>
      </form>
    </div>
  );
}
