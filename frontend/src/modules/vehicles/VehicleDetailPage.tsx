import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Can } from '../../components/Can';
import { FileUpload } from '../../components/FileUpload';
import {
  Badge,
  Button,
  Card,
  Field,
  fmtDate,
  fmtMoney,
  inputCls,
  Modal,
  PageHeader,
} from '../../components/ui';
import { downloadReport, vehiclesApi } from '../../services/domain';

const FUEL: Record<string, string> = { DIESEL: 'Dizel', GASOLINE: 'Benzin', LPG: 'LPG', ELECTRIC: 'Elektrik' };
type Dialog = null | 'insurance' | 'inspection' | 'fuel' | 'maintenance';

export function VehicleDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [v, setV] = useState<any>(null);
  const [fuel, setFuel] = useState<any[]>([]);
  const [maint, setMaint] = useState<any[]>([]);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [form, setForm] = useState<any>({});

  const load = () => {
    vehiclesApi.get(id).then(setV);
    vehiclesApi.fuel(id).then(setFuel);
    vehiclesApi.maintenance(id).then(setMaint);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const openDialog = (d: Dialog) => {
    const today = new Date().toISOString().slice(0, 10);
    if (d === 'insurance') setForm({ type: 'TRAFFIC', company: '', startDate: today, endDate: today, amount: '' });
    if (d === 'inspection') setForm({ inspectionDate: today, expiryDate: today });
    if (d === 'fuel') setForm({ date: today, fuelType: v?.fuelType ?? 'DIESEL', liters: '', pricePerLiter: '', odometer: '' });
    if (d === 'maintenance') setForm({ date: today, company: '', description: '', totalAmount: '', vatRate: 20 });
    setDialog(d);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (dialog === 'insurance') await vehiclesApi.addInsurance(id, { ...form, amount: form.amount ? Number(form.amount) : undefined });
    if (dialog === 'inspection') await vehiclesApi.addInspection(id, form);
    if (dialog === 'fuel') await vehiclesApi.addFuel(id, { ...form, liters: Number(form.liters), pricePerLiter: Number(form.pricePerLiter), odometer: form.odometer ? Number(form.odometer) : undefined });
    if (dialog === 'maintenance') await vehiclesApi.addMaintenance(id, { ...form, totalAmount: Number(form.totalAmount), vatRate: Number(form.vatRate) });
    setDialog(null);
    load();
  };

  if (!v) return <div className="text-slate-400">Yükleniyor…</div>;

  const daysLeft = (d: string) => Math.round((new Date(d).getTime() - Date.now()) / 86400000);

  return (
    <div>
      <PageHeader
        title={v.plate}
        subtitle={<span>{v.status === 'ACTIVE' ? <Badge tone="green">Aktif</Badge> : <Badge tone="slate">Pasif</Badge>} · {v.brand} {v.model} · {FUEL[v.fuelType] ?? ''}</span>}
        actions={
          <div className="flex gap-2">
            <Can module="VEHICLES" action="EXPORT"><Button size="sm" variant="secondary" onClick={() => downloadReport(`/reports/vehicles/${id}/history`, 'arac-gecmis.pdf')}>Geçmiş PDF</Button></Can>
            <Can module="VEHICLES" action="EXPORT"><Button size="sm" variant="secondary" onClick={() => downloadReport(`/reports/fuel/consumption?vehicleId=${id}`, 'tuketim.pdf')}>Tüketim PDF</Button></Can>
            <Button variant="secondary" onClick={() => navigate('/vehicles')}>← Liste</Button>
          </div>
        }
      />

      {/* Sigorta & Muayene */}
      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2"><h2 className="font-semibold text-sm">Sigorta / Kasko</h2><Can module="VEHICLES" action="CREATE"><Button size="sm" onClick={() => openDialog('insurance')}>+ Ekle</Button></Can></div>
          {v.insurances.length === 0 ? <div className="text-sm text-slate-400">Kayıt yok.</div> : v.insurances.map((i: any) => (
            <div key={i.id} className="flex items-center justify-between text-sm py-1.5 border-t first:border-0">
              <span>{i.type === 'KASKO' ? 'Kasko' : 'Trafik'} · {i.company}</span>
              <span className="flex items-center gap-2">
                {fmtDate(i.endDate)}
                {i.status === 'ACTIVE' ? (daysLeft(i.endDate) < 0 ? <Badge tone="red">geçti</Badge> : daysLeft(i.endDate) <= 15 ? <Badge tone="amber">{daysLeft(i.endDate)}g</Badge> : <Badge tone="green">geçerli</Badge>) : <Badge tone="slate">pasif</Badge>}
                <Can module="VEHICLES" action="DELETE"><button className="text-slate-400 hover:text-red-600" onClick={async () => { await vehiclesApi.removeInsurance(i.id); load(); }}>×</button></Can>
              </span>
            </div>
          ))}
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2"><h2 className="font-semibold text-sm">Muayene</h2><Can module="VEHICLES" action="CREATE"><Button size="sm" onClick={() => openDialog('inspection')}>+ Ekle</Button></Can></div>
          {v.inspections.length === 0 ? <div className="text-sm text-slate-400">Kayıt yok.</div> : v.inspections.map((i: any) => (
            <div key={i.id} className="flex items-center justify-between text-sm py-1.5 border-t first:border-0">
              <span>Muayene: {fmtDate(i.inspectionDate)}</span>
              <span className="flex items-center gap-2">Bitiş {fmtDate(i.expiryDate)}{i.status === 'ACTIVE' ? <Badge tone="green">geçerli</Badge> : <Badge tone="slate">arşiv</Badge>}</span>
            </div>
          ))}
        </Card>
      </div>

      {/* Akaryakıt */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold">Akaryakıt</h2>
        <div className="flex gap-2">
          <Can module="VEHICLES" action="EXPORT"><Button size="sm" variant="secondary" onClick={() => downloadReport(`/reports/fuel?vehicleId=${id}`, 'akaryakit.pdf')}>PDF</Button></Can>
          <Can module="VEHICLES" action="CREATE"><Button size="sm" onClick={() => openDialog('fuel')}>+ Yakıt</Button></Can>
        </div>
      </div>
      <Card className="mb-5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="bg-slate-50 text-left text-slate-500"><th className="px-4 py-2">Tarih</th><th className="px-4 py-2">Yakıt</th><th className="px-4 py-2 text-right">Litre</th><th className="px-4 py-2 text-right">Birim</th><th className="px-4 py-2 text-right">Tutar</th><th className="px-4 py-2 text-right">KM</th><th className="px-4 py-2"></th></tr></thead>
          <tbody>
            {fuel.length === 0 && <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-400">Kayıt yok.</td></tr>}
            {fuel.map((f) => (
              <tr key={f.id} className="border-t">
                <td className="px-4 py-2">{fmtDate(f.date)}</td><td className="px-4 py-2">{FUEL[f.fuelType]}</td>
                <td className="px-4 py-2 text-right">{f.liters}</td><td className="px-4 py-2 text-right">{fmtMoney(f.pricePerLiter)}</td>
                <td className="px-4 py-2 text-right font-medium">{fmtMoney(f.totalAmount)}</td><td className="px-4 py-2 text-right">{f.odometer ?? '-'}</td>
                <td className="px-4 py-2 text-right"><Can module="VEHICLES" action="DELETE"><Button size="sm" variant="ghost" onClick={async () => { await vehiclesApi.removeFuel(f.id); load(); }}>Sil</Button></Can></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Bakım */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold">Bakım</h2>
        <Can module="VEHICLES" action="CREATE"><Button size="sm" onClick={() => openDialog('maintenance')}>+ Bakım</Button></Can>
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="bg-slate-50 text-left text-slate-500"><th className="px-4 py-2">Tarih</th><th className="px-4 py-2">Firma</th><th className="px-4 py-2">Açıklama</th><th className="px-4 py-2 text-right">Toplam</th><th className="px-4 py-2 text-right">KDV%</th><th className="px-4 py-2 text-right">KDV'siz</th><th className="px-4 py-2"></th></tr></thead>
          <tbody>
            {maint.length === 0 && <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-400">Kayıt yok.</td></tr>}
            {maint.map((m) => (
              <tr key={m.id} className="border-t">
                <td className="px-4 py-2">{fmtDate(m.date)}</td><td className="px-4 py-2">{m.company ?? '-'}</td><td className="px-4 py-2">{m.description ?? '-'}</td>
                <td className="px-4 py-2 text-right font-medium">{fmtMoney(m.totalAmount)}</td><td className="px-4 py-2 text-right">{m.vatRate}</td><td className="px-4 py-2 text-right">{fmtMoney(m.netAmount)}</td>
                <td className="px-4 py-2 text-right"><Can module="VEHICLES" action="DELETE"><Button size="sm" variant="ghost" onClick={async () => { await vehiclesApi.removeMaintenance(m.id); load(); }}>Sil</Button></Can></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Tek modal, dialog türüne göre form */}
      <Modal
        open={dialog !== null}
        title={{ insurance: 'Sigorta / Kasko', inspection: 'Muayene', fuel: 'Akaryakıt', maintenance: 'Bakım', null: '' }[String(dialog)] as string}
        onClose={() => setDialog(null)}
        footer={<><Button variant="secondary" onClick={() => setDialog(null)}>Vazgeç</Button><Button onClick={() => (document.getElementById('veh-form') as HTMLFormElement)?.requestSubmit()}>Kaydet</Button></>}
      >
        <form id="veh-form" onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {dialog === 'insurance' && (<>
            <Field label="Tür"><select className={inputCls} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="TRAFFIC">Trafik</option><option value="KASKO">Kasko</option></select></Field>
            <Field label="Şirket" required><input className={inputCls} required value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></Field>
            <Field label="Başlangıç" required><input type="date" className={inputCls} required value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></Field>
            <Field label="Bitiş" required><input type="date" className={inputCls} required value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></Field>
            <Field label="Tutar"><input type="number" className={inputCls} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
            <div className="col-span-2"><Field label="Poliçe Belgesi (opsiyonel)"><FileUpload kind="document" value={form.documentUrl} onChange={(url) => setForm({ ...form, documentUrl: url })} /></Field></div>
          </>)}
          {dialog === 'inspection' && (<>
            <Field label="Muayene Tarihi" required><input type="date" className={inputCls} required value={form.inspectionDate} onChange={(e) => setForm({ ...form, inspectionDate: e.target.value })} /></Field>
            <Field label="Geçerlilik Bitişi" required><input type="date" className={inputCls} required value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} /></Field>
          </>)}
          {dialog === 'fuel' && (<>
            <Field label="Tarih" required><input type="date" className={inputCls} required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
            <Field label="Yakıt Türü"><select className={inputCls} value={form.fuelType} onChange={(e) => setForm({ ...form, fuelType: e.target.value })}>{Object.entries(FUEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
            <Field label="Litre" required><input type="number" step="0.01" className={inputCls} required value={form.liters} onChange={(e) => setForm({ ...form, liters: e.target.value })} /></Field>
            <Field label="Litre Fiyatı" required><input type="number" step="0.01" className={inputCls} required value={form.pricePerLiter} onChange={(e) => setForm({ ...form, pricePerLiter: e.target.value })} /></Field>
            <Field label="Kilometre"><input type="number" className={inputCls} value={form.odometer} onChange={(e) => setForm({ ...form, odometer: e.target.value })} /></Field>
            <div className="col-span-2"><Field label="Fiş (opsiyonel)"><FileUpload value={form.receiptUrl} onChange={(url) => setForm({ ...form, receiptUrl: url })} /></Field></div>
          </>)}
          {dialog === 'maintenance' && (<>
            <Field label="Tarih" required><input type="date" className={inputCls} required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
            <Field label="Firma"><input className={inputCls} value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></Field>
            <div className="col-span-2"><Field label="Açıklama"><input className={inputCls} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field></div>
            <Field label="Toplam Tutar (KDV dahil)" required><input type="number" step="0.01" className={inputCls} required value={form.totalAmount} onChange={(e) => setForm({ ...form, totalAmount: e.target.value })} /></Field>
            <Field label="KDV %"><input type="number" className={inputCls} value={form.vatRate} onChange={(e) => setForm({ ...form, vatRate: e.target.value })} /></Field>
            <div className="col-span-2"><Field label="Fiş (opsiyonel)"><FileUpload value={form.receiptUrl} onChange={(url) => setForm({ ...form, receiptUrl: url })} /></Field></div>
          </>)}
        </form>
      </Modal>
    </div>
  );
}
