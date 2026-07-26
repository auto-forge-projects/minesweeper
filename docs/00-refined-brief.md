# 00 — Rafine Proje Brief'i: minesweeper

- Tarih: 2026-07-26 | Rafine eden model: Sonnet | Onay durumu: **Onaylandı** (dashboard, 2026-07-26)

## Ham fikir (kullanıcının girdisi — değiştirilmez)
> Basit bir mayın tarlası oyunu

## Rafine problem (tek cümle)
Kullanıcının tarayıcıda oynayabileceği, klasik kurallara sahip basit (tek oyunculu) bir mayın tarlası (Minesweeper) oyunu yok.

## Hedef kitle
Kısa süreli, tek oyunculu mantık oyunu oynamak isteyen herhangi bir web kullanıcısı (mobil dahil).

## Kısıtlar & varsayımlar (AF-001 kapanışı)
- Platform/runtime: Web (statik HTML/CSS/JS, framework'süz — build adımı yok)
- Çevrimiçi/çevrimdışı, veri konumu: Tamamen istemci taraflı, sunucu/veritabanı yok, veri saklanmaz (skor/kayıt kalıcılığı yok)
- Zaman/kota bütçesi: LITE profil, düşük efor — küçük tek sayfalık ürün
- Varsayımlar: Klasik kare grid + sağ-tık/uzun-basma bayrak koyma; zorluk seviyesi (küçük/orta/büyük grid) sabit ön tanımlı seçenekler olarak sunulur; çoklu dil desteği yok (TR arayüz metni yeterli)

## Başarı kriterleri (ölçülebilir)
1. Kullanıcı grid boyutu/mayın sayısını en az 3 zorluk seviyesinden seçip yeni oyun başlatabilir
2. Sol tık hücre açar, sağ tık/basılı tutma bayrak koyar/kaldırır; sayı hücreleri komşu mayın sayısını doğru gösterir
3. Mayına tıklanınca oyun biter (tüm mayınlar açılır) ve mayınsız tüm hücreler açılınca "kazandın" mesajı %100 doğru tetiklenir
4. Sayfa yenilemeden "yeniden başlat" ile aynı zorlukta yeni oyun kurulabilir

## Kapsam sınırı (v1'de yapılmayacaklar)
- Skor tablosu / kalıcı istatistik / kullanıcı hesabı yok
- Çoklu oyunculu veya gerçek zamanlı özellik yok
- Özel grid boyutu girişi (yalnız ön tanımlı 3 zorluk seviyesi)

## Açık sorular (kullanıcının netleştirmesi önerilen)
- [ ] Zorluk seviyeleri klasik değerlerle mi sabitlensin (Kolay 9x9/10 mayın, Orta 16x16/40 mayın, Zor 16x30/99 mayın) yoksa farklı bir set mi istenir?
- [ ] Mobilde sağ-tık olmadığı için bayrak koyma "basılı tutma (long-press)" ile mi olsun, yoksa ayrı bir "bayrak modu" anahtarı mı tercih edilir?

## Önerilen profil ve ilk mod
- Profil: LITE · Gerekçe: Solo, framework'süz, veri katmanı olmayan küçük ölçekli statik web oyunu — tam FULL süreç gereksiz tören olur.

---
## Onay kaydı
- 2026-07-26 — Beklemede
