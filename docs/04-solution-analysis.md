# 04 — Çözüm Analizi: minesweeper

- Tarih: 2026-07-26 | Mod: AUTOPILOT | Profil: LITE
- Girdi: `docs/03-requirements.md` (FR-1..FR-6, NFR-1..NFR-4)
- Ölçek çerçevesi: en büyük tahta Zor = 16x30 = **480 hücre / 99 mayın** (tüm kararların üst sınırı)

## Karar 1 — Mayın yerleştirme (FR-2, NFR-4)
- **A — Düz rastgele + retry:** rastgele indeks seç, doluysa/yasaksa tekrar dene.
- **B — Fisher-Yates ile uygun-hücre havuzu:** yasak küme (ilk tık + 8 komşu) hariç indeks dizisi kurulur, kısmi Fisher-Yates ile ilk N seçilir.

| Kriter | A (retry) | B (Fisher-Yates havuz) |
|---|---|---|
| Maliyet (kod) | Çok düşük | Düşük (~15 satır) |
| Karmaşıklık | Düşük ama **sınırsız döngü** | Sabit O(n) |
| NFR uyumu | NFR-1 riskli: Zor'da 99/471 yoğunlukta çarpışma retry'ları; en kötü hâl teorik olarak sınırsız | NFR-1 ✅ deterministik süre; NFR-4 ✅ yasak küme havuza hiç girmez |
| Test edilebilirlik | Zayıf (retry sayısı rastgele) | ✅ RNG enjekte edilir → deterministik test |
| Geri alınabilirlik | Yüksek | Yüksek (tek fonksiyon `placeMines`) |

**Seçim: B.** **Gerekçe:** yasak kümeyi havuza hiç almadığı için ilk-tık güvenliği (NFR-4) *yapısal* olarak garanti; süre sabit. A'da güvenlik ancak "kontrol et-tekrar dene" ile sağlanır ve süresi olasılıksaldır. → **DL-04-001**

## Karar 2 — Flood-fill (FR-2)
- **C — Rekürsif DFS:** `reveal(i)` kendini komşular için çağırır.
- **D — İteratif yığın (explicit stack):** açılacak indeksler dizide tutulur, `while (stack.length)`.

| Kriter | C (rekürsif) | D (iteratif yığın) |
|---|---|---|
| Maliyet | En düşük | Düşük |
| Karmaşıklık | Düşük görünür, gizli çağrı yığını | Düşük + açık kontrol |
| NFR uyumu | Boş tahtada en kötü hâl 480 derinlik → mobil tarayıcıda stack-overflow riski; NFR-1 belirsiz | NFR-1 ✅ heap'te dizi, derinlik sınırı yok, O(480) |
| Yan fayda | — | Değişen indeksleri **tek listede** biriktirir → hedefli render girdisi (Karar 3) |
| Geri alınabilirlik | Yüksek | Yüksek |

**Seçim: D.** **Gerekçe:** 480 hücrelik en kötü hâl rekürsiyonda tarayıcı yığınına bağımlıdır (ölçülemeyen risk); iteratif sürüm aynı maliyetle riski sıfırlar ve render'a hazır "değişen hücreler" listesini bedavaya üretir. → **DL-04-002**

## Karar 3 — Render stratejisi (NFR-1)
- **E — Tam yeniden çizim:** her hamlede `container.innerHTML` yeniden kurulur.
- **F — Hedefli DOM güncelleme + olay delegasyonu:** hücre `<div>`'leri yeni oyunda bir kez kurulur; hamlede yalnız değişen indeksler güncellenir; tek `click`/`contextmenu` dinleyicisi kapsayıcıdadır.

| Kriter | E (tam çizim) | F (hedefli + delegasyon) |
|---|---|---|
| Maliyet | En düşük | Düşük (~30 satır) |
| Karmaşıklık | Düşük | Orta-düşük (hücre `<div>` referans dizisi) |
| NFR uyumu | Her hamlede 480 düğüm + 480 dinleyici yeniden kurulur → NFR-1 (≤100ms) mobilde riskli | NFR-1 ✅ tipik hamle 1-20 düğüm; en kötü flood 480 `className`/`textContent` yazımı, layout thrash yok |
| Geri alınabilirlik | Yüksek | Yüksek (render arayüzü `updateCells(indices)` sabit kalır) |

**Seçim: F.** **Gerekçe:** ≤100ms bütçesi tek ölçülebilir performans kısıtımız; tam yeniden çizim onu her hamlede en büyük tahtada sınava sokar. Delegasyon ayrıca 480 dinleyici kurulumunu tamamen kaldırır. → **DL-04-003**

## Karar 4 — State modeli (NFR-2, test edilebilirlik)
- **G — Tek düz (1D) dizi:** `cells[r * cols + c]`, her eleman `{mine, adj, state}`.
- **H — 2D dizi:** `cells[r][c]`.
- **I — Set tabanlı:** `mines:Set`, `revealed:Set`, `flags:Set`.

| Kriter | G (1D) | H (2D) | I (Set) |
|---|---|---|---|
| Maliyet | Düşük | Düşük | Orta |
| Karmaşıklık | Tek indeks; komşuluk sınır kontrolü satır/sütun türetimiyle | Okunaklı ama çift döngü + iki sınır kontrolü | Üç ayrı yapı senkron tutulur (tutarsızlık kaynağı) |
| NFR uyumu | NFR-2 ✅ tek `neighbors(i)` yardımcısı, tek yerde test | NFR-2 ✅ ama komşuluk iki yerde tekrarlanır | NFR-2 ⚠ `adj` yine ayrıca tutulmalı |
| Render uyumu | ✅ indeks = DOM dizi indeksi (Karar 3 ile birebir) | Dönüşüm gerekir | Dönüşüm gerekir |
| Geri alınabilirlik | Yüksek (saf modül içi) | Yüksek | Orta |

**Seçim: G.** **Gerekçe:** hedefli render "değişen indeks listesi" ile çalışır; 1D model bu indeksle DOM çocuk indeksini birebir eşler (dönüşüm yok). Komşuluk mantığı tek `neighbors(i)` fonksiyonuna iner → NFR-2'nin %100 doğruluk iddiası tek noktadan test edilir. Set modeli üç yapıyı senkron tutma yükü getirir, 480 hücrede performans kazancı yok. → **DL-04-004**

## Reddedilen kapsam
- Web Worker / canvas render: 480 hücre için gereksiz; NFR-3 (framework/derleme yok) sadeliğini bozar.
- Zamanlayıcı/skor kalıcılığı: v1 kapsam dışı (`docs/00-idea.md`).

## Kalite kapısı raporu
- "≥2 alternatif karşılaştırıldı" → ✅ 4 kararın her birinde 2-3 gerçek alternatif satır satır tablolandı (A/B, C/D, E/F, G/H/I — toplam 9 seçenek)
- "Trade-off matrisi (maliyet/karmaşıklık/NFR uyumu/geri alınabilirlik)" → ✅ dört karar tablosunun ortak sütunları
- "Seçim gerekçeli" → ✅ her kararda **Seçim + Gerekçe** ve DL referansı
- Decision Log → ✅ DL-04-001, DL-04-002, DL-04-003, DL-04-004
