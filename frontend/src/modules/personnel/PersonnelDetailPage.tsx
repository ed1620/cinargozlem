import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Can } from '../../components/Can';
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
import { downloadReport, personnelApi } from '../../services/domain';

const AYLAR = ['', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

export function PersonnelDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [p, setP] = useState<any>(null);
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const now = new Date();
  const [year] = useState(now.getFullYear());
  const [summary, setSummary] = useState<any>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [entOpen, setEntOpen] = useState(false);
  const [payForm, setPayForm] = useState<any>({ year, month: now.getMonth() + 1, grossSalary: '', deductions: '', additions: '' });
  const [leaveForm, setLeaveForm] = useState<any>({ type: 'ANNUAL', startDate: '', endDate: '' });
  const [entDays, setEntDays] = useState(20);

  const load = () => {
    personnelApi.get(id).then(setP);
    personnelApi.payrolls(id).then(setPayrolls);
    personnelApi.leaves(id).then(setLeaves);
    personnelApi.leaveSummary(id, year).then(setSummary);
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const addPayroll = async (e: FormEvent) => {
    e.preventDefault();
    await personnelApi.createPayroll({
      personnelId: id,
      year: Number(payForm.year),
      month: Number(payForm.month),
      grossSalary: Number(payForm.grossSalary),
      deductions: payForm.deductions ? Number(payForm.deductions) : undefined,
      additions: payForm.additions ? Number(payForm.additions) : undefined,
    });
    setPayOpen(false);
    load();
  };
  const pay = async (pid: string) => { await personnelApi.payPayroll(pid); load(); };
  const delPay = async (pid: string) => { if (confirm('Maaş kaydı silinsin mi?')) { await personnelApi.removePayroll(pid); load(); } };

  const addLeave = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await personnelApi.createLeave({ personnelId: id, ...leaveForm });
      setLeaveOpen(false);
      load();
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'İzin eklenemedi');
    }
  };
  const delLeave = async (lid: string) => { if (confirm('İzin kaydı silinsin mi?')) { await personnelApi.removeLeave(lid); load(); } };
  const saveEnt = async (e: FormEvent) => {
    e.preventDefault();
    await personnelApi.setEntitlement(id, { year, entitledDays: Number(entDays) });
    setEntOpen(false);
    load();
  };

  if (!p) return <div className="text-slate-400">Yükleniyor…</div>;
  const active = p.status === 'ACTIVE';

  return (
    <div>
      <PageHeader
        title={`${p.firstName} ${p.lastName}`}
        subtitle={<span>{active ? <Badge tone="green">Aktif</Badge> : <Badge tone="slate">Pasif</Badge>} · {p.title} · TC: {p.tcNo || '-'}</span>}
        actions={
          <div className="flex gap-2">
            <Can module="PERSONNEL" action="EXPORT"><Button size="sm" variant="secondary" onClick={() => downloadReport(`/reports/personnel/annual-salary?personnelId=${id}&year=${year}`, 'yillik-maas.pdf')}>Yıllık Maaş PDF</Button></Can>
            <Button variant="secondary" onClick={() => navigate('/personnel')}>← Liste</Button>
          </div>
        }
      />

      {/* İzin özeti */}
      <Card className="p-4 mb-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex gap-6 text-sm">
            <div><div className="text-slate-500">Yıllık Hak ({year})</div><div className="text-lg font-semibold">{summary?.entitled ?? 0} gün</div></div>
            <div><div className="text-slate-500">Kullanılan</div><div className="text-lg font-semibold">{summary?.used ?? 0} gün</div></div>
            <div><div className="text-slate-500">Kalan</div><div className="text-lg font-semibold text-brand">{summary?.remaining ?? 0} gün</div></div>
          </div>
          <Can module="PERSONNEL" action="UPDATE">
            <Button size="sm" variant="secondary" onClick={() => { setEntDays(summary?.entitled ?? 20); setEntOpen(true); }}>Hak Tanımla</Button>
          </Can>
        </div>
      </Card>

      {/* Bordro */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold">Maaş / Bordro</h2>
        <div className="flex gap-2">
          <Can module="PERSONNEL" action="EXPORT">
            <Button size="sm" variant="secondary" onClick={() => downloadReport(`/reports/payroll?year=${year}&month=${now.getMonth() + 1}`, 'bordro.pdf')}>Dönem PDF</Button>
          </Can>
          <Can module="PERSONNEL" action="CREATE">
            <Button size="sm" onClick={() => setPayOpen(true)} disabled={!active}>+ Bordro</Button>
          </Can>
        </div>
      </div>
      <Card className="mb-5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="bg-slate-50 text-left text-slate-500"><th className="px-4 py-2">Dönem</th><th className="px-4 py-2 text-right">Brüt</th><th className="px-4 py-2 text-right">Net</th><th className="px-4 py-2">Durum</th><th className="px-4 py-2"></th></tr></thead>
          <tbody>
            {payrolls.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">Kayıt yok.</td></tr>}
            {payrolls.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-4 py-2">{AYLAR[r.month]} {r.year}</td>
                <td className="px-4 py-2 text-right">{fmtMoney(r.grossSalary)}</td>
                <td className="px-4 py-2 text-right font-medium">{fmtMoney(r.netSalary)}</td>
                <td className="px-4 py-2">{r.paymentStatus === 'PAID' ? <Badge tone="green">Ödendi</Badge> : <Badge tone="amber">Ödenmedi</Badge>}</td>
                <td className="px-4 py-2 text-right">
                  <div className="flex justify-end gap-1">
                    {r.paymentStatus !== 'PAID' && (
                      <Can module="PERSONNEL" action="UPDATE"><Button size="sm" variant="secondary" onClick={() => pay(r.id)}>Ödendi işaretle</Button></Can>
                    )}
                    <Can module="PERSONNEL" action="DELETE"><Button size="sm" variant="ghost" onClick={() => delPay(r.id)}>Sil</Button></Can>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* İzin */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold">İzin Kayıtları</h2>
        <Can module="PERSONNEL" action="CREATE"><Button size="sm" onClick={() => setLeaveOpen(true)} disabled={!active}>+ İzin</Button></Can>
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="bg-slate-50 text-left text-slate-500"><th className="px-4 py-2">Tür</th><th className="px-4 py-2">Başlangıç</th><th className="px-4 py-2">Bitiş</th><th className="px-4 py-2">Gün</th><th className="px-4 py-2"></th></tr></thead>
          <tbody>
            {leaves.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">Kayıt yok.</td></tr>}
            {leaves.map((l) => (
              <tr key={l.id} className="border-t">
                <td className="px-4 py-2">{l.type}</td>
                <td className="px-4 py-2">{fmtDate(l.startDate)}</td>
                <td className="px-4 py-2">{fmtDate(l.endDate)}</td>
                <td className="px-4 py-2">{l.totalDays}</td>
                <td className="px-4 py-2 text-right"><Can module="PERSONNEL" action="DELETE"><Button size="sm" variant="ghost" onClick={() => delLeave(l.id)}>Sil</Button></Can></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Modallar */}
      <Modal open={payOpen} title="Yeni Bordro" onClose={() => setPayOpen(false)} footer={<><Button variant="secondary" onClick={() => setPayOpen(false)}>Vazgeç</Button><Button onClick={() => (document.getElementById('pay-form') as HTMLFormElement)?.requestSubmit()}>Kaydet</Button></>}>
        <form id="pay-form" onSubmit={addPayroll} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Yıl" required><input type="number" className={inputCls} required value={payForm.year} onChange={(e) => setPayForm({ ...payForm, year: e.target.value })} /></Field>
          <Field label="Ay" required>
            <select className={inputCls} value={payForm.month} onChange={(e) => setPayForm({ ...payForm, month: e.target.value })}>
              {AYLAR.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
            </select>
          </Field>
          <Field label="Brüt Maaş" required><input type="number" className={inputCls} required value={payForm.grossSalary} onChange={(e) => setPayForm({ ...payForm, grossSalary: e.target.value })} /></Field>
          <Field label="Kesinti"><input type="number" className={inputCls} value={payForm.deductions} onChange={(e) => setPayForm({ ...payForm, deductions: e.target.value })} /></Field>
          <Field label="Ek Ödeme"><input type="number" className={inputCls} value={payForm.additions} onChange={(e) => setPayForm({ ...payForm, additions: e.target.value })} /></Field>
          <div className="col-span-2 text-xs text-slate-500">Net = Brüt − Kesinti + Ek (otomatik hesaplanır)</div>
        </form>
      </Modal>

      <Modal open={leaveOpen} title="Yeni İzin" onClose={() => setLeaveOpen(false)} footer={<><Button variant="secondary" onClick={() => setLeaveOpen(false)}>Vazgeç</Button><Button onClick={() => (document.getElementById('leave-form') as HTMLFormElement)?.requestSubmit()}>Kaydet</Button></>}>
        <form id="leave-form" onSubmit={addLeave} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Tür">
            <select className={inputCls} value={leaveForm.type} onChange={(e) => setLeaveForm({ ...leaveForm, type: e.target.value })}>
              <option value="ANNUAL">Yıllık</option><option value="EXCUSE">Mazeret</option><option value="SICK">Hastalık</option><option value="UNPAID">Ücretsiz</option><option value="OTHER">Diğer</option>
            </select>
          </Field>
          <div />
          <Field label="Başlangıç" required><input type="date" className={inputCls} required value={leaveForm.startDate} onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })} /></Field>
          <Field label="Bitiş" required><input type="date" className={inputCls} required value={leaveForm.endDate} onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })} /></Field>
        </form>
      </Modal>

      <Modal open={entOpen} title={`${year} Yıllık İzin Hakkı`} onClose={() => setEntOpen(false)} footer={<><Button variant="secondary" onClick={() => setEntOpen(false)}>Vazgeç</Button><Button onClick={() => (document.getElementById('ent-form') as HTMLFormElement)?.requestSubmit()}>Kaydet</Button></>}>
        <form id="ent-form" onSubmit={saveEnt}>
          <Field label="Hak edilen gün" required><input type="number" className={inputCls} required value={entDays} onChange={(e) => setEntDays(Number(e.target.value))} /></Field>
        </form>
      </Modal>
    </div>
  );
}
