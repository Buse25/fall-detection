/**
 * SensorChart — Canlı sensör verisi grafiği (Recharts)
 *
 * GÖREV 1: Dinamik Zaman Penceresi
 *   "1 Dk (Canlı)" → 60 saniyelik sliding domain, 1 sn'de bir nowMs güncellenir.
 *   "1 Saat" / "24 Saat" → API'den gelen geçmiş veri, domain=dataMin→dataMax.
 *
 * GÖREV 2: Büyütülmüş Hover Target
 *   Düşme/Hareketsizlik noktaları büyük r ile render edilir; görünmez geniş
 *   hit-area circle onMouseEnter/onMouseLeave olaylarını kolayca yakalatır.
 *   Recharts'ın varsayılan Tooltip'i DEVRE DIŞI bırakıldı.
 *
 * GÖREV 3: Vurgulu Hover Kartı
 *   hoveredEvent state'i dolunca konteyner içinde absolute konumlu "Olay Detayı"
 *   kartı belirir; nokta terk edilince (onMouseLeave) kaybolur.
 *   Kart sağ kenara taşmamak için yansıma (flip) mantığı uygulanır.
 *
 * Props:
 *   data[]            : sensör veri noktaları
 *   chartMode         : "live" | "1h" | "24h"
 *   onChartModeChange : (mode: string) => void
 *   devices[]         : cihaz ID listesi
 *   selectedDevice    : seçili cihaz
 *   onDeviceChange    : (id: string) => void
 */
import { useState, useEffect, useCallback, useRef } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

// ── Zaman penceresi seçenekleri ─────────────────────────────────────────────
const TIME_WINDOWS = [
  { id: "live", label: "1 Dk (Canlı)" },
  { id: "1h",   label: "1 Saat"       },
  { id: "24h",  label: "24 Saat"      },
];

const LIVE_WINDOW_MS = 60_000; // 60 saniye

// ── Tarih / saat formatlayıcılar ────────────────────────────────────────────
function formatTime(ts) {
  if (!ts) return "";
  return new Date(Number(ts)).toLocaleTimeString("tr-TR", {
    timeZone: "Europe/Istanbul",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDateTime(ts) {
  if (!ts) return "";
  return new Date(Number(ts)).toLocaleString("tr-TR", {
    timeZone: "Europe/Istanbul",
    day:    "2-digit",
    month:  "short",
    hour:   "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// ── Ana bileşen ─────────────────────────────────────────────────────────────
export default function SensorChart({
  data = [],
  chartMode = "live",
  onChartModeChange,
  devices = [],
  selectedDevice = "",
  onDeviceChange,
}) {
  /** Konteyner ref — hover kartı konumlandırması için */
  const containerRef = useRef(null);

  // ── GÖREV 1: sliding domain için "şu an" zaman damgası ────────────────────
  const [nowMs, setNowMs] = useState(Date.now());

  useEffect(() => {
    if (chartMode !== "live") return;
    setNowMs(Date.now()); // mod değişiminde anında senkronize
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [chartMode]);

  // ── GÖREV 2+3: hover durumu ───────────────────────────────────────────────
  // { payload, x, y, isRightSide }  →  null = kart gizli
  const [hoveredEvent, setHoveredEvent] = useState(null);

  // ── Veri dönüşümü ─────────────────────────────────────────────────────────
  const chartData = data.map((d) => {
    // Jiroskop: socket'ten hazır geliyorsa kullan, yoksa {x,y,z}'den hesapla
    let gyroscopeMag = null;
    if (d?.gyroscopeMagnitude != null) {
      gyroscopeMag = d.gyroscopeMagnitude;
    } else {
      const gx = d?.gyroscope?.x ?? 0;
      const gy = d?.gyroscope?.y ?? 0;
      const gz = d?.gyroscope?.z ?? 0;
      if (gx || gy || gz) {
        gyroscopeMag = parseFloat(
          Math.sqrt(gx * gx + gy * gy + gz * gz).toFixed(3)
        );
      }
    }
    return {
      ...d,
      ts:           d?.timestamp ? new Date(d.timestamp).getTime() : Date.now(),
      magnitude:    d?.accelerometer?.magnitude ?? 0,
      gyroscopeMag,
    };
  });

  // ── GÖREV 1: XAxis domain ─────────────────────────────────────────────────
  const xDomain =
    chartMode === "live"
      ? [nowMs - LIVE_WINDOW_MS, nowMs]
      : ["dataMin", "dataMax"];

  // ── GÖREV 2: Büyütülmüş, hover'lanabilir nokta renderer ──────────────────
  // useCallback — containerRef ve setHoveredEvent her ikisi de stabil referans;
  // fonksiyon hiçbir zaman yeniden oluşturulmaz → gereksiz Recharts render'ı yok.
  const eventDotRenderer = useCallback(
    (dotProps) => {
      const { cx, cy, payload } = dotProps;
      if (!payload?.isFallDetected && !payload?.isInactivity) return null;

      const isFall = payload.isFallDetected;
      const color  = isFall ? "#ba1a1a" : "#e87811";
      const r      = isFall ? 9 : 10;

      return (
        <g
          style={{ cursor: "pointer" }}
          onMouseEnter={(e) => {
            const rect = containerRef.current?.getBoundingClientRect();
            if (!rect) return;
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            // Kart konteynerin sağ yarısındaysa solda açılır
            const isRightSide = x > rect.width * 0.55;
            setHoveredEvent({ payload, x, y, isRightSide });
          }}
          onMouseLeave={() => setHoveredEvent(null)}
        >
          {/* Dış parlama halkası */}
          <circle cx={cx} cy={cy} r={r + 9}  fill={color} fillOpacity={0.14} />
          {/* Ana renkli nokta */}
          <circle cx={cx} cy={cy} r={r}      fill={color} stroke="#fff" strokeWidth={2.5} />
          {/* Görünmez, geniş fare hedefi — hedeflemeyi kolaylaştırır */}
          <circle cx={cx} cy={cy} r={r + 20} fill="transparent" />
        </g>
      );
    },
    [] // eslint-disable-line react-hooks/exhaustive-deps — stabil kapanım
  );

  const he = hoveredEvent;
  const isFallEvent = he?.payload?.isFallDetected;
  const hasData = chartData.length > 0;

  // Popover yatay konum: sağ tarafa taşarsa solda açılır
  const popoverX = he
    ? he.isRightSide
      ? Math.max(4, he.x - 224)   // 224 = popover genişliği (w-56=14rem) + 16px boşluk
      : he.x + 16
    : 0;
  const popoverY = he ? Math.max(he.y - 148, 4) : 0;

  return (
    <div
      ref={containerRef}
      className="bg-surface-container-lowest rounded-xl border border-outline-variant/60 shadow-sm p-4 relative"
    >
      {/* ── Başlık + Kontroller ──────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
        <div>
          <h3 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-2">
            Canlı Sensör Verisi
            {/* CANLI rozeti — yalnızca live modda görünür */}
            {chartMode === "live" && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                CANLI
              </span>
            )}
          </h3>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            İvmeölçer (G) ve Jiroskop (rad/s)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Cihaz Seçimi — her zaman görünür */}
          <div className="relative">
            <select
              value={selectedDevice}
              onChange={(e) => onDeviceChange?.(e.target.value)}
              className="appearance-none bg-surface border border-outline-variant rounded-lg pl-3 pr-8 py-1 text-label-md font-label-md text-on-surface focus:ring-1 focus:ring-primary focus:border-primary outline-none"
            >
              <option value="">Tüm Cihazlar</option>
              {devices.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-sm">
              expand_more
            </span>
          </div>

          {/* Zaman Penceresi Butonları */}
          <div className="flex gap-1 bg-surface-container-low p-0.5 rounded-lg border border-outline-variant/50">
            {TIME_WINDOWS.map((tw) => (
              <button
                key={tw.id}
                onClick={() => onChartModeChange?.(tw.id)}
                className={[
                  "px-2.5 py-1 rounded-md text-label-md font-label-md transition-colors whitespace-nowrap",
                  chartMode === tw.id
                    ? "bg-primary text-on-primary shadow-sm"
                    : "text-on-surface-variant hover:bg-surface-container-high",
                ].join(" ")}
              >
                {tw.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Grafik ────────────────────────────────────────────── */}
      {hasData ? (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 5, left: -20, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#c3c6d7"
              strokeOpacity={0.5}
            />

            {/*
             * XAxis:
             *  • type="number" + scale="time" → sürekli sayısal eksen
             *  • live mod: [nowMs-60s, nowMs] domain — grafik sağa kayar
             *  • diğer modlar: [dataMin, dataMax] — tüm API verisi görünür
             */}
            <XAxis
              dataKey="ts"
              type="number"
              scale="time"
              domain={xDomain}
              tickFormatter={formatTime}
              tick={{ fontSize: 10, fill: "#434655" }}
              tickLine={false}
              axisLine={{ stroke: "#c3c6d7" }}
              tickCount={5}
            />

            <YAxis
              tick={{ fontSize: 11, fill: "#434655" }}
              tickLine={false}
              axisLine={false}
              width={40}
            />

            {/*
             * <Tooltip> KASITLI OLARAK KALDIRILDI (GÖREV 2).
             * Varsayılan X-ekseni hover tooltip'i sık noktalarda olay
             * hedeflerini zorlaştırıyor; yerine dot-bazlı popover kullanılıyor.
             */}

            {/* İvme çizgisi — EventDot düşme/hareketsizlik noktalarını render eder */}
            <Line
              type="monotone"
              dataKey="magnitude"
              stroke="#004ac6"
              strokeWidth={2}
              dot={eventDotRenderer}
              activeDot={false}
              isAnimationActive={false}
            />

            {/* Jiroskop çizgisi — kesikli, turuncu */}
            <Line
              type="monotone"
              dataKey="gyroscopeMag"
              stroke="#e87811"
              strokeWidth={1.5}
              strokeDasharray="5 3"
              dot={false}
              activeDot={false}
              isAnimationActive={false}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[220px] flex flex-col items-center justify-center text-on-surface-variant">
          <span className="material-symbols-outlined text-4xl opacity-30 mb-2">
            show_chart
          </span>
          <p className="font-body-sm text-body-sm">
            {chartMode === "live"
              ? "Canlı veri bekleniyor..."
              : "Seçilen zaman aralığında veri yok"}
          </p>
        </div>
      )}

      {/* ── GÖREV 3: Olay Detayı Hover Kartı ─────────────────── */}
      {he && (
        <div
          style={{
            position: "absolute",
            left:     popoverX,
            top:      popoverY,
            zIndex:   50,
            pointerEvents: "none",
          }}
          className="w-56 bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-2xl p-4"
        >
          {/* Olay başlığı */}
          <div
            className={[
              "flex items-center gap-2 px-2.5 py-1.5 rounded-lg mb-3",
              isFallEvent
                ? "bg-red-50 text-error border border-red-100"
                : "bg-orange-50 text-orange-600 border border-orange-100",
            ].join(" ")}
          >
            <span className="material-symbols-outlined text-[18px]">
              {isFallEvent ? "warning" : "motion_sensor_idle"}
            </span>
            <span className="font-label-md text-label-md font-bold tracking-wide">
              {isFallEvent ? "🚨 DÜŞME" : "⚠️ HAREKETSİZLİK"}
            </span>
          </div>

          {/* Saat */}
          <div className="flex items-center gap-1.5 text-on-surface-variant mb-3">
            <span className="material-symbols-outlined text-sm">schedule</span>
            <span className="font-body-sm text-body-sm">
              {formatDateTime(he.payload?.ts)}
            </span>
          </div>

          {/* İvme değeri */}
          <div className="flex items-end justify-between border-t border-outline-variant/40 pt-2.5">
            <span className="font-label-md text-label-md text-on-surface-variant">
              İvme
            </span>
            <span className="font-bold text-lg text-primary leading-none">
              {(he.payload?.magnitude ?? he.payload?.accelerometer?.magnitude ?? 0).toFixed(3)}
              <span className="font-body-sm text-body-sm text-on-surface-variant font-normal ml-1">
                G
              </span>
            </span>
          </div>

          {/* Jiroskop değeri (varsa) */}
          {he.payload?.gyroscopeMag != null && (
            <div className="flex items-end justify-between mt-1.5">
              <span className="font-label-md text-label-md text-on-surface-variant">
                Jiroskop
              </span>
              <span className="font-bold text-lg text-orange-500 leading-none">
                {he.payload.gyroscopeMag.toFixed(3)}
                <span className="font-body-sm text-body-sm text-on-surface-variant font-normal ml-1">
                  rad/s
                </span>
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Açıklama (Legend) ─────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-4 mt-3 text-label-md font-label-md text-on-surface-variant">
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-0.5 bg-primary inline-block" />
          İvme (G)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-px border-t-2 border-dashed border-orange-400 inline-block" />
          Jiroskop (rad/s)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-error inline-block" />
          Düşme
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-orange-500 inline-block" />
          Hareketsizlik
        </span>
      </div>
    </div>
  );
}
