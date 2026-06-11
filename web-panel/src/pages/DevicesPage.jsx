/**
 * DevicesPage — Cihaz Yönetimi sayfası
 * Tasarım: cihaz_y_netimi_vigilantcare/code.html'den dönüştürüldü
 *
 * TODO: GET /api/devices endpoint'i backend'de henüz uygulanmamış (device.routes.js boş).
 *       Geçici çözüm: Sensör verisindeki benzersiz deviceId'ler listeleniyor.
 *       Backend hazır olduğunda bu sayfayı şu şekilde güncelleyin:
 *         import { getDevices } from "../api/devices";
 *         ve useEffect içinde loadDevices() fonksiyonunu çağırın.
 *
 * Mevcut veri kaynağı:
 *   GET /api/sensor-data → benzersiz deviceId + son kayıt zamanı çıkarılır
 *   GET /api/sensor-data/latest → istatistik kartları için
 */
import { useState, useEffect, useCallback } from "react";
import PageLayout from "../components/layout/PageLayout";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import { fetchDevices } from "../api/panel";



function formatRelativeTime(dateStr) {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Şimdi";
  if (mins < 60) return `${mins} dk önce`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} saat önce`;
  return `${Math.floor(hrs / 24)} gün önce`;
}

function isOnline(dateStr) {
  if (!dateStr) return false;
  return Date.now() - new Date(dateStr).getTime() < 5 * 60 * 1000; // 5 dk
}

const PAGE_SIZE = 10;

export default function DevicesPage() {
  const [devices, setDevices]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [page, setPage]         = useState(1);

  const loadDevices = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchDevices();
      setDevices(result || []);
    } catch (err) {
      console.error("[Devices] Yüklenemedi:", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  const filtered = devices.filter((d) =>
    d.deviceId.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const onlineCount  = devices.filter((d) => isOnline(d.lastSeen)).length;
  const offlineCount = devices.length - onlineCount;

  return (
    <PageLayout>
      {/* Başlık */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-stack-lg gap-4">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">
            Cihaz Yönetimi
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            Sisteme bağlı sensör cihazlarını izleyin.
          </p>
          {/* TODO: Yeni cihaz ekleme (POST /api/devices gerekli) */}
        </div>
        {/* TODO: "Yeni Cihaz Ekle" butonu — POST /api/devices endpoint'i hazır olduğunda aktifleştirin */}
        <button
          disabled
          title="Bu özellik yakında eklenecek (backend endpoint bekliyor)"
          className="bg-primary/40 text-on-primary px-6 py-2.5 rounded-lg font-label-md text-label-md flex items-center shadow-sm cursor-not-allowed opacity-60"
        >
          <span className="material-symbols-outlined mr-2 text-sm">add</span>
          Yeni Cihaz Ekle
        </button>
      </div>

      {/* İstatistik Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter mb-stack-lg">
        <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/60 shadow-sm relative overflow-hidden hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <span className="material-symbols-outlined text-[64px]">sensors</span>
          </div>
          <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider mb-2">
            Toplam Cihaz
          </p>
          <p className="font-headline-lg text-headline-lg text-on-surface">
            {loading ? "—" : devices.length}
          </p>
          <p className="font-body-sm text-body-sm text-primary mt-2 flex items-center">
            <span className="material-symbols-outlined text-sm mr-1">sensors</span>
            Sensör kaynaklı
          </p>
        </div>
        <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/60 shadow-sm relative overflow-hidden hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <span className="material-symbols-outlined text-[64px]">wifi</span>
          </div>
          <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider mb-2">
            Çevrimiçi
          </p>
          <p className="font-headline-lg text-headline-lg text-on-surface">
            {loading ? "—" : onlineCount}
          </p>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-2">
            Son 5 dk içinde aktif
          </p>
        </div>
        <div className="bg-error-container/20 p-6 rounded-xl border border-error-container shadow-sm relative overflow-hidden hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-error">
            <span className="material-symbols-outlined text-[64px]">wifi_off</span>
          </div>
          <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider mb-2">
            Çevrimdışı / Dikkat
          </p>
          <p className="font-headline-lg text-headline-lg text-error">
            {loading ? "—" : offlineCount}
          </p>
          {offlineCount > 0 && (
            <p className="font-body-sm text-body-sm text-error mt-2 flex items-center font-medium">
              <span className="material-symbols-outlined text-sm mr-1">warning</span>
              Kontrol gerekli
            </p>
          )}
        </div>
      </div>

      {/* Cihaz Tablosu */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/60 shadow-sm overflow-hidden">
        {/* Araç çubuğu */}
        <div className="p-4 border-b border-outline-variant/60 flex gap-3 bg-surface-container-low/50">
          <div className="relative flex-1 max-w-xs">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Cihaz ID ara..."
              className="w-full pl-9 pr-4 py-1.5 bg-surface-bright border border-outline-variant rounded-md text-body-sm font-body-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none"
            />
          </div>
          <button
            onClick={loadDevices}
            className="p-1.5 text-on-surface-variant border border-outline-variant rounded-md hover:bg-surface-variant transition-colors bg-surface-bright"
            title="Yenile"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
          </button>
        </div>

        {loading ? (
          <LoadingSpinner text="Cihazlar yükleniyor..." />
        ) : paginated.length === 0 ? (
          <div className="py-16 text-center">
            <span className="material-symbols-outlined text-5xl text-on-surface-variant opacity-30">
              devices
            </span>
            <p className="font-body-md text-body-md text-on-surface-variant mt-3">
              {search ? "Aramayla eşleşen cihaz yok" : "Henüz kayıtlı cihaz yok"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container border-b border-outline-variant/60">
                  <th className="py-3 px-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider whitespace-nowrap">
                    Cihaz ID
                  </th>
                  <th className="py-3 px-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider whitespace-nowrap">
                    Durum
                  </th>
                  <th className="py-3 px-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider whitespace-nowrap">
                    Son Magnitude
                  </th>
                  <th className="py-3 px-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider whitespace-nowrap">
                    Düşme Sayısı
                  </th>
                  <th className="py-3 px-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider whitespace-nowrap">
                    Son Görülme
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40">
                {paginated.map((device) => {
                  const online = isOnline(device.lastSeen);
                  return (
                    <tr
                      key={device.deviceId}
                      className={`hover:bg-surface-container-low/50 transition-colors ${
                        !online ? "bg-error-container/5" : ""
                      }`}
                    >
                      <td className="py-4 px-4 font-data-mono text-data-mono text-on-surface font-medium">
                        {device.deviceId}
                      </td>
                      <td className="py-4 px-4">
                        {online ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse" />
                            Online
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-surface-variant text-on-surface-variant border border-outline-variant">
                            <span className="w-1.5 h-1.5 rounded-full bg-outline mr-1.5" />
                            Offline
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-data-mono text-data-mono text-on-surface w-12">
                            {device.magnitude.toFixed(2)}G
                          </span>
                          <div className="w-16 h-1.5 bg-surface-variant rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                device.magnitude > 2.5 ? "bg-error" : "bg-primary"
                              }`}
                              style={{
                                width: `${Math.min(100, (device.magnitude / 5) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`font-data-mono text-data-mono ${
                            device.fallCount > 0 ? "text-error font-bold" : "text-on-surface"
                          }`}
                        >
                          {device.fallCount}
                        </span>
                      </td>
                      <td
                        className={`py-4 px-4 font-body-sm text-body-sm ${
                          !online ? "text-error font-medium" : "text-on-surface-variant"
                        }`}
                      >
                        {formatRelativeTime(device.lastSeen)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Sayfalama */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-outline-variant/60 bg-surface-container-low/30 flex justify-between items-center">
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              Gösterilen: {(page - 1) * PAGE_SIZE + 1}–
              {Math.min(page * PAGE_SIZE, filtered.length)} / Toplam: {filtered.length}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1 rounded hover:bg-surface-variant disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-sm">chevron_left</span>
              </button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setPage(i + 1)}
                  className={`px-2 py-1 rounded font-label-md text-label-md ${
                    page === i + 1
                      ? "bg-primary text-on-primary"
                      : "hover:bg-surface-variant text-on-surface-variant"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1 rounded hover:bg-surface-variant disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-sm">chevron_right</span>
              </button>
            </div>
          </div>
        )}
      </div>


    </PageLayout>
  );
}
