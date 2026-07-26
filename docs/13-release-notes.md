# minesweeper v0.1.0 — Release Notes

- Tarih: 2026-07-26 | SemVer: **v0.1.0** (0.x = API garanti yok) | Mod: AUTOPILOT
> Sürüm, Faz 8 planındaki tek milestone M1 (Oynanabilir Minesweeper) ile tutarlı: FR-1..FR-6 eksiksiz.

## Öne çıkanlar
- İstemci-taraflı, sıfır bağımlılık, tek sayfa klasik Minesweeper (statik `index.html`+3 JS modülü+`styles.css`).
- İlk-tık güvenliği: mayınlar oyuncunun ilk tıkladığı hücreden SONRA, o hücre+komşuları hariç tutularak yerleştirilir.
- Hem masaüstü (sağ tık) hem dokunmatik (uzun-basma) bayrak koyma; Faz 10 code review'unda bulunan Critical bir çakışma hatası (uzun-basma sonrası sentetik tıkla hücrenin kendiliğinden açılması) düzeltildi ve regresyon testleriyle kanıtlandı.

## Özellikler
- FR-1: 3 sabit zorluk (Kolay 9x9/10, Orta 16x16/40, Zor 16x30/99) + yeni oyun kurulumu.
- FR-2: Sol tık ile hücre açma, ilk-tık güvenli, komşu=0 hücrelerde flood-fill zincirleme açılma.
- FR-3: Sağ tık / ~500ms uzun-basma ile bayrak koy/kaldır.
- FR-4: Mayına tıklanınca tüm mayınlar açılır, tahta kilitlenir, "Kaybettin" mesajı.
- FR-5: Tüm mayınsız hücreler açılınca tahta kilitlenir, "Kazandın" mesajı.
- FR-6: "Yeni Oyun" ile aynı zorlukta sıfırdan kurulum.

## Güvenlik
- OWASP Top 10 değerlendirildi (`docs/07-security.md`); SEC-1..SEC-6, SEC-8, SEC-9 Faz 10 code review'unda kodda bağımsız doğrulandı (grep kanıtı: `innerHTML`/`eval`/`fetch`/`XMLHttpRequest`/`localStorage` repoda yok).
- SEC-5 (CSP): `<meta>` etiketi mevcut ancak `frame-ancestors` meta'da etkisiz olduğu Faz 10'da tespit edildi (F9, Minor) — HTTP başlığı ile tamamlanması Faz 14/15 notu.
- SEC-7 (CI sertleştirme): kök `permissions: contents: read` + sürüm-pinli action'lar (`@v4`) mevcut.

## Test
- 44/44 birim/entegrasyon/performans/render testi yeşil (`npm test`).
- NFR-1 (tık→DOM ≤100ms) ölçüldü: en büyük grid (16x30) tam flood-fill senaryosunda ~1-7ms — hedefin çok altında.
- Faz 11 sonuçları: `docs/11-test/results.md`.

## Bilinen sınırlar (docs/15-maintenance.md referanslı)
- Klavye navigasyonu v1 kapsamı dışı (DL-06-001) — yalnız fare/dokunmatik.
- F15 (Major, Faz 10 re-review): `suppressNextClick` bayrağı trailing-click üretmeyen bazı platformlarda bir sonraki dokunuşu yutabilir (fail-safe; hücre yanlışlıkla açılmaz, yalnızca bir dokunuş gecikebilir) — gerçek cihazda doğrulanmadı.
- CSP `frame-ancestors` meta'da etkisiz (F9, Minor) — HTTP başlığı gerekiyor.

## Kurulum
```bash
git clone <repo> && cd minesweeper
# Statik dosya sunucusu ile aç, örn:
npx serve .     # veya Docker: docker build -t minesweeper . && docker run -p 3000:3000 minesweeper
```

## Rollback planı (kalite kapısı)
1. **Kod:** İlk sürüm (v0.1.0) — geri alınacak önceki sürüm yok; gerekirse `git revert` ile Faz 9 commit zincirine dönülebilir, statik dosya olduğundan anlık etkilidir.
2. **Veri uyumluluğu:** Durumsuz (kalıcı depolama/backend yok) — rollback veri kaybı yaratmaz, oyun durumu yalnız tarayıcı belleğinde geçicidir.
3. **Doğrulama:** Rollback sonrası `npm test` (44/44 yeşil beklenir) + `/health` endpoint (nginx statik servis) 200 dönmeli.
4. **Dağıtım:** Docker imajı `ghcr.io/auto-forge-projects/minesweeper:<önceki-sha>` tag'ine geri alınır (`deploy-image.yml` immutable SHA tag üretir); SSH-push deploy script'i (`deploy/remote-deploy.sh`) önceki tag ile yeniden çalıştırılır.

## Kalite kapısı raporu
- "Rollback prosedürü tanımlı" → ✅ (yukarıdaki 4 adım: kod/veri/doğrulama/dağıtım)
- "Sürüm plana uygun" → ✅ (Faz 8 tek milestone M1, FR-1..FR-6 eksiksiz)
