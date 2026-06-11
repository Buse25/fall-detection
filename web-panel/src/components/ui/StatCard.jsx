/**
 * StatCard — Dashboard istatistik kartı
 * @param {{ icon, label, value, sub, subIcon, variant }} props
 * variant: 'default' | 'error'
 */
export default function StatCard({ icon, label, value, sub, subIcon, variant = "default" }) {
  const isError = variant === "error";

  return (
    <div
      className={[
        "relative overflow-hidden rounded-xl border p-6 shadow-sm hover:shadow-md transition-shadow group",
        isError
          ? "bg-error-container/20 border-error-container"
          : "bg-surface-container-lowest border-outline-variant/60",
      ].join(" ")}
    >
      {/* Arka plan ikon (dekoratif) */}
      <div className={`absolute top-0 right-0 p-4 opacity-10 ${isError ? "text-error" : ""}`}>
        <span className="material-symbols-outlined text-[64px]">{icon}</span>
      </div>

      <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider mb-2">
        {label}
      </p>
      <p
        className={`font-headline-lg text-headline-lg ${isError ? "text-error" : "text-on-surface"}`}
      >
        {value ?? "—"}
      </p>
      {sub && (
        <p
          className={`font-body-sm text-body-sm mt-2 flex items-center ${
            isError ? "text-error font-medium" : "text-primary"
          }`}
        >
          {subIcon && (
            <span className="material-symbols-outlined text-sm mr-1">{subIcon}</span>
          )}
          {sub}
        </p>
      )}
    </div>
  );
}
