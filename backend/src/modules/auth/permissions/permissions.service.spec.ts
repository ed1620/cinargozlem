import { ModuleCode, PermissionAction } from '@prisma/client';
import { PermissionsService } from './permissions.service';

function serviceWithUser(user: any) {
  const prisma = { user: { findUnique: jest.fn().mockResolvedValue(user) } };
  return new PermissionsService(prisma as any);
}

describe('PermissionsService (RBAC çözümleme)', () => {
  it('süper admin her yetkiye sahiptir', async () => {
    const svc = serviceWithUser({ isSuperAdmin: true, roles: [], userPermissions: [] });
    expect(await svc.can('u', ModuleCode.FINANCE, PermissionAction.DELETE)).toBe(true);
    expect(await svc.getAccessibleModules('u')).toContain(ModuleCode.USERS);
  });

  it('rol yetkilerini toplar', async () => {
    const svc = serviceWithUser({
      isSuperAdmin: false,
      roles: [
        {
          role: {
            permissions: [
              { module: ModuleCode.FINANCE, action: PermissionAction.VIEW },
              { module: ModuleCode.FINANCE, action: PermissionAction.CREATE },
            ],
          },
        },
      ],
      userPermissions: [],
    });
    expect(await svc.can('u', ModuleCode.FINANCE, PermissionAction.VIEW)).toBe(true);
    expect(await svc.can('u', ModuleCode.FINANCE, PermissionAction.DELETE)).toBe(false);
    expect(await svc.getAccessibleModules('u')).toEqual([ModuleCode.FINANCE]);
  });

  it('kullanıcı override deny, rol yetkisini ezip engeller', async () => {
    const svc = serviceWithUser({
      isSuperAdmin: false,
      roles: [
        { role: { permissions: [{ module: ModuleCode.FINANCE, action: PermissionAction.VIEW }] } },
      ],
      userPermissions: [
        { module: ModuleCode.FINANCE, action: PermissionAction.VIEW, allowed: false },
      ],
    });
    expect(await svc.can('u', ModuleCode.FINANCE, PermissionAction.VIEW)).toBe(false);
  });

  it('kullanıcı override allow, ekstra yetki verir', async () => {
    const svc = serviceWithUser({
      isSuperAdmin: false,
      roles: [],
      userPermissions: [
        { module: ModuleCode.STUDENTS, action: PermissionAction.VIEW, allowed: true },
      ],
    });
    expect(await svc.can('u', ModuleCode.STUDENTS, PermissionAction.VIEW)).toBe(true);
  });

  it('kullanıcı yoksa hiçbir yetki yok', async () => {
    const svc = serviceWithUser(null);
    expect(await svc.can('u', ModuleCode.FINANCE, PermissionAction.VIEW)).toBe(false);
    expect(await svc.getAccessibleModules('u')).toEqual([]);
  });
});
