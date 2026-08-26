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
  fmtDate,
  inputCls,
  Modal,
  PageHeader,
  LinkButton,
} from '../../components/ui';
import { downloadReport, personnelApi } from '../../services/domain';

const blank = {
  firstName: '',
  lastName: '',
  tcNo: '',
  title: '',
  phone: '',
  startDate: new Date().toISOString().slice(0, 10),
  salaryType: 'MONTHLY',
};

export function PersonnelPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<any>({ items: [], counts: null });
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(blank);

  const load = () =>
    personnelApi.list({ status: status || undefined, search: search || undefined }).then(setData);
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    await personnelApi.create(form);
    setOpen(false);
    setForm(blank);
    load();
  };
  const toggle = async (p: any) => {
    await personnelApi.setStatus(p.id, p.status === 'ACTIVE' ? 'PASSIVE' : 'ACTIVE');
    load();
  };
  const remove = async (p: any) => {
    if (!confirm(`${p.firstName} ${p.lastName} ve maaş/izin kayıtları silinsin mi?`)) return;
    await personnelApi.remove(p.id);
    load();
  };

  const columns: Column<any>[] = [
    {
      header: 'Ad Soyad',
      render: (p) => (
        <LinkButton onClick={() => navigate(`/personnel/${p.id}`)}>
          {p.firstName} {p.lastName}
        </LinkButton>
      ),
    },
    { header: 'Görev', render: (p) => p.title },
    { header: 'İşe Başlama', render: (p) => fmtDate(p.startDate) },
    {
      header: 'Durum',
      render: (p) => (p.status === 'ACTIVE' ? <Badge tone="green">Aktif</Badge> : <Badge tone="slate">Pasif</Badge>),
    },
    {
      header: '',
      className: 'text-right',
      render: (p) => (
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="ghost" onClick={() => navigate(`/personnel/${p.id}`)}>Detay</Button>
          <Can module="PERSONNEL" action="UPDATE">
            <Button size="sm" variant="secondary" onClick={() => toggle(p)}>
              {p.status === 'ACTIVE' ? 'Pasife al' : 'Aktifleştir'}
            </Button>
          </Can>
          <Can module="PERSONNEL" action="DELETE">
            <Button size="sm" variant="danger" onClick={() => remove(p)}>Sil</Button>
          </Can>
        </div>
      ),
    },
  ];

  const c = data.counts;
  return (
    <div>
      <PageHeader
        title="Personel & Bordro"
        subtitle={c && `Toplam ${c.all} · Aktif ${c.active} · Pasif ${c.passive}`}
        actions={
          <div className="flex gap-2">
            <Can module="PERSONNEL" action="EXPORT">
              <Button variant="secondary" onClick={() => downloadReport('/reports/personnel', 'personel.pdf')}>PDF</Button>
            </Can>
            <Can module="PERSONNEL" action="CREATE">
              <Button onClick={() => { setForm(blank); setOpen(true); }}>+ Yeni Personel</Button>
            </Can>
          </div>
        }
      />
      <div className="flex gap-2 mb-3">
        <input className={inputCls + ' max-w-xs'} placeholder="İsim ara..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} />
        <select className={inputCls + ' max-w-[160px]'} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Tümü</option>
          <option value="ACTIVE">Aktif</option>
          <option value="PASSIVE">Pasif</option>
        </select>
        <Button variant="secondary" onClick={load}>Ara</Button>
      </div>
      <Card className="card-rise">
        <DataTable columns={columns} rows={data.items} keyOf={(p) => p.id} />
      </Card>

      <Modal
        open={open}
        title="Yeni Personel"
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Vazgeç</Button>
            <Button onClick={() => (document.getElementById('p-form') as HTMLFormElement)?.requestSubmit()}>Kaydet</Button>
          </>
        }
      >
        <form id="p-form" onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Ad" required><input className={inputCls} required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></Field>
          <Field label="Soyad" required><input className={inputCls} required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></Field>
          <Field label="Görev / Ünvan" required><input className={inputCls} required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label="T.C. Kimlik No"><input className={inputCls} value={form.tcNo} onChange={(e) => setForm({ ...form, tcNo: e.target.value })} /></Field>
          <Field label="Telefon"><input className={inputCls} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="İşe Başlama" required><input type="date" className={inputCls} required value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></Field>
        </form>
      </Modal>
    </div>
  );
}
