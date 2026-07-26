# 07 — Güvenlik Tasarımı: minesweeper

- Tarih: 2026-07-26 | Mod: AUTOPILOT | Profil: LITE
- Girdi: `docs/03-requirements.md`, `docs/05-architecture.md`
- Ürün sınırı: %100 istemci-taraflı statik HTML/CSS/JS. **Sunucu, veritabanı, hesap, oturum, çerez, ağ isteği, kullanıcı verisi YOK.** Girdi yalnız fare/dokunmatik olayı.

## Varlıklar ve veri sınıflandırma
| Veri | Sınıf | Nerede duruyor | Koruma |
|------|-------|----------------|--------|
| Oyun durumu (`Board`: mayın konumları, hücre durumu, sayaçlar) | Internal (oturum-içi, geçici) | Yalnız sekme belleği (JS heap); kalıcılık yok | Gizlilik gerekmez — sayfa kapanınca yok olur; DevTools'a açık (bkz. R-1) |
| Zorluk seçimi | Public | Bellek (DOM `select` değeri) | Allowlist doğrulaması (SEC-3) |
| Kaynak kod + statik varlıklar (`index.html`, `styles.css`, `src/*.js`) | Public | GitHub reposu + statik hosting | Bütünlük: git + CI (SEC-7); gizlilik gerekmez |
| CI/deploy kimlik bilgileri (`GITHUB_TOKEN`, `DEPLOY_SSH_KEY` vb.) | Confidential | GitHub Secrets (repoda ASLA) | Minimum yetki + log'a yazılmaz (SEC-7) |
| Kişisel veri (PII) | **YOK** | — | Toplanmıyor: analytics/telemetri/localStorage/çerez/form yok |

Sonuç: üründe **korunacak gizli çalışma-zamanı varlığı yoktur**; tek gerçek Confidential varlık CI/deploy sırlarıdır (fabrika/hosting katmanı).

## Threat model (STRIDE, bileşen bazında)
| Bileşen | Spoofing | Tampering | Repudiation | Info Disclosure | DoS | Elevation | Önlemler |
|---------|----------|-----------|-------------|-----------------|-----|-----------|----------|
| `src/board.js` (saf mantık, DOM'suz) | Yok (kimlik yok) | Kullanıcı kendi belleğini değiştirebilir — **kendi oturumu** (R-1) | Yok (kayıt tutulmuyor) | Mayın konumu bellekte okunabilir (R-1) | Sınırsız döngü/derin özyineleme riski → iteratif flood-fill + sabit grid | Yok (ayrıcalık düzeyi yok) | Sınır kontrolü SEC-2; grid boyutu sabit allowlist SEC-3 |
| `src/render.js` (DOM adaptörü) | Yok | DOM'a enjekte edilen içerik → **DOM XSS** tek gerçek kod-seviyesi tehdidi | Yok | Yok | Aşırı düğüm yazımı (yalnız `changed[]` ile sınırlı) | XSS gerçekleşirse origin içinde script çalışır | **SEC-1** (`textContent`/`classList` zorunlu, `innerHTML` yasak) + **SEC-5** (CSP) |
| `src/app.js` (girdi/controller) | Yok | Sentetik olay üretilebilir (kullanıcı kendi tarayıcısında) — etkisi R-1 ile aynı | Yok | Yok | Uzun-basma zamanlayıcı sızıntısı → temizlik | Yok | SEC-2 indeks doğrulama; SEC-4 dış girdi kanalı yok |
| `index.html` + statik servis | Alan adı/TLS ile | Yayın yolunda dosya değişimi | Yok | Dizin listeleme / kaynak sızıntısı | Hosting katmanı | Yok | HTTPS zorunlu, dizin listeleme kapalı, CSP (SEC-5) |
| CI/CD (`.github/workflows`) | Sahte PR/action | **Tedarik zinciri: kötü niyetli action veya PR kodu yayınlanır** | Actions denetim kaydı var | Secret log'a sızabilir | Runner tüketimi | Aşırı `permissions` ile repo yazımı | **SEC-7**: minimum `permissions`, action pinleme, `pull_request_target` yasak, secret echo yasak |

## Auth / Authz stratejisi
**Uygulanamaz — bilinçli tasarım.** Ürün tek oyunculu, anonim, tamamen istemci-taraflıdır: kimlik, oturum, rol, çerez, token yoktur; dolayısıyla kimlik doğrulama/yetkilendirme yüzeyi de yoktur. "En iyi auth, gerek duyulmayan auth"tur — hesap eklemek PII ve saldırı yüzeyi getirir, FR-1..FR-6 bunu gerektirmez. **Tetikleyici:** skor tablosu / bulut kayıt / çok oyunculu eklenirse bu bölüm ve A01/A02/A04/A07 satırları geçersizleşir → Faz 5+7 yeniden çalışmalıdır.

## OWASP Top 10 (2021) değerlendirmesi — HER madde
| # | Risk | Uygulanabilir mi | Değerlendirme / Azaltım |
|---|------|------------------|--------------------------|
| A01 | Broken Access Control | **Hayır** (kod) / Evet (hosting) | Sunucu, kullanıcı, kaynak sahipliği yok → yetki sınırı yok. Kullanıcının kendi tarayıcı state'ini değiştirmesi erişim kontrolü ihlali DEĞİLDİR (koruduğu başkasına ait varlık yok) — bkz. R-1. Hosting: dizin listeleme kapalı, yalnız derlenmiş/yayınlanan dosyalar servis edilir. |
| A02 | Cryptographic Failures | **Kısmen** (yalnız aktarım) | Gizli/hassas veri saklanmıyor, şifreleme gerektiren alan yok. Aktarımda **HTTPS/TLS zorunlu** (mixed content yasak — SEC-5). `Math.random()` mayın yerleşiminde kullanılır; **kriptografik amaçlı değildir** (token/anahtar/nonce üretimi yok) → CSPRNG gereksiz (R-2). |
| A03 | Injection | **Evet — tek gerçek kod riski (DOM XSS)** | SQL/OS/LDAP yüzeyi yok. Kalan vektör DOM-based XSS: hücre içeriği (sayı/bayrak/mayın simgesi) **yalnız `textContent`**, sınıf **yalnız `classList`/sabit allowlist** ile yazılır. `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `eval`, `new Function`, string `setTimeout` **yasaktır** (SEC-1). Bugün içerik tamamen program-üretimi (0-8, sabit simgeler) olduğu için istismar edilebilir değildir; yasak **gelecekteki** bir metin kaynağı (URL, localStorage, i18n) eklendiğinde açık oluşmasın diye konur. CSP ikinci savunma katmanıdır (SEC-5). |
| A04 | Insecure Design | **Evet (değerlendirildi, kabul)** | Tasarım bilinçli olarak istemci-otoriteli: tüm oyun state'i tarayıcıda, doğrulayan sunucu yok. Rekabet/skor/ödül olmadığı için "hile" bir tehdit modeli oluşturmaz (R-1). Güvenli-tasarım kazanımları: sıfır bağımlılık, saf çekirdek/DOM ayrımı (`board.js` DOM'a dokunmaz → XSS yüzeyi tek dosyaya hapsedilir), kalıcı veri yok (ihlal edilecek depo yok). |
| A05 | Security Misconfiguration | **Evet (hosting/HTML)** | `index.html`'de **CSP meta** (`default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`), inline script/style yok, `<meta name="referrer" content="no-referrer">`, HTTPS + `X-Content-Type-Options: nosniff` (hosting), dizin listeleme kapalı, `.git`/kaynak harita yayınlanmaz (SEC-5). |
| A06 | Vulnerable and Outdated Components | **Evet ama minimal** | Faz 5 kararı: **sıfır çalışma-zamanı bağımlılığı**, bundler yok, CDN'den script/font YOK; test koşucusu Node yerleşiği `node:test` (dev bağımlılığı bile yok). Saldırı yüzeyi = tarayıcı + Node runtime. Kural: `package.json` `dependencies`/`devDependencies` **boş kalır** (SEC-6); bağımlılık eklemek Faz 7'ye geri besleme gerektirir. |
| A07 | Identification and Authentication Failures | **Hayır** | Kimlik, parola, oturum, token, çerez, "beni hatırla", parola sıfırlama yok → sınıfın tamamı yüzey dışı. (Auth eklenirse bkz. Auth bölümündeki tetikleyici.) |
| A08 | Software and Data Integrity Failures | **Evet (CI/CD + yayın hattı)** | Ürünün en yüksek kalıntı riski burada: repoya/CI'a sızan kötü kod tüm ziyaretçilerin tarayıcısında çalışır. Azaltım: workflow'larda **minimum `permissions`** (varsayılan `contents: read`), üçüncü-parti action'lar pinlenir, `pull_request_target` + fork PR'ında secret kullanımı yasak, deploy yalnız korunan ana daldan, secret'lar log'a yazılmaz (SEC-7). Dış script olmadığı için SRI gerekmez; güncelleme mekanizması/otomatik indirilen kod yok. |
| A09 | Security Logging and Monitoring Failures | **Kısmen (düşük)** | İstemci tarafında güvenlik olayı üreten işlem (giriş, yetki, ödeme, veri erişimi) yok → loglanacak güvenlik olayı yok; log toplama eklemek PII/izleme riski getirir, bilinçle **eklenmiyor**. Konsola hassas veri yazılmaz (zaten yok), üretimde `console.*` gürültüsü bırakılmaz. Görünürlük CI build sonuçları + hosting erişim logları + Faz 14 uptime/health probe'una devredilir. |
| A10 | Server-Side Request Forgery (SSRF) | **Hayır** | Sunucu-taraf bileşen yok; ürün **hiçbir ağ isteği yapmaz** — `fetch`/`XHR`/`WebSocket`/`EventSource`/dinamik `import()` kullanımı yasaktır (SEC-4) ve CSP `connect-src 'none'` ile ikinci kez engellenir. Kullanıcı-kontrollü URL alan hiçbir kod yolu yok. |

## AI tedarik zinciri & fabrika tehditleri
| Tehdit | Uygulanabilir? | Önlem / Neden uygulanamaz |
|--------|----------------|----------------------------|
| Prompt injection | Hayır (üründe) | Ürün model çağırmaz; kullanıcı girdisi yalnız tık koordinatı. Fabrika tarafı: ajan yalnız kendi faz artefaktlarını okur. |
| Repository/artefakt prompt poisoning | Düşük | Repo tek sahipli/özel; Faz 10 blind review üretilen kodu bağımsız denetler. |
| Dependency confusion | Hayır | Hiç paket kurulmuyor (SEC-6) → çözümlenecek iç paket adı yok. |
| Malicious package scripts (postinstall) | Hayır | `npm install` gerektiren bağımlılık yok; CI'da `npm ci` yerine doğrudan `node --test` yeterli. |
| Shell komut güvenliği | Hayır | Ürün kabuk çağırmaz; CI adımlarında kullanıcı-kontrollü içerik kabuğa geçmez (`${{ github.event.* }}` interpolasyonu run bloklarında kullanılmaz — SEC-7). |
| Workspace sınırı / path & symlink escape | Hayır | Dosya sistemi erişimi yok (tarayıcı sandbox'ı). |
| Secret leakage | Evet (CI) | Repoda düz sır yok; `deploy.json` yalnız `env_ref` taşır; secret echo/`set -x` yasak (SEC-7). |
| Docker build izolasyonu | Düşük | Statik ürün; imaj kullanılırsa yalnız statik dosya sunucusu, root olmayan kullanıcı, build-arg'a sır konmaz. |
| Üretilen CI güvenliği | **Evet** | SEC-7 (minimum permissions, action pinleme, korumalı dal, `pull_request_target` yasağı). |
| MCP/tool izinleri | Hayır (üründe) | Ürün araç yüzeyi taşımaz; fabrika Execution Policy'si Faz 9'u WORKSPACE_WRITE+TEST_EXEC ile sınırlar (ağ yok). |

## Kabul edilen riskler
| ID | Risk | Şiddet | Gerekçe / İzleme |
|----|------|--------|-------------------|
| R-1 | **İstemci-taraflı güven sınırı:** tüm state tarayıcıda; kullanıcı DevTools ile mayın konumlarını görebilir, state'i değiştirip "kazanabilir". | Düşük (güvenlik etkisi yok) | Tek oyunculu casual oyun; skor tablosu, rekabet, ödül, sunucu doğrulaması, başka kullanıcıya ait veri **yok** → ihlal edilen bir güvenlik özelliği (gizlilik/bütünlük/erişilebilirlik) yoktur; etki yalnız kullanıcının kendi eğlencesidir. Sunucu otoritesi eklemek FR kapsamı dışıdır ve NFR-3 (framework'süz, statik) ile çelişir. **Tetikleyici:** skor/liderlik/çok oyunculu eklenirse risk gerçek olur → Faz 5 + Faz 7 yeniden çalışır. |
| R-2 | **Kriptografik olmayan RNG:** mayın yerleşiminde `Math.random()` (Fisher-Yates) — çıktı teorik olarak tahmin edilebilir. | Düşük (güvenlik etkisi yok) | RNG bir güvenlik kontrolünü beslemiyor (anahtar/token/nonce/oturum yok); tahmin edilebilirliğin tek sonucu R-1'in bir varyantıdır. `crypto.getRandomValues` maliyeti sıfıra yakın olsa da test edilebilirlik için RNG enjekte edilebilir kalır (DL-05-003); istenirse varsayılan CSPRNG'ye yükseltmek tek satırlıktır (geri alınabilirlik yüksek). |

## Faz 9'a devredilen güvenlik gereksinimleri (implementasyon listesi)
- [ ] **SEC-1 (A03, zorunlu):** DOM'a yazım YALNIZ `textContent` + `classList`/`setAttribute('class',…)` ile. `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `eval`, `new Function`, string argümanlı `setTimeout/setInterval` kullanılmaz — `src/` genelinde grep ile doğrulanabilir olmalı (Faz 10 bunu arar).
- [ ] **SEC-2 (A01/A04, zorunlu):** Hücre indeksi doğrulama — `data-i` → `Number.parseInt(...,10)`; `board.js` public fonksiyonları (`revealCell`, `toggleFlag`, `neighbors`) başında `Number.isInteger(i) && i >= 0 && i < board.cells.length` guard'ı, aksi halde **etkisiz** (`{changed:[]}`) döner, exception fırlatmaz/çökmez. Test: `-1`, `cells.length`, `NaN`, `undefined` girdileriyle çökme yok.
- [ ] **SEC-3 (A05, zorunlu):** Zorluk anahtarı allowlist — `Object.hasOwn(DIFFICULTIES, key)` değilse `'easy'`a düş; `__proto__`/`constructor`/`prototype` anahtarları reddedilir (prototype pollution). Grid boyutları yalnız `DIFFICULTIES` sabitinden gelir (kullanıcıdan serbest sayı alınmaz → bellek DoS yok).
- [ ] **SEC-4 (A10/A03, zorunlu):** Dış girdi ve ağ yasağı — `location.search/hash`, `document.cookie`, `localStorage`, `sessionStorage`, `postMessage`, `fetch`, `XMLHttpRequest`, `WebSocket`, dinamik `import()` **kullanılmaz**. Girdi tek kanal: `#board` üzerindeki delege `click`/`contextmenu`/`touchstart` olayları.
- [ ] **SEC-5 (A05, zorunlu):** `index.html` `<head>`'ine CSP meta etiketi: `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`. Ek: `<meta name="referrer" content="no-referrer">`, inline `<script>`/`style=` yok (tüm JS harici `<script type="module" src>`), dış link kullanılırsa `rel="noopener noreferrer"`.
- [ ] **SEC-6 (A06, zorunlu):** Sıfır bağımlılık korunur — `package.json`'da `dependencies`/`devDependencies` boş; CDN'den script/font/CSS çekilmez; testler yalnız `node:test` + `node:assert`.
- [ ] **SEC-7 (A08, Faz 12 ile ortak):** CI/CD sertleştirme — workflow kökünde `permissions: contents: read` (yayın işine yalnız gerektiği kadar yetki), üçüncü-parti action'lar sürüm/SHA ile pinlenir, `pull_request_target` kullanılmaz, `run:` bloklarında `${{ github.event.* }}` doğrudan interpolasyonu yok, secret log'lanmaz (`set -x` yok), deploy yalnız ana daldan.
- [ ] **SEC-8 (A02, düşük):** Yayın yalnız HTTPS üzerinden; mixed content yok. Kullanıcı verisi toplayan hiçbir alan (form, analytics, telemetri, hata raporlama SDK'sı) eklenmez.
- [ ] **SEC-9 (A09, düşük):** Üretim kodunda `console.log` gürültüsü bırakılmaz; kilitli tahta (won/lost) sonrası tüm girdi yollarının etkisiz olduğu testle doğrulanır (FR-4/FR-5 bütünlük invariantı).

## Kalite kapısı raporu
- "OWASP Top 10 değerlendirildi" → ✅ A01–A10'un **onu da** tek tek tabloda; her satırda uygulanabilirlik yargısı + azaltım ya da neden-uygulanamaz gerekçesi var (boş hücre yok).
- "Hassas veri sınıflandırması eksiksiz" → ✅ 5 varlık sınıflandırıldı; PII yokluğu açıkça kayıtlı; tek Confidential varlık (CI sırları) SEC-7'ye bağlandı.
- "Threat model (STRIDE) bileşen bazında" → ✅ 5 bileşen × 6 STRIDE kategorisi + önlem sütunu.
- "AI/tedarik zinciri tehditleri değerlendirildi" → ✅ 10 maddenin hepsi.
- "Faz 9'a devredilen maddelenmiş gereksinimler" → ✅ SEC-1..SEC-9, her biri doğrulanabilir/test edilebilir ifadeyle.
- "Kabul edilen riskler kayıtlı" → ✅ R-1, R-2 (ikisi de Düşük, güvenlik etkisi yok; tetikleyicileri yazılı) — DL-07-001.
- Decision Log → ✅ `decisions/DL-07-001.md`
