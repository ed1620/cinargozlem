import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'kg_is_public';

/** Kimlik doğrulama gerektirmeyen route'lar (ör: /auth/login). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
