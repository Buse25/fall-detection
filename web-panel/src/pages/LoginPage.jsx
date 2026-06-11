/**
 * LoginPage — Kullanıcı giriş sayfası
 * POST /api/auth/login → token alınır, AuthContext'e kaydedilir
 */
import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { login as loginApi } from "../api/auth";
import { useAuth } from "../context/AuthContext";
import { connectSocket } from "../socket/socket";

export default function LoginPage() {
  const { login, token } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Zaten giriş yapılmışsa dashboard'a yönlendir
  if (token) return <Navigate to="/dashboard" replace />;

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await loginApi(form.email, form.password);
      
      if (data.user?.role !== "admin") {
        throw new Error("forbidden");
      }
      
      login(data.user, data.token);
      // Socket bağlantısını kur
      connectSocket(data.token);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      const status = err.response?.status;
      const message = err.response?.data?.message;

      if (status === 403 || err.message === "forbidden") {
        // Admin kontrolünden geçemeyen kullanıcı — özel erişim reddi hatası
        setError({
          type: "forbidden",
          text: message || "Bu panele sadece sistem yöneticileri giriş yapabilir.",
        });
      } else {
        setError({
          type: "credentials",
          text: message || "Giriş başarısız. E-posta veya şifre hatalı.",
        });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Arka plan dekoratif gradyan */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-fixed/30 via-background to-surface-container pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo kartı */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-container mb-4 shadow-lg">
            <span className="material-symbols-outlined text-3xl text-on-primary-container">
              monitor_heart
            </span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-background">
            CatchMe
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            Klinik İzleme Paneli
          </p>
        </div>

        {/* Giriş formu */}
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-[0_24px_48px_-12px_rgba(0,74,198,0.12)] p-8">
          <h2 className="font-headline-sm text-headline-sm text-on-background mb-6">
            Hesabınıza Giriş Yapın
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* E-posta */}
            <div>
              <label
                htmlFor="login-email"
                className="block font-label-md text-label-md text-on-surface mb-1"
              >
                E-posta Adresi
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">
                  mail
                </span>
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={form.email}
                  onChange={handleChange}
                  placeholder="admin@gmail.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-surface border border-outline-variant rounded-lg font-body-md text-body-md text-on-surface focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-shadow"
                />
              </div>
            </div>

            {/* Şifre */}
            <div>
              <label
                htmlFor="login-password"
                className="block font-label-md text-label-md text-on-surface mb-1"
              >
                Şifre
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">
                  lock
                </span>
                <input
                  id="login-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-surface border border-outline-variant rounded-lg font-body-md text-body-md text-on-surface focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-shadow"
                />
              </div>
            </div>

            {/* Hata mesajı */}
            {error && (
              <div
                className={[
                  "rounded-lg p-4 border",
                  error.type === "forbidden"
                    ? "bg-error-container/50 border-error text-error"
                    : "bg-error-container/30 border-error-container text-error",
                ].join(" ")}
                role="alert"
              >
                {error.type === "forbidden" ? (
                  /* Erişim Reddi — belirgin uyarı */
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-lg">
                        gpp_bad
                      </span>
                      <p className="font-label-md text-label-md font-bold uppercase tracking-wide">
                        Erişim Reddedildi
                      </p>
                    </div>
                    <p className="font-body-sm text-body-sm">{error.text}</p>
                    <div className="flex items-center gap-1.5 bg-error/10 rounded-lg px-3 py-2 mt-1">
                      <span className="material-symbols-outlined text-sm">
                        info
                      </span>
                      <p className="font-body-sm text-body-sm">
                        Yetkili bir sistem yöneticisi hesabıyla giriş yapmanız
                        gerekmektedir.
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Yanlış kimlik bilgisi — normal hata */
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-sm mt-0.5">
                      error
                    </span>
                    <p className="font-body-sm text-body-sm">{error.text}</p>
                  </div>
                )}
              </div>
            )}

            {/* Giriş butonu */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-secondary text-on-primary font-label-md text-label-md py-3 rounded-lg transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
                  Giriş yapılıyor...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-base">login</span>
                  Giriş Yap
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center font-body-sm text-body-sm text-on-surface-variant mt-6">
          © 2026 CatchMe Platform
        </p>
      </div>
    </div>
  );
}
