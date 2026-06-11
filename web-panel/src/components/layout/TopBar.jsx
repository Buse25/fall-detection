/**
 * TopBar — Üst uygulama çubuğu
 * Tasarım: tüm sayfa tasarımlarının header bölümünden alındı.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { disconnectSocket } from "../../socket/socket";

export default function TopBar({ title, unreadAlarms = 0 }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
      {/* Sol: Mobil logo / Masaüstü arama */}
      <div className="flex items-center md:hidden">
        <button
          className="p-2 text-on-surface-variant"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Menü"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>
        <span className="font-headline-sm text-headline-sm font-bold text-primary ml-2">
          VigilantCare
        </span>
      </div>

      <div className="hidden md:flex flex-1 max-w-md items-center bg-surface-container-low rounded-full px-4 py-2 border border-outline-variant/50 focus-within:ring-2 focus-within:ring-primary focus-within:border-primary transition-all">
        <span className="material-symbols-outlined text-on-surface-variant mr-2 text-sm">
          search
        </span>
        <input
          className="bg-transparent border-none focus:ring-0 text-body-md font-body-md w-full text-on-surface placeholder-on-surface-variant/70 outline-none"
          placeholder="Search devices, alarms..."
          type="text"
        />
      </div>

      {/* Sağ: İkonlar + Avatar */}
      <div className="flex items-center space-x-1 ml-auto md:ml-4">
        {/* Bildirim butonu */}
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

        <button className="p-2 text-on-surface-variant hover:bg-surface-container-high rounded-full transition-colors hidden sm:block">
          <span className="material-symbols-outlined">help</span>
        </button>

        <button
          className="p-2 text-on-surface-variant hover:bg-surface-container-high rounded-full transition-colors"
          onClick={() => navigate("/profile")}
          aria-label="Profil ayarları"
        >
          <span className="material-symbols-outlined">settings</span>
        </button>

        {/* Kullanıcı avatarı */}
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
