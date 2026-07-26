import { CryptoService } from './crypto.service';

describe('CryptoService (AES-256-GCM)', () => {
  let crypto: CryptoService;

  beforeAll(() => {
    process.env.ENCRYPTION_KEY = 'test-encryption-key-123456';
    crypto = new CryptoService();
  });

  it('şifreleyip aynı değeri geri çözer', () => {
    const enc = crypto.encrypt('12345678901');
    expect(enc).not.toBe('12345678901');
    expect(crypto.decrypt(enc)).toBe('12345678901');
  });

  it('sayısal tutarları korur', () => {
    const enc = crypto.encrypt(42000.5);
    expect(crypto.decryptNumber(enc)).toBe(42000.5);
  });

  it('null/boş değerleri null döndürür', () => {
    expect(crypto.encrypt(null)).toBeNull();
    expect(crypto.encrypt('')).toBeNull();
    expect(crypto.decrypt(null)).toBeNull();
    expect(crypto.decryptNumber(null)).toBe(0);
  });

  it('her şifrelemede farklı ciphertext üretir (rastgele IV)', () => {
    expect(crypto.encrypt('ayni')).not.toBe(crypto.encrypt('ayni'));
  });
});
