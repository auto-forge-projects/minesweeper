# 03 — Requirement Analizi: minesweeper

- Tarih: 2026-07-26 | Mod: AUTOPILOT | Profil: LITE

## Açık soruların çözümü (0b brief'inden)
- Zorluk seviyeleri: klasik değerler sabitlenir — Kolay 9x9/10, Orta 16x16/40, Zor 16x30/99.
- Bayrak koyma: **hem** sağ-tık (masaüstü) **hem** uzun-basma ~500ms (dokunmatik) aynı anda desteklenir — ayrı "bayrak modu" anahtarına gerek yok, ikisi çakışmaz (farklı girdi yolu).

## Fonksiyonel gereksinimler

### FR-1: Zorluk seçimi ve yeni oyun kurulumu
- **User story:** Oyuncu olarak, bir zorluk seviyesi seçip yeni oyun başlatmak istiyorum, böylece istediğim büyüklükte oynayabilirim.
- **Kabul kriterleri:**
  - Given oyun ekranı açık, when Kolay/Orta/Zor'dan biri seçilir, then o zorluğun grid boyutu + mayın sayısıyla yeni tahta kurulur.
  - Given yeni tahta kuruldu, then hiçbir hücre açık/bayraklı değildir ve mayınlar henüz yerleştirilmemiş ya da gizlidir (bkz. FR-2 ilk-tık güvenliği).
- **Öncelik:** Must

### FR-2: Hücre açma (ilk-tık güvenli)
- **User story:** Oyuncu olarak, bir hücreye sol tıkladığımda hücrenin açılmasını istiyorum, böylece tahtayı keşfedebilirim.
- **Kabul kriterleri:**
  - Given tahtada hiç hücre açılmamış, when ilk sol tık yapılır, then mayınlar İLK TIKLANAN hücre ve komşuları hariç tutularak yerleştirilir (ilk tık asla mayına denk gelmez).
  - Given açılan hücrenin komşu mayın sayısı 0, when hücre açılır, then komşu hücreler de zincirleme (flood-fill) otomatik açılır.
  - Given açılan hücrenin komşu mayın sayısı >0, then hücrede o sayı gösterilir.
  - Given hücre bayraklı, when sol tık yapılır, then hücre AÇILMAZ (önce bayrak kaldırılmalı).
- **Öncelik:** Must

### FR-3: Bayrak koyma/kaldırma
- **User story:** Oyuncu olarak, mayın olduğunu düşündüğüm hücreyi işaretlemek istiyorum, böylece yanlışlıkla açmam.
- **Kabul kriterleri:**
  - Given hücre kapalı, when sağ tık (masaüstü) veya ~500ms uzun-basma (dokunmatik) yapılır, then hücre bayraklı/bayraksız arasında geçiş yapar.
  - Given hücre açık, when sağ tık/uzun-basma yapılır, then hiçbir şey değişmez.
- **Öncelik:** Must

### FR-4: Kaybetme durumu
- **User story:** Oyuncu olarak, mayına tıkladığımda oyunun bittiğini net görmek istiyorum.
- **Kabul kriterleri:**
  - Given kapalı bir hücre mayın içeriyor, when o hücre açılır, then TÜM mayınlar açılır, tahta kilitlenir (başka tıklama etkisiz) ve "Kaybettin" mesajı gösterilir.
- **Öncelik:** Must

### FR-5: Kazanma durumu
- **User story:** Oyuncu olarak, tüm mayınsız hücreleri açtığımda kazandığımı görmek istiyorum.
- **Kabul kriterleri:**
  - Given mayın içermeyen tüm hücreler açıldı (mayınlı hücre sayısı kadar hücre kapalı kaldı), then tahta kilitlenir ve "Kazandın" mesajı %100 doğru tetiklenir.
  - Given en az bir mayınsız hücre hâlâ kapalı, then "Kazandın" mesajı GÖSTERİLMEZ.
- **Öncelik:** Must

### FR-6: Yeniden başlatma
- **User story:** Oyuncu olarak, sayfayı yenilemeden aynı zorlukta yeni oyun kurmak istiyorum.
- **Kabul kriterleri:**
  - Given oyun ekranı (kazanılmış/kaybedilmiş/devam eden), when "Yeniden Başlat" tıklanır, then aynı zorlukla FR-1'deki gibi sıfırdan tahta kurulur.
- **Öncelik:** Must

## Fonksiyonel olmayan gereksinimler (kalite kapısı: ölçülebilir)
| ID | Kategori | Gereksinim | Ölçüt / Hedef |
|----|----------|------------|----------------|
| NFR-1 | Performans | Tıklamadan DOM güncellemesine gecikme (en büyük grid 16x30 dahil) | ≤ 100ms |
| NFR-2 | Doğruluk | Komşu mayın sayımı (8-komşu) | %100 doğru (otomatik testle doğrulanır) |
| NFR-3 | Uyumluluk | Güncel masaüstü + mobil tarayıcılarda çalışmalı | Ek bağımlılık/derleme yok, saf HTML/CSS/JS |
| NFR-4 | Güvenilirlik | İlk tık asla mayına denk gelmemeli | %100 (otomatik testle doğrulanır) |

## İzlenebilirlik
| FR | Karşıladığı KPI / iş hedefi |
|----|------------------------------|
| FR-1 | Başarı kriteri 1 (zorluk seçip yeni oyun) |
| FR-2, FR-3 | Başarı kriteri 2 (sol/sağ tık davranışı, komşu sayısı) + KPI-3 (tepki≤100ms) |
| FR-2 (komşu sayımı) | KPI-2 (%100 doğru sayım) |
| FR-4, FR-5 | Başarı kriteri 3 (kaybetme/kazanma) |
| FR-6 | Başarı kriteri 4 (yeniden başlatma) |

## Kalite kapısı raporu
- "Her FR'nin kabul kriteri var" → ✅ (FR-1..FR-6, Given/When/Then kriterleriyle)
- "NFR'ler ölçülebilir" → ✅ (NFR-1..NFR-4, ölçüt/hedef sütunuyla)
