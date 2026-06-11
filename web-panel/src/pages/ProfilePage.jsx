/**
 * ProfilePage — Admin Profil & Ayarlar Sayfası
 * Tasarım: admin_profil_ayarlar_vigilantcare/code.html referans alındı
 *
 * API:
 *   GET   /api/auth/me   → formu doldur
 *   PATCH /api/auth/me   → kişisel bilgi güncelle (name)
 *
 * TODO: Şifre değiştirme için backend'e ayrı bir endpoint gerekiyor.
 *       Önerilen: PATCH /api/auth/change-password
 *       { currentPassword, newPassword } → bcrypt compare + hash + save
 *
 * TODO: Bildirim tercihleri backend'de saklanmıyor.
 *       Önerilen: User modeline notificationPrefs objesi eklenmesi.
 */
import { useState, useEffect } from "react";
import PageLayout from "../components/layout/PageLayout";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import { getMe, updateMe } from "../api/auth";
import { useAuth } from "../context/AuthContext";

/* ── Toggle bileşeni ─────────────────────────────────────────────────── */
function Toggle({ checked, onChange, id }) {
  return (
    <label htmlFor={id} className="relative inline-flex items-center cursor-pointer">
      <input
        id={id}
        type="checkbox"
        className="sr-only peer"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <div className="w-11 h-6 bg-surface-variant rounded-full peer
                      peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-fixed
                      peer-checked:after:translate-x-full peer-checked:after:border-white
                      after:content-[''] after:absolute after:top-[2px] after:left-[2px]
                      after:bg-white after:border-gray-300 after:border after:rounded-full
                      after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
    </label>
  );
}

/* ── Ana bileşen ─────────────────────────────────────────────────────── */
export default function ProfilePage() {
  const { setUser: setCtxUser } = useAuth();

  /* Veri state'leri */
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  /* Kişisel bilgi formu */
  const [profileForm, setProfileForm] = useState({ name: "" });
  const [nameSaving, setNameSaving] = useState(false);
  const [nameMsg, setNameMsg]       = useState(null); // { type:'success'|'error', text }

  /* Şifre formu */
  const [pwForm, setPwForm]     = useState({ current: "", next: "", confirm: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg]       = useState(null);

  /* Bildirim tercihleri (localStorage'da tutulur, TODO: backend) */
  const [notifs, setNotifs] = useState(() => {
    try {
      const stored = localStorage.getItem("vc_notifs");
      return stored
        ? JSON.parse(stored)
        : { fallEmail: true, deviceOffline: true, systemErrors: true };
    } catch {
      return { fallEmail: true, deviceOffline: true, systemErrors: true };
    }
  });

  /* ── Kullanıcı yükle ──────────────────────────────────────────────── */
  useEffect(() => {
    async function load() {
      try {
        const data = await getMe();
        setUser(data);
        setProfileForm({ name: data.name ?? "" });
      } catch (err) {
        console.error("[Profile] Yüklenemedi:", err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  /* Bildirim tercihlerini localStorage'a kaydet */
  useEffect(() => {
    localStorage.setItem("vc_notifs", JSON.stringify(notifs));
  }, [notifs]);

  /* ── Kişisel bilgi kaydet (tüm profil alanları tek PATCH) ────────── */
  async function handleNameSave(e) {
    e.preventDefault();
    setNameSaving(true);
    setNameMsg(null);
    try {
      const updated = await updateMe({ name: profileForm.name });
      setUser(updated);
      setCtxUser?.((prev) => ({ ...prev, name: updated.name }));
      setNameMsg({ type: "success", text: "Bilgiler başarıyla güncellendi." });
      setTimeout(() => setNameMsg(null), 4000);
    } catch (err) {
      setNameMsg({
        type: "error",
        text: err.response?.data?.message || "Güncelleme başarısız.",
      });
    } finally {
      setNameSaving(false);
    }
  }

  /* ── Şifre güncelle ───────────────────────────────────────────────── */
  async function handlePasswordSave(e) {
    e.preventDefault();
    setPwMsg(null);

    if (pwForm.next !== pwForm.confirm) {
      setPwMsg({ type: "error", text: "Yeni şifreler eşleşmiyor." });
      return;
    }
    if (pwForm.next.length < 6) {
      setPwMsg({ type: "error", text: "Şifre en az 6 karakter olmalıdır." });
      return;
    }

    setPwSaving(true);
    try {
      // PATCH /api/auth/me — currentPassword + password (yeni)
      // Backend: bcrypt.compare → bcrypt.hash → save
      await updateMe({
        currentPassword: pwForm.current,
        password:        pwForm.next,
      });
      setPwMsg({ type: "success", text: "Şifre başarıyla güncellendi." });
      setPwForm({ current: "", next: "", confirm: "" });
      setTimeout(() => setPwMsg(null), 5000);
    } catch (err) {
      setPwMsg({
        type: "error",
        text: err.response?.data?.message || "Şifre güncellenemedi.",
      });
    } finally {
      setPwSaving(false);
    }
  }

  /* ── Avatar baş harfleri ──────────────────────────────────────────── */
  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "AD";

  if (loading) {
    return (
      <PageLayout>
        <LoadingSpinner text="Profil yükleniyor..." />
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      {/* ── Başlık ──────────────────────────────────────────────────── */}
      <div className="mb-stack-lg">
        <h2 className="font-headline-lg text-headline-lg text-on-background">
          Profil Bilgileri
        </h2>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Sistem operatörü hesap detaylarını ve acil durum iletişim bilgilerini
          yönetin.
        </p>
      </div>

      {/* ── İki kolonlu grid ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter lg:gap-container-padding">

        {/* ════ SOL: Kimlik Kartı ══════════════════════════════════════ */}
        <div className="lg:col-span-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-[0_12px_24px_-8px_rgba(0,0,0,0.07)] flex flex-col items-center text-center relative overflow-hidden">

            {/* Gradyan aksanı */}
            <div className="absolute top-0 left-0 w-full h-28 bg-gradient-to-br from-primary-fixed to-surface-container opacity-60 z-0" />

            {/* Avatar */}
            <div className="relative z-10 mt-8 mb-4">
              <div className="w-24 h-24 rounded-full border-4 border-surface-container-lowest shadow-lg bg-gradient-to-br from-inverse-surface to-tertiary-container flex items-center justify-center overflow-hidden">
                {/* Hooded figure efekti — saf CSS */}
                <div className="relative w-full h-full flex flex-col items-center justify-end pb-1">
                  {/* Vücut */}
                  <div className="absolute bottom-0 w-20 h-14 bg-inverse-surface/90 rounded-t-full" />
                  {/* Baş */}
                  <div className="absolute top-3 w-11 h-11 rounded-full bg-inverse-surface flex items-center justify-center shadow-inner">
                    <span className="font-headline-sm text-headline-sm text-inverse-primary font-bold text-lg">
                      {initials}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative z-10 px-container-padding pb-container-padding w-full">
              {/* İsim & e-posta */}
              <h3 className="font-headline-md text-headline-md text-on-background">
                {user?.name ?? "—"}
              </h3>
              <p className="font-body-sm text-body-sm text-primary mb-3">
                {user?.email ?? "—"}
              </p>

              {/* Sistem Admini rozeti */}
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary-fixed/40 border border-primary-fixed-dim text-on-primary-fixed-variant font-label-md text-label-md mb-5">
                <span className="material-symbols-outlined text-[15px] mr-1">
                  admin_panel_settings
                </span>
                Sistem Admini
              </div>

              {/* Ayırıcı */}
              <div className="w-full border-t border-outline-variant pt-stack-md text-left">
                <h4 className="font-label-md text-label-md text-on-surface-variant mb-3 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px]">badge</span>
                  ÇALIŞAN BİLGİLERİ
                </h4>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-body-sm text-body-sm text-on-surface-variant">
                    Departman
                  </span>
                  <span className="font-data-mono text-data-mono text-on-background">
                    Teknik Yönetim
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-body-sm text-body-sm text-on-surface-variant">
                    Durum
                  </span>
                  <span className="font-data-mono text-data-mono text-green-600 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" />
                    Aktif
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ════ SAĞ: Formlar ══════════════════════════════════════════ */}
        <div className="lg:col-span-8 flex flex-col gap-gutter">

          {/* ─── Kart 1: Kişisel Bilgiler ─────────────────────────── */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-container-padding shadow-[0_12px_24px_-8px_rgba(0,0,0,0.04)]">
            <div className="flex justify-between items-center border-b border-outline-variant pb-stack-sm mb-stack-md">
              <h3 className="font-headline-sm text-headline-sm text-on-background">
                Kişisel Bilgileri Güncelle
              </h3>
              <span className="material-symbols-outlined text-on-surface-variant">
                edit
              </span>
            </div>

            {/* Mesaj */}
            {nameMsg && (
              <div
                className={`flex items-center gap-2 rounded-lg p-3 mb-4 border text-sm ${
                  nameMsg.type === "success"
                    ? "bg-green-50 border-green-200 text-green-700"
                    : "bg-error-container/30 border-error-container text-error"
                }`}
              >
                <span className="material-symbols-outlined text-sm">
                  {nameMsg.type === "success" ? "check_circle" : "error"}
                </span>
                {nameMsg.text}
              </div>
            )}

            <form onSubmit={handleNameSave} className="space-y-stack-md">
              {/* ─ Satır 1: Ad Soyad + E-posta ─────────────────────── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
                <div className="space-y-1">
                  <label
                    htmlFor="prof-name"
                    className="block font-label-md text-label-md text-on-surface"
                  >
                    Ad Soyad
                  </label>
                  <input
                    id="prof-name"
                    type="text"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))}
                    className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-2 font-body-md text-body-md text-on-surface focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-shadow"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-label-md text-label-md text-on-surface">
                    E-posta
                  </label>
                  <input
                    type="email"
                    disabled
                    value={user?.email ?? ""}
                    className="w-full bg-surface-container border border-outline-variant rounded-lg px-4 py-2 font-body-md text-body-md text-on-surface-variant cursor-not-allowed opacity-70"
                  />
                  <p className="font-body-sm text-body-sm text-primary text-xs">
                    E-posta adresi sistem yöneticisi tarafından değiştirilebilir.
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-stack-md border-t border-outline-variant mt-stack-md">
                <button
                  type="submit"
                  disabled={nameSaving}
                  className="bg-primary text-on-primary font-label-md text-label-md px-6 py-2.5 rounded-lg hover:bg-secondary transition-colors shadow-sm active:scale-95 disabled:opacity-60 flex items-center gap-2"
                >
                  {nameSaving && (
                    <div className="w-4 h-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
                  )}
                  Bilgileri Kaydet
                </button>
              </div>
            </form>
          </div>

          {/* ─── Kart 2: Şifre ve Güvenlik ────────────────────────── */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-container-padding shadow-[0_12px_24px_-8px_rgba(0,0,0,0.04)]">
            <div className="flex justify-between items-center border-b border-outline-variant pb-stack-sm mb-stack-md">
              <h3 className="font-headline-sm text-headline-sm text-on-background flex items-center gap-2">
                <span className="material-symbols-outlined text-on-surface-variant">
                  lock
                </span>
                Şifre ve Güvenlik
              </h3>
            </div>

            {/* Mesaj */}
            {pwMsg && (
              <div
                className={`flex items-start gap-2 rounded-lg p-3 mb-4 border text-sm ${
                  pwMsg.type === "success"
                    ? "bg-green-50 border-green-200 text-green-700"
                    : pwMsg.type === "warning"
                    ? "bg-orange-50 border-orange-200 text-orange-700"
                    : "bg-error-container/30 border-error-container text-error"
                }`}
              >
                <span className="material-symbols-outlined text-sm mt-0.5">
                  {pwMsg.type === "success"
                    ? "check_circle"
                    : pwMsg.type === "warning"
                    ? "info"
                    : "error"}
                </span>
                <span>{pwMsg.text}</span>
              </div>
            )}

            <form onSubmit={handlePasswordSave} className="space-y-stack-md">
              {/* Mevcut Şifre */}
              <div className="space-y-1">
                <label
                  htmlFor="pw-current"
                  className="block font-label-md text-label-md text-on-surface"
                >
                  Mevcut Şifre
                </label>
                <input
                  id="pw-current"
                  type="password"
                  placeholder="••••••••"
                  value={pwForm.current}
                  onChange={(e) =>
                    setPwForm((p) => ({ ...p, current: e.target.value }))
                  }
                  className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-2 font-body-md text-body-md text-on-surface focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-shadow"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
                {/* Yeni Şifre */}
                <div className="space-y-1">
                  <label
                    htmlFor="pw-new"
                    className="block font-label-md text-label-md text-on-surface"
                  >
                    Yeni Şifre
                  </label>
                  <input
                    id="pw-new"
                    type="password"
                    placeholder="••••••••"
                    value={pwForm.next}
                    onChange={(e) =>
                      setPwForm((p) => ({ ...p, next: e.target.value }))
                    }
                    className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-2 font-body-md text-body-md text-on-surface focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-shadow"
                  />
                </div>

                {/* Şifre Tekrar */}
                <div className="space-y-1">
                  <label
                    htmlFor="pw-confirm"
                    className="block font-label-md text-label-md text-on-surface"
                  >
                    Şifre Tekrar
                  </label>
                  <input
                    id="pw-confirm"
                    type="password"
                    placeholder="••••••••"
                    value={pwForm.confirm}
                    onChange={(e) =>
                      setPwForm((p) => ({ ...p, confirm: e.target.value }))
                    }
                    className={`w-full bg-surface border rounded-lg px-4 py-2 font-body-md text-body-md text-on-surface focus:ring-2 focus:ring-primary outline-none transition-shadow ${
                      pwForm.confirm && pwForm.next !== pwForm.confirm
                        ? "border-error focus:border-error"
                        : "border-outline-variant focus:border-primary"
                    }`}
                  />
                  {pwForm.confirm && pwForm.next !== pwForm.confirm && (
                    <p className="font-body-sm text-body-sm text-error text-xs">
                      Şifreler eşleşmiyor
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-stack-md border-t border-outline-variant mt-stack-md">
                <button
                  type="submit"
                  disabled={pwSaving || !pwForm.current || !pwForm.next || !pwForm.confirm}
                  className="bg-primary text-on-primary font-label-md text-label-md px-6 py-2.5 rounded-lg hover:bg-secondary transition-colors shadow-sm active:scale-95 disabled:opacity-60 flex items-center gap-2"
                >
                  {pwSaving && (
                    <div className="w-4 h-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
                  )}
                  Şifreyi Güncelle
                </button>
              </div>
            </form>
          </div>

          {/* ─── Kart 3: Admin Bildirim Tercihleri ────────────────── */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-container-padding shadow-[0_12px_24px_-8px_rgba(0,0,0,0.04)]">
            <div className="flex justify-between items-center border-b border-outline-variant pb-stack-sm mb-stack-md">
              <h3 className="font-headline-sm text-headline-sm text-on-background flex items-center gap-2">
                <span className="material-symbols-outlined text-on-surface-variant">
                  notifications_active
                </span>
                Admin Bildirim Tercihleri
              </h3>
            </div>

            {/* TODO: Bu tercihler şu an yalnızca localStorage'da tutuluyor.
                  Backend'e User modeline notificationPrefs objesi eklendiğinde
                  PATCH /api/auth/me ile kaydedilebilir. */}
            <div className="space-y-stack-md">
              {[
                {
                  key: "fallEmail",
                  label: "Kritik Düşme Alarmlarını E-posta ile Al",
                },
                {
                  key: "deviceOffline",
                  label: "Cihaz Bağlantı Kopukluğu (Çevrimdışı) Bildirimleri",
                },
                {
                  key: "systemErrors",
                  label: "Sistem Hata Raporları",
                },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between">
                  <h4 className="font-body-md text-body-md font-medium text-on-surface pr-4">
                    {label}
                  </h4>
                  <Toggle
                    id={`notif-${key}`}
                    checked={notifs[key]}
                    onChange={(val) =>
                      setNotifs((prev) => ({ ...prev, [key]: val }))
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
