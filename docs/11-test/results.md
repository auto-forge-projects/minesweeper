# 11 — Test Sonuçları: minesweeper

- Tarih: 2026-07-26 | Mod: AUTOPILOT
- Koşum: `cd workspace/minesweeper && npm test` (`node --test`, bağımsız, sıfır bağımlılık — SEC-6)

## Sonuç özeti

| Metrik | Değer |
|--------|-------|
| Toplam test | 44 |
| Geçen | **44** |
| Kalan (fail) | **0** |
| Süre | ~487ms (tüm suite) |
| Faz 9/10 sonundaki test sayısı | 42 |
| Bu fazda eklenen | 2 (`perf.test.js` ×1, `render.test.js` ×1) |

`npm test` çıktısı (özet):
```
# tests 44
# suites 0
# pass 44
# fail 0
# cancelled 0
# skipped 0
# todo 0
```

## NFR-1 ölçüm sonucu (F11 — PR-1)
- Senaryo: `hard` zorluk (16x30 = 480 hücre), `mines=0` ile en geniş flood-fill (tek reveal → tüm tahta bir kademede açılır — hem `revealCell`'in en kötü flood-fill genişliği hem `updateCells`'in en kötü `changed[]` boyutu aynı anda).
- Ölçüm: `revealCell` + `updateCells` toplam süresi, ısınma (warm-up) koşumundan SONRA.
- **Sonuç: ~1-7ms** (5 elle koşumda gözlenen aralık; test dosyasındaki koşumda ~6.3ms) — **NFR-1 hedefi ≤100ms'nin çok altında.**
- Üst sınır olarak testte doğrudan NFR-1'in kendi hedefi (≤100ms) kullanıldı, gevşetilmedi: sahte-DOM (gerçek reflow/paint/layout yok) + Node süreci gerçek tarayıcıdan tutarlı biçimde hızlı olduğundan, buradaki ölçüm gerçek dünya gecikmesinin bir ALT SINIRIdır, eşdeğeri değil — bu yüzden 100ms bandı burada bol pay bırakıyor (gözlenen değer hedefin ~%1-7'si).
- **Kapatıldı: F11 birinci parça.**

## F11 / F15 durumu

| Bulgu | Faz 11 durumu |
|-------|----------------|
| **F11** (PR-1, Minor — NFR-1 ölçümü yok) | **Kapatıldı.** `tests/perf.test.js` eklendi, sonuç yukarıda. |
| **F11 ikinci parça** (PR-1, F5 ile birleşik — kaybetme render'ı test edilmemiş) | **Kapatıldı.** `render.test.js`'e `mine-triggered` vs `.mine` ayrımını doğrulayan test eklendi. |
| **F15** (PR-2, Major, YENİ — `suppressNextClick` bayatlık riski) | **Kapsam dışı bırakıldı (bilinçli), gerçek-tarayıcı riski olarak not edildi.** Etkisi fail-safe (yanlış açma değil, kayıp girdi) ve kodda tek satırlık bir düzeltmesi var, ama bu fazın yetkisi yalnız TEST eklemekle sınırlı — src/ DEĞİŞTİRİLEMEZ (bkz. görev kısıtı). Trailing-click üretmeyen platformlar (bazı Android Chrome/iOS Safari sürümleri) kod-seviyesinde tam olarak modellenemiyor; gerçek dokunmatik cihaz/tarayıcı testi gerektiriyor. **Faz 15 teknik borcuna not düşüldü** (bkz. `decisions/DL-11-001.md`). Faz 9'a geri besleme ÖNERİLİR (tek satır: `touchstart` başında `suppressNextClick = false;` + `newGame()`'de sıfırlama) — orchestrator'a bildirildi, bu faz kendi düzeltmedi. |
| **F16** (PR-2, Minor — unflag regresyon testi eksik) | Kapsam dışı bırakıldı; davranış PR-2'de doğru bulundu, yalnız koruyucu test eksik. Faz 15. |
| Gerçek tarayıcı duman testi (PR-1 F2, PR-2 NFR-3 satırı) | Hiçbir otomasyon katmanında yok; bu proje sıfır-bağımlılık/framework'süz olduğundan (NFR-3) headless tarayıcı koşucusu bilinçli olarak eklenmedi — riskin kendisi doküman edildi, giderilmedi. |

## Kalite kapısı raporu
- Kritik senaryolar (FR-2 ilk-tık-güvenli+flood-fill, FR-3 bayrak, FR-4 kaybet, FR-5 kazan) → **%100 geçti** ✅ (44/44 test yeşil, bağımsız koşuldu — beyan değil).
- F11 (NFR-1 ölçümü + kaybetme render'ı) → ✅ kapatıldı.
- Kapsam dışı bırakılanlar (F15, F16, gerçek-tarayıcı testi) → ✅ gerekçeli, `decisions/DL-11-001.md`'de kayıtlı.
- **Kapı sonucu: GEÇTİ ✅** — geri besleme gerekmiyor (F15 orchestrator'a bilgi notu olarak iletiliyor, kapıyı düşürmüyor çünkü Minor/Major seviyesinde src değişikliği gerektiren bir kalem, bu fazın "kritik senaryo %100" kriterine dahil değil).
