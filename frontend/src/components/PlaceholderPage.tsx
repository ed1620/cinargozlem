import { MODULE_META, ModuleCode } from '../types';

/** Henüz uygulanmamış modül ekranları için yer tutucu (sidebar/RBAC testine hazır). */
export function PlaceholderPage({ module }: { module: ModuleCode }) {
  const meta = MODULE_META[module];
  return (
    <div className="space-y-2">
      <h1 className="text-xl font-semibold tracking-[-0.015em] flex items-center gap-2">
        <span>{meta.icon}</span> {meta.label}
      </h1>
      <p className="text-slate-500 text-sm max-w-lg">
        Bu modülün CRUD ekranları bir sonraki fazda; aynı RBAC guard'ları, PDF
        rapor ve uyarı altyapısı üzerine eklenecek. Menüde görünüyor olması,
        yetkilendirmenin doğru çalıştığını gösterir.
      </p>
    </div>
  );
}
