# 10 — Code Review: PR-2 (minesweeper) — Re-review (cycle 2, diff-only)

- Tarih: 2026-07-26 | Mod: AUTOPILOT | İnceleyen: code-reviewer (opus) — **yazan (developer/sonnet) ile FARKLI (Author ≠ Reviewer)**
- İncelenen: `git diff 4e2a0c6..HEAD` → `src/app.js` (+28), `src/board.js` (+1), `tests/app.test.js` (+39), `tests/helpers/fake-dom.js` (+19), `tests/render.test.js` (+9/-3) · Referans: docs/03, docs/05, docs/07
- Blind korundu: yazarın yeni ara raporu/DL anlatısı OKUNMADI; girdi yalnız diff + PR-1 bulgu listesi.
- Kapsam: LITE `max_cycles:1` tavanındaki **son** re-review turu. PR-1'de Faz 9'a beslenen F1/F2/F3/F4/F8 doğrulandı; F5-F7, F9-F14 kapsam dışı (yalnız dokunulmamışlık kontrolü).

## Yöntem
- `npm test` bağımsız koşuldu: **42/42 pass, 0 fail** (`node --test`, ~541ms). Önceki 39 testin hiçbiri silinmedi/gevşetilmedi (39 + 3 yeni app testi = 42; render SEC-1 testi yerine **daha geniş** biriyle değiştirildi).
- Diff satır satır okundu; `app.js` girdi katmanı (click / contextmenu / touchstart / touchend|move|cancel) durum makinesi olarak yeniden sürüldü — `suppressNextClick` bayrağının **yaşam döngüsü** (set/consume/stale) tüm giriş-çıkış yollarında izlendi.
- Yeni testlerin gerçekten kırmızıya düşürdüğü doğrulandı (eski kodda `click` → `handleReveal` → `revealed` sınıfı → assertion düşer): kanıt tiyatrosu değil.
- Kapsam sızıntısı kontrolü: `git diff --stat` yalnız 5 dosya; F5/F6/F7/F9/F10/F12/F13/F14'ün yaşadığı satırlara **dokunulmamış** (doğrulandı — beklenmeyen genişleme yok, disiplinli düzeltme).

## Bulgular
| # | Severity | Dosya:Satır | Bulgu | Aksiyon |
|---|----------|-------------|-------|---------|
| F1 | ~~Critical~~ → **Çözüldü ✅** | `src/app.js:35,68-96,101-105` | Dokunmatik/fare yolları artık ayrıştırılmış. Uzun-basma zamanlayıcısı ateşlerken `suppressNextClick=true` kuruluyor; `click` dinleyicisi bayrağı görünce olayı **yutuyor** (`preventDefault`+`stopPropagation`+`return`) → emüle click hücreyi AÇMIYOR. Bayraklı hücre senaryosu da kapalı: `toggleFlag` yönü ne olursa olsun (flagged→hidden dahil) bayrak kuruluyor, ardından gelen click yutuluyor → **PR-1'in yıkıcı senaryosu (işaretlenen mayının kendiliğinden açılması) artık üretilemez.** Android çift-tetik yolu da ele alınmış: `contextmenu` zamanlayıcı beklerken gelirse (`pressTimer!==null`) timer iptal + tek `handleFlag` + suppress; zamanlayıcı zaten ateşlediyse (`suppressNextClick`) contextmenu **erken dönüyor** → çifte toggle yok. | — (kapandı; kalan lifecycle açığı ayrı bulgu F15) |
| F2 | ~~Major~~ → **Çözüldü ✅ (bir eksikle)** | `tests/helpers/fake-dom.js:111-128`, `tests/app.test.js:80-115` | Fake DOM'a uyumluluk-olayı semantiği eklendi: `dispatchTouchTap()` gerçekçi diziyi (`touchstart` → [opsiyonel `contextmenu`] → hold → `touchend` → sentetik `click`) üretiyor ve click olayını döndürüyor (defaultPrevented iddia edilebiliyor). Üç gerçek regresyon testi: (1) uzun-basma bayraklar + ardındaki click AÇMAZ, (2) kısa dokunuş normal açar (aşırı bastırma yok — fix'in kendi karşı-testi), (3) Android `contextmenu`+timer birlikte gelince bayrak **bir kez** toggle olur. İkinci test özellikle değerli: düzeltmenin normal yolu kırmadığını kanıtlıyor. Eksik: PR-1'in adıyla istediği **UNFLAG** dizisi (bayraklı hücrede uzun-basma → click) testlenmedi → F16. | — (kapandı; test boşluğu F16) |
| F3 | ~~Minor~~ → **Çözüldü ✅** | `tests/render.test.js:22-31` | SEC-1 testi artık `src/` altındaki **tüm** `.js` dosyalarını (app/board/render) döngüyle tarıyor, boş-dizin durumuna karşı `files.length>0` guard'ı var (test sessizce boşa koşamaz — iyi detay) ve kalıp `\+?=` ile `innerHTML +=` biçimini de yakalıyor. Hata mesajı dosya adını taşıyor. | — (kapandı; artık kalanlar F17 Nit) |
| F4 | ~~Minor~~ → **Çözüldü ✅** | `src/board.js:62-63` | `board.mines = mineCount;` eklendi — kazanma kontrolünün (`cells.length - board.mines`) ve bayrak sayacının tek kaynağı senkron. 3 zorluk × 1000 tohum entegrasyon testi bu değişiklikle yeşil kaldı → davranışsal regresyon yok. | — (kapandı) |
| F8 | ~~Minor~~ → **Çözüldü ✅** | `src/app.js:38` | `newGame()` ilk satırında `clearPressTimer()` — bekleyen uzun-basma artık YENİ tahtada hücre bayraklayamaz. `clearPressTimer` bir `function` bildirimi (hoisted) ve `pressTimer` `newGame()` çağrısından (satır 119) önce init edildiği için TDZ/sıra sorunu yok. | — (kapandı; `suppressNextClick` sıfırlanmaması F15 kapsamında) |
| **F15** | **Major (YENİ — düzeltmeyle girdi)** | `src/app.js:35,101-105,88-94` (+ `newGame` 37-43) | **`suppressNextClick` "gesture başına" değil "tüketilene kadar" yaşıyor — bayrak kurulduğu jestten sonra click GELMEZSE bayat kalır ve BİR SONRAKİ meşru dokunuşu yutar (ölü tık).** Kod yorumu niyeti "swallowed **once** for the SAME gesture" diyor ama uygulamada bayrağı temizleyen tek yer `click` dinleyicisidir; `touchstart` onu sıfırlamıyor, `newGame()`/`touchend`/`touchcancel` de temizlemiyor. Gerçekçi tetikleyici: Android Chrome uzun-basmayı tanıyınca tap jestini iptal eder ve **emüle `click` üretmez** (iOS Safari'de de callout sonrası sıklıkla üretilmez) → her bayraklamadan sonraki ilk dokunuş sessizce düşer (FR-2 "hücreyi aç" o tıkta gerçekleşmez). İkinci yol: uzun-basma sonrası click gelmeden "Yeni Oyun"/zorluk değişimi → yeni tahtadaki ilk tık yutulur. Mevcut testler bunu göremez çünkü `dispatchTouchTap` **her zaman** trailing click üretir (tek platform modeli). Not: hata yönü **fail-safe** (yanlış hücre açılmaz, oyun kaybedilmez; kullanıcı tekrar dokununca çalışır) ve F1'i geri getirmez → Critical değil. | Tek satır: `touchstart` dinleyicisinin başında `suppressNextClick = false;` (bayatlığı jest sınırına hapseder) + `newGame()` içinde de sıfırla. Testi: `dispatchTouchTap(..., {emitClick:false})` varyantı ile uzun-basma, ardından ayrı bir hücreye normal tap → hücre AÇILMALI (bu test bugün KIRMIZI olur). |
| **F16** | **Minor (YENİ / F2 kalıntısı)** | `tests/app.test.js:80-115`, `tests/helpers/fake-dom.js:118-128` | PR-1'in F1 için birebir istediği **en yıkıcı senaryonun** regresyon testi yok: *bayraklı* hücrede uzun-basma (unflag) → `touchend` → emüle click → hücre AÇILMAMALI. Kod bunu doğru yapıyor (elle sürüldü), ama koruyucu test yoksa gelecekte "suppress yalnız flag-ekleme yolunda kurulsun" gibi bir refaktör hatayı sessizce geri getirir. Ayrıca fake DOM tek platform davranışını modelliyor ("click hep gelir") — F15'i görünmez kılan tam olarak bu. | Dört satırlık test: hücreyi önce `contextmenu` ile bayrakla, sonra `dispatchTouchTap(holdMs:500)` → `flagged` YOK **ve** `revealed` YOK. `emitClick` seçeneği ekle (F15 ile aynı yardımcı). |
| **F17** | **Nit (YENİ / F3 kalıntısı)** | `tests/render.test.js:24-25` | SEC-1 taraması `readdirSync` ile **düz** okuyor (alt dizin yok sayılır — bugün `src/` düz, ileride `src/lib/` eklenirse sessizce kapsam dışı kalır) ve PR-1'in önerdiği string-argümanlı `setTimeout`/`setInterval` kalıbı eklenmedi. Ayrıca `\+?=` deseni `.innerHTML ==` karşılaştırmasını da yakalar (aşırı-katı, zararsız). | `{recursive:true}` ile tara + `setTimeout\(\s*['"\`]` kalıbını ekle (Faz 15 ucuz borç). |

**Blocker: 0 · Critical: 0 · Major: 1 · Minor: 1 · Nit: 1**

(Bu tur NET durumu: F1/F2/F3/F4/F8 çözüldüğü için sayılmadı; sayılanlar yalnız YENİ/KALAN bulgulardır. PR-1'den Faz 11/12/15'e devredilenler — F5-F7, F9-F14 — bilinçli ertelemedir, bu sayıma girmez ve DL-10-001'de kayıtlıdır.)

## İzlenebilirlik (FR ↔ kod) — diff'ten etkilenen satırlar
| FR | Karşılayan modül | Durum |
|----|------------------|-------|
| FR-2 (bayraklı hücre açılmaz, ilk-tık güvenli) | `board.js:52-124`, `app.js:68-78` | ✅ Karşılandı — dokunmatik yoldaki delik kapandı (app.test 80, 105). F15 nedeniyle *bir sonraki* dokunuş düşebilir (yanlış açma değil, kayıp girdi) |
| FR-3 (bayrak: sağ tık + uzun basma) | `board.js:127-144`, `app.js:80-106` | ✅ **PR-1'deki ⚠️ kalktı** — masaüstü `contextmenu` yolu değişmedi (regresyon yok: `pressTimer===null` iken davranış birebir eski), dokunmatik yol artık çakışma-korumalı ve üç testle çivilenmiş |
| FR-5 (kazanma %100 doğru) | `board.js:62-63,119-122` | ✅ F4 ile latent sapma kapandı — `board.mines` tek kaynak |
| FR-6 (yeniden başlatma) | `app.js:37-43` | ✅ F8 ile bekleyen zamanlayıcı sızıntısı kapandı (kalan: F15'in suppress sızıntısı) |
| NFR-3 (mobil tarayıcı) | `app.js` girdi katmanı | ⚠️ Büyük ölçüde ✅; gerçek cihaz/tarayıcı doğrulaması hâlâ yok (PR-1 F11 ile birlikte **Faz 11** duman testi) |
| Diğer FR/NFR | değişmedi | PR-1 değerlendirmesi geçerli (diff dokunmadı) |

## Güvenlik (SEC-*) uygulama kontrolü — diff etkisi
- **SEC-1** (innerHTML yasağı): ✅ **güçlendi** — regresyon testi artık `src/` genelini + `+=` biçimini kapsıyor (F3 kapandı); üretim kodunda yeni DOM yazımı eklenmedi (diff'te yalnız `preventDefault/stopPropagation`).
- **SEC-2** (indeks guard): ✅ değişmedi — yeni yollar da `indexFromEvent` → `handleFlag/handleReveal` (`i < 0` guard'ı) üzerinden geçiyor; guard atlanan yeni giriş yolu YOK.
- **SEC-3** (allowlist): ✅ değişmedi (`resolveDifficultyKey` diff dışı).
- **SEC-4** (ağ/depolama yasağı): ✅ diff'te `fetch/storage/location/postMessage` yok; girdi hâlâ tek kanal (`#board` delegasyonu).
- **SEC-6** (sıfır bağımlılık): ✅ `package.json` değişmedi; yeni test yardımcısı el yazımı (jsdom eklenmedi) — doğru tercih.
- **SEC-5 / SEC-7 / SEC-8 / SEC-9**: diff dokunmadı; PR-1 değerlendirmesi ve devirleri (F9 → Faz 12) aynen geçerli.

## Test kalitesi değerlendirmesi
**Güçlü:** Düzeltme **önce kırmızı test** commit'iyle geldi (`43a95a7 test(app): ... (kirmizi)` → `e8a97aa fix(app): ... (yesil)`) — TDD sırası commit geçmişinden mekanik olarak doğrulanabiliyor, beyan değil. Yeni testler davranışsal ve karşı-testli: yalnız "bastırma çalışıyor mu" değil, "**fazla** bastırıyor mu" (kısa tap hâlâ açıyor) da sınanmış — aşırı-düzeltmeyi yakalayan bu simetri, düzeltme kalitesinin en iyi göstergesi. Android çift-tetik senaryosu ayrı test edilmiş. `dispatchTouchTap` yardımcısı jest dizisini tek yerde tanımlayarak sonraki senaryoları ucuzlatıyor.
**Zayıf:** Yardımcı **tek platform** modelliyor (trailing click hep var) → F15 test edilemez durumda; PR-1'in adıyla istediği unflag dizisi yazılmamış (F16) → düzeltme "kanıtlandı" derken en yıkıcı varyant kanıtsız. Hâlâ gerçek tarayıcı duman testi ve NFR-1 ölçümü yok (PR-1 F11, Faz 11). Fake DOM'un `dispatchEvent`'i `_stopped` bayrağını olayda bırakıyor; olay nesneleri yeniden kullanılmadığı için bugün sorun değil.

## Karar
**Kapı GEÇTİ (✅).** Blocker 0 · **Critical 0**. Geri beslenen beş bulgunun beşi de gerçekten (kod okunarak + testleri incelenerek + bağımsız koşumla) düzeltilmiş; kapsam disiplini korunmuş (ertelenen bulgulara dokunulmamış), 42/42 yeşil, önceki testler zayıflatılmamış. Düzeltme sırasında giren F15 (Major) gerçek bir kusurdur ama etkisi **fail-safe**tir (kayıp girdi, yanlış açma değil), LITE profilinde eşik `critical` olduğu için düzeltme dayatmaz ve `max_cycles:1` tavanı dolmuştur → üçüncü tur açılmaz.

**Yönlendirme:** F15 + F16 → **Faz 11** (test-engineer'ın `emitClick:false` varyantı zaten yazacağı yardımcıyla yakalayabileceği, tek satırlık düzeltmesi olan bir kalem; Faz 11 kapsamındaki gerçek-tarayıcı duman testi de aynı yolu doğrular). F17 + PR-1'den devredilen F5, F6, F7, F10, F12, F13, F14 → **Faz 15** teknik borcu. F9 (CSP başlığı) + SEC-7 → **Faz 12**. PR-1 F11 (NFR-1 ölçümü) → **Faz 11**.
**Faz 13 (Release) JOIN kapısı için engel YOK** — review tamamlandı, Blocker/Critical = 0.

## Kalite kapısı raporu
- "Blocker/Critical bulgu = 0" → ✅ (Blocker: 0, Critical: 0)
- Bağımsız test koşumu → ✅ 42/42 pass (beyan değil, fiilen koşuldu)
- Author ≠ Reviewer + blind → ✅ (yazan: developer/sonnet; inceleyen: code-reviewer/opus; yazarın raporu okunmadı)
- Geri beslenen bulguların doğrulanması → ✅ F1, F2, F3, F4, F8 kod+test seviyesinde teyit edildi
- Decision Log → ✅ `decisions/DL-10-002.md`
