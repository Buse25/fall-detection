/**
 * Sidebar — Sol navigasyon (masaüstü)
 * Tasarım: cihaz_y_netimi ve alarm_ge_mi_i sayfalarından alındı.
 */
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { disconnectSocket } from "../../socket/socket";

const navItems = [
  { to: "/dashboard", icon: "dashboard",   label: "Kontrol Paneli" },
  { to: "/devices",   icon: "devices",     label: "Cihaz Yönetimi" },
  { to: "/alarms",    icon: "history",     label: "Alarm Geçmişi" },
  { to: "/profile",   icon: "person",      label: "Profil" },
];

export default function Sidebar() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    disconnectSocket();
    logout();
    navigate("/login");
  }

  return (
    <nav className="hidden md:flex flex-col h-screen w-64 flex-shrink-0 bg-surface border-r border-outline-variant py-gutter px-base z-20">
      {/* Başlık */}
      <div className="flex items-center px-gutter py-stack-md mb-stack-lg">
        <div className="w-8 h-8 rounded bg-primary-container flex items-center justify-center mr-stack-sm text-on-primary-container overflow-hidden">
          <img src="/icon.png" alt="CatchMe Logo" className="w-full h-full object-cover" />
        </div>
        <div>
          <h1 className="font-headline-sm text-headline-sm font-bold text-primary leading-tight">
            CatchMe
          </h1>
          <p className="font-label-md text-label-md text-on-surface-variant">
            Fall Detection System
          </p>
        </div>
      </div>

      {/* Navigasyon Linkleri */}
      <div className="flex-1 flex flex-col gap-base w-full">
        {navItems.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              [
                "flex items-center px-gutter py-stack-sm rounded-lg transition-all duration-200 group",
                isActive
                  ? "text-primary font-bold border-r-4 border-primary bg-secondary-fixed/10 scale-[0.98]"
                  : "text-on-surface-variant hover:text-primary hover:bg-surface-container-high",
              ].join(" ")
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`material-symbols-outlined mr-stack-sm ${isActive ? "text-primary" : "group-hover:text-primary"}`}
                  style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
                >
                  {icon}
                </span>
                <span className="font-label-md text-label-md">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>

      {/* Kullanıcı Bilgisi + Çıkış */}
      <div className="mt-auto flex flex-col gap-base w-full pt-stack-md border-t border-outline-variant">
        {user && (
          <div className="px-gutter py-stack-sm">
            <p className="font-label-md text-label-md text-on-surface-variant truncate">
              {user.name}
            </p>
            <p className="font-body-sm text-body-sm text-on-surface-variant truncate opacity-70">
              {user.email}
            </p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center px-gutter py-stack-sm rounded-lg text-on-surface-variant hover:text-error hover:bg-error-container/20 transition-colors duration-200 group w-full text-left"
        >
          <span className="material-symbols-outlined mr-stack-sm group-hover:text-error">
            logout
          </span>
          <span className="font-label-md text-label-md">Çıkış Yap</span>
        </button>
      </div>
    </nav>
  );
}
