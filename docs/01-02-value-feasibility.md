# 01-02 — Değer & Fizibilite (LITE birleşik faz): minesweeper

> LITE profil: yarım sayfa hedefi, paydaş analizi yok.

- Tarih: 2026-07-26 | Mod: AUTOPILOT | Profil: LITE

## Değer önerisi
Kurulum gerektirmeyen, tarayıcıda anında açılan klasik bir Minesweeper oyunu; kullanıcı hesap/indirme olmadan kısa süreli mantık oyunu oynar.

## KPI'lar (kalite kapısı: en az 3, ölçülebilir)
1. Sayfa yüklenmesinden ilk hamleye kadar geçen süre ≤ 5 sn (manuel ölçüm, tarayıcı DevTools).
2. Açılan her hücrenin komşu mayın sayısı hesaplaması %100 doğru (otomatik birim testle doğrulanır — 8-komşu tarama).
3. Bayrak koy/kaldır ve hücre açma tepki gecikmesi ≤ 100ms (tıklamadan DOM güncellemesine, manuel/otomatik ölçüm).

## Fizibilite
- Teknik: Statik HTML/CSS/JS ile tamamen client-side çözülebilir; grid/mayın yerleşimi basit rastgele dağıtım + flood-fill algoritmasıdır (kanıtlanmış, düşük risk). ✅
- Ekonomik: Sıfır altyapı maliyeti (statik barındırma yeterli). ✅
- Zaman: LITE MVP kapsamı (3 sabit zorluk, backend yok) 1 günden az geliştirme gerektirir. ✅

## GO / NO-GO önerisi: **GO**
Gerekçe: Teknik risk yok (flood-fill + komşu sayımı standart algoritmalar), maliyet sıfıra yakın, kapsam net ve küçük. Üç ölçülebilir KPI ile ilerlemek uygun.

## Kalite kapısı raporu
- "En az 3 ölçülebilir KPI" → ✅ (yukarıda 3 KPI, hedef + ölçüm yöntemiyle)
- "GO/NO-GO kararı gerekçeli" → ✅ (GO, teknik/ekonomik/zaman gerekçesiyle)
