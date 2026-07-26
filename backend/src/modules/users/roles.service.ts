import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ModuleCode, PermissionAction } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateRoleDto, PermissionItemDto } from './dto/role.dto';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  /** RBAC matris ekranı için: roller + yetkileri + kullanıcı sayısı. */
  list() {
    return this.prisma.role.findMany({
      include: {
        permissions: { select: { module: true, action: true } },
        _count: { select: { users: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  /** Matris ekranının kolonları/satırları için sabit metadata. */
  meta() {
    return {
      modules: Object.values(ModuleCode),
      actions: Object.values(PermissionAction),
    };
  }

  async create(dto: CreateRoleDto) {
    const exists = await this.prisma.role.findUnique({
      where: { name: dto.name },
    });
    if (exists) throw new ConflictException('Bu rol adı zaten var');
    return this.prisma.role.create({ data: dto });
  }

  /** Bir rolün tüm yetki matrisini tek seferde değiştirir (checkbox grid save). */
  async replacePermissions(roleId: string, permissions: PermissionItemDto[]) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundException('Rol bulunamadı');

    // Yinelenenleri temizle
    const unique = new Map<string, PermissionItemDto>();
    for (const p of permissions) unique.set(`${p.module}:${p.action}`, p);

    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({ where: { roleId } }),
      this.prisma.rolePermission.createMany({
        data: [...unique.values()].map((p) => ({
          roleId,
          module: p.module,
          action: p.action,
        })),
      }),
    ]);
    return this.list();
  }
}
