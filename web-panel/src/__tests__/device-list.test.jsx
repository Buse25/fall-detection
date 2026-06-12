import React from "react";
import { MemoryRouter } from "react-router-dom";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import DevicesPage from "../pages/DevicesPage";
import { AuthProvider } from "../context/AuthContext";
import { fetchDevices } from "../api/panel";

let handlers = {};
const socketMock = {
  connected: true,
  on: vi.fn((event, handler) => {
    handlers[event] = handler;
    return socketMock;
  }),
  off: vi.fn((event) => {
    delete handlers[event];
    return socketMock;
  }),
};

vi.mock("../api/panel", () => ({
  fetchDevices: vi.fn(),
}));

vi.mock("../socket/socket", () => ({
  connectSocket: vi.fn(() => socketMock),
  disconnectSocket: vi.fn(),
  getSocket: vi.fn(() => socketMock),
}));

const now = new Date("2026-06-12T09:00:00.000Z").getTime();

function ago(ms) {
  return new Date(now - ms).toISOString();
}

function setAdminSession() {
  localStorage.setItem("vc_token", "admin-token");
  localStorage.setItem(
    "vc_user",
    JSON.stringify({ name: "Admin", email: "admin@test.com", role: "admin" })
  );
}

function renderDevices() {
  setAdminSession();
  return render(
    <MemoryRouter initialEntries={["/devices"]}>
      <AuthProvider>
        <DevicesPage />
      </AuthProvider>
    </MemoryRouter>
  );
}

function getDeviceRow(deviceId) {
  return screen.getByText(deviceId).closest("tr");
}

describe("Senaryo 2.6.* — Cihaz Listesi Sayfası", () => {
  beforeEach(() => {
    localStorage.clear();
    handlers = {};
    vi.clearAllMocks();
    vi.spyOn(Date, "now").mockReturnValue(now);
  });

  test("2.6.1 isOnline=true cihaz yeşil/aktif, isOnline=false cihaz pasif göstergeli render edilir", async () => {
    fetchDevices.mockResolvedValue([
      {
        deviceId: "phone-online",
        lastSeen: ago(2 * 60 * 1000),
        magnitude: 1.12,
        fallCount: 3,
        isOnline: true,
      },
      {
        deviceId: "phone-offline",
        lastSeen: ago(10 * 60 * 1000),
        magnitude: 0.98,
        fallCount: 0,
        isOnline: false,
      },
    ]);

    renderDevices();

    const onlineRow = await waitFor(() => getDeviceRow("phone-online"));
    const offlineRow = getDeviceRow("phone-offline");

    const onlineBadge = within(onlineRow).getByText("Online").closest("span");
    expect(onlineBadge).toHaveClass("bg-green-100");
    expect(onlineBadge).toHaveClass("text-green-800");
    expect(within(onlineRow).getByText("2 dk önce")).toBeInTheDocument();

    expect(within(offlineRow).getByText("Offline")).toBeInTheDocument();
    expect(offlineRow).toHaveClass("bg-error-container/5");
    expect(within(offlineRow).getByText("10 dk önce")).toBeInTheDocument();
  });

  test("2.6.1 kenar durum: 4 dakika 59 saniye online, tam 5 dakika offline kabul edilir", async () => {
    fetchDevices.mockResolvedValue([
      {
        deviceId: "phone-4m59s",
        lastSeen: ago(4 * 60 * 1000 + 59 * 1000),
        magnitude: 1,
        fallCount: 0,
      },
      {
        deviceId: "phone-5m",
        lastSeen: ago(5 * 60 * 1000),
        magnitude: 1,
        fallCount: 0,
      },
    ]);

    renderDevices();

    const onlineBoundaryRow = await waitFor(() => getDeviceRow("phone-4m59s"));
    const offlineBoundaryRow = getDeviceRow("phone-5m");

    expect(within(onlineBoundaryRow).getByText("Online")).toBeInTheDocument();
    expect(within(offlineBoundaryRow).getByText("Offline")).toBeInTheDocument();
  });

  test("2.6.2 fallCount cihaz satırında sayısal olarak gösterilir", async () => {
    fetchDevices.mockResolvedValue([
      {
        deviceId: "phone-falls",
        lastSeen: ago(60 * 1000),
        magnitude: 1.75,
        fallCount: 7,
      },
    ]);

    renderDevices();

    const row = await waitFor(() => getDeviceRow("phone-falls"));
    const fallCount = within(row).getByText("7");
    expect(fallCount).toBeInTheDocument();
    expect(fallCount).toHaveClass("text-error");
    expect(fallCount).toHaveClass("font-bold");
  });

  test("2.6.2 kenar durum: fallCount=0 undefined göstermeden 0 render eder", async () => {
    fetchDevices.mockResolvedValue([
      {
        deviceId: "phone-zero",
        lastSeen: ago(60 * 1000),
        magnitude: 1.01,
        fallCount: 0,
      },
    ]);

    renderDevices();

    const row = await waitFor(() => getDeviceRow("phone-zero"));
    expect(within(row).getByText("0")).toBeInTheDocument();
    expect(within(row).queryByText(/undefined/i)).not.toBeInTheDocument();
  });

  test("2.6 canlı device_status event'i mevcut cihazı online yapar ve magnitude değerini günceller", async () => {
    fetchDevices.mockResolvedValue([
      {
        deviceId: "phone-live",
        lastSeen: ago(20 * 60 * 1000),
        magnitude: 0.5,
        fallCount: 4,
      },
    ]);

    renderDevices();
    await waitFor(() => {
      expect(handlers.device_status).toBeTypeOf("function");
    });

    act(() => {
      handlers.device_status({
        deviceId: "phone-live",
        magnitude: 2.8,
        timestamp: new Date(now).toISOString(),
      });
    });

    const row = getDeviceRow("phone-live");
    expect(within(row).getByText("Online")).toBeInTheDocument();
    expect(within(row).getByText("2.80G")).toBeInTheDocument();
    expect(within(row).getByText("4")).toBeInTheDocument();
  });
});
