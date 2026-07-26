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
} from '../../components/ui';
import { studentsApi } from '../../services/domain';

const blank = {
  firstName: '',
  lastName: '',
  tcNo: '',
  parentName: '',
  parentPhone: '',
  diagnosis: '',
  registrationDate: new Date().toISOString().slice(0, 10),
};

export function StudentsPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<any>({ items: [], counts: null });
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(blank);
  const [saving, setSaving] = useState(false);

  const load = () =>
    studentsApi
      .list({ status: status || undefined, search: search || undefined })
      .then(setData);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await studentsApi.create(form);
      setOpen(false);
      setForm(blank);
      load();
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (s: any) => {
    await studentsApi.setStatus(s.id, s.status === 'ACTIVE' ? 'PASSIVE' : 'ACTIVE');
    load();
  };
  const remove = async (s: any) => {
    if (!confirm(`${s.firstName} ${s.lastName} ve tüm gelişim kayıtları/fotoğrafları silinsin mi?`))
      return;
    await studentsApi.remove(s.id);
    load();
  };

  const columns: Column<any>[] = [
    {
      header: 'Ad Soyad',
      render: (s) => (
        <button className="text-brand hover:underline font-medium" onClick={() => navigate(`/students/${s.id}`)}>
          {s.firstName} {s.lastName}
        </button>
      ),
    },
    { header: 'Veli', render: (s) => s.parentName || '-' },
    { header: 'Tanı', render: (s) => s.diagnosis || '-' },
    { header: 'Kayıt', render: (s) => fmtDate(s.registrationDate) },
    {
      header: 'Durum',
      render: (s) =>
        s.status === 'ACTIVE' ? <Badge tone="green">Aktif</Badge> : <Badge tone="slate">Pasif</Badge>,
    },
    {
      header: '',
      className: 'text-right',
      render: (s) => (
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="ghost" onClick={() => navigate(`/students/${s.id}`)}>
            Detay
          </Button>
          <Can module="STUDENTS" action="UPDATE">
            <Button size="sm" variant="secondary" onClick={() => toggleStatus(s)}>
              {s.status === 'ACTIVE' ? 'Pasife al' : 'Aktifleştir'}
            </Button>
          </Can>
          <Can module="STUDENTS" action="DELETE">
            <Button size="sm" variant="danger" onClick={() => remove(s)}>
              Sil
            </Button>
          </Can>
        </div>
      ),
    },
  ];

  const c = data.counts;

  return (
    <div>
      <PageHeader
        title="Öğrenci Takip"
        subtitle={c && `Toplam ${c.all} · Aktif ${c.active} · Pasif ${c.passive}`}
        actions={
          <Can module="STUDENTS" action="CREATE">
            <Button onClick={() => { setForm(blank); setOpen(true); }}>+ Yeni Öğrenci</Button>
          </Can>
        }
      />

      <div className="flex gap-2 mb-3">
        <input
          className={inputCls + ' max-w-xs'}
          placeholder="İsim ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load()}
        />
        <select className={inputCls + ' max-w-[160px]'} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Tümü</option>
          <option value="ACTIVE">Aktif</option>
          <option value="PASSIVE">Pasif</option>
        </select>
        <Button variant="secondary" onClick={load}>Ara</Button>
      </div>

      <Card>
        <DataTable columns={columns} rows={data.items} keyOf={(s) => s.id} />
      </Card>

      <Modal
        open={open}
        title="Yeni Öğrenci"
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Vazgeç</Button>
            <Button type="submit" onClick={() => (document.getElementById('student-form') as HTMLFormElement)?.requestSubmit()} disabled={saving}>
              {saving ? 'Kaydediliyor…' : 'Kaydet'}
            </Button>
          </>
        }
      >
        <form id="student-form" onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Ad" required>
            <input className={inputCls} required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
          </Field>
          <Field label="Soyad" required>
            <input className={inputCls} required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          </Field>
          <Field label="T.C. Kimlik No">
            <input className={inputCls} value={form.tcNo} onChange={(e) => setForm({ ...form, tcNo: e.target.value })} />
          </Field>
          <Field label="Kayıt Tarihi" required>
            <input type="date" className={inputCls} required value={form.registrationDate} onChange={(e) => setForm({ ...form, registrationDate: e.target.value })} />
          </Field>
          <Field label="Veli Adı">
            <input className={inputCls} value={form.parentName} onChange={(e) => setForm({ ...form, parentName: e.target.value })} />
          </Field>
          <Field label="Veli Telefon">
            <input className={inputCls} value={form.parentPhone} onChange={(e) => setForm({ ...form, parentPhone: e.target.value })} />
          </Field>
          <div className="col-span-2">
            <Field label="Tanı / Bireysel İhtiyaç">
              <textarea className={inputCls} rows={2} value={form.diagnosis} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} />
            </Field>
          </div>
        </form>
      </Modal>
    </div>
  );
}
