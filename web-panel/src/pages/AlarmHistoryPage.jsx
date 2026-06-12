/**
 * AlarmHistoryPage — Alarm geçmişi sayfası
 * Tasarım: alarm_ge_mi_i_vigilantcare/code.html'den dönüştürüldü
 *
 * API:
 *   GET   /api/alarms?severity=&isResolved=&startDate=  → liste
 *   PATCH /api/alarms/:id/resolve                        → çözüme işaretle
 */
import { useState, useEffect, useCallback } from "react";
import PageLayout from "../components/layout/PageLayout";
import AlarmBadge from "../components/AlarmBadge";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import { getAlarms } from "../api/alarms";

const ALARM_TYPE_MAP = {
  fall:       { icon: "falling",              label: "Düşme",          color: "text-error" },
  inactivity: { icon: "motion_sensor_idle",   label: "Hareketsizlik",  color: "text-orange-500" },
  battery:    { icon: "battery_alert",        label: "Düşük Batarya",  color: "text-tertiary" },
  default:    { icon: "warning",              label: "Alarm",          color: "text-on-surface-variant" },
};

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const PAGE_SIZE = 10;

const EMPTY_FILTERS = { alarmType: "", severity: "", isResolved: "", startDate: "" };

export default function AlarmHistoryPage() {
  const [alarms, setAlarms]   = useState([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(true);

  // Filtreler
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [applied, setApplied] = useState(EMPTY_FILTERS);

  const loadAlarms = useCallback(async (currentPage, currentFilters) => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        limit: PAGE_SIZE,
        ...(currentFilters.alarmType  && { alarmType: currentFilters.alarmType }),
        ...(currentFilters.severity   && { severity: currentFilters.severity }),
        ...(currentFilters.isResolved !== "" && { isResolved: currentFilters.isResolved }),
        ...(currentFilters.startDate  && { startDate: currentFilters.startDate }),
      };
      const result = await getAlarms(params);
      setAlarms(result.data ?? []);
      setTotal(result.count ?? 0);
    } catch (err) {
      console.error("[AlarmHistory] Yüklenemedi:", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAlarms(page, applied);
  }, [page, applied, loadAlarms]);

  function handleApplyFilters() {
    setPage(1);
    setApplied({ ...filters });
  }

  function handleClearFilters() {
    setFilters(EMPTY_FILTERS);
    setApplied(EMPTY_FILTERS);
    setPage(1);
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <PageLayout>
      {/* Başlık */}
      <div className="mb-stack-lg">
        <h2 className="font-headline-lg text-headline-lg text-on-surface">
          Alarm Geçmişi
        </h2>
        <p className="font-body-md text-body-md text-on-surface-variant mt-1">
          Geçmiş klinik uyarıları ve sistem bildirimlerini inceleyin.
        </p>
      </div>

      {/* Filtre Alanı */}
      <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-gutter shadow-sm mb-stack-md">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-gutter items-end">
          {/* Alarm Tipi */}
          <div className="flex flex-col gap-base">
            <label className="font-label-md text-label-md text-on-surface-variant">
              Alarm Tipi
            </label>
            <select
              value={filters.alarmType}
              onChange={(e) => setFilters((p) => ({ ...p, alarmType: e.target.value }))}
              className="border border-outline-variant rounded-lg px-3 py-2 text-body-sm font-body-sm focus:ring-2 focus:ring-primary outline-none bg-surface"
            >
              <option value="">Tümü</option>
              <option value="fall">Düşme</option>
              <option value="inactivity">Hareketsizlik</option>
              <option value="battery">Düşük Batarya</option>
            </select>
          </div>

          {/* Tarih */}
          <div className="flex flex-col gap-base">
            <label className="font-label-md text-label-md text-on-surface-variant">
              Başlangıç Tarihi
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters((p) => ({ ...p, startDate: e.target.value }))}
              className="border border-outline-variant rounded-lg px-3 py-2 text-body-sm font-body-sm focus:ring-2 focus:ring-primary outline-none bg-surface"
            />
          </div>

          {/* Önem Derecesi */}
          <div className="flex flex-col gap-base">
            <label className="font-label-md text-label-md text-on-surface-variant">
              Önem Derecesi
            </label>
            <select
              value={filters.severity}
              onChange={(e) => setFilters((p) => ({ ...p, severity: e.target.value }))}
              className="border border-outline-variant rounded-lg px-3 py-2 text-body-sm font-body-sm focus:ring-2 focus:ring-primary outline-none bg-surface"
            >
              <option value="">Tümü</option>
              <option value="high">Yüksek (High)</option>
              <option value="medium">Orta (Medium)</option>
              <option value="low">Düşük (Low)</option>
            </select>
          </div>

          {/* Durum */}
          <div className="flex flex-col gap-base">
            <label className="font-label-md text-label-md text-on-surface-variant">
              Durum
            </label>
            <select
              value={filters.isResolved}
              onChange={(e) => setFilters((p) => ({ ...p, isResolved: e.target.value }))}
              className="border border-outline-variant rounded-lg px-3 py-2 text-body-sm font-body-sm focus:ring-2 focus:ring-primary outline-none bg-surface"
            >
              <option value="">Tümü</option>
              <option value="false">Bekliyor</option>
              <option value="true">Çözüldü</option>
            </select>
          </div>

          {/* Butonlar */}
          <div className="flex gap-2 items-end">
            <button
              onClick={handleApplyFilters}
              className="flex-1 bg-primary text-on-primary font-label-md text-label-md px-4 py-2 rounded-lg hover:bg-secondary transition-colors"
            >
              Filtrele
            </button>
            <button
              onClick={handleClearFilters}
              className="flex-1 bg-surface-container-high text-on-surface font-label-md text-label-md px-4 py-2 rounded-lg hover:bg-surface-variant transition-colors"
            >
              Temizle
            </button>
          </div>
        </div>
      </div>

      {/* Tablo Kartı */}
      <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl shadow-sm overflow-hidden">
        {/* Tablo başlığı */}
        <div className="px-gutter py-3 border-b border-outline-variant/60 bg-surface-bright flex justify-between items-center">
          <h3 className="font-headline-sm text-headline-sm text-on-surface">
            Alarmlar
          </h3>
          <span className="font-label-md text-label-md text-on-surface-variant bg-surface-container py-1 px-2 rounded">
            Toplam: {total}
          </span>
        </div>

        {loading ? (
          <LoadingSpinner text="Alarmlar yükleniyor..." />
        ) : alarms.length === 0 ? (
          <div className="py-16 text-center">
            <span className="material-symbols-outlined text-5xl text-on-surface-variant opacity-30">
              notifications_off
            </span>
            <p className="font-body-md text-body-md text-on-surface-variant mt-3">
              Filtreyle eşleşen alarm bulunamadı
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant/60">
                  <th className="p-stack-md font-label-md text-label-md text-on-surface-variant whitespace-nowrap">
                    ID
                  </th>
                  <th className="p-stack-md font-label-md text-label-md text-on-surface-variant whitespace-nowrap">
                    Tarih / Saat
                  </th>
                  <th className="p-stack-md font-label-md text-label-md text-on-surface-variant whitespace-nowrap">
                    Tip
                  </th>
                  <th className="p-stack-md font-label-md text-label-md text-on-surface-variant whitespace-nowrap">
                    Önem Derecesi
                  </th>
                  <th className="p-stack-md font-label-md text-label-md text-on-surface-variant whitespace-nowrap">
                    Durum
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40">
                {alarms.map((alarm) => {
                  const typeInfo =
                    ALARM_TYPE_MAP[alarm.alarmType] ?? ALARM_TYPE_MAP.default;
                  return (
                    <tr
                      key={alarm._id}
                      className={`hover:bg-surface-container-low/50 transition-colors ${
                        alarm.isResolved ? "opacity-60" : ""
                      }`}
                    >
                      <td className="p-stack-md font-data-mono text-data-mono text-on-surface">
                        #{String(alarm._id).slice(-8).toUpperCase()}
                      </td>
                      <td className="p-stack-md font-body-sm text-body-sm text-on-surface-variant whitespace-nowrap">
                        {formatDate(alarm.createdAt)}
                      </td>
                      <td className="p-stack-md font-body-sm text-body-sm text-on-surface">
                        <div className="flex items-center gap-2">
                          <span
                            className={`material-symbols-outlined text-lg ${typeInfo.color}`}
                          >
                            {typeInfo.icon}
                          </span>
                          <span>{typeInfo.label}</span>
                        </div>
                      </td>
                      <td className="p-stack-md">
                        <AlarmBadge severity={alarm.severity} />
                      </td>
                      <td className="p-stack-md font-body-sm text-body-sm">
                        {alarm.isResolved ? (
                          <span className="text-green-600 font-medium">Çözüldü</span>
                        ) : (
                          <span className="text-on-surface-variant">Bekliyor</span>
                        )}
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
          <div className="px-gutter py-3 border-t border-outline-variant/60 bg-surface-bright flex justify-between items-center">
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              {(page - 1) * PAGE_SIZE + 1}–
              {Math.min(page * PAGE_SIZE, total)} / Toplam: {total}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded hover:bg-surface-variant disabled:opacity-40 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">chevron_left</span>
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum =
                  totalPages <= 5
                    ? i + 1
                    : page <= 3
                    ? i + 1
                    : page >= totalPages - 2
                    ? totalPages - 4 + i
                    : page - 2 + i;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`px-2.5 py-1 rounded font-label-md text-label-md transition-colors ${
                      page === pageNum
                        ? "bg-primary text-on-primary"
                        : "hover:bg-surface-variant text-on-surface-variant"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded hover:bg-surface-variant disabled:opacity-40 transition-colors"
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
