# CatchMe Web Panel

Bu klasör, CatchMe için web panel uygulamasının başlangıç iskeletini içerir. Amaç alarm ve sensör verilerini web arayüzünden görüntülemek ve gerçek zamanlı düşme olaylarını takip etmektir.

## Başlatma

```bash
npm install
npm run dev
```

## Kimlik doğrulama

- Token, istemci tarafında `localStorage` içinde `catchme_token` anahtarıyla tutulacaktır.
- API isteklerinde `Authorization: Bearer <token>` başlığı kullanılacaktır.

## Socket eventleri

Web panel tarafında dinlenecek eventler:

- `fall_detected` (kullanıcının `panel:<userId>` room'u üzerinden)

Web panel tarafında gönderilecek eventler:

- `join_panel_room`

## Kullanılacak backend endpoint'leri

- `GET /api/panel/stats`
- `GET /api/panel/recent-alarms`
- `GET /api/panel/sensor-chart?hours=1`
- `POST /api/auth/login`
- `GET /api/auth/me`
