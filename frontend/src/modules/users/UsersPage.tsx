import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
} from '../../components/ui';
import { rbacService } from '../../services/rbac.service';
import { usersApi } from '../../services/domain';
import { Role } from '../../types';

const blank = { username: '', email: '', fullName: '', phone: '', password: '', isSuperAdmin: false, roleIds: [] as string[] };

export function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(blank);

  const load = () => {
    usersApi.list().then(setUsers);
    rbacService.listRoles().then(setRoles);
  };
  useEffect(() => { load(); }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await usersApi.create(form);
      setOpen(false);
      setForm(blank);
      load();
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Oluşturulamadı');
    }
  };
  const toggle = async (u: any) => { await usersApi.setStatus(u.id, u.status === 'ACTIVE' ? 'PASSIVE' : 'ACTIVE'); load(); };
  const remove = async (u: any) => { if (confirm(`${u.username} silinsin mi?`)) { await usersApi.remove(u.id); load(); } };
  const resetPw = async (u: any) => {
    const pw = prompt(`${u.username} için yeni şifre (min 6):`);
    if (pw) { await usersApi.resetPassword(u.id, pw); alert('Şifre güncellendi, oturumlar kapatıldı.'); }
  };
  const setRole = (roleId: string, checked: boolean) => {
    setForm((f: any) => ({ ...f, roleIds: checked ? [...f.roleIds, roleId] : f.roleIds.filter((r: string) => r !== roleId) }));
  };

  const columns: Column<any>[] = [
    { header: 'Kullanıcı', render: (u) => <div><div className="font-medium">{u.username}</div><div className="text-xs text-slate-500">{u.fullName}</div></div> },
    { header: 'E-posta', render: (u) => u.email },
    { header: 'Roller', render: (u) => u.isSuperAdmin ? <Badge tone="blue">Süper Admin</Badge> : (u.roles?.map((r: any) => <Badge key={r.role.id}>{r.role.name}</Badge>) ?? '-') },
    { header: 'Durum', render: (u) => u.status === 'ACTIVE' ? <Badge tone="green">Aktif</Badge> : <Badge tone="slate">Pasif</Badge> },
    {
      header: '', className: 'text-right',
      render: (u) => (
        <div className="flex justify-end gap-1">
          <Can module="USERS" action="UPDATE"><Button size="sm" variant="ghost" onClick={() => resetPw(u)}>Şifre</Button></Can>
          <Can module="USERS" action="UPDATE"><Button size="sm" variant="secondary" onClick={() => toggle(u)}>{u.status === 'ACTIVE' ? 'Pasife al' : 'Aktifleştir'}</Button></Can>
          <Can module="USERS" action="DELETE"><Button size="sm" variant="danger" onClick={() => remove(u)}>Sil</Button></Can>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Kullanıcılar"
        subtitle="Kullanıcı oluştur, rol ata, aktif/pasif yap."
        actions={
          <div className="flex gap-2">
            <Link to="/users/matrix"><Button variant="secondary">Yetki Matrisi →</Button></Link>
            <Can module="USERS" action="CREATE"><Button onClick={() => { setForm(blank); setOpen(true); }}>+ Yeni Kullanıcı</Button></Can>
          </div>
        }
      />
      <Card><DataTable columns={columns} rows={users} keyOf={(u) => u.id} /></Card>

      <Modal open={open} title="Yeni Kullanıcı" onClose={() => setOpen(false)} footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Vazgeç</Button><Button onClick={() => (document.getElementById('u-form') as HTMLFormElement)?.requestSubmit()}>Kaydet</Button></>}>
        <form id="u-form" onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Kullanıcı Adı" required><input className={inputCls} required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></Field>
            <Field label="E-posta" required><input type="email" className={inputCls} required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Ad Soyad" required><input className={inputCls} required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></Field>
            <Field label="Şifre" required><input type="password" className={inputCls} required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 accent-brand" checked={form.isSuperAdmin} onChange={(e) => setForm({ ...form, isSuperAdmin: e.target.checked })} />
            Süper Yönetici (tüm modüllerde tam yetki)
          </label>
          {!form.isSuperAdmin && (
            <div>
              <div className="text-sm font-medium mb-1">Roller</div>
              <div className="flex flex-wrap gap-3">
                {roles.map((r) => (
                  <label key={r.id} className="flex items-center gap-1.5 text-sm">
                    <input type="checkbox" className="h-4 w-4 accent-brand" checked={form.roleIds.includes(r.id)} onChange={(e) => setRole(r.id, e.target.checked)} />
                    {r.name}
                  </label>
                ))}
              </div>
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
}
