/**
 * SensorChart — Canlı sensör verisi grafiği (Recharts)
 * Veri kaynağı: GET /api/panel/sensor-chart  +  Socket fall_detected
 *
 * @param {{ data: Array, hours: number, onHoursChange: function }} props
 * data item: { timestamp, accelerometer: { magnitude }, isFallDetected }
 */
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Dot,
} from "recharts";

const HOURS_OPTIONS = [1, 3, 6, 12, 24];

function formatTime(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Özel Tooltip */
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-3 shadow-lg text-body-sm font-body-sm">
      <p className="text-on-surface-variant mb-1">{formatTime(d?.timestamp)}</p>
      <p className="text-primary font-medium">
        Magnitude: {payload[0]?.value?.toFixed(3)}
      </p>
      {d?.isFallDetected && (
        <p className="text-error font-bold mt-1">⚠ Düşme Tespit Edildi</p>
      )}
    </div>
  );
}

/** Düşme noktaları için özel nokta */
function CustomDot(props) {
  const { cx, cy, payload } = props;
  if (!payload?.isFallDetected) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={6} fill="#ba1a1a" stroke="#fff" strokeWidth={2} />
      <circle cx={cx} cy={cy} r={12} fill="#ba1a1a" fillOpacity={0.2} />
    </g>
  );
}

export default function SensorChart({ 
  data = [], 
  hours = 1, 
  onHoursChange,
  devices = [],
  selectedDevice = "",
  onDeviceChange 
}) {
  // Grafik için veriyi düzleştir
  const chartData = data.map((d) => ({
    ...d,
    magnitude: d?.accelerometer?.magnitude ?? 0,
    time: formatTime(d?.timestamp),
  }));

  const hasData = chartData.length > 0;

  return (
    <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/60 shadow-sm p-4">
      {/* Başlık ve saat/cihaz filtresi */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
        <div>
          <h3 className="font-headline-sm text-headline-sm text-on-surface">
            Canlı Sensör Verisi
          </h3>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            İvmeölçer büyüklüğü (G)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Cihaz Seçimi */}
          {devices.length > 0 && (
            <div className="relative">
              <select
                value={selectedDevice}
                onChange={(e) => onDeviceChange?.(e.target.value)}
                className="appearance-none bg-surface border border-outline-variant rounded-lg pl-3 pr-8 py-1 text-label-md font-label-md text-on-surface focus:ring-1 focus:ring-primary focus:border-primary outline-none"
              >
                <option value="">Tüm Cihazlar</option>
                {devices.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-sm">
                expand_more
              </span>
            </div>
          )}

          {/* Saat Seçimi */}
          <div className="flex gap-1 bg-surface-container-low p-0.5 rounded-lg border border-outline-variant/50">
            {HOURS_OPTIONS.map((h) => (
              <button
                key={h}
                onClick={() => onHoursChange?.(h)}
                className={[
                  "px-2 py-1 rounded-md text-label-md font-label-md transition-colors",
                  hours === h
                    ? "bg-primary text-on-primary shadow-sm"
                    : "text-on-surface-variant hover:bg-surface-container-high",
                ].join(" ")}
              >
                {h}s
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grafik */}
      {hasData ? (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#c3c6d7" strokeOpacity={0.5} />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 11, fill: "#434655" }}
              tickLine={false}
              axisLine={{ stroke: "#c3c6d7" }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#434655" }}
              tickLine={false}
              axisLine={false}
              width={40}
            />
            <Tooltip content={<CustomTooltip />} />
            {/* Düşme eşik çizgisi */}
            <ReferenceLine y={2.5} stroke="#ba1a1a" strokeDasharray="4 2" strokeOpacity={0.6} />
            <Line
              type="monotone"
              dataKey="magnitude"
              stroke="#004ac6"
              strokeWidth={2}
              dot={<CustomDot />}
              activeDot={{ r: 5, fill: "#004ac6" }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[220px] flex flex-col items-center justify-center text-on-surface-variant">
          <span className="material-symbols-outlined text-4xl opacity-30 mb-2">show_chart</span>
          <p className="font-body-sm text-body-sm">
            Seçilen zaman aralığında veri yok
          </p>
        </div>
      )}

      {/* Açıklama */}
      <div className="flex items-center gap-4 mt-3 text-label-md font-label-md text-on-surface-variant">
        <span className="flex items-center gap-1">
          <span className="w-4 h-0.5 bg-primary inline-block" /> İvme
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-error inline-block" /> Düşme
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-px border-t-2 border-dashed border-error inline-block" /> Eşik (2.5G)
        </span>
      </div>
    </div>
  );
}
