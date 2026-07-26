import { Injectable, InternalServerErrorException } from '@nestjs/common';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from 'crypto';

/**
 * AES-256-GCM ile hassas PII şifreleme (TC No, maaş, finansal tutarlar).
 * Şema'daki `*Enc` alanları bu servis üzerinden yazılır/okunur.
 *
 * Depolanan format: base64( iv[12] | authTag[16] | ciphertext )
 */
@Injectable()
export class CryptoService {
  private readonly key: Buffer;
  private static readonly IV_LEN = 12;
  private static readonly TAG_LEN = 16;

  constructor() {
    const raw = process.env.ENCRYPTION_KEY;
    if (!raw) {
      throw new InternalServerErrorException('ENCRYPTION_KEY tanımlı değil');
    }
    // 32 byte anahtar türet (girilen değer ne uzunlukta olursa olsun).
    this.key = scryptSync(raw, 'kg-kyp-salt', 32);
  }

  encrypt(plain: string | number | null | undefined): string | null {
    if (plain === null || plain === undefined || plain === '') return null;
    const iv = randomBytes(CryptoService.IV_LEN);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const enc = Buffer.concat([
      cipher.update(String(plain), 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, enc]).toString('base64');
  }

  decrypt(payload: string | null | undefined): string | null {
    if (!payload) return null;
    const buf = Buffer.from(payload, 'base64');
    const iv = buf.subarray(0, CryptoService.IV_LEN);
    const tag = buf.subarray(
      CryptoService.IV_LEN,
      CryptoService.IV_LEN + CryptoService.TAG_LEN,
    );
    const data = buf.subarray(CryptoService.IV_LEN + CryptoService.TAG_LEN);
    const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString(
      'utf8',
    );
  }

  /** Şifreli tutarı sayıya çevirir (finans/bordro hesapları için). */
  decryptNumber(payload: string | null | undefined): number {
    const v = this.decrypt(payload);
    return v ? Number(v) : 0;
  }
}
