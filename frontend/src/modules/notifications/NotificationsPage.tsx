import { useEffect, useState } from 'react';
import { Can } from '../../components/Can';
import { Badge, Button, Card, fmtDate, PageHeader } from '../../components/ui';
import { notificationsApi } from '../../services/domain';

const tone: Record<string, any> = { CRITICAL: 'red', WARNING: 'amber', INFO: 'blue' };

export function NotificationsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = () => notificationsApi.list(onlyUnread).then(setItems);
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [onlyUnread]);

  const runChecks = async () => {
    setBusy(true);
    try { await notificationsApi.runChecks(); await load(); } finally { setBusy(false); }
  };

  return (
    <div>
      <PageHeader
        title="Uyarılar"
        subtitle="Sigorta/muayene, ödenmemiş maaş, negatif bakiye ve izin uyarıları"
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => notificationsApi.markAllRead().then(load)}>Tümünü okundu yap</Button>
            <Can module="NOTIFICATIONS" action="UPDATE"><Button onClick={runChecks} disabled={busy}>{busy ? 'Taranıyor…' : 'Şimdi tara'}</Button></Can>
          </div>
        }
      />
      <label className="flex items-center gap-2 text-sm mb-3">
        <input type="checkbox" className="h-4 w-4 accent-brand" checked={onlyUnread} onChange={(e) => setOnlyUnread(e.target.checked)} />
        Sadece okunmamışlar
      </label>

      <div className="space-y-2">
        {items.length === 0 && <Card className="p-6 text-center text-slate-400 text-sm">Uyarı yok.</Card>}
        {items.map((n) => (
          <Card key={n.id} className={`p-4 flex items-start justify-between gap-3 ${n.isRead ? 'opacity-60' : ''}`}>
            <div>
              <div className="flex items-center gap-2">
                <Badge tone={tone[n.severity]}>{n.severity}</Badge>
                <span className="font-medium">{n.title}</span>
              </div>
              <p className="text-sm text-slate-600 mt-1">{n.message}</p>
              <div className="text-xs text-slate-400 mt-1">{fmtDate(n.createdAt)}</div>
            </div>
            {!n.isRead && (
              <Can module="NOTIFICATIONS" action="UPDATE">
                <Button size="sm" variant="ghost" onClick={() => notificationsApi.markRead(n.id).then(load)}>Okundu</Button>
              </Can>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
