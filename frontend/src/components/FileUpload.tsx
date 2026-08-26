import { ChangeEvent, useState } from 'react';
import { uploadsApi } from '../services/domain';
import { IconButton } from './ui';

/**
 * Fiş/fatura/poliçe yükleme. Dosyayı /uploads'a gönderir, dönen URL'yi
 * onChange ile bildirir. value doluysa "yüklendi" linki + kaldır gösterir.
 */
export function FileUpload({
  value,
  onChange,
  kind = 'receipt',
}: {
  value?: string;
  onChange: (url: string) => void;
  kind?: 'receipt' | 'document';
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const pick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const res = kind === 'document' ? await uploadsApi.document(file) : await uploadsApi.receipt(file);
      onChange(res.url);
    } catch {
      setError('Yüklenemedi (JPG/PNG/PDF, max 10MB)');
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  };

  if (value) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <a href={value} target="_blank" rel="noreferrer" className="text-brand hover:underline inline-flex items-center gap-1">
          📎 Yüklendi
        </a>
        <IconButton tone="danger" label="Yüklenen dosyayı kaldır" onClick={() => onChange('')}>
          ×
        </IconButton>
      </div>
    );
  }

  return (
    <div>
      {/* Etiketin kendisi düğme gibi davranıyor: basma geri bildirimi ve
          klavye halkası (gizli input odaklanınca) burada görünmeli. */}
      <label className="press-feedback inline-flex items-center gap-2 text-sm border border-dashed border-slate-300 rounded-md px-3 py-2 cursor-pointer hover:bg-slate-50 hover:border-slate-400 active:bg-slate-100 text-slate-600 focus-within:ring-2 focus-within:ring-brand focus-within:outline-none">
        <input type="file" accept="image/jpeg,image/png,application/pdf" className="hidden" onChange={pick} />
        {busy ? 'Yükleniyor…' : '📎 Dosya seç (JPG/PNG/PDF)'}
      </label>
      {error && <div role="alert" className="card-rise text-xs text-red-600 mt-1">{error}</div>}
    </div>
  );
}
