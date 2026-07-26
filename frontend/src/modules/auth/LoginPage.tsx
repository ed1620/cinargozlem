import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/auth.store';

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
        className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-8 space-y-5"
      >
        <div className="text-center">
          <img src="/logo.png" alt="Çınar Gözlem" className="h-16 w-auto object-contain mx-auto" />
          <p className="text-xs text-slate-500 mt-3">Kurumsal Yönetim Platformu</p>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Kullanıcı adı</label>
          <input
            className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Şifre</label>
          <input
            type="password"
            className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand text-white rounded-md py-2 text-sm font-medium hover:bg-brand-dark disabled:opacity-60"
        >
          {loading ? 'Giriş yapılıyor…' : 'Giriş Yap'}
        </button>
      </form>
    </div>
  );
}
