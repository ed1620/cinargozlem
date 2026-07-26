import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { RecordStatus } from '@prisma/client';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AuthUser } from '../../../common/decorators/current-user.decorator';

export interface JwtPayload {
  sub: string;
  username: string;
  isSuperAdmin: boolean;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_ACCESS_SECRET as string,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    // Token geçerli olsa bile kullanıcı pasifse erişimi engelle.
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, username: true, isSuperAdmin: true, status: true },
    });
    if (!user || user.status !== RecordStatus.ACTIVE) {
      throw new UnauthorizedException('Kullanıcı pasif veya bulunamadı');
    }
    return {
      userId: user.id,
      username: user.username,
      isSuperAdmin: user.isSuperAdmin,
    };
  }
}
