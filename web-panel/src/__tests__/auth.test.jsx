import React from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";
import { AuthProvider } from "../context/AuthContext";
import { login as loginApi } from "../api/auth";
import { connectSocket } from "../socket/socket";

vi.mock("../api/auth", () => ({
  login: vi.fn(),
}));

vi.mock("../api/panel", () => ({
  fetchStats: vi.fn(() =>
    Promise.resolve({
      totalAlarms: 0,
      unresolvedAlarms: 0,
      todayFalls: 0,
      totalSensorRecords: 0,
    })
  ),
  fetchRecentAlarms: vi.fn(() => Promise.resolve([])),
  fetchDevices: vi.fn(() => Promise.resolve([])),
  fetchSensorChart: vi.fn(() => Promise.resolve([])),
}));

const socketMock = {
  connected: true,
  on: vi.fn(),
  off: vi.fn(),
};

vi.mock("../socket/socket", () => ({
  connectSocket: vi.fn(() => socketMock),
  disconnectSocket: vi.fn(),
  getSocket: vi.fn(() => socketMock),
}));

vi.mock("../components/SensorChart", () => ({
  default: () => <div data-testid="sensor-chart">Sensor chart mock</div>,
}));

function renderApp(path = "/dashboard") {
  window.history.pushState({}, "Test page", path);

  return render(
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}

function setStoredSession(user = { name: "Admin", email: "admin@test.com", role: "admin" }) {
  localStorage.setItem("vc_token", "stored-admin-token");
  localStorage.setItem("vc_user", JSON.stringify(user));
}

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("Senaryo 2.1.* — Kimlik Doğrulama ve Rota Koruma", () => {
  beforeEach(() => {
    localStorage.clear();
    loginApi.mockReset();
    connectSocket.mockClear();
    socketMock.on.mockClear();
    socketMock.off.mockClear();
  });

  test("2.1.1 token yokken /dashboard erişimi /login sayfasına yönlendirir ve dashboard render etmez", async () => {
    renderApp("/dashboard");

    expect(await screen.findByRole("heading", { name: /hesabınıza giriş yapın/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /^dashboard$/i })).not.toBeInTheDocument();
    expect(window.location.pathname).toBe("/login");
  });

  test("2.1.1 kenar durum: /login rotası token yokken kendi içine sonsuz yönlendirme üretmeden formu gösterir", async () => {
    renderApp("/login");

    expect(await screen.findByRole("heading", { name: /hesabınıza giriş yapın/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /giriş yap/i })).toBeEnabled();
  });

  test("2.1.2 admin olmayan role=user oturumu temizler ve /login'e yönlendirir", async () => {
    setStoredSession({ name: "Normal User", email: "user@test.com", role: "user" });

    renderApp("/dashboard");

    expect(await screen.findByRole("heading", { name: /hesabınıza giriş yapın/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(localStorage.getItem("vc_token")).toBeNull();
      expect(localStorage.getItem("vc_user")).toBeNull();
    });
    expect(window.location.pathname).toBe("/login");
  });

  test("2.1.2 kenar durum: user nesnesinde role undefined ise savunma katmanı oturumu kapatır", async () => {
    setStoredSession({ name: "Role Missing", email: "missing@test.com" });

    renderApp("/dashboard");

    expect(await screen.findByRole("heading", { name: /hesabınıza giriş yapın/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(localStorage.getItem("vc_token")).toBeNull();
      expect(localStorage.getItem("vc_user")).toBeNull();
    });
  });

  test("2.1.3 başarılı admin girişi token'ı saklar, submit sırasında butonu disable eder ve dashboard'a yönlendirir", async () => {
    const user = userEvent.setup();
    const deferred = createDeferred();
    loginApi.mockReturnValueOnce(deferred.promise);

    renderApp("/login");

    await user.type(screen.getByLabelText(/e-posta adresi/i), "admin@test.com");
    await user.type(screen.getByLabelText(/şifre/i), "correct-password");
    await user.click(screen.getByRole("button", { name: /giriş yap/i }));

    expect(screen.getByRole("button", { name: /giriş yapılıyor/i })).toBeDisabled();

    deferred.resolve({
      token: "admin-token",
      user: { name: "Admin", email: "admin@test.com", role: "admin" },
    });

    expect(await screen.findByRole("heading", { name: /^dashboard$/i })).toBeInTheDocument();
    expect(localStorage.getItem("vc_token")).toBe("admin-token");
    expect(connectSocket).toHaveBeenCalledWith("admin-token");
    expect(window.location.pathname).toBe("/dashboard");
  });

  test("2.1.4 hatalı kimlik bilgileri hata mesajı gösterir, token kaydetmez ve login sayfasında kalır", async () => {
    const user = userEvent.setup();
    loginApi.mockRejectedValueOnce({
      response: {
        status: 401,
        data: { message: "Geçersiz kimlik bilgileri" },
      },
    });

    renderApp("/login");

    const emailInput = screen.getByLabelText(/e-posta adresi/i);
    const passwordInput = screen.getByLabelText(/şifre/i);
    await user.type(emailInput, "admin@test.com");
    await user.type(passwordInput, "wrong-password");
    await user.click(screen.getByRole("button", { name: /giriş yap/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Geçersiz kimlik bilgileri");
    expect(localStorage.getItem("vc_token")).toBeNull();
    expect(emailInput).toHaveValue("admin@test.com");
    expect(passwordInput).toHaveValue("wrong-password");
    expect(window.location.pathname).toBe("/login");
  });

  test("2.1.5 localStorage'daki geçerli admin oturumu sayfa yenileme sonrası korumalı sayfayı açar", async () => {
    setStoredSession();

    renderApp("/dashboard");

    expect(await screen.findByRole("heading", { name: /^dashboard$/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /hesabınıza giriş yapın/i })).not.toBeInTheDocument();
  });

  test("2.1.5 kenar durum: malformed vc_user değeri UI'ı kilitlemeden korumalı sayfayı render eder", async () => {
    localStorage.setItem("vc_token", "token-with-malformed-user");
    localStorage.setItem("vc_user", "{malformed-json");

    renderApp("/dashboard");

    expect(await screen.findByRole("heading", { name: /^dashboard$/i })).toBeInTheDocument();
  });

  test("2.1.6 logout localStorage'ı temizler, context'i sıfırlar ve /login'e yönlendirir", async () => {
    const user = userEvent.setup();
    setStoredSession();

    renderApp("/dashboard");

    await user.click(await screen.findByRole("button", { name: /logout/i }));

    expect(await screen.findByRole("heading", { name: /hesabınıza giriş yapın/i })).toBeInTheDocument();
    expect(localStorage.getItem("vc_token")).toBeNull();
    expect(localStorage.getItem("vc_user")).toBeNull();
    expect(window.location.pathname).toBe("/login");
  });
});
