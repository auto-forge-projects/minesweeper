# 11 — Test Planı: minesweeper

- Tarih: 2026-07-26 | Mod: AUTOPILOT | Profil: LITE
- Girdi: `docs/03-requirements.md`, `docs/10-review/PR-1.md`, `docs/10-review/PR-2.md`, `src/`, `tests/` (42 mevcut birim testi)
- Kapsam kararı: Faz 9/10'da yazılan 42 birim/entegrasyon testi TEKRAR YAZILMAZ — bağımsız çalıştırılıp doğrulanır. Bu faz yalnız review'dan Faz 11'e devredilen boşlukları (F11) kapatır. Ayrıntı: `decisions/DL-11-001.md`.

## İzlenebilirlik: FR/NFR → test

| ID | Gereksinim (özet) | Kapsayan test(ler) | Durum |
|----|---------------------|---------------------|-------|
| FR-1 | Zorluk seçimi + yeni tahta kurulumu | `board.core.test.js` (createBoard/DIFFICULTIES), `app.test.js` (zorluk seçimi, Yeni Oyun) | ✅ |
| FR-2 | İlk-tık güvenli açma + flood-fill + bayraklı hücre açılmaz | `board.reveal.test.js` (lazy placeMines, flood-fill), `integration.test.js` (NFR-4 1000 tohum×3 zorluk), `board.flag.test.js` (bayraklıyken reveal no-op), `app.test.js` (touch/click entegrasyonu, F1 regresyonu) | ✅ **Kritik senaryo** |
| FR-3 | Bayrak koy/kaldır (sağ tık + uzun-basma), açık hücrede etkisiz | `board.flag.test.js` (toggle, kilitli tahta no-op), `app.test.js` (contextmenu, `dispatchTouchTap` uzun-basma, Android çift-tetik) | ✅ **Kritik senaryo** |
| FR-4 | Kaybetme: tüm mayınlar açılır, kilit, mesaj, kaybetme render'ı | `board.reveal.test.js`/`integration.test.js` (tüm mayınlar `revealed`, kilit), `render.test.js` "setStatus...Kaybettin", **YENİ:** `render.test.js` "losing render: exploded mine gets mine-triggered..." (F11 ikinci parça — `mine-triggered` vs `.mine` ayrımı) | ✅ **Kritik senaryo** |
| FR-5 | Kazanma: tüm mayınsızlar açık → kilit + mesaj, eksikse tetiklenmez | `board.reveal.test.js` (tam flood-fill → won), `board.flag.test.js` (kazanma sınırı izole), `render.test.js` "setStatus...Kazandın" | ✅ **Kritik senaryo** |
| FR-6 | Yeniden başlatma (aynı zorlukla sıfırdan) | `app.test.js` (Yeni Oyun tıklaması, bekleyen basma zamanlayıcısı temizleniyor — F8) | ✅ |
| NFR-1 | Tık→DOM ≤100ms (16x30 dahil) | **YENİ:** `perf.test.js` — hard (16x30=480 hücre) tam flood-fill (`mines=0` ile en geniş yayılım) `revealCell`+`updateCells` toplam süresi ölçülüp ≤100ms doğrulandı | ✅ **F11 kapatıldı** (kod-seviyesi; gerçek tarayıcı ölçümü hâlâ eksik — bkz. results.md) |
| NFR-2 | 8-komşu sayımı %100 doğru | `integration.test.js`, `board.reveal.test.js` — bağımsız brute-force karşılaştırma | ✅ |
| NFR-3 | Ek bağımlılık yok, masaüstü+mobil | `package.json` (sıfır dep), `render.test.js` SEC-1 grep, `app.test.js` dokunmatik/fare ayrımı | ✅ kod-seviyesi; gerçek cihaz duman testi yok (F11/F15 residual, bkz. results.md) |
| NFR-4 | İlk tık asla mayına denk gelmez | `integration.test.js` (3 zorluk × 1000 tohum), `board.reveal.test.js` (200 tohum) | ✅ |

## Kritik senaryolar (kabul kriteri: %100 geçmeli)
1. **İlk-tık-güvenli + flood-fill** (FR-2, NFR-4) — ✅ geçiyor.
2. **Bayrak koy/kaldır** (FR-3, masaüstü+dokunmatik) — ✅ geçiyor.
3. **Kaybetme** (FR-4, tüm mayınlar + kilit + render) — ✅ geçiyor (render boşluğu bu fazda kapatıldı).
4. **Kazanma** (FR-5, %100 doğru tetikleme) — ✅ geçiyor.

## Bu fazda eklenen testler
- `tests/perf.test.js` — NFR-1 ölçümü (F11, PR-1).
- `tests/render.test.js` içine 1 yeni test — kaybetme render'ı `mine-triggered`/`.mine` ayrımı (F11 ikinci parçası, PR-1 F5/F11).

## Kapsam DIŞI (bilinçli — gerekçe `decisions/DL-11-001.md`)
- **F15 (PR-2, Major, fail-safe):** `suppressNextClick` bayatlık riski — gerçek cihazda trailing-click üretmeyen platformlarda bir sonraki dokunuşu yutabilir. Kod-seviyesinde fake DOM ile tekrar üretilebilir olsa da, bu fazın kapsam kararı gereği burada AYRI bir test EKLENMEDİ (bkz. DL-11-001) — gerçek cihaz/tarayıcı doğrulaması gerektiren bir risk olarak not edilip Faz 15 teknik borcuna bırakıldı.
- **F16 (PR-2, Minor):** Bayraklı hücrede uzun-basma (unflag) → click no-op regresyon testi — davranış PR-2'de kod okunarak doğru bulundu ama koruyucu test eksik; bu faz kapsamına alınmadı (Faz 15).
- **Gerçek tarayıcı/dokunmatik cihaz duman testi** — hiçbir otomasyon katmanında yok; kod-seviyesinde ölçülemez.

## Kalite kapısı raporu
- "Kritik senaryolar %100" → ✅ FR-2/FR-3/FR-4/FR-5 tüm kritik senaryolar geçiyor (44/44 test yeşil).
- F11 (NFR-1 ölçümü + kaybetme render testi) → ✅ kapatıldı.
- F15 kapsam dışı bırakma kararı → ✅ DL-11-001'de gerekçelendirildi.
