import { FormEvent, useEffect, useState } from 'react';
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
  SegmentedControl,
} from '../../components/ui';
import { downloadReport, financeApi } from '../../services/domain';

const PM: Record<string, string> = { CASH: 'Nakit', TRANSFER: 'Havale', EFT: 'EFT', CREDIT_CARD: 'Kredi Kartı', OTHER: 'Diğer' };

export function FinancePage() {
  const now = new Date();
  const [tab, setTab] = useState<'income' | 'expense' | 'category'>('income');
  const [year, setYear] = useState(now.getFullYear());
  const [balance, setBalance] = useState<any>(null);
  const [incomes, setIncomes] = useState<any>({ items: [] });
  const [expenses, setExpenses] = useState<any>({ items: [] });
  const [cats, setCats] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({});

  const load = () => {
    financeApi.balance({ year }).then(setBalance);
    financeApi.incomes({ year }).then(setIncomes);
    financeApi.expenses({ year }).then(setExpenses);
    financeApi.categories().then(setCats);
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  const openNew = () => {
    if (tab === 'category') setForm({ name: '', type: 'INCOME' });
    else setForm({ date: now.toISOString().slice(0, 10), amount: '', paymentMethod: 'CASH', categoryId: '', description: '', [tab === 'income' ? 'incomeType' : 'expenseType']: '' });
    setOpen(true);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (tab === 'category') await financeApi.createCategory(form);
    else if (tab === 'income') await financeApi.createIncome({ ...form, amount: Number(form.amount), categoryId: form.categoryId || undefined });
    else await financeApi.createExpense({ ...form, amount: Number(form.amount), categoryId: form.categoryId || undefined });
    setOpen(false);
    load();
  };
  const delRow = async (kind: 'income' | 'expense', rid: string) => {
    if (!confirm('Kayıt pasife alınsın mı?')) return;
    kind === 'income' ? await financeApi.removeIncome(rid) : await financeApi.removeExpense(rid);
    load();
  };
  const toggleCat = async (cat: any) => {
    await financeApi.updateCategory(cat.id, { status: cat.status === 'ACTIVE' ? 'PASSIVE' : 'ACTIVE' });
    load();
  };

  const activeCats = cats.filter((c) => c.type === (tab === 'income' ? 'INCOME' : 'EXPENSE') && c.status === 'ACTIVE');

  return (
    <div>
      <PageHeader
        title="Gelir - Gider"
        actions={
          <div className="flex gap-2 items-center">
            <select className={inputCls + ' py-1.5'} value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {[0, 1, 2].map((d) => { const y = now.getFullYear() - d; return <option key={y} value={y}>{y}</option>; })}
            </select>
            <Can module="FINANCE" action="EXPORT">
              <Button variant="secondary" onClick={() => downloadReport(`/reports/finance?year=${year}`, 'gelir-gider.pdf')}>PDF</Button>
            </Can>
          </div>
        }
      />

      {/* Bakiye kartları */}
      <div className="grid sm:grid-cols-3 gap-4 mb-5">
        <Card className="p-4"><div className="text-xs text-slate-500">Toplam Gelir</div><div className="text-2xl font-semibold text-emerald-600">{fmtMoney(balance?.totalIncome ?? 0)}</div></Card>
        <Card className="p-4"><div className="text-xs text-slate-500">Toplam Gider</div><div className="text-2xl font-semibold text-red-600">{fmtMoney(balance?.totalExpense ?? 0)}</div></Card>
        <Card className="p-4"><div className="text-xs text-slate-500">Net Bakiye</div><div className={`text-2xl font-semibold ${(balance?.balance ?? 0) < 0 ? 'text-red-600' : 'text-brand'}`}>{fmtMoney(balance?.balance ?? 0)}</div></Card>
      </div>

      {/* Sekmeler */}
      <div className="flex items-center justify-between mb-3">
        <SegmentedControl
          value={tab}
          onChange={setTab}
          options={[
            { value: 'income', label: 'Gelirler' },
            { value: 'expense', label: 'Giderler' },
            { value: 'category', label: 'Kategoriler' },
          ]}
        />
        <Can module="FINANCE" action="CREATE"><Button onClick={openNew}>+ Yeni</Button></Can>
      </div>

      <Card className="card-rise overflow-x-auto">
        {tab === 'category' ? (
          <table className="w-full text-sm">
            <thead><tr className="bg-slate-50 text-left text-slate-500"><th className="px-4 py-2">Ad</th><th className="px-4 py-2">Tür</th><th className="px-4 py-2">Durum</th><th className="px-4 py-2"></th></tr></thead>
            <tbody>
              {cats.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="px-4 py-2">{c.name}</td>
                  <td className="px-4 py-2">{c.type === 'INCOME' ? 'Gelir' : 'Gider'}</td>
                  <td className="px-4 py-2">{c.status === 'ACTIVE' ? <Badge tone="green">Aktif</Badge> : <Badge tone="slate">Pasif</Badge>}</td>
                  <td className="px-4 py-2 text-right"><Can module="FINANCE" action="UPDATE"><Button size="sm" variant="secondary" onClick={() => toggleCat(c)}>{c.status === 'ACTIVE' ? 'Pasife al' : 'Aktifleştir'}</Button></Can></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="bg-slate-50 text-left text-slate-500"><th className="px-4 py-2">Tarih</th><th className="px-4 py-2">Kategori</th><th className="px-4 py-2">Açıklama</th><th className="px-4 py-2">Yöntem</th><th className="px-4 py-2 text-right">Tutar</th><th className="px-4 py-2"></th></tr></thead>
            <tbody>
              {(tab === 'income' ? incomes : expenses).items.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">Kayıt yok.</td></tr>}
              {(tab === 'income' ? incomes : expenses).items.map((r: any) => (
                <tr key={r.id} className="border-t">
                  <td className="px-4 py-2">{fmtDate(r.date)}</td>
                  <td className="px-4 py-2">{r.category?.name ?? '-'}</td>
                  <td className="px-4 py-2">
                    {r.description || (tab === 'income' ? r.incomeType : r.expenseType)}
                    {r.sourceModule && r.sourceModule !== 'MANUAL' && <Badge tone="blue">oto</Badge>}
                    {r.attachmentUrl && <a href={r.attachmentUrl} target="_blank" rel="noreferrer" className="ml-1.5 text-brand" title="Fiş/fatura">📎</a>}
                  </td>
                  <td className="px-4 py-2">{PM[r.paymentMethod] ?? r.paymentMethod}</td>
                  <td className={`px-4 py-2 text-right font-medium ${tab === 'expense' ? 'text-red-600' : 'text-emerald-600'}`}>{fmtMoney(r.amount)}</td>
                  <td className="px-4 py-2 text-right"><Can module="FINANCE" action="DELETE"><Button size="sm" variant="ghost" onClick={() => delRow(tab, r.id)}>Sil</Button></Can></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal
        open={open}
        title={tab === 'category' ? 'Yeni Kategori' : tab === 'income' ? 'Yeni Gelir' : 'Yeni Gider'}
        onClose={() => setOpen(false)}
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Vazgeç</Button><Button onClick={() => (document.getElementById('fin-form') as HTMLFormElement)?.requestSubmit()}>Kaydet</Button></>}
      >
        <form id="fin-form" onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {tab === 'category' ? (
            <>
              <Field label="Ad" required><input className={inputCls} required value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
              <Field label="Tür" required>
                <select className={inputCls} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="INCOME">Gelir</option><option value="EXPENSE">Gider</option></select>
              </Field>
            </>
          ) : (
            <>
              <Field label="Tarih" required><input type="date" className={inputCls} required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
              <Field label="Tutar" required><input type="number" step="0.01" className={inputCls} required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
              <Field label={tab === 'income' ? 'Gelir Türü' : 'Gider Türü'} required>
                <input className={inputCls} required value={form[tab === 'income' ? 'incomeType' : 'expenseType'] || ''} onChange={(e) => setForm({ ...form, [tab === 'income' ? 'incomeType' : 'expenseType']: e.target.value })} />
              </Field>
              <Field label="Kategori">
                <select className={inputCls} value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                  <option value="">— Seçiniz —</option>
                  {activeCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="Ödeme Yöntemi">
                <select className={inputCls} value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
                  {Object.entries(PM).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Field>
              <div className="col-span-2"><Field label="Açıklama"><input className={inputCls} value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field></div>
              {tab === 'expense' && (
                <div className="col-span-2">
                  <Field label="Fiş / Fatura (opsiyonel)">
                    <FileUpload value={form.attachmentUrl} onChange={(url) => setForm({ ...form, attachmentUrl: url })} />
                  </Field>
                </div>
              )}
            </>
          )}
        </form>
      </Modal>
    </div>
  );
}
