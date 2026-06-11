/**
 * RecentAlarms — Son alarmlar listesi (Dashboard'da kullanılır)
 * @param {{ alarms: Array, onResolve?: function }} props
 */
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
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function RecentAlarms({ alarms = [], onResolve }) {
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

  return (
    <ul className="divide-y divide-outline-variant/40">
      {alarms.map((alarm) => {
        const typeInfo = ALARM_TYPE_MAP[alarm.alarmType] ?? ALARM_TYPE_MAP.default;
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

            {/* Sağ: rozet + buton */}
            <div className="flex items-center gap-2 ml-3 flex-shrink-0">
              <AlarmBadge severity={alarm.severity} isResolved={alarm.isResolved} />
              {!alarm.isResolved && onResolve && (
                <button
                  onClick={() => onResolve(alarm._id)}
                  className="text-primary hover:text-secondary font-label-md text-label-md transition-colors whitespace-nowrap"
                >
                  Çöz
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
