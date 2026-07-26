import {
  ModuleCode,
  PermissionAction,
  PrismaClient,
} from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  // 1) Sistem rolleri
  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: {
      name: 'ADMIN',
      description: 'Süper yönetici — tüm modüllerde tam yetki',
      isSystem: true,
    },
  });

  // Muhasebe rolü: Finans + Personel(bordro) görüntüle/ekle/güncelle/rapor
  const accountingRole = await prisma.role.upsert({
    where: { name: 'MUHASEBE' },
    update: {},
    create: {
      name: 'MUHASEBE',
      description: 'Gelir-Gider ve bordro işlemleri',
    },
  });

  const accountingPerms: Array<[ModuleCode, PermissionAction]> = [];
  for (const m of [ModuleCode.FINANCE, ModuleCode.PERSONNEL] as const) {
    for (const a of [
      PermissionAction.VIEW,
      PermissionAction.CREATE,
      PermissionAction.UPDATE,
      PermissionAction.EXPORT,
    ] as const) {
      accountingPerms.push([m, a]);
    }
  }
  for (const [module, action] of accountingPerms) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_module_action: { roleId: accountingRole.id, module, action },
      },
      update: {},
      create: { roleId: accountingRole.id, module, action },
    });
  }

  // 2) Süper admin kullanıcı
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'Admin1234!';
  const passwordHash = await argon2.hash(password);
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@cinargozlem.local',
      fullName: 'Sistem Yöneticisi',
      passwordHash,
      isSuperAdmin: true,
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: adminRole.id } },
    update: {},
    create: { userId: admin.id, roleId: adminRole.id },
  });

  // eslint-disable-next-line no-console
  console.log(
    `Seed tamam. Giriş: admin / ${password} (SEED_ADMIN_PASSWORD ile değiştirin)`,
  );
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
