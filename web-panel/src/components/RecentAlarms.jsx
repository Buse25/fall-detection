/**
 * RecentAlarms — Son alarmlar listesi (Dashboard'da kullanılır)
 * @param {{ alarms: Array, onResolve?: function }} props
 */
import { useState } from "react";
import AlarmBadge from "./AlarmBadge";

const ALARM_TYPE_MAP = {
  fall:     { icon: "falling",             label: "Düşme",          color: "text-error" },
  inactivity: { icon: "motion_sensor_idle", label: "Hareketsizlik", color: "text-orange-500" },
  battery:  { icon: "battery_alert",       label: "Düşük Batarya",  color: "text-tertiary" },
  default:  { icon: "warning",             label: "Alarm",          color: "text-on-surface-variant" },
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

export default function RecentAlarms({ alarms = [], onResolve }) {
  // Hangi alarm ID'si şu an API isteğinde — çift tıklamayı önler
  const [resolvingId, setResolvingId] = useState(null);
  if (alarms.length === 0) {
    return (
      <div className="py-10 text-center">
        <span className="material-symbols-outlined text-4xl text-on-surface-variant opacity-40">
          notifications_off
        </span>
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-2">
          Henüz alarm yok
        </p>
      </div>
    );
  }

  async function handleClick(alarmId) {
    if (resolvingId || !onResolve) return;
    setResolvingId(alarmId);
    try {
      await onResolve(alarmId);
    } finally {
      setResolvingId(null);
    }
  }

  return (
    <ul className="divide-y divide-outline-variant/40">
      {alarms.map((alarm) => {
        const typeInfo = ALARM_TYPE_MAP[alarm.alarmType] ?? ALARM_TYPE_MAP.default;
        const isLoading = resolvingId === String(alarm._id);
        return (
          <li
            key={alarm._id}
            className={`flex items-center justify-between py-3 px-4 hover:bg-surface-container-low/50 transition-colors ${
              alarm.isResolved ? "opacity-60" : ""
            }`}
          >
            {/* Sol: ikon + bilgi */}
            <div className="flex items-center gap-3 min-w-0">
              <span className={`material-symbols-outlined ${typeInfo.color}`}>
                {typeInfo.icon}
              </span>
              <div className="min-w-0">
                <p className="font-body-sm text-body-sm text-on-surface font-medium truncate">
                  {alarm.message || typeInfo.label}
                </p>
                <p className="font-label-md text-label-md text-on-surface-variant">
                  {formatDate(alarm.createdAt)}
                </p>
              </div>
            </div>

            {/* Sağ: çözüldü göstergesi veya resolve butonu */}
            <div className="flex items-center gap-2 ml-3 flex-shrink-0">
              {alarm.isResolved ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-label-md text-label-md select-none">
                  <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
                    check_circle
                  </span>
                  Çözüldü
                </span>
              ) : (
                <button
                  onClick={() => handleClick(String(alarm._id))}
                  disabled={!!resolvingId}
                  title="Alarmı çözüldü olarak işaretle"
                  className="flex items-center justify-center w-8 h-8 rounded-full text-on-surface-variant hover:text-green-600 hover:bg-green-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150"
                >
                  <span
                    className={`material-symbols-outlined text-xl ${
                      isLoading ? "animate-spin" : ""
                    }`}
                    style={isLoading ? {} : { fontVariationSettings: "'FILL' 0" }}
                  >
                    {isLoading ? "progress_activity" : "check_circle"}
                  </span>
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
