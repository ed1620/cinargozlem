# PDF Fontları (Türkçe karakter desteği)

PdfService, raporlarda Türkçe glifleri (ğ, ş, İ, ı, Ç, Ö, Ü) doğru basmak için
bu klasörde **Unicode TTF** font arar:

- `DejaVuSans.ttf`
- `DejaVuSans-Bold.ttf`

Bu iki dosyayı buraya koyun (ör. DejaVu Sans dağıtımından — kamuya açık/ücretsiz).
Dosyalar yoksa servis Helvetica'ya düşer ve bazı Türkçe karakterler eksik görünür.

Farklı bir konum için `FONT_DIR` ortam değişkenini kullanın.

> Not: Font dosyaları ikili (binary) olduğundan depoya eklenmemiştir.
