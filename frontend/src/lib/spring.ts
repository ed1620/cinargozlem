/**
 * Küçük bir yay (spring) motoru + jest yardımcıları.
 *
 * Neden sabit süreli bir geçiş değil: sabit süreli animasyon yeni girdiye
 * cevap veremez. Yay verebilir — hedef değişince mevcut konum ve mevcut hız
 * korunarak yeni hedefe doğru çözülmeye devam eder. Kesintiye uğratılabilirlik
 * ve hız sürekliliği bundan bedava gelir.
 *
 * Parametreler Apple'ın tasarımcı ikilisi:
 *  - damping (sönüm oranı): 1 = kritik sönüm, taşma yok. <1 = taşar, sallanır.
 *  - response: hedefe varış çevikliği, saniye. "Süre" değil — yayın oturma
 *    zamanı parametrelerden doğar, önceden dayatılmaz.
 */

type Options = { damping?: number; response?: number };

// Sekme arka plana atılıp geri gelince dt devasa olur ve integrasyon patlar.
const MAX_DT = 1 / 30;

export class Spring {
  private x: number;
  private v = 0;
  private target: number;
  private raf = 0;
  private last = 0;
  private readonly zeta: number;
  private readonly omega: number;

  constructor(
    initial: number,
    private readonly onUpdate: (x: number) => void,
    opts: Options = {},
    private readonly onRest?: () => void,
  ) {
    this.x = initial;
    this.target = initial;
    this.zeta = opts.damping ?? 1;
    this.omega = (2 * Math.PI) / (opts.response ?? 0.35);
  }

  get value() {
    return this.x;
  }

  get velocity() {
    return this.v;
  }

  /** 1:1 sürükleme: parmağın yazdığı değer doğrudan geçer, araya yay girmez. */
  set(x: number) {
    this.stop();
    this.x = x;
    this.onUpdate(x);
  }

  /**
   * Yeni hedefe çöz. Hız verilirse ondan devam eder (jestin bıraktığı hız),
   * verilmezse mevcut hız korunur — ikisi de dikişsiz. Hızı sıfırlamak,
   * yön değiştiren bir jestte "duvara çarpma" hissi yaratırdı.
   */
  animateTo(target: number, velocity?: number) {
    this.target = target;
    if (velocity !== undefined) this.v = velocity;
    if (!this.raf) {
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.tick);
    }
  }

  /** Animasyonsuz atla (hareket azaltma modu, ilk yerleşim). */
  jumpTo(x: number) {
    this.stop();
    this.x = x;
    this.target = x;
    this.v = 0;
    this.onUpdate(x);
  }

  stop() {
    if (this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    }
  }

  private tick = (now: number) => {
    const dt = Math.min((now - this.last) / 1000, MAX_DT);
    this.last = now;

    // Sönümlü harmonik salınım, yarı-örtük Euler ile.
    const a = -(this.omega * this.omega) * (this.x - this.target) - 2 * this.zeta * this.omega * this.v;
    this.v += a * dt;
    this.x += this.v * dt;
    this.onUpdate(this.x);

    // Yarım pikselin ve göze görünmeyen hızın altında oturmuş sayılır.
    if (Math.abs(this.x - this.target) < 0.5 && Math.abs(this.v) < 1) {
      this.x = this.target;
      this.v = 0;
      this.onUpdate(this.x);
      this.raf = 0;
      this.onRest?.();
      return;
    }
    this.raf = requestAnimationFrame(this.tick);
  };
}

/**
 * Momentum projeksiyonu: bırakma hızından, kaydırma yavaşlamasının götüreceği
 * duruş noktasını kestirir. Hedefi bırakma noktasına göre değil bu kestirime
 * göre seçmek, fiskenin nesneyi gerçekten fırlattığı hissini verir.
 *
 * Fizik dersindeki v²/(2a) değil — kaydırma üstel sönümle durur.
 */
export function project(initialVelocity: number, decelerationRate = 0.998) {
  return ((initialVelocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

/**
 * Sınırın ötesinde ilerledikçe artan direnç. Sert duruş "dondu" diye okunur;
 * süregelen direnç "cevap veriyor ama burada devamı yok" diye.
 */
export function rubberband(overshoot: number, dimension: number, constant = 0.55) {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

/**
 * Son birkaç işaretçi olayından hız (px/sn). Son iki nokta tek başına
 * gürültülüdür, uzun pencere ise yön değişimini yutar: kullanıcı sola çekip
 * son anda sağa döndürdüyse, pencere jestin tamamını kapsarsa hız hâlâ sola
 * görünür ve çekmece kullanıcının tersine karar verir.
 *
 * 60ms ≈ 60fps'de son 4 kare: tazelik ile kararlılık arasında denge.
 */
const VELOCITY_WINDOW_MS = 60;

export function velocityFrom(history: { x: number; t: number }[]) {
  if (history.length < 2) return 0;
  const last = history[history.length - 1];

  // Pencere içindeki en eski noktayı bul; hepsi pencereye sığıyorsa en eskisi.
  let first = history[0];
  for (let i = history.length - 2; i >= 0; i--) {
    if (last.t - history[i].t > VELOCITY_WINDOW_MS) break;
    first = history[i];
  }

  const dt = (last.t - first.t) / 1000;
  if (dt <= 0) return 0;
  return (last.x - first.x) / dt;
}
