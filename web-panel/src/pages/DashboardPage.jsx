/**
 * DashboardPage — Ana kontrol paneli
 *
 * API çağrıları:
 *   GET /api/panel/stats         → 4 istatistik kartı
 *   GET /api/panel/recent-alarms → son alarmlar listesi
 *   GET /api/panel/sensor-chart  → grafik verisi
 *
 * Socket:
 *   EMIT → join_panel_room
 *   ON   → fall_detected → FallAlert toast + alarm listesine ekle
 */
import { useState, useEffect, useCallback, useRef } from "react";
import PageLayout from "../components/layout/PageLayout";
import StatCard from "../components/ui/StatCard";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import FallAlert from "../components/ui/FallAlert";
import SensorChart from "../components/SensorChart";
import RecentAlarms from "../components/RecentAlarms";
import { fetchStats, fetchRecentAlarms, fetchSensorChart, fetchDevices } from "../api/panel";
import { resolveAlarm } from "../api/alarms";
import { getSocket, connectSocket } from "../socket/socket";
import { useAuth } from "../context/AuthContext";

export default function DashboardPage() {
  const { token } = useAuth();

  const [stats, setStats]           = useState(null);
  const [alarms, setAlarms]         = useState([]);
  const [chartData, setChartData]   = useState([]);
  // "live" → 60 saniyelik sliding window (socket verisi)
  // "1h"  → API'den son 1 saat  |  "24h" → API'den son 24 saat
  const [chartMode, setChartMode]   = useState("live");
  const [devices, setDevices]       = useState([]);
  const [selectedDevice, setSelectedDevice] = useState("");
  const [loading, setLoading]       = useState(true);
  const [fallAlert, setFallAlert]   = useState(null); // anlık socket bildirimi

  // device_status listener'ının closure'ında güncel selectedDevice'ı okumak için ref.
  // selectedDevice state'i değişince socket listener'ını yeniden bağlamadan filtre güncellenir.
  const selectedDeviceRef = useRef(selectedDevice);
  useEffect(() => { selectedDeviceRef.current = selectedDevice; }, [selectedDevice]);

  // Canlı grafik için maksimum nokta sayısı: 300 (~1 dk veri, 5 pencere/sn'de)
  const MAX_LIVE_POINTS = 300;

  // ── Veri yükleme ──────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [statsData, alarmsData, devicesData] = await Promise.all([
        fetchStats(),
        fetchRecentAlarms(),
        fetchDevices(),
      ]);
      setStats(statsData);
      setAlarms(alarmsData);
      setDevices(devicesData ? devicesData.map(d => d.deviceId) : []);
    } catch (err) {
      console.error("[Dashboard] Veri yüklenemedi:", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadChart = useCallback(async (h, devId) => {
    try {
      const data = await fetchSensorChart(h, devId);
      setChartData(data);
    } catch (err) {
      console.error("[Dashboard] Grafik verisi yüklenemedi:", err.message);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // "live" modunda API çağrısı yapılmaz — grafik doğrudan socket verisiyle beslenir
  const CHART_HOURS = { "1h": 1, "24h": 24 };
  useEffect(() => {
    if (chartMode === "live") return;
    loadChart(CHART_HOURS[chartMode], selectedDevice);
  }, [chartMode, selectedDevice, loadChart]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleChartModeChange(mode) {
    setChartMode(mode);
    // Live moda geçişte eski geçmiş verisi temizlenir; socket stream'i taze başlar
    if (mode === "live") setChartData([]);
  }

  // ── Socket bağlantısı ve olay dinleme ─────────────────────────────────────
  useEffect(() => {
    if (!token) return;

    let socket = getSocket();
    if (!socket?.connected) {
      socket = connectSocket(token);
    }

    // fall_detected: Yeni düşme alarmı — toast göster, stats/liste güncelle, grafiğe marker ekle
    function onFallDetected(payload) {
      setFallAlert(payload);
      setStats((prev) =>
        prev
          ? {
              ...prev,
              unresolvedAlarms: (prev.unresolvedAlarms ?? 0) + 1,
              totalAlarms: (prev.totalAlarms ?? 0) + 1,
              todayFalls: (prev.todayFalls ?? 0) + 1,
            }
          : prev
      );
      setAlarms((prev) => [
        {
          _id: payload.alarmId,
          alarmType: "fall",
          severity: "high",
          message: `Fall detected by ${payload.detectionMethod}`,
          isResolved: false,
          createdAt: new Date().toISOString(),
        },
        ...prev.slice(0, 9),
      ]);
      // Grafiğe düşme marker'ı ekle (son bilinen magnitude değerinde)
      setChartData((prev) => {
        const lastMag = prev.length > 0 ? (prev[prev.length - 1].accelerometer?.magnitude ?? 1) : 1;
        const marker = {
          timestamp: new Date().toISOString(),
          accelerometer: { magnitude: lastMag },
          isFallDetected: true,
          isInactivity: false,
          deviceId: "",
        };
        const updated = [...prev, marker];
        return updated.length > MAX_LIVE_POINTS ? updated.slice(-MAX_LIVE_POINTS) : updated;
      });
    }

    // alarm_resolved: Mobil "İyiyim" tuşu veya panel resolve — alarm listesini güncelle
    function onAlarmResolved(payload) {
      setAlarms((prev) =>
        prev.map((a) =>
          String(a._id) === String(payload.alarmId)
            ? { ...a, isResolved: true, resolvedAt: new Date().toISOString() }
            : a
        )
      );
      setStats((prev) =>
        prev
          ? { ...prev, unresolvedAlarms: Math.max(0, (prev.unresolvedAlarms ?? 1) - 1) }
          : prev
      );
    }

    // emergency_alert: Hareketsizlik onaylandı — alarm ekle, grafiğe marker koy
    function onEmergencyAlert(payload) {
      setStats((prev) =>
        prev
          ? {
              ...prev,
              unresolvedAlarms: (prev.unresolvedAlarms ?? 0) + 1,
              totalAlarms: (prev.totalAlarms ?? 0) + 1,
            }
          : prev
      );
      setAlarms((prev) => [
        {
          _id: payload.alarmId,
          alarmType: "inactivity",
          severity: "high",
          message: "Hareketsizlik alarmı onaylandı — acil durum kişileri uyarıldı",
          isResolved: false,
          createdAt: new Date().toISOString(),
        },
        ...prev.slice(0, 9),
      ]);
      // Grafiğe hareketsizlik marker'ı ekle (son bilinen magnitude değerinde)
      setChartData((prev) => {
        const lastMag = prev.length > 0 ? (prev[prev.length - 1].accelerometer?.magnitude ?? 0) : 0;
        const marker = {
          timestamp: new Date().toISOString(),
          accelerometer: { magnitude: lastMag },
          isFallDetected: false,
          isInactivity: true,
          deviceId: "",
        };
        const updated = [...prev, marker];
        return updated.length > MAX_LIVE_POINTS ? updated.slice(-MAX_LIVE_POINTS) : updated;
      });
    }

    // device_status: Canlı sensör penceresi — grafiği sağa doğru kaydır
    function onDeviceStatus(payload) {
      // selectedDevice filtresi: ref üzerinden okunur, closure yeniden bağlanmadan çalışır
      const selDev = selectedDeviceRef.current;
      if (selDev && payload.deviceId !== selDev) return;

      // Grafiğe yeni nokta ekle — gyroscopeMagnitude backend'den gelen pre-computed değer
      setChartData((prev) => {
        const newPoint = {
          timestamp: payload.timestamp,
          accelerometer: { magnitude: payload.magnitude },
          gyroscopeMagnitude: payload.gyroscopeMagnitude ?? null,
          isFallDetected: false,
          isInactivity: false,
          deviceId: payload.deviceId,
        };
        const updated = [...prev, newPoint];
        return updated.length > MAX_LIVE_POINTS ? updated.slice(-MAX_LIVE_POINTS) : updated;
      });

      // Yeni bir cihaz görüldüyse dropdown listesine ekle
      setDevices((prev) =>
        prev.includes(payload.deviceId) ? prev : [...prev, payload.deviceId]
      );
    }

    socket?.on("fall_detected",   onFallDetected);
    socket?.on("alarm_resolved",  onAlarmResolved);
    socket?.on("emergency_alert", onEmergencyAlert);
    socket?.on("device_status",   onDeviceStatus);

    return () => {
      socket?.off("fall_detected",   onFallDetected);
      socket?.off("alarm_resolved",  onAlarmResolved);
      socket?.off("emergency_alert", onEmergencyAlert);
      socket?.off("device_status",   onDeviceStatus);
    };
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const unresolved = stats?.unresolvedAlarms ?? 0;

  // ── Alarm çözme ───────────────────────────────────────────────────────────
  async function handleResolve(alarmId) {
    try {
      await resolveAlarm(alarmId);
      // Sayfa yenilemeden yerel state'i güncelle
      setAlarms((prev) =>
        prev.map((a) =>
          String(a._id) === String(alarmId)
            ? { ...a, isResolved: true, resolvedAt: new Date().toISOString() }
            : a
        )
      );
      setStats((prev) =>
        prev
          ? { ...prev, unresolvedAlarms: Math.max(0, (prev.unresolvedAlarms ?? 1) - 1) }
          : prev
      );
    } catch (err) {
      console.error("[Dashboard] Alarm çözülemedi:", err.message);
    }
  }

  return (
    <PageLayout unreadAlarms={unresolved}>
      {/* Anlık düşme bildirimi */}
      <FallAlert alert={fallAlert} onDismiss={() => setFallAlert(null)} />

      {/* Sayfa başlığı */}
      <div className="mb-stack-lg">
        <h2 className="font-headline-lg text-headline-lg text-on-surface">
          Dashboard
        </h2>
        <p className="font-body-md text-body-md text-on-surface-variant mt-1">
          Sistemin anlık durumu ve son etkinlikler
        </p>
      </div>

      {loading ? (
        <LoadingSpinner text="Veriler yükleniyor..." />
      ) : (
        <>
          {/* İstatistik kartları */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-gutter mb-stack-lg">
            <StatCard
              icon="notifications_active"
              label="Toplam Alarm"
              value={stats?.totalAlarms ?? 0}
              sub="Tüm zamanlar"
              subIcon="history"
            />
            <StatCard
              icon="falling"
              label="Bugün Düşme"
              value={stats?.todayFalls ?? 0}
              sub="Bugün tespit edildi"
              subIcon="today"
            />
            <StatCard
              icon="sensors"
              label="Sensör Kaydı"
              value={stats?.totalSensorRecords ?? 0}
              sub="Toplam veri noktası"
              subIcon="database"
            />
          </div>

          {/* Alt iki kolon: Grafik + Alarmlar */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-gutter">
            {/* Grafik (2/3 genişlik) */}
            <div className="xl:col-span-2">
              <SensorChart
                data={chartData}
                chartMode={chartMode}
                onChartModeChange={handleChartModeChange}
                devices={devices}
                selectedDevice={selectedDevice}
                onDeviceChange={(dev) => setSelectedDevice(dev)}
              />
            </div>

            {/* Son Alarmlar (1/3 genişlik) */}
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/60 shadow-sm overflow-hidden flex flex-col">
              <div className="px-4 py-3 border-b border-outline-variant/60 flex justify-between items-center">
                <h3 className="font-headline-sm text-headline-sm text-on-surface">
                  Son Alarmlar
                </h3>
                <span className="font-label-md text-label-md text-on-surface-variant bg-surface-container px-2 py-0.5 rounded">
                  {alarms.length}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto">
                <RecentAlarms alarms={alarms} onResolve={handleResolve} />
              </div>
            </div>
          </div>
        </>
      )}
    </PageLayout>
  );
}
