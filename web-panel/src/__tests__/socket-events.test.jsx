import React from "react";
import { MemoryRouter } from "react-router-dom";
import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import DashboardPage from "../pages/DashboardPage";
import { AuthProvider } from "../context/AuthContext";
import { fetchDevices, fetchRecentAlarms, fetchSensorChart, fetchStats } from "../api/panel";
import { disconnectSocket } from "../socket/socket";

let handlers = {};
const socketMock = {
  id: "socket-test-id",
  connected: true,
  on: vi.fn((event, handler) => {
    handlers[event] = handler;
    return socketMock;
  }),
  off: vi.fn((event) => {
    delete handlers[event];
    return socketMock;
  }),
  emit: vi.fn(),
  disconnect: vi.fn(),
};

vi.mock("socket.io-client", () => ({
  io: vi.fn(() => socketMock),
}));

vi.mock("../api/panel", () => ({
  fetchStats: vi.fn(),
  fetchRecentAlarms: vi.fn(),
  fetchDevices: vi.fn(),
  fetchSensorChart: vi.fn(),
}));

vi.mock("../components/SensorChart", () => ({
  default: ({ data = [], devices = [] }) => (
    <section data-testid="sensor-chart">
      <span data-testid="chart-point-count">{data.length}</span>
      <span data-testid="chart-device-list">{devices.join(",")}</span>
      {data.map((point, index) => (
        <div key={`${point.timestamp}-${index}`} data-testid="chart-point">
          {point.deviceId || "event"}|{point.accelerometer?.magnitude ?? ""}|{point.gyroscopeMagnitude ?? ""}|
          {point.isFallDetected ? "fall" : point.isInactivity ? "inactivity" : "normal"}
        </div>
      ))}
    </section>
  ),
}));

function setAdminSession() {
  localStorage.setItem("vc_token", "admin-token");
  localStorage.setItem(
    "vc_user",
    JSON.stringify({ name: "Admin", email: "admin@test.com", role: "admin" })
  );
}

function renderDashboard() {
  setAdminSession();
  return render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <AuthProvider>
        <DashboardPage />
      </AuthProvider>
    </MemoryRouter>
  );
}

function mockInitialApi({ alarms = [] } = {}) {
  fetchStats.mockResolvedValue({
    totalAlarms: alarms.length,
    unresolvedAlarms: alarms.filter((alarm) => !alarm.isResolved).length,
    todayFalls: alarms.filter((alarm) => alarm.alarmType === "fall").length,
    totalSensorRecords: 100,
  });
  fetchRecentAlarms.mockResolvedValue(alarms);
  fetchDevices.mockResolvedValue([]);
  fetchSensorChart.mockResolvedValue([]);
}

async function waitForSocketHandlers() {
  await waitFor(() => {
    expect(handlers.device_status).toBeTypeOf("function");
    expect(handlers.fall_detected).toBeTypeOf("function");
    expect(handlers.emergency_alert).toBeTypeOf("function");
    expect(handlers.alarm_resolved).toBeTypeOf("function");
  });
}

describe("Senaryo 2.4.* — Socket.IO Gerçek Zamanlı Event Testleri", () => {
  beforeEach(() => {
    localStorage.clear();
    handlers = {};
    vi.clearAllMocks();
    disconnectSocket();
  });

  test("2.4.1 device_status event'i grafik state'ine yeni veri noktası ve cihaz listesi ekler", async () => {
    mockInitialApi();
    renderDashboard();
    await waitForSocketHandlers();

    act(() => {
      handlers.device_status({
        deviceId: "phone-123",
        magnitude: 1.23,
        gyroscopeMagnitude: 0.45,
        timestamp: "2026-06-12T09:00:00.000Z",
      });
    });

    expect(await screen.findByText(/phone-123\|1\.23\|0\.45\|normal/)).toBeInTheDocument();
    expect(screen.getByTestId("chart-device-list")).toHaveTextContent("phone-123");
    expect(screen.getByTestId("chart-point-count")).toHaveTextContent("1");
  });

  test("2.4.1 flood durumunda canlı grafik state'i son 300 noktayla sınırlı kalır", async () => {
    mockInitialApi();
    renderDashboard();
    await waitForSocketHandlers();

    act(() => {
      Array.from({ length: 350 }, (_, index) => {
        handlers.device_status({
          deviceId: "phone-123",
          magnitude: index,
          gyroscopeMagnitude: index / 10,
          timestamp: new Date(Date.UTC(2026, 5, 12, 9, 0, index)).toISOString(),
        });
      });
    });

    expect(screen.getByTestId("chart-point-count")).toHaveTextContent("300");
    expect(screen.queryByText(/phone-123\|0\|0\|normal/)).not.toBeInTheDocument();
  });

  test("2.4.2 fall_detected event'i acil uyarı gösterir ve son alarmlar listesine alarmı ekler", async () => {
    mockInitialApi();
    renderDashboard();
    await waitForSocketHandlers();

    act(() => {
      handlers.fall_detected({
        alarmId: "abc123",
        fallScore: 0.91,
        detectionMethod: "ai-model",
        countdownSec: 10,
      });
    });

    expect(await screen.findByRole("alert")).toHaveTextContent("Düşme Tespit Edildi");
    expect(screen.getByRole("alert")).toHaveTextContent("ABC123");
    expect(screen.getByText("Fall detected by ai-model")).toBeInTheDocument();
    expect(screen.getByText(/event\|1\|\|fall/)).toBeInTheDocument();
  });

  test("2.4.3 emergency_alert type=inactivity event'i hareketsizlik alarmını UI'a yansıtır", async () => {
    mockInitialApi();
    renderDashboard();
    await waitForSocketHandlers();

    act(() => {
      handlers.emergency_alert({
        alarmId: "xyz789",
        type: "inactivity",
      });
    });

    expect(
      await screen.findByText("Hareketsizlik alarmı onaylandı — acil durum kişileri uyarıldı")
    ).toBeInTheDocument();
    expect(screen.getByText(/event\|0\|\|inactivity/)).toBeInTheDocument();
  });

  test.fails("2.4.3 kenar durum: aynı alarmId için tekrarlanan emergency_alert duplicate alarm göstermemeli", async () => {
    mockInitialApi();
    renderDashboard();
    await waitForSocketHandlers();

    act(() => {
      handlers.emergency_alert({ alarmId: "xyz789", type: "inactivity" });
      handlers.emergency_alert({ alarmId: "xyz789", type: "inactivity" });
    });

    expect(
      screen.getAllByText("Hareketsizlik alarmı onaylandı — acil durum kişileri uyarıldı")
    ).toHaveLength(1);
  });

  test("2.4.4 alarm_resolved event'i mevcut alarm kartını sayfa yenilenmeden Çözüldü yapar", async () => {
    mockInitialApi({
      alarms: [
        {
          _id: "abc123",
          alarmType: "fall",
          severity: "high",
          isResolved: false,
          message: "Düşme alarmı",
          createdAt: "2026-06-12T09:00:00.000Z",
        },
      ],
    });
    renderDashboard();
    await waitForSocketHandlers();
    expect(await screen.findByText("Düşme alarmı")).toBeInTheDocument();

    act(() => {
      handlers.alarm_resolved({
        alarmId: "abc123",
        resolvedBy: "user",
        alarmType: "fall",
      });
    });

    expect(await screen.findByText("Çözüldü")).toBeInTheDocument();
  });

  test("2.4.4 kenar durum: mevcut listede olmayan alarm_resolved event'i sessizce yutulur", async () => {
    mockInitialApi({ alarms: [] });
    renderDashboard();
    await waitForSocketHandlers();

    act(() => {
      handlers.alarm_resolved({
        alarmId: "missing-id",
        resolvedBy: "user",
        alarmType: "fall",
      });
    });

    expect(screen.getByText("Henüz alarm yok")).toBeInTheDocument();
  });

  test("2.4.5 unmount sonrası socket listener'ları temizlenir ve çift listener birikimi engellenir", async () => {
    mockInitialApi();
    const { unmount } = renderDashboard();
    await waitForSocketHandlers();

    expect(socketMock.on).toHaveBeenCalledWith("device_status", expect.any(Function));

    unmount();

    expect(socketMock.off).toHaveBeenCalledWith("fall_detected", expect.any(Function));
    expect(socketMock.off).toHaveBeenCalledWith("alarm_resolved", expect.any(Function));
    expect(socketMock.off).toHaveBeenCalledWith("emergency_alert", expect.any(Function));
    expect(socketMock.off).toHaveBeenCalledWith("device_status", expect.any(Function));
  });
});
