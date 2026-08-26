import { useEffect, useMemo, useState } from 'react';
import { Can } from '../../components/Can';
import { Button, inputCls, LinkButton } from '../../components/ui';
import { rbacService } from '../../services/rbac.service';
import {
  ACTION_LABEL,
  MODULE_META,
  ModuleCode,
  PermissionAction,
  Role,
} from '../../types';

const cellKey = (m: ModuleCode, a: PermissionAction) => `${m}:${a}`;

export function RbacMatrixPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [modules, setModules] = useState<ModuleCode[]>([]);
  const [actions, setActions] = useState<PermissionAction[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newRole, setNewRole] = useState('');
  const [message, setMessage] = useState('');

  const selected = useMemo(
    () => roles.find((r) => r.id === selectedId),
    [roles, selectedId],
  );

  useEffect(() => {
    (async () => {
      const [meta, roleList] = await Promise.all([
        rbacService.meta(),
        rbacService.listRoles(),
      ]);
      setModules(meta.modules);
      setActions(meta.actions);
      setRoles(roleList);
      if (roleList.length) selectRole(roleList[0]);
    })().catch(() => setMessage('Veriler yüklenemedi.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectRole = (role: Role) => {
    setSelectedId(role.id);
    setChecked(new Set(role.permissions.map((p) => cellKey(p.module, p.action))));
    setDirty(false);
  };

  const toggle = (m: ModuleCode, a: PermissionAction) => {
    const next = new Set(checked);
    const k = cellKey(m, a);
    next.has(k) ? next.delete(k) : next.add(k);
    setChecked(next);
    setDirty(true);
  };

  const toggleRow = (m: ModuleCode, on: boolean) => {
    const next = new Set(checked);
    actions.forEach((a) => {
      const k = cellKey(m, a);
      on ? next.add(k) : next.delete(k);
    });
    setChecked(next);
    setDirty(true);
  };

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    setMessage('');
    try {
      const permissions = [...checked].map((k) => {
        const [module, action] = k.split(':') as [ModuleCode, PermissionAction];
        return { module, action };
      });
      const updated = await rbacService.setPermissions(selected.id, permissions);
      setRoles(updated);
      setDirty(false);
      setMessage('Yetkiler kaydedildi.');
    } catch {
      setMessage('Kaydedilemedi (yetkiniz olmayabilir).');
    } finally {
      setSaving(false);
    }
  };

  const createRole = async () => {
    if (!newRole.trim()) return;
    try {
      await rbacService.createRole(newRole.trim());
      const list = await rbacService.listRoles();
      setRoles(list);
      setNewRole('');
      const created = list.find((r) => r.name === newRole.trim());
      if (created) selectRole(created);
    } catch {
      setMessage('Rol oluşturulamadı (aynı ad olabilir).');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-[-0.015em]">Yetki Matrisi</h1>
        {message && <span className="text-sm text-slate-500">{message}</span>}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Rol listesi */}
        <div className="w-full lg:w-56 lg:shrink-0 space-y-3">
          <div className="bg-white rounded-xl shadow-[0_1px_2px_rgba(47,52,58,0.04),0_4px_12px_-4px_rgba(47,52,58,0.08)] ring-1 ring-slate-900/5 p-2">
            {roles.map((r) => (
              <button
                key={r.id}
                onClick={() => selectRole(r)}
                className={`press-feedback w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between ${
                  r.id === selectedId
                    ? 'bg-brand-light text-brand-dark font-medium'
                    : 'hover:bg-slate-50'
                }`}
              >
                <span>{r.name}</span>
                <span className="text-[11px] text-slate-400">
                  {r._count.users} kişi
                </span>
              </button>
            ))}
            {!roles.length && (
              <div className="text-xs text-slate-400 p-2">Rol yok</div>
            )}
          </div>

          <Can module="USERS" action="CREATE">
            <div className="bg-white rounded-xl shadow-[0_1px_2px_rgba(47,52,58,0.04),0_4px_12px_-4px_rgba(47,52,58,0.08)] ring-1 ring-slate-900/5 p-3 space-y-2">
              <div className="text-xs font-medium text-slate-500">
                Yeni Rol
              </div>
              <input
                className={inputCls}
                placeholder="Rol adı"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
              />
              <button
                onClick={createRole}
                className="press-feedback w-full text-sm bg-brand text-white rounded-md py-1.5 hover:bg-brand-dark active:bg-brand-dark"
              >
                Ekle
              </button>
            </div>
          </Can>
        </div>

        {/* Matris */}
        <div className="flex-1 min-w-0">
          {!selected ? (
            <div className="text-slate-400 text-sm">Bir rol seçin.</div>
          ) : (
            <div className="bg-white rounded-xl shadow-[0_1px_2px_rgba(47,52,58,0.04),0_4px_12px_-4px_rgba(47,52,58,0.08)] ring-1 ring-slate-900/5 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <div>
                  <div className="font-medium">{selected.name}</div>
                  {selected.isSystem && (
                    <div className="text-[11px] text-amber-600">
                      Sistem rolü
                    </div>
                  )}
                </div>
                <Can module="USERS" action="UPDATE">
                  <Button onClick={save} disabled={!dirty || saving} size="sm">
                    {saving ? 'Kaydediliyor…' : 'Kaydet'}
                  </Button>
                </Can>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500">
                      <th className="text-left px-4 py-2 font-medium">Modül</th>
                      {actions.map((a) => (
                        <th key={a} className="px-3 py-2 font-medium text-center">
                          {ACTION_LABEL[a]}
                        </th>
                      ))}
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {modules.map((m) => {
                      const rowAll = actions.every((a) =>
                        checked.has(cellKey(m, a)),
                      );
                      return (
                        <tr key={m} className="border-t">
                          <td className="px-4 py-2">
                            <span className="mr-2">{MODULE_META[m].icon}</span>
                            {MODULE_META[m].label}
                          </td>
                          {actions.map((a) => (
                            <td key={a} className="px-3 py-2 text-center">
                              <input
                                type="checkbox"
                                className="h-4 w-4 accent-brand cursor-pointer"
                                checked={checked.has(cellKey(m, a))}
                                onChange={() => toggle(m, a)}
                              />
                            </td>
                          ))}
                          <td className="px-3 py-2 text-center">
                            <LinkButton onClick={() => toggleRow(m, !rowAll)}>
                              <span className="text-[11px]">{rowAll ? 'Temizle' : 'Tümü'}</span>
                            </LinkButton>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
