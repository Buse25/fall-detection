/**
 * TopBar — Üst uygulama çubuğu
 * Tasarım: tüm sayfa tasarımlarının header bölümünden alındı.
 */
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { disconnectSocket } from "../../socket/socket";

export default function TopBar({ title, unreadAlarms = 0 }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    disconnectSocket();
    logout();
    navigate("/login");
  }

  // Kullanıcı adının baş harfleri (avatar fallback)
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <header className="flex justify-between items-center w-full px-gutter h-16 bg-surface-container-lowest border-b border-outline-variant shadow-sm flex-shrink-0 z-10 sticky top-0">
      {/* Sol: Mobil logo */}
      <div className="flex items-center md:hidden">
        <span className="font-headline-sm text-headline-sm font-bold text-primary">
          VigilantCare
        </span>
      </div>

      {/* Sağ: Bildirim + Ayarlar + Avatar */}
      <div className="flex items-center space-x-1 ml-auto">
        <button
          className="relative p-2 text-on-surface-variant hover:bg-surface-container-high rounded-full transition-colors"
          onClick={() => navigate("/alarms")}
          aria-label="Alarmlar"
        >
          <span className="material-symbols-outlined">notifications</span>
          {unreadAlarms > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full" />
          )}
        </button>

        <button
          className="p-2 text-on-surface-variant hover:bg-surface-container-high rounded-full transition-colors"
          onClick={() => navigate("/profile")}
          aria-label="Profil ayarları"
        >
          <span className="material-symbols-outlined">settings</span>
        </button>

        <div
          className="h-8 w-8 ml-2 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container font-label-md text-label-md cursor-pointer select-none"
          onClick={() => navigate("/profile")}
          title={user?.name}
        >
          {initials}
        </div>
      </div>
    </header>
  );
}
