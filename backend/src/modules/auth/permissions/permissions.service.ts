import { Injectable } from '@nestjs/common';
import { ModuleCode, PermissionAction } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';

export interface EffectivePermissions {
  isSuperAdmin: boolean;
  /** "MODULE:ACTION" biçiminde etkin yetki kümesi. */
  granted: Set<string>;
}

export interface ModulePermissionMatrix {
  module: ModuleCode;
  actions: PermissionAction[];
}

const key = (m: ModuleCode, a: PermissionAction) => `${m}:${a}`;

/**
 * RBAC çözümleyici: User → Role → Module → Action.
 * Kullanıcı bazlı override (UserPermission) rol yetkilerinin üzerine uygulanır;
 * `allowed=false` açık engel oluşturur (deny wins).
 */
@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async getEffective(userId: string): Promise<EffectivePermissions> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: { include: { role: { include: { permissions: true } } } },
        userPermissions: true,
      },
    });

    if (!user) {
      return { isSuperAdmin: false, granted: new Set() };
    }
    if (user.isSuperAdmin) {
      return { isSuperAdmin: true, granted: new Set() };
    }

    const granted = new Set<string>();

    // 1) Rollerden gelen yetkiler
    for (const ur of user.roles) {
      for (const p of ur.role.permissions) {
        granted.add(key(p.module, p.action));
      }
    }

    // 2) Kullanıcı bazlı override'lar (allow ekler, deny siler)
    for (const up of user.userPermissions) {
      const k = key(up.module, up.action);
      if (up.allowed) granted.add(k);
      else granted.delete(k);
    }

    return { isSuperAdmin: false, granted };
  }

  /** Tek bir yetki kontrolü. */
  async can(
    userId: string,
    module: ModuleCode,
    action: PermissionAction,
  ): Promise<boolean> {
    const eff = await this.getEffective(userId);
    if (eff.isSuperAdmin) return true;
    return eff.granted.has(key(module, action));
  }

  /**
   * Kullanıcının erişebildiği (en az VIEW yetkisi olan) modüller.
   * Dinamik sidebar ve modül-filtre middleware'i bunu kullanır.
   */
  async getAccessibleModules(userId: string): Promise<ModuleCode[]> {
    const eff = await this.getEffective(userId);
    const all = Object.values(ModuleCode) as ModuleCode[];
    if (eff.isSuperAdmin) return all;
    return all.filter((m) => eff.granted.has(key(m, PermissionAction.VIEW)));
  }

  /** Frontend yetki matrisi için modül bazında işlem listesi. */
  async getPermissionMatrix(userId: string): Promise<ModulePermissionMatrix[]> {
    const eff = await this.getEffective(userId);
    const modules = Object.values(ModuleCode) as ModuleCode[];
    const actions = Object.values(PermissionAction) as PermissionAction[];
    return modules
      .map((module) => ({
        module,
        actions: actions.filter(
          (a) => eff.isSuperAdmin || eff.granted.has(key(module, a)),
        ),
      }))
      .filter((row) => row.actions.length > 0);
  }
}
