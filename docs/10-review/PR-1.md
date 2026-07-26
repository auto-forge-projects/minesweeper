# 10 — Code Review: PR-1 (minesweeper)

- Tarih: 2026-07-26 | Mod: AUTOPILOT | İnceleyen: code-reviewer (opus) — **yazan (developer/sonnet) ile FARKLI (Author ≠ Reviewer)**
- İncelenen: `src/board.js`, `src/render.js`, `src/app.js`, `tests/**`, `index.html`, `styles.css`, `package.json` · Referans: docs/03, docs/05, docs/07
- Blind review: yazarın DL/HANDOFF anlatısı okunmadı; yalnız kod + sabit checklist.

## Yöntem
- `npm test` bağımsız koşuldu: **39/39 pass, 0 fail** (`node --test`, ~540ms, sıfır bağımlılık).
- Üç modül + iki statik dosya satır satır elle okundu; girdi yolları (click / contextmenu / touchstart) uçtan uca zihinsel sürüşle izlendi.
- SEC-1..SEC-9 için `src/`, `index.html`, `styles.css` üzerinde grep: `innerHTML|outerHTML|insertAdjacentHTML|document.write|eval(|new Function|localStorage|sessionStorage|cookie|fetch(|XMLHttpRequest|WebSocket|location.|postMessage|console.` → **yalnız `render.js:3` yorum satırı** eşleşti, gerçek kullanım yok.
- `git log` ile TDD sırası doğrulandı: her TASK için `test(...)` commit'i implementasyon commit'inden ÖNCE (TASK-001..007).

## Bulgular
| # | Severity | Dosya:Satır | Bulgu | Aksiyon |
|---|----------|-------------|-------|---------|
| F1 | **Critical** | `src/app.js:62-82` | **Dokunmatik/fare olay yolları ayrıştırılmamış.** `touchstart` dinleyicisi `preventDefault()` ÇAĞIRMIYOR ve uzun-basma bayrağı ile ardından gelen emüle `click` arasında hiçbir bastırma/koruma yok. Sonuç: (a) BAYRAKLI bir hücrede uzun-basma bayrağı kaldırır (`flagged→hidden`), parmak kalkınca tarayıcının ürettiği sentetik `click` aynı hücreyi ANINDA açar → oyuncunun bilerek işaretlediği mayın patlar, oyun kaybedilir (geri dönüşü yok, tahta kilitlenir); (b) Android Chrome uzun-basmada `contextmenu` de üretir → 500ms zamanlayıcı + `contextmenu` aynı hücrede iki kez `handleFlag` çağırır, toggle kendini iptal eder (bayrak hiç konmamış görünür). FR-3 dokunmatik yolu (Must) ve docs/03 §Açık soruların çözümü'ndeki **"ikisi çakışmaz (farklı girdi yolu)"** kararı kodda karşılıksız; NFR-3 (mobil tarayıcı) etkilenir. Not: tarayıcıda koşturulmadı, kod-seviyesinde mekanizmanın YOKLUĞU kesin. | `touchstart`'ta `evt.preventDefault()` (veya `touch-action:none` + `suppressNextClick` bayrağı) ile emüle click'i bastır; dokunmatik jest aktifken `contextmenu`'yu yut. Regresyon testi: `touchstart→tick(500)→touchend→click` dizisinde hücre bayraklı KALIR; bayraklıda aynı dizi hücreyi AÇMAZ. |
| F2 | Major | `tests/helpers/fake-dom.js:1-109`, `tests/app.test.js:62-78` | **Sahte DOM tarayıcı uyumluluk-olayı (compatibility event) semantiğini taşımıyor**, bu yüzden F1 gibi girdi-yolu çakışmaları test edilemiyor ve tüm app testleri yeşilken gerçek entegrasyon bozuk kalabiliyor. Uzun-basma testi yalnız `touchstart→tick(500)` yapıyor; `touchend` + ardından gelen `click` hiç simüle edilmiyor; UNFLAG senaryosu hiç yok. Ayrıca hiçbir gerçek-tarayıcı smoke doğrulaması yok. | Fake DOM'a "touch sonrası emüle click" davranışını ekle (ya da `dispatchTouchTap()` yardımcısı) ve F1 senaryolarını testle. Gerçek tarayıcı duman testi Faz 11'e görev olarak geçsin. |
| F3 | Minor | `tests/render.test.js:22-26` | **SEC-1 regresyon testi eksik kapsamlı:** docs/07 SEC-1 "`src/` genelinde grep ile doğrulanabilir" diyor, test yalnız `render.js`'i okuyor (`app.js`, `board.js` denetimsiz). Ayrıca regex `\.innerHTML\s*=` biçimini arıyor → `el.innerHTML += x` yakalanmaz. | Testi `src/` altındaki TÜM `.js` dosyalarında döndür; kalıba `\+?=` ve string argümanlı `setTimeout`/`setInterval` kalıbı ekle. |
| F4 | Minor | `src/board.js:62,119-121` | `mineCount = Math.min(board.mines, candidates.length)` ile daha az mayın konabilir ama `board.mines` GÜNCELLENMEZ; kazanma kontrolü `cells.length - board.mines` kullandığı için bu durumda **kapalı mayınsız hücre varken "Kazandın" tetiklenir** (FR-5 "%100 doğru" invariantı). Üç allowlist zorluğuyla bugün ulaşılamaz (en dar durum: easy 81 hücre / 72 aday / 10 mayın), ama `placeMines` docs/05'te public arayüz ve `board.mines` yazılabilir. | `board.mines = mineCount;` (tek satır) — hesap tek kaynaktan aksın. |
| F5 | Minor | `src/board.js:99`, `src/render.js:8`, docs/05:38 | `triggered` alanı `createBoard`'daki hücre şeklinde (`{mine, adj, state}`) YOK, kaybetme anında dinamik ekleniyor; docs/05 veri modelinde de tanımsız. `render.js` bu alana göre `mine-triggered` sınıfı basıyor ama **hiçbir test bu sınıfı doğrulamıyor** → sessizce kırılabilecek, sözleşmesiz alan. | `createBoard`'da `triggered: false` ile başlat + docs/05 veri modeline ekle + kaybetme render'ı için test yaz. |
| F6 | Minor | `src/board.js:92-101,127-144` | Kaybetme anında bayraklı mayınlar da `state='revealed'` yapılıyor → oyuncunun DOĞRU bayrakları oyun sonunda kayboluyor (klasik Mayın Tarlası davranışı bayrağı korur) ve `flagCount` artık bayraklı hücre sayısıyla uyuşmuyor (invariant kırılır; bugün zararsız çünkü `setStatus` `lost` durumunda sayacı göstermiyor — gelecekte "yanlış bayrak" göstergesi eklenirse yanlış sonuç verir). | Kaybetmede yalnız `hidden` mayınları aç, `flagged` mayınları koru (veya `flagCount`'u tutarlı düşür). |
| F7 | Minor | `src/app.js:24-37,62` | **Tutarsız savunma:** `difficultySelect`/`newGameBtn` null-guard'lı (33, 84, 87) ama zorunlu `boardEl`/`statusEl` guard'sız — `#board` yoksa satır 62'de `TypeError` ile uygulama sessizce ölür (boş sayfa, mesaj yok). Ya dördü de guard'lansın ya da eksik zorunlu düğüm için açık/anlaşılır hata verilsin. | `if (!boardEl \|\| !statusEl) throw new Error('initApp: #board/#status bulunamadı')` — hızlı ve açık başarısızlık. |
| F8 | Minor | `src/app.js:32-37,71-78` | `newGame()` bekleyen uzun-basma zamanlayıcısını temizlemiyor: basma sırasında (500ms içinde) zorluk değiştirilir/"Yeni Oyun"a basılırsa zamanlayıcı **yeni tahtada** `handleFlag(i)` çalıştırıp oyuncunun dokunmadığı bir hücreyi bayraklar. | `newGame()` başında `clearPressTimer()` çağır. |
| F9 | Minor | `index.html:6` | CSP `<meta>` içindeki **`frame-ancestors 'none'` yok sayılır** (CSP spesifikasyonu: `frame-ancestors`/`report-uri`/`sandbox` yalnız HTTP başlığında geçerlidir) → SEC-5'in clickjacking koruması fiilen YOK. Bu üründe etki düşük (oturum/veri yok) ama kayıtlı bir kontrolün sessizce uygulanmaması yanıltıcıdır. | Hosting/CI katmanında `Content-Security-Policy` (veya `X-Frame-Options: DENY`) başlığı ver → Faz 12/14 görevi; docs/07 SEC-5'e "meta ile karşılanamayan kısım" notu düş. |
| F10 | Minor | `src/board.js:17-19`, `src/app.js:12-14` | SEC-3 allowlist mantığı iki modülde birebir kopya (`resolveDifficulty` / `resolveDifficultyKey`); `createBoard` zaten kendi içinde geri düşüyor, app kopyası işlevsel olarak gereksiz. Savunma-derinliği argümanı geçerli ama **iki kopya kayabilir** (biri güncellenip diğeri unutulabilir). | Tek fonksiyonu `board.js`'ten export edip `app.js`'te yeniden kullan (kopyalama değil paylaşım). |
| F11 | Minor | tests/** | **NFR-1 (tık→DOM ≤100ms) için hiçbir ölçüm/kanıt yok.** Mimaride gerekçesi var, kodda makul, ama doğrulanmamış. | 16x30 tahtada tam flood-fill + `updateCells` süresini ölçen basit bir zaman testi → Faz 11 kapsamı. |
| F12 | Nit | `index.html:23` vs docs/03 FR-6 | İsimlendirme tutarsızlığı: kabul kriteri "Yeniden Başlat" butonundan söz ediyor, UI "Yeni Oyun" gösteriyor. İşlevsel etki yok, izlenebilirlik gürültüsü var. | Etiketi veya FR metnini eşitle. |
| F13 | Nit | `src/*.js` tümü | Public arayüzlerin (docs/05'te imzalı sözleşmeler) **JSDoc'u yok**; tip sistemi de olmadığı için makine-okunur tek sözleşme kaynağı eksik. Ayrıca yorumlar dil olarak karışık (İngilizce: `board.js:1,9,15`; Türkçe: `board.js:50,126`, `render.js`, `app.js`). | Export edilen 8 fonksiyona `@param/@returns` JSDoc + tek yorum dili (öneri: İngilizce kod yorumu). |
| F14 | Nit | `src/render.js:22-27`, `index.html:26` | Erişilebilirlik: `role="grid"` altında doğrudan `role="gridcell"` çocukları var, ARIA `grid` deseni ara `role="row"` bekler; hücreler odaklanamaz (`tabindex` yok), klavye ile oynanamaz. FR kapsamında değil (gereksinim yok), yine de kayda değer. | Faz 15 teknik borcu: `row` sarmalayıcı + klavye gezinme (kapsam genişlemesi kararı gerektirir). |

**Blocker: 0 · Critical: 1 · Major: 1 · Minor: 9 · Nit: 3**

## İzlenebilirlik (FR ↔ kod)
| FR | Karşılayan modül | Durum |
|----|------------------|-------|
| FR-1 (zorluk + yeni tahta) | `board.js:3-28` (DIFFICULTIES/createBoard), `app.js:32-37,84-86`, `index.html:18-22` | ✅ Karşılandı (test: app.test 27, 80; board.core 5, 11) |
| FR-2 (ilk-tık güvenli açma, flood-fill, bayraklı açılmaz) | `board.js:52-124` (lazy placeMines + iteratif flood-fill), `app.js:45-48,62-64` | ✅ Karşılandı (test: board.reveal 43, 58, 67; board.flag 17) — **ancak dokunmatik yolda F1 ile "bayraklı hücre açılmaz" garantisi delinebiliyor** |
| FR-3 (bayrak koy/kaldır: sağ tık + uzun basma) | `board.js:127-144`, `app.js:66-78` | ⚠️ **Kısmen** — masaüstü (contextmenu) ✅ tam; dokunmatik uzun-basma yolu F1 nedeniyle güvenilmez (Critical) |
| FR-4 (kaybetme: tüm mayınlar + kilit + mesaj) | `board.js:92-102`, `render.js:46-50` | ✅ Karşılandı (test: board.reveal 67; integration 62) — bayrak korunmaması F6 (Minor) |
| FR-5 (kazanma: tüm mayınsızlar açık + kilit + mesaj) | `board.js:119-122`, `render.js:51-54` | ✅ Karşılandı (test: board.flag 42, 55; integration 47) — F4 latent sapma |
| FR-6 (yeniden başlatma) | `app.js:87-89,32-37`, `index.html:23` | ✅ Karşılandı (test: app.test 96) — etiket farkı F12 (Nit) |
| NFR-1 (≤100ms) | `render.js:36-43` hedefli güncelleme, tek delege dinleyici | ⚠️ Tasarımda karşılanıyor, **ölçülmedi** (F11 → Faz 11) |
| NFR-2 (8-komşu %100) | `board.js:32-48` tek doğruluk kaynağı | ✅ Bağımsız brute-force karşılaştırmalı invariant testi (integration 28; board.reveal 33) |
| NFR-3 (framework'süz, masaüstü+mobil) | Sıfır bağımlılık, `type="module"`, CSS Grid, clamp | ⚠️ Statik/uyumluluk ✅; mobil girdi yolu F1 ile bozuk |
| NFR-4 (ilk tık asla mayın) | `board.js:53-57` yasak küme | ✅ 3 zorluk × 1000 tohum (integration 14) + 200 tohum (board.reveal 43) |

Not (doc drift, Nit): docs/05 diyagramı `tests/board.test.js` diyor; gerçek dosyalar `board.core/flag/reveal + render + app + integration` — mimari doküman güncellenmeli.

## Güvenlik (SEC-*) uygulama kontrolü
- SEC-1 (innerHTML yasağı): ✅ (`src/` genelinde grep temiz — yalnız `render.js:3` yorumu; DOM yazımı yalnız `textContent`/`className`/`setAttribute`; `render.js:20-42`). Regresyon testinin kapsam açığı F3.
- SEC-2 (indeks guard): ✅ (`board.js:11-13` tek kaynak `isValidIndex`; `neighbors:33`, `revealCell:81`, `toggleFlag:129` guard'lı; `app.js:16-21` `parseInt`+`Number.isInteger`; `-1/length/NaN/undefined/3.5` testli — çökme yok, `changed:[]` döner).
- SEC-3 (zorluk allowlist): ✅ (`Object.hasOwn` — `board.js:18`, `app.js:13`; `__proto__`/`constructor` testli: board.core 25, app.test 88). Kopya mantık F10.
- SEC-4 (dış girdi/ağ yasağı): ✅ (grep: `fetch/XHR/WebSocket/location/cookie/localStorage/sessionStorage/postMessage/import()` YOK; girdi tek kanal `#board` delegasyonu).
- SEC-5 (CSP + referrer + inline yok): ⚠️ **Kısmen** — meta CSP dizesi docs/07 ile birebir aynı, `referrer=no-referrer` var, inline script/style yok, JS harici modül; ancak `frame-ancestors` meta'da etkisiz (F9) → HTTP başlığı gerekiyor.
- SEC-6 (sıfır bağımlılık): ✅ (`package.json` `dependencies`/`devDependencies` boş; test koşucusu `node --test`; CDN/font/dış kaynak yok).
- SEC-7 (CI sertleştirme): ⏭️ **Faz 12 kapsamı** — mevcut iskelet workflow'larda kök `permissions` var, action'lar sürüm etiketiyle pinli (`@v4`); SHA pinleme ve `pull_request_target` yasağı Faz 12'de doğrulanmalı.
- SEC-8 (HTTPS, veri toplama yok): ✅ kod tarafı (form/analytics/telemetri/SDK yok); yayın tarafı Faz 12/14.
- SEC-9 (console gürültüsü yok + kilitli tahta invariantı): ✅ (`console.*` yok; won/lost kilidi hem `board.js` hem test seviyesinde: integration 47/62, board.flag 79/89).

## Test kalitesi değerlendirmesi
**Güçlü yanlar (senaryo kalitesi yüksek):**
- `adj` invariantı, üretim kodunun kendi hesabıyla değil **bağımsız brute-force yeniden hesaplamayla** karşılaştırılıyor (integration 28, board.reveal 5-15) — kanıt tiyatrosu değil, gerçek çapraz doğrulama.
- NFR-4 için 3 zorluk × 1000 tohum, **deterministik enjekte RNG** (LCG) ile → hata tekrar üretilebilir.
- Kazanma SINIRI izole test edilmiş (board.flag 55): flood-cascade'in sınırı gölgelememesi için `adj` bilerek sıfırdan farklı yapılmış — bilinçli, düşünülmüş kurgu.
- SEC-2 için geçersiz girdi kümesi (`-1`, `length`, `NaN`, `undefined`, `3.5`), SEC-3 için prototip-kirlenmesi anahtarları, kilitli tahta için "her iki mutasyon da `changed:[]`" — güvenlik gereksinimleri davranışsal olarak sınanmış.
- SEC-1 için kaynak-grep testi (kod-enforced yasak) — doğru fikir, kapsamı dar (F3).

**Zayıf yanlar:**
- Girdi katmanı testleri elle yazılmış sahte DOM'a dayanıyor; tarayıcı uyumluluk-olayı davranışı modellenmediği için **en kritik gerçek hata (F1) test edilemiyor** (F2). Yeşil suite yanlış güven veriyor.
- Birkaç test tahtayı beyaz-kutu şekilde sahneliyor (`board.mines = 1`, `cells[i].state='revealed'`, `revealedCount = ...`): public yol bozulsa bile geçmeye devam edebilirler; en az bir uçtan-uca "gerçek oyun oyna" senaryosu (yalnız public API ile kazanana kadar) eksik.
- Kaybetme render'ı (`mine-triggered`, 💣 yayılımı) ve `setStatus` bayrak sayacının bayrak koyup kaldırdıkça güncellenmesi test edilmemiş.
- NFR-1 için hiç ölçüm yok (F11).
- TDD disiplini commit geçmişinden doğrulandı (her TASK'ta önce kırmızı test commit'i) — bu iyi ve gerçek.

## Karar
**Kapı KALDI (❌).** F1 (Critical) FR-3'ün dokunmatik yolunu Must seviyesinde bozuyor ve etkisi yıkıcı (oyuncunun bayrakladığı mayının kendiliğinden açılması, oyun kaybı). LITE profilinde eşik `critical` olduğundan bu bulgu **düzeltme dayatır** — Faz 13 (Release) JOIN kapısına bu haliyle gidemez.

**Faz 9'a geri besleme (sırayla):**
1. **F1 (Critical)** — dokunmatik/fare olay yolu ayrımı: `touchstart`'ta emüle click bastırma + `contextmenu` çakışma koruması.
2. **F2 (Major)** — fake DOM'a compatibility-event semantiği + F1 senaryolarının (uzun-basma UNFLAG → click) regresyon testleri; F1 düzeltmesi bu testlerle KANITLANSIN.
3. **F3, F4, F8 (Minor, ucuz ve mekanik)** — SEC-1 grep kapsamı, `board.mines = mineCount`, `newGame()`'de `clearPressTimer()`.

**Sonraki fazlara devredilen:** F11 + kaybetme-render testi + gerçek tarayıcı duman testi → **Faz 11**; F9 (CSP başlığı) + SEC-7 doğrulaması → **Faz 12**; F5, F6, F7, F10, F12, F13, F14 → **Faz 15 teknik borç** (DL-10-001 ile kabul edildi).

Re-review kapsamı: yalnız **diff + bu bulgu listesi** (blind review korunur).

## Kalite kapısı raporu
- "Blocker/Critical bulgu = 0" → ❌ (Blocker: 0, Critical: 1)
- Bağımsız test koşumu → ✅ 39/39 pass (beyan değil, fiilen koşuldu)
- Author ≠ Reviewer → ✅ (yazan: developer/sonnet; inceleyen: code-reviewer/opus, blind)
- Decision Log → ✅ `decisions/DL-10-001.md`
