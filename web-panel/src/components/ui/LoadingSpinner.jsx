/**
 * LoadingSpinner — Yükleme göstergesi
 */
export default function LoadingSpinner({ size = "md", text = "Yükleniyor..." }) {
  const sizeClasses = { sm: "h-5 w-5", md: "h-8 w-8", lg: "h-12 w-12" };
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <div
        className={`${sizeClasses[size]} border-4 border-surface-container-high border-t-primary rounded-full animate-spin`}
      />
      {text && (
        <p className="font-body-sm text-body-sm text-on-surface-variant">{text}</p>
      )}
    </div>
  );
}
