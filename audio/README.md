# Kara Damar – Ses Kütüphanesi

Kaynak paket: **Epic Stock Media – Evolved Game Creatures 2** (166 wav, 24 bit / 96 kHz, 10 yaratık).
Kullanım Epic Stock Media EULA'sına tabidir.

## Klasörler
```
audio/
  profiles.json          çalışma anı yaratık ses profilleri (aktif)
  library.json           166 kaynak sesin tamamı: kategori, durum (active/candidate/rejected/library),
                         analiz verisi, hangi çalışma dosyasına dönüştüğü, aday profiller
  creatures/stalker/     Long-Limbed Stalker (Derisiz)   – Wight + Orc nefesi + Wraith fısıltısı
  creatures/hemiplex/    ana yaratık Hemiplex (böceksi) – gırtlak tıkırtısı, ekolokasyon tıkları, spiracle tıslaması,
                         çene şakırtısı, titreşimli çığlık; kazı sesleri; steps.mp3 = 12 bacak tıkırtısı (ayak basışında çalar)
  creatures/hemiplex_yavru/  yavrular                    – tiz, hızlı çırpınan çığlık + minik tıkırtılar
  creatures/ocu/         Öcü (Kök Ormanı)                 – Wraith + Mimic eklem sesleri
  environment/           göçük, yeraltı suyu              – Rock Golem Landslide, Kelpie Spray/Splash
audio_source/SourceLibrary/EpicStockMedia_EvolvedGameCreatures2/   orijinal 24/96 dosyalar (oyuna paketlenmez)
```
Çalışma dosyaları: mono MP3 44,1 kHz (~100 kbps), -19 LUFS'a eşitlenmiş, baş/son sessizliği kırpılmış, uzun yankı kuyrukları kesilmiş.

### Hemiplex ses tasarımı (v27)
Memeli sesi yok. Katmanlar: (1) kaynak-süzgeç sentezli gırtlak tıkırtısı: düzensiz darbeler + gerçek tık örnekleri →
formant rezonatörleri + darbeyle kabaran nefes; (2) Harpy çığlıkları pes edilip 30–70 Hz genlik çırpınmasıyla böcek çığlığına
çevrildi, alt oktav katmanı + tıslama; (3) Mimic/Rock Golem kayıtlarından ayıklanmış tık bankası (ekolokasyon, çene, bacak);
(4) ıslak katman: Wight Vomit kabarcıkları, Kelpie gurultusu. Sessizlik tasarımı: dolaşırken seyrek, dinlerken tık taraması,
kovalarken kısa patlamalar; kazarken vokal yerine kaya yırtma.

## Yeni yaratık eklemek
1. `library.json` içindeki aday profillerden ya da kaynak kütüphaneden sesleri seç, aynı ayarlarla MP3'e çevir.
2. `profiles.json` → `profiles` altına yeni profil yaz: `base`, `pitch`, `ref`, `maxDist`, `gap` ve kategoriler
   (`files`, `vol`, `pitch`, `cooldown`, `interval`, `chance`, `maxDist`, `priority`, `overlap`, `reverb`).
3. Oyunda: `const e = audEmitter(id, 'profil', () => [x, y, z]);`
   - olay sesi: `audPlay(e, 'attack')`
   - aralıklı ses (idle/nefes/kovalama): her karede `audTick(e, 'idle', dt)`
   - animasyona bağlı ses: `audLater(e, 'contort', 0.55)`

## Ağ
Her ses başlangıcı 4 baytlık olaydır: `[yayıcı id, kategori, varyant, ses]`. Varyantı sunucu seçer,
istemciler `audReceive(paket)` ile aynı dosyayı yerel olarak çalar. Dosya ya da ses verisi gönderilmez.
