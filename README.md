# Descent oda sunucusu

Descent (Kara Damar) için çok oyunculu oda sunucusu. Bağımlılık yok, sadece Node.js.

- `GET /` → durum
- `GET /health` → `ok`
- `WS /ws?room=KOD` → oda (en fazla 4 oyuncu)

Render'da: New → Blueprint (ya da Web Service) → bu depo → Free.

## Cloudflare (önerilen: ücretsiz, kart yok, uyumaz)
dash.cloudflare.com → Workers & Pages → Create → Import a repository → bu depo → Deploy.
`wrangler.toml` her şeyi ayarlar (Durable Object: ROOMS).
