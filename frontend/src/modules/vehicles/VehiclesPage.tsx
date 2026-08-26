import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Can } from '../../components/Can';
import {
  Badge,
  Button,
  Card,
  Column,
  DataTable,
  Field,
  inputCls,
  Modal,
  PageHeader,
  LinkButton,
} from '../../components/ui';
import { downloadReport, vehiclesApi } from '../../services/domain';

const FUEL: Record<string, string> = { DIESEL: 'Dizel', GASOLINE: 'Benzin', LPG: 'LPG', ELECTRIC: 'Elektrik' };
const blank = { plate: '', brand: '', model: '', modelYear: '', vehicleType: '', fuelType: 'DIESEL' };

export function VehiclesPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<any>({ items: [], counts: null });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(blank);

  const load = () => vehiclesApi.list().then(setData);
  useEffect(() => { load(); }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    await vehiclesApi.create({ ...form, modelYear: form.modelYear ? Number(form.modelYear) : undefined });
    setOpen(false);
    setForm(blank);
    load();
  };
  const toggle = async (v: any) => { await vehiclesApi.setStatus(v.id, v.status === 'ACTIVE' ? 'PASSIVE' : 'ACTIVE'); load(); };
  const remove = async (v: any) => { if (confirm(`${v.plate} ve tüm kayıtları silinsin mi?`)) { await vehiclesApi.remove(v.id); load(); } };

  const columns: Column<any>[] = [
    { header: 'Plaka', render: (v) => <LinkButton onClick={() => navigate(`/vehicles/${v.id}`)}>{v.plate}</LinkButton> },
    { header: 'Marka / Model', render: (v) => `${v.brand} ${v.model}` },
    { header: 'Yakıt', render: (v) => FUEL[v.fuelType] ?? '-' },
    { header: 'Durum', render: (v) => (v.status === 'ACTIVE' ? <Badge tone="green">Aktif</Badge> : <Badge tone="slate">Pasif</Badge>) },
    {
      header: '', className: 'text-right',
      render: (v) => (
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="ghost" onClick={() => navigate(`/vehicles/${v.id}`)}>Detay</Button>
          <Can module="VEHICLES" action="UPDATE"><Button size="sm" variant="secondary" onClick={() => toggle(v)}>{v.status === 'ACTIVE' ? 'Pasife al' : 'Aktifleştir'}</Button></Can>
          <Can module="VEHICLES" action="DELETE"><Button size="sm" variant="danger" onClick={() => remove(v)}>Sil</Button></Can>
        </div>
      ),
    },
  ];

  const c = data.counts;
  return (
    <div>
      <PageHeader
        title="Araç & Akaryakıt"
        subtitle={c && `Toplam ${c.all} · Aktif ${c.active} · Pasif ${c.passive}`}
        actions={
          <div className="flex gap-2">
            <Can module="VEHICLES" action="EXPORT"><Button variant="secondary" onClick={() => downloadReport('/reports/vehicles/upcoming', 'yaklasan-islemler.pdf')}>Yaklaşanlar PDF</Button></Can>
            <Can module="VEHICLES" action="CREATE"><Button onClick={() => { setForm(blank); setOpen(true); }}>+ Yeni Araç</Button></Can>
          </div>
        }
      />
      <Card className="card-rise"><DataTable columns={columns} rows={data.items} keyOf={(v) => v.id} /></Card>

      <Modal open={open} title="Yeni Araç" onClose={() => setOpen(false)} footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Vazgeç</Button><Button onClick={() => (document.getElementById('v-form') as HTMLFormElement)?.requestSubmit()}>Kaydet</Button></>}>
        <form id="v-form" onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Plaka" required><input className={inputCls} required value={form.plate} onChange={(e) => setForm({ ...form, plate: e.target.value })} /></Field>
          <Field label="Marka" required><input className={inputCls} required value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} /></Field>
          <Field label="Model" required><input className={inputCls} required value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} /></Field>
          <Field label="Model Yılı"><input type="number" className={inputCls} value={form.modelYear} onChange={(e) => setForm({ ...form, modelYear: e.target.value })} /></Field>
          <Field label="Araç Tipi"><input className={inputCls} value={form.vehicleType} onChange={(e) => setForm({ ...form, vehicleType: e.target.value })} /></Field>
          <Field label="Yakıt Tipi">
            <select className={inputCls} value={form.fuelType} onChange={(e) => setForm({ ...form, fuelType: e.target.value })}>
              {Object.entries(FUEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
        </form>
      </Modal>
    </div>
  );
}
