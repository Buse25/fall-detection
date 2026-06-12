/**
 * FallAlert — Socket'ten gelen anlık düşme bildirimi (Toast)
 * Socket olayı: fall_detected { alarmId, fallScore, detectionMethod, countdownSec }
 *
 * @param {{ alert: object|null, onDismiss: function }} props
 */
import { useEffect, useState } from "react";

export default function FallAlert({ alert, onDismiss }) {
  const [countdown, setCountdown] = useState(null);

  useEffect(() => {
    if (!alert) return;
    // Geri sayım başlat
    setCountdown(alert.countdownSec ?? 10);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onDismiss?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [alert, onDismiss]);

  if (!alert) return null;

  return (
    <div
      className="fixed top-4 right-4 z-50 w-80 bg-surface-container-lowest border-2 border-error rounded-xl shadow-2xl p-4 slide-in"
      role="alert"
      aria-live="assertive"
    >
      {/* Başlık */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-error pulse-alarm inline-block" />
          <h4 className="font-headline-sm text-headline-sm text-error">
            ⚠ Düşme Tespit Edildi!
          </h4>
        </div>
        <button
          onClick={onDismiss}
          className="text-on-surface-variant hover:text-on-surface transition-colors"
          aria-label="Kapat"
        >
          <span className="material-symbols-outlined text-base">close</span>
        </button>
      </div>

      {/* Detaylar */}
      <div className="space-y-1 mb-3">
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          <span className="font-medium text-on-surface">Yöntem:</span>{" "}
          {alert.detectionMethod}
        </p>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          <span className="font-medium text-on-surface">Skor:</span>{" "}
          {typeof alert.fallScore === "number"
            ? `${(alert.fallScore * 100).toFixed(0)}%`
            : alert.fallScore}
        </p>
        <p className="font-data-mono text-data-mono text-on-surface-variant">
          Alarm ID: {String(alert.alarmId).slice(-8).toUpperCase()}
        </p>
      </div>

      {/* Geri sayım çubuğu */}
      {countdown !== null && (
        <div className="mt-2">
          <div className="flex justify-between mb-1">
            <span className="font-label-md text-label-md text-on-surface-variant">
              Otomatik kapanıyor
            </span>
            <span className="font-data-mono text-data-mono text-error">{countdown}s</span>
          </div>
          <div className="w-full h-1 bg-surface-container rounded-full overflow-hidden">
            <div
              className="h-full bg-error rounded-full transition-all duration-1000"
              style={{
                width: `${(countdown / (alert.countdownSec ?? 10)) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Aksiyon butonu */}
      <button
        onClick={onDismiss}
        className="mt-3 w-full bg-error text-on-error font-label-md text-label-md py-2 rounded-lg hover:opacity-90 transition-opacity"
      >
        Alarmı Gör
      </button>
    </div>
  );
}
