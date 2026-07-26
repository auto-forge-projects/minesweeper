# 15 — Bakım: minesweeper

- Tarih: 2026-07-26 | Mod: AUTOPILOT
- Bu dosya ÜRÜNÜN teknik borcunu izler; fabrikanın eksikleri `AUTOFORGE-FEEDBACK.md`'ye.

## Bilinen sorunlar
- Yok (Blocker/Critical = 0 — Faz 10 PR-2 sonucu). Tüm kalan bulgular Major/Minor/Nit seviyesinde, LITE eşiği (`critical`) düzeltme dayatmıyor.

## Teknik borç (kalite kapısı: önceliklendirilmiş)
| # | Borç | Kaynak (DL/review bulgusu) | Öncelik (P1/P2/P3) | Not |
|---|------|---------------------------|--------------------|-----|
| TD-1 | `suppressNextClick` bayrağı jest sınırına hapsedilmemiş — trailing-click üretmeyen platformlarda (bazı Android/iOS uzun-basma) bayrak konduktan sonraki ilk dokunuş sessizce yutulur (fail-safe: yanlış hücre açılmaz, yalnız bir dokunuş kaybolur) | PR-2.md F15 (Major) | P2 | Tek satır: `touchstart` başında + `newGame()` içinde `suppressNextClick = false` |
| TD-2 | F15'in "unflag→click hücreyi açmaz" ve "trailing-click-siz platform" senaryoları test edilmemiş | PR-2.md F16 (Minor) | P2 | `dispatchTouchTap(..., {emitClick:false})` varyantı + 2 test |
| TD-3 | Kaybetme anında bayraklı mayınlar da `revealed` yapılıyor — klasik Minesweeper'da doğru bayraklar korunur | PR-1.md F6 (Minor) | P2 | Kaybetmede yalnız `hidden` mayınları aç, `flagged` olanı koru |
| TD-4 | CSP `frame-ancestors` `<meta>` içinde etkisiz (yalnız HTTP başlığında geçerli) — clickjacking koruması fiilen yok | PR-1.md F9 (Minor) | P3 | `deploy/nginx.conf`'a `add_header Content-Security-Policy "frame-ancestors 'none'"` |
| TD-5 | `triggered` hücre alanı `createBoard`'da başlatılmıyor, veri modelinde (docs/05) tanımsız; test yok | PR-1.md F5 (Minor) | P3 | `createBoard`'da `triggered:false` ile başlat + docs/05 güncelle + test |
| TD-6 | `boardEl`/`statusEl` için null-guard yok — `#board`/`#status` eksikse sessiz `TypeError` | PR-1.md F7 (Minor) | P3 | Açık hata fırlat: `initApp: #board/#status bulunamadı` |
| TD-7 | Zorluk allowlist mantığı `board.js` ve `app.js`'te iki kopya | PR-1.md F10 (Minor) | P3 | Tek fonksiyonu `board.js`'ten export edip paylaş |
| TD-8 | UI "Yeni Oyun" gösteriyor, FR-6 metni "Yeniden Başlat" diyor — izlenebilirlik gürültüsü | PR-1.md F12 (Nit) | P3 | Etiket veya FR metnini eşitle |
| TD-9 | Public arayüzlerde JSDoc yok, yorum dili karışık (EN/TR) | PR-1.md F13 (Nit) | P3 | 8 export fonksiyona `@param/@returns` + tek dil |
| TD-10 | `role="grid"` altında `role="row"` yok, hücreler `tabindex` ile odaklanamıyor — klavye ile oynanamaz (DL-06-001 ile bilinçli v1 dışı bırakılmıştı) | PR-1.md F14 (Nit) | P3 | Kapsam genişlemesi kararı gerektirir — kullanıcı isterse ele alınır |
| TD-11 | SEC-1 taraması `src/` alt dizinlerini gözden kaçırıyor (düz `readdirSync`), `setTimeout`/`setInterval` string-argüman kalıbı eklenmedi | PR-2.md F17 (Nit) | P3 | `{recursive:true}` + ek regex |

## Bağımlılık güncelleme planı
- Sıfır çalışma-zamanı bağımlılık (DL-04-004 miras) — güncellenecek paket yok.
- Runtime: Node.js sürümü (`node --test`, geliştirme/CI'da) — CI workflow'undaki Node sürümü LTS güncellemelerinde elle bump edilir.

## Bakım ritmi
- P2 borçları (TD-1, TD-2, TD-3) sonraki bir bakım turunda veya ↺ Yeni İhtiyaç fazında toplu ele alınabilir — hiçbiri işlevsel/güvenlik blokeri değil (fail-safe/kozmetik).
- P3 borçları birikimli backlog'da tutulur.

## Kalite kapısı raporu
- "Teknik borç önceliklendirilmiş" → ✅ (11 borç, hepsi PR-1/PR-2 bulgusuna izlenebilir, P2/P3 önceliklendirildi)
