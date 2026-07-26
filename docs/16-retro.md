# 16 — Retrospektif: AutoForge pipeline'ı (minesweeper koşusu)

- Tarih: 2026-07-26 | Mod: AUTOPILOT | Girdi: `AUTOFORGE-FEEDBACK.md` (AF-107, AF-108)
- Kapsam: FABRİKA değerlendirilir, ürün değil (minesweeper'ın kendi teknik borcu `docs/15-maintenance.md`'de).

## Ne iyi gitti
- **Faz 9↔10 geri besleme döngüsü uçtan uca kanıtlandı:** Faz 10 blind review gerçek bir Critical bulgu (F1 — dokunmatik/fare olay çakışması) buldu; Faz 9'a DELTA geri besleme açıldı (baştan yazım değil, yalnız 5 bulgu), developer düzeltti + regresyon testleriyle kanıtladı, blind re-review (cycle 2, yalnız diff+önceki bulgular) Critical=0 ile GEÇTİ. LITE `max_cycles:1` tavanı tam beklendiği gibi işledi — üçüncü tur açılmadı.
- **Author≠Reviewer gerçek değer kattı:** Aynı kod tabanını yazan (developer/sonnet) ile inceleyen (code-reviewer/opus) FARKLI oldu; blind reviewer yazarın "39/39 yeşil" beyanına güvenmeyip kodu elle sürdü ve testlerin göremediği bir gerçek çakışma senaryosunu (touch→click race) buldu.
- **Mekanik kapılar (npm test bağımsız koşum, TDD commit-sırası kanıtı, docker build) hepsi orchestrator tarafından bağımsız doğrulandı** — ajan beyanlarına güvenilmedi, her seferinde `npm test`/`docker build` gerçekten çalıştırıldı.

## En önemli öğrenim
`product.type` alanının Faz 12'ye kadar "gerekmiyor" sanılması, aslında Faz 6'nın kendi kapısının (ürün-tipi toleranslı arama) çok daha erken bu alana baktığı gerçeğini gizliyor — her yeni web/oyun projesinde bir kez kaçınılabilir "kapı düştü" araştırması yaratıyor (AF-108). Ayrıca faz kapanışlarını hızlı art arda yaparken elle `commit-queue --drain` çağırmak, arka planda zaten çalışan post-commit-hook auto-push ile yarışıp iki kez benign "push BAŞARISIZ" üretti (AF-107'nin bu koşuda da tekrarı) — sistem kendiliğinden düzeldi ama gözlem AF-107'nin P3 önerisini güçlendiriyor.

## Kök-neden temaları (AF kayıtları → temalar)
| Tema | İlgili AF | Özet |
|------|-----------|------|
| `product.type` geç/varsayılan ayarı yanlış kapı beklentisi üretiyor | AF-108 (bu koşu) | Faz 6 kapısı `cli` varsayımıyla düşüyor, `web` elle yazılınca hemen geçiyor — materyalizasyonda brief'ten türetilebilir |
| Kuyruk-drain / auto-push yarışı benign ama gürültülü | AF-107 (önceki koşu, bu koşuda DOĞRULANDI/tekrarlandı) | İki kez "push BAŞARISIZ" görüldü, ikisi de post-commit hook'un otomatik push'uyla kendiliğinden çözüldü |

## Somut süreç iyileştirmeleri (kalite kapısı: ≥1)
### Öneri 1 — Materyalizasyonda `product.type`'ı brief'ten türet **[P2, önerildi — AF-108'de detaylandırıldı]**
`create-project.mjs` (veya Faz 0b onay akışı), refined-brief'in "Platform/runtime" satırından basit anahtar-kelime eşlemesiyle `state.product.type`'ı doldursun; bilinmiyorsa sessiz `cli` varsayımı yerine açık "tip belirtilmemiş" sinyali versin. Uygulama yeri: `scripts/create-project.mjs`, `scripts/lib/product-types.cjs`.

### Öneri 2 — Orchestrator talimatına güvenilir "dashboard koşuyor mu?" kontrolü **[P2, önerildi — AF-107'de detaylandırıldı, bu koşuda tekrar gözlendi]**
`CLAUDE.md` kural 3: `pgrep`/süreç adına güvenme; `dashboard/runs/active-<proje>.json` işaretine bak — varsa manuel `--drain`'i atla.

**Seçilen:** Öneri 1 (P2) — bu koşuda doğrudan yaşandı, ucuz ve kesin bir düzeltmesi var; Öneri 2 zaten AF-107'de önerilmişti, bu koşu onu ikinci kez doğruladı (öncelik teyit edildi, tekrar önerilmedi).

## MASTER-PROMPT / CLAUDE.md / şablon değişiklik önerileri
1. `scripts/create-project.mjs` → materyalizasyonda brief'ten `product.type` türetimi (bkz. Öneri 1).
2. (Uygulanmadı, gelecek oturuma bırakıldı — bu faz kapsamı yalnız GÖZLEM/ÖNERİ üretmek; fabrika kodu değişikliği `/pipeline-improve` + insan onayı akışına aittir.)

## Kalite kapısı raporu
- "En az 1 somut süreç iyileştirmesi" → ✅ GEÇTİ (2 öneri, biri seçildi + gerekçelendirildi; AUTOFORGE-FEEDBACK.md'ye AF-108 olarak zaten işlendi)
