import React from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import DashboardPage from "../pages/DashboardPage";
import { AuthProvider } from "../context/AuthContext";
import { fetchDevices, fetchRecentAlarms, fetchSensorChart, fetchStats } from "../api/panel";

vi.mock("../api/panel", () => ({
  fetchStats: vi.fn(),
  fetchRecentAlarms: vi.fn(),
  fetchDevices: vi.fn(),
  fetchSensorChart: vi.fn(),
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
  default: ({ devices = [], selectedDevice = "" }) => (
    <section data-testid="sensor-chart">
      Sensor chart mock
      <span data-testid="device-count">{devices.length}</span>
      <span data-testid="selected-device">{selectedDevice}</span>
    </section>
  ),
}));

function renderDashboard() {
  localStorage.setItem("vc_token", "admin-token");
  localStorage.setItem(
    "vc_user",
    JSON.stringify({ name: "Admin", email: "admin@test.com", role: "admin" })
  );

  return render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <AuthProvider>
        <DashboardPage />
      </AuthProvider>
    </MemoryRouter>
  );
}

function mockDashboardApi({
  stats = {
    totalUsers: 42,
    totalAlarms: 15,
    unresolvedAlarms: 3,
    todayFalls: 2,
    totalSensorRecords: 1200,
  },
  alarms = [],
  devices = [],
} = {}) {
  fetchStats.mockResolvedValue(stats);
  fetchRecentAlarms.mockResolvedValue(alarms);
  fetchDevices.mockResolvedValue(devices);
  fetchSensorChart.mockResolvedValue([]);
}

function buildAlarms(count = 10) {
  return Array.from({ length: count }, (_, index) => {
    const isResolved = index >= 6;
    const isFall = index % 2 === 0;
    return {
      _id: `alarm-${index + 1}`,
      alarmType: isFall ? "fall" : "inactivity",
      severity: index % 3 === 0 ? "high" : "medium",
      isResolved,
      message: isFall ? `Düşme alarmı ${index + 1}` : `Hareketsizlik alarmı ${index + 1}`,
      createdAt: new Date(Date.UTC(2026, 5, 12, 9, index)).toISOString(),
    };
  });
}

describe("Senaryo 2.2.* — Dashboard İstatistik Kartları", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    socketMock.on.mockClear();
    socketMock.off.mockClear();
  });

  test("2.2.1 istatistik kartları /api/panel/stats yanıtındaki değerleri doğru render eder", async () => {
    mockDashboardApi({
      stats: {
        totalUsers: 42,
        totalAlarms: 15,
        unresolvedAlarms: 3,
        todayFalls: 2,
        totalSensorRecords: 1200,
      },
    });

    renderDashboard();

    expect(await screen.findByText("Toplam Alarm")).toBeInTheDocument();
    expect(screen.getByText("Bugün Düşme")).toBeInTheDocument();
    expect(screen.getByText("Sensör Kaydı")).toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("1200")).toBeInTheDocument();
    expect(fetchStats).toHaveBeenCalledTimes(1);
  });

  test("2.2.1 kenar durum: tüm değerler 0 olduğunda kartlar boş kalmaz ve 0 gösterir", async () => {
    mockDashboardApi({
      stats: {
        totalUsers: 0,
        totalAlarms: 0,
        unresolvedAlarms: 0,
        todayFalls: 0,
        totalSensorRecords: 0,
      },
    });

    renderDashboard();

    await screen.findByText("Toplam Alarm");
    const zeroValues = screen.getAllByText("0");
    expect(zeroValues.length).toBeGreaterThanOrEqual(3);
    expect(screen.queryByText("—")).not.toBeInTheDocument();
  });

  test("2.2.2 API yanıtı beklemedeyken loading state görünür ve undefined/null değer render edilmez", () => {
    fetchStats.mockReturnValue(new Promise(() => {}));
    fetchRecentAlarms.mockReturnValue(new Promise(() => {}));
    fetchDevices.mockReturnValue(new Promise(() => {}));
    fetchSensorChart.mockResolvedValue([]);

    renderDashboard();

    expect(screen.getByText("Veriler yükleniyor...")).toBeInTheDocument();
    expect(screen.queryByText(/undefined|null/i)).not.toBeInTheDocument();
  });

  test("2.2.3 API 500 hatasında dashboard beyaz ekrana düşmeden graceful fallback render eder", async () => {
    fetchStats.mockRejectedValue({ response: { status: 500 } });
    fetchRecentAlarms.mockRejectedValue({ response: { status: 500 } });
    fetchDevices.mockRejectedValue({ response: { status: 500 } });
    fetchSensorChart.mockResolvedValue([]);

    renderDashboard();

    expect(await screen.findByRole("heading", { name: /^dashboard$/i })).toBeInTheDocument();
    expect(screen.getByText("Toplam Alarm")).toBeInTheDocument();
    expect(screen.getByText("Bugün Düşme")).toBeInTheDocument();
    expect(screen.getByText("Sensör Kaydı")).toBeInTheDocument();
    expect(screen.getByText("Henüz alarm yok")).toBeInTheDocument();
  });

  test("2.2.3 kenar durum: network error durumunda da dashboard çökmeyip empty state gösterir", async () => {
    fetchStats.mockRejectedValue(new Error("Network Error"));
    fetchRecentAlarms.mockRejectedValue(new Error("Network Error"));
    fetchDevices.mockRejectedValue(new Error("Network Error"));
    fetchSensorChart.mockResolvedValue([]);

    renderDashboard();

    expect(await screen.findByRole("heading", { name: /^dashboard$/i })).toBeInTheDocument();
    expect(screen.getByText("Henüz alarm yok")).toBeInTheDocument();
  });

  test("2.2.4 recent alarms endpoint'inden gelen 10 alarm listede render edilir", async () => {
    const alarms = buildAlarms(10);
    mockDashboardApi({ alarms });

    const { container } = renderDashboard();

    expect(await screen.findByText("Son Alarmlar")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();

    for (const alarm of alarms) {
      expect(screen.getByText(alarm.message)).toBeInTheDocument();
    }

    expect(screen.getAllByText("Çözüldü")).toHaveLength(4);
    expect(screen.getAllByText("Yüksek").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Orta").length).toBeGreaterThan(0);

    const firstAlarmRow = container.querySelector("li");
    expect(firstAlarmRow).not.toBeNull();
    expect(within(firstAlarmRow).getByText("Düşme alarmı 1")).toBeInTheDocument();
  });

  test("2.2.4 kenar durum: alarm listesi boşsa empty state mesajı gösterilir", async () => {
    mockDashboardApi({ alarms: [] });

    renderDashboard();

    expect(await screen.findByText("Son Alarmlar")).toBeInTheDocument();
    expect(screen.getByText("Henüz alarm yok")).toBeInTheDocument();
  });
});
