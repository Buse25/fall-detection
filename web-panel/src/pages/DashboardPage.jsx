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
import { useState, useEffect, useCallback } from "react";
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
  const [hours, setHours]           = useState(1);
  const [devices, setDevices]       = useState([]);
  const [selectedDevice, setSelectedDevice] = useState("");
  const [loading, setLoading]       = useState(true);
  const [fallAlert, setFallAlert]   = useState(null); // anlık socket bildirimi

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

  useEffect(() => {
    loadChart(hours, selectedDevice);
  }, [hours, selectedDevice, loadChart]);

  // ── Socket bağlantısı ve olay dinleme ─────────────────────────────────────
  useEffect(() => {
    if (!token) return;

    // Bağlantı yoksa kur
    let socket = getSocket();
    if (!socket?.connected) {
      socket = connectSocket(token);
    }

    function onFallDetected(payload) {
      setFallAlert(payload);
      // İstatistikleri güncelle
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
      // En son alarmı listeye ekle (geçici, tam veri yüklenene kadar)
      setAlarms((prev) => [
        {
          _id: payload.alarmId,
          alarmType: "fall",
          severity: "high",
          message: `Fall detected by ${payload.detectionMethod}`,
          isResolved: false,
          createdAt: new Date().toISOString(),
        },
        ...prev.slice(0, 9), // maksimum 10 kayıt
      ]);
    }

    socket?.on("fall_detected", onFallDetected);
    return () => {
      socket?.off("fall_detected", onFallDetected);
    };
  }, [token]);

  // ── Alarm çözüme işaretleme ───────────────────────────────────────────────
  async function handleResolve(id) {
    try {
      await resolveAlarm(id);
      setAlarms((prev) =>
        prev.map((a) => (a._id === id ? { ...a, isResolved: true } : a))
      );
      setStats((prev) =>
        prev
          ? { ...prev, unresolvedAlarms: Math.max(0, (prev.unresolvedAlarms ?? 1) - 1) }
          : prev
      );
    } catch (err) {
      console.error("[Dashboard] Alarm çözüme işaretlenemedi:", err.message);
    }
  }

  const unresolved = stats?.unresolvedAlarms ?? 0;

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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter mb-stack-lg">
            <StatCard
              icon="notifications_active"
              label="Toplam Alarm"
              value={stats?.totalAlarms ?? 0}
              sub="Tüm zamanlar"
              subIcon="history"
            />
            <StatCard
              icon="warning"
              label="Çözülmemiş"
              value={stats?.unresolvedAlarms ?? 0}
              sub={stats?.unresolvedAlarms > 0 ? "Dikkat gerekiyor" : "Temiz"}
              subIcon={stats?.unresolvedAlarms > 0 ? "warning" : "check_circle"}
              variant={stats?.unresolvedAlarms > 0 ? "error" : "default"}
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
                hours={hours}
                onHoursChange={(h) => setHours(h)}
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
