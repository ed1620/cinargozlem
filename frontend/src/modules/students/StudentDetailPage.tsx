import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Can } from '../../components/Can';
import {
  Badge,
  Button,
  Card,
  Field,
  fmtDate,
  inputCls,
  Modal,
  PageHeader,
} from '../../components/ui';
import { assetUrl, downloadReport, studentsApi } from '../../services/domain';

export function StudentDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState<any>(null);
  const [acts, setActs] = useState<any[]>([]);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState<number | ''>('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ date: now.toISOString().slice(0, 10), title: '', description: '', targetGains: '', evaluationNote: '' });

  const loadActs = () =>
    studentsApi.activities(id, { year, month: month || undefined }).then(setActs);

  useEffect(() => {
    studentsApi.get(id).then(setStudent);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  useEffect(() => {
    loadActs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    await studentsApi.addActivity(id, form);
    setOpen(false);
    setForm({ ...form, title: '', description: '', targetGains: '', evaluationNote: '' });
    loadActs();
  };

  const upload = async (actId: string, files: FileList | null) => {
    if (!files?.length) return;
    await studentsApi.addImages(actId, files);
    loadActs();
  };
  const delImage = async (imageId: string) => {
    if (!confirm('Bu fotoğraf silinsin mi?')) return;
    await studentsApi.removeImage(imageId);
    loadActs();
  };
  const delActivity = async (actId: string) => {
    if (!confirm('Aktivite ve görselleri silinsin mi?')) return;
    await studentsApi.removeActivity(actId);
    loadActs();
  };

  if (!student) return <div className="text-slate-400">Yükleniyor…</div>;

  return (
    <div>
      <PageHeader
        title={`${student.firstName} ${student.lastName}`}
        subtitle={
          <span>
            {student.status === 'ACTIVE' ? <Badge tone="green">Aktif</Badge> : <Badge tone="slate">Pasif</Badge>}{' '}
            · Veli: {student.parentName || '-'} · Kayıt: {fmtDate(student.registrationDate)}
          </span>
        }
        actions={<Button variant="secondary" onClick={() => navigate('/students')}>← Liste</Button>}
      />

      <Card className="p-4 mb-4">
        <div className="grid sm:grid-cols-3 gap-3 text-sm">
          <div><span className="text-slate-500">T.C.:</span> {student.tcNo || '-'}</div>
          <div><span className="text-slate-500">Telefon:</span> {student.parentPhone || '-'}</div>
          <div><span className="text-slate-500">Tanı:</span> {student.diagnosis || '-'}</div>
        </div>
      </Card>

      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">Gelişim Kayıtları</span>
          <select className={inputCls + ' py-1'} value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {[0, 1, 2].map((d) => { const y = now.getFullYear() - d; return <option key={y} value={y}>{y}</option>; })}
          </select>
          <select className={inputCls + ' py-1'} value={month} onChange={(e) => setMonth(e.target.value ? Number(e.target.value) : '')}>
            <option value="">Tüm aylar</option>
            {Array.from({ length: 12 }).map((_, i) => <option key={i + 1} value={i + 1}>{i + 1}. ay</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <Can module="STUDENTS" action="EXPORT">
            <Button size="sm" variant="secondary" onClick={() => downloadReport(`/reports/students/monthly?studentId=${id}&year=${year}&month=${month || now.getMonth() + 1}`, 'ogrenci-aylik.pdf')}>
              Aylık PDF
            </Button>
          </Can>
          <Can module="STUDENTS" action="EXPORT">
            <Button size="sm" variant="secondary" onClick={() => downloadReport(`/reports/students/annual?studentId=${id}&year=${year}`, 'ogrenci-yillik.pdf')}>
              Yıllık PDF
            </Button>
          </Can>
          <Can module="STUDENTS" action="CREATE">
            <Button size="sm" onClick={() => setOpen(true)} disabled={student.status !== 'ACTIVE'}>+ Aktivite</Button>
          </Can>
        </div>
      </div>

      <div className="space-y-3">
        {acts.length === 0 && <Card className="p-6 text-center text-slate-400 text-sm">Bu dönemde kayıt yok.</Card>}
        {acts.map((a) => (
          <Card key={a.id} className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-medium">{a.title}</div>
                <div className="text-xs text-slate-500">{fmtDate(a.date)}</div>
              </div>
              <Can module="STUDENTS" action="DELETE">
                <Button size="sm" variant="ghost" onClick={() => delActivity(a.id)}>Sil</Button>
              </Can>
            </div>
            {a.description && <p className="text-sm mt-2">{a.description}</p>}
            {a.targetGains && <p className="text-sm mt-1"><span className="text-slate-500">Kazanım:</span> {a.targetGains}</p>}
            {a.evaluationNote && <p className="text-sm mt-1"><span className="text-slate-500">Değerlendirme:</span> {a.evaluationNote}</p>}
            <div className="flex flex-wrap gap-2 mt-3">
              {a.images?.map((img: any) => (
                <div key={img.id} className="relative group">
                  <a href={assetUrl(img.url)} target="_blank" rel="noreferrer">
                    <img src={assetUrl(img.url)} alt="" className="h-20 w-20 object-cover rounded-md border" />
                  </a>
                  <Can module="STUDENTS" action="DELETE">
                    <button
                      type="button"
                      onClick={() => delImage(img.id)}
                      title="Fotoğrafı sil"
                      className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-red-600 text-white text-xs leading-none grid place-items-center shadow hover:bg-red-700"
                    >
                      ×
                    </button>
                  </Can>
                </div>
              ))}
              <Can module="STUDENTS" action="UPDATE">
                <label className="h-20 w-20 border-2 border-dashed rounded-md grid place-items-center text-2xl text-slate-400 cursor-pointer hover:bg-slate-50">
                  +
                  <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => upload(a.id, e.target.files)} />
                </label>
              </Can>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        open={open}
        title="Yeni Gelişim Kaydı"
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Vazgeç</Button>
            <Button onClick={() => (document.getElementById('act-form') as HTMLFormElement)?.requestSubmit()}>Kaydet</Button>
          </>
        }
      >
        <form id="act-form" onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Tarih" required>
              <input type="date" className={inputCls} required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </Field>
            <Field label="Aktivite Başlığı" required>
              <input className={inputCls} required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </Field>
          </div>
          <Field label="Açıklama">
            <textarea className={inputCls} rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <Field label="Hedeflenen Kazanımlar">
            <textarea className={inputCls} rows={2} value={form.targetGains} onChange={(e) => setForm({ ...form, targetGains: e.target.value })} />
          </Field>
          <Field label="Değerlendirme / Gözlem">
            <textarea className={inputCls} rows={2} value={form.evaluationNote} onChange={(e) => setForm({ ...form, evaluationNote: e.target.value })} />
          </Field>
        </form>
      </Modal>
    </div>
  );
}
