# Environment/OldMine

Quixel Megascans **Old Mine** paketinden (2K, LOD0 TIER2) oyuna dönüştürülmüş çevre kütüphanesi.
Kaynak zip (FBX + 2K dokular) oyuna paketlenmez; burada yalnızca optimize edilmiş çalışma zamanı dosyaları var.

## Klasörler
| Klasör | İçerik |
|---|---|
| `Structural/` | ahşap dikmeler, kirişler, hidrolik direkler, tünel kaplamaları (kemerli + düz tavanlı), tahta zemin |
| `Rails/` | geniş hat ray (oyuncunun rayı), gömülü eski dar hat, sökülmüş hat yatağı, çivi, takoz |
| `MineCarts/` | cevher dolu vagon, boş vagon, kereste vagonu, kasasız araba, torbalı vagon, tekerlek takımı |
| `Tools/` | 2 kazma, balyoz, kürek, baret |
| `Props/` | kafesli duvar lambası, yükleme sehpası |
| `Rocks/` | taş (ölçekle kaya/kömür topağı) |
| `Debris/` | toprak ve çakıl yığınları, çakıl yaması, kıymıklar, kırık tahta |
| `Surfaces/` | mağara duvar/zemin yüzeyleri (triplanar): katmanlı, gri, kahve, delik izli kaya; koyu, kömürlü, kırmızı zemin; beton |
| `Decals/` | kömür/taş kırıntısı ve leke çıkartmaları (albedo + opaklık) |

## Dosya biçimi
- `mesh.txt`: base64 **KDM3** — JSON başlık + pos (int16 norm, `qs/qo` ile açılır), normal (int8), uv (uint16 norm), tangent (int8, w = el yönü), indeks (LOD0 | LOD1 | LOD2 art arda).
- `albedo.jpg` sRGB (Cavity haritası hafifçe işlendi) · `normal.jpg` OpenGL (+Y) · `rma.jpg` R=pürüzlülük, G=metalik, B=AO.
- Yüzeylerde `rha.jpg`: R=pürüzlülük, G=yükseklik (duvar dokuları arasında yükseklik tabanlı geçiş için), B=AO. Çalışma anında albedo+yükseklik ve normal+pürüzlülük+AO tek dokularda paketlenir.

## Doku bütçesi (mobil)
- Kahraman objeler (vagonlar, kaplamalar, yığınlar, büyük kaya): albedo 1024, normal 512, RMA 256
- Yapısal (dikme, kiriş, ray, direk): albedo 512, normal 512, RMA 256
- Küçük objeler (aletler, çivi, kıymık): 256 / 256 / 128
- Yüzeyler: 1024 albedo + 1024 normal + 512 RHA
- Düşük grafikte tüm dokular yarı çözünürlükte yüklenir; yalnızca o katın (ve bir alttakinin) yüzeyleri GPU'da tutulur.

`library.json` her asset için boyut, üçgen sayıları (3 LOD), çarpışma önerisi, etiketler, oyundaki kullanımı ve kullanılmayanların nedenini içerir.
