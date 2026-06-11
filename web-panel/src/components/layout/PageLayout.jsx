/**
 * PageLayout — Sidebar + TopBar + içerik alanı sarmalayıcısı
 * Tüm korumalı sayfalar bu layout'u kullanır.
 */
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import Footer from "./Footer";

export default function PageLayout({ children, unreadAlarms = 0 }) {
  return (
    <div className="bg-background text-on-background antialiased flex h-screen overflow-hidden">
      {/* Sol navigasyon (sabit, masaüstü) */}
      <Sidebar />

      {/* Sağ: TopBar + sayfa içeriği + footer */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar unreadAlarms={unreadAlarms} />

        {/* Kaydırılabilir içerik alanı */}
        <main className="flex-1 overflow-y-auto p-container-padding bg-surface-bright">
          <div className="max-w-[1200px] mx-auto">
            {children}
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}
