# 14 — Monitoring: minesweeper

- Tarih: 2026-07-26 | Mod: AUTOPILOT | Profil: LITE (basit health check + hata görünürlüğü)

## Ürün tipine göre izleme (web)

| Tip | İzlenecekler |
|-----|--------------|
| Web | `/health` endpoint (nginx statik servis), istemci-taraflı JS hataları, statik dosya sunum hataları (404/5xx) |

LITE profil asgari kapsam: health check + hata görünürlüğü. Kod-içi analytics/APM eklenmedi (sıfır bağımlılık, durumsuz mimariyle tutarlı — docs/05-architecture.md).

## Health check
| Kontrol | Sağlıklı | Sorunlu davranış |
|---------|----------|-------------------|
| `GET /health` (nginx, `deploy/nginx.conf:6-8`) | `200 OK` (statik `"ok\n"` yanıtı) | Bağlantı reddi / 5xx → container ayakta değil veya nginx config bozuk |
| `GET /` (index.html) | `200 OK`, `Content-Type: text/html` | 404 → yanlış statik kök yolu; 5xx → nginx config hatası |
| Tarayıcı konsolu (manuel/gözlem) | Hata yok | `Uncaught TypeError` → `#board`/`#status` seçicilerinden biri yoksa `app.js` guard'sız kod noktasında patlar (bkz. docs/10-review F7, Faz 15 borcu) |

## Hata görünürlüğü / loglama
- **Sunucu tarafı:** nginx erişim/hata logları (container stdout/stderr — `docker logs`); ek log altyapısı gerekmiyor (statik dosya servisi, backend yok).
- **İstemci tarafı:** Kazanma/kaybetme durumları `#status[aria-live]` ile kullanıcıya gösterilir; `console.*` üretim kodunda YOK (SEC-9, Faz 10'da doğrulandı). Üçüncü-taraf hata toplama CSP (`connect-src 'none'`) tarafından zaten engelleniyor ve sıfır-bağımlılık ilkesiyle çelişirdi.
- **Hassas veri loglanmaz:** Kullanıcı girdisi yalnız hücre tıklaması (kimlik, PII, sır yok); nginx erişim logu yalnız istek yolu+durum kodu tutar.

## Kritik akış izleme (kalite kapısı)
- **En kritik risk:** Statik dosya servisinin (container) ayakta kalmaması → tüm ürün erişilemez olur (tek risk yüzeyi, sunucu-taraflı iş mantığı yok).
- **Görünürlük/alert mekanizması:** `deploy-image.yml` + `remote-deploy.sh` sonrası `/health` **canlı probe** edilir (kural 9, bitiş otomasyonu) ve sonucu `state.deploy` alanına yazılır; dashboard 🔴/🟢 rozetiyle gösterir. Sürekli uptime ping bu ölçekte (LITE, tek statik container) kapsam dışı — deploy-anı probe + manuel `docker logs` yeterli kabul edildi.
- **İkincil risk:** F15 (Faz 10 re-review, Major) — `suppressNextClick` bayrağının gerçek dokunmatik cihazlarda bir sonraki dokunuşu yutması; sunucuya rapor edilmeyen istemci-taraflı bir davranış, alert kapsamı dışında, Faz 15 bakım borcunda izlenir.

## Kalite kapısı raporu
- "Kritik akışlar için alert/hata görünürlüğü tanımlı" → ✅ (health probe + deploy-anı doğrulama + nginx log; tip=web beklentisi: health/hata/log karşılandı)
