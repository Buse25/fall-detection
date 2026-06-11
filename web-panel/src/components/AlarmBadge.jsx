/**
 * AlarmBadge — Alarm ciddiyet / durum rozeti
 * @param {{ severity?: string, isResolved?: boolean }} props
 */
export default function AlarmBadge({ severity, isResolved }) {
  // Çözülmüş ise yeşil rozet
  if (isResolved) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5" />
        Çözüldü
      </span>
    );
  }

  const map = {
    high: {
      bg: "bg-error-container",
      text: "text-on-error-container",
      dot: "bg-error",
      label: "Yüksek",
      pulse: true,
    },
    medium: {
      bg: "bg-orange-100",
      text: "text-orange-800",
      dot: "bg-orange-500",
      label: "Orta",
      pulse: false,
    },
    low: {
      bg: "bg-surface-container-high",
      text: "text-on-surface-variant",
      dot: "bg-outline",
      label: "Düşük",
      pulse: false,
    },
  };

  const style = map[severity?.toLowerCase()] ?? map.low;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${style.dot} mr-1.5 ${style.pulse ? "pulse-alarm" : ""}`}
      />
      {style.label}
    </span>
  );
}
