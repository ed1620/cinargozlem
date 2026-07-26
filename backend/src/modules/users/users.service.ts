import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RecordStatus } from '@prisma/client';
import * as argon2 from 'argon2';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  AssignRolesDto,
  CreateUserDto,
  SetUserOverridesDto,
  UpdateUserDto,
} from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly publicSelect = {
    id: true,
    username: true,
    email: true,
    fullName: true,
    phone: true,
    isSuperAdmin: true,
    status: true,
    lastLoginAt: true,
    createdAt: true,
    roles: { include: { role: { select: { id: true, name: true } } } },
    userPermissions: {
      select: { module: true, action: true, allowed: true },
    },
  };

  list() {
    return this.prisma.user.findMany({
      select: this.publicSelect,
      orderBy: { username: 'asc' },
    });
  }

  async get(id: string) {
    const u = await this.prisma.user.findUnique({
      where: { id },
      select: this.publicSelect,
    });
    if (!u) throw new NotFoundException('Kullanıcı bulunamadı');
    return u;
  }

  async create(dto: CreateUserDto) {
    const dup = await this.prisma.user.findFirst({
      where: { OR: [{ username: dto.username }, { email: dto.email }] },
    });
    if (dup)
      throw new ConflictException('Kullanıcı adı veya e-posta zaten kayıtlı');

    const passwordHash = await argon2.hash(dto.password);
    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        email: dto.email,
        fullName: dto.fullName,
        phone: dto.phone,
        passwordHash,
        isSuperAdmin: dto.isSuperAdmin ?? false,
        roles: dto.roleIds?.length
          ? { create: dto.roleIds.map((roleId) => ({ roleId })) }
          : undefined,
      },
      select: this.publicSelect,
    });
    return user;
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.assertExists(id);
    return this.prisma.user.update({
      where: { id },
      data: {
        email: dto.email,
        fullName: dto.fullName,
        phone: dto.phone,
        isSuperAdmin: dto.isSuperAdmin,
      },
      select: this.publicSelect,
    });
  }

  async setStatus(id: string, status: RecordStatus) {
    await this.assertExists(id);
    // Pasif kullanıcı: mevcut oturumları iptal et.
    if (status === RecordStatus.PASSIVE)
      await this.prisma.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    return this.prisma.user.update({
      where: { id },
      data: { status },
      select: this.publicSelect,
    });
  }

  async assignRoles(id: string, dto: AssignRolesDto) {
    await this.assertExists(id);
    await this.prisma.$transaction([
      this.prisma.userRole.deleteMany({ where: { userId: id } }),
      this.prisma.userRole.createMany({
        data: dto.roleIds.map((roleId) => ({ userId: id, roleId })),
        skipDuplicates: true,
      }),
    ]);
    return this.get(id);
  }

  /** Kullanıcı bazlı yetki override'ları (rolün üzerine allow/deny). */
  async setOverrides(id: string, dto: SetUserOverridesDto) {
    await this.assertExists(id);
    await this.prisma.$transaction([
      this.prisma.userPermission.deleteMany({ where: { userId: id } }),
      this.prisma.userPermission.createMany({
        data: dto.overrides.map((o) => ({
          userId: id,
          module: o.module,
          action: o.action,
          allowed: o.allowed,
        })),
      }),
    ]);
    return this.get(id);
  }

  async resetPassword(id: string, password: string) {
    await this.assertExists(id);
    const passwordHash = await argon2.hash(password);
    await this.prisma.user.update({ where: { id }, data: { passwordHash } });
    // Parola değişince oturumları iptal et.
    await this.prisma.refreshToken.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { updated: true };
  }

  async remove(id: string) {
    await this.assertExists(id);
    await this.prisma.user.delete({ where: { id } });
    return { deleted: true };
  }

  private async assertExists(id: string) {
    const c = await this.prisma.user.count({ where: { id } });
    if (!c) throw new NotFoundException('Kullanıcı bulunamadı');
  }
}
