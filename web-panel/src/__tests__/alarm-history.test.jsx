import React from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AlarmHistoryPage from "../pages/AlarmHistoryPage";
import { AuthProvider } from "../context/AuthContext";
import { getAlarms } from "../api/alarms";

vi.mock("../api/alarms", () => ({
  getAlarms: vi.fn(),
}));

vi.mock("../socket/socket", () => ({
  connectSocket: vi.fn(),
  disconnectSocket: vi.fn(),
  getSocket: vi.fn(() => null),
}));

function setAdminSession() {
  localStorage.setItem("vc_token", "admin-token");
  localStorage.setItem(
    "vc_user",
    JSON.stringify({ name: "Admin", email: "admin@test.com", role: "admin" })
  );
}

function renderAlarmHistory() {
  setAdminSession();
  return render(
    <MemoryRouter initialEntries={["/alarms"]}>
      <AuthProvider>
        <AlarmHistoryPage />
      </AuthProvider>
    </MemoryRouter>
  );
}

function buildAlarms(count = 10) {
  return Array.from({ length: count }, (_, index) => {
    const unresolved = index < 6;
    const isFall = index % 2 === 0;
    return {
      _id: `alarm-${String(index + 1).padStart(2, "0")}`,
      alarmType: isFall ? "fall" : "inactivity",
      severity: index % 3 === 0 ? "high" : "medium",
      isResolved: !unresolved,
      message: isFall ? `Düşme alarmı ${index + 1}` : `Hareketsizlik alarmı ${index + 1}`,
      createdAt: new Date(Date.UTC(2026, 5, 12, 9, index)).toISOString(),
    };
  });
}

describe("Senaryo 2.5.* — Alarm Geçmişi Sayfası", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  test("2.5.1 sayfa yüklendiğinde alarm API'si çağrılır ve 10 alarm listelenir", async () => {
    const alarms = buildAlarms(10);
    getAlarms.mockResolvedValue({ success: true, count: 10, data: alarms });

    const { container } = renderAlarmHistory();

    expect(await screen.findByText("Alarm Geçmişi")).toBeInTheDocument();
    expect(getAlarms).toHaveBeenCalledWith({ page: 1, limit: 10 });
    expect(screen.getByText("Toplam: 10")).toBeInTheDocument();

    for (const alarm of alarms) {
      expect(screen.getByText(`#${alarm._id.slice(-8).toUpperCase()}`)).toBeInTheDocument();
    }

    const rows = container.querySelectorAll("tbody tr");
    expect(rows).toHaveLength(10);
    expect(within(rows[0]).getByText("Bekliyor")).toBeInTheDocument();
    expect(within(rows[6]).getByText("Çözüldü")).toBeInTheDocument();
  });

  test("2.5.1 filtreyle eşleşen alarm yoksa empty state mesajı gösterilir", async () => {
    getAlarms.mockResolvedValue({ success: true, count: 0, data: [] });

    renderAlarmHistory();

    expect(await screen.findByText("Filtreyle eşleşen alarm bulunamadı")).toBeInTheDocument();
  });

  test("2.5.3 fall ve inactivity alarm tipleri farklı ikon/etiketlerle ayrıştırılır", async () => {
    getAlarms.mockResolvedValue({
      success: true,
      count: 2,
      data: [
        {
          _id: "alarm-fall",
          alarmType: "fall",
          severity: "high",
          isResolved: false,
          message: "Düşme alarmı",
          createdAt: "2026-06-12T09:00:00.000Z",
        },
        {
          _id: "alarm-inactivity",
          alarmType: "inactivity",
          severity: "medium",
          isResolved: false,
          message: "Hareketsizlik alarmı",
          createdAt: "2026-06-12T09:01:00.000Z",
        },
      ],
    });

    const { container } = renderAlarmHistory();

    expect(await screen.findByText("Düşme")).toBeInTheDocument();
    expect(screen.getAllByText("Hareketsizlik").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Yüksek")).toBeInTheDocument();
    expect(screen.getByText("Orta")).toBeInTheDocument();

    const iconTexts = Array.from(container.querySelectorAll(".material-symbols-outlined")).map((node) =>
      node.textContent?.trim()
    );
    expect(iconTexts).toContain("falling");
    expect(iconTexts).toContain("motion_sensor_idle");
  });

  test("2.5 filtreler API parametrelerine alarmType, severity ve isResolved olarak yansır", async () => {
    const user = userEvent.setup();
    getAlarms.mockResolvedValue({ success: true, count: 0, data: [] });

    renderAlarmHistory();
    await screen.findByText("Filtreyle eşleşen alarm bulunamadı");

    const [alarmTypeSelect, severitySelect, statusSelect] = screen.getAllByRole("combobox");
    await user.selectOptions(alarmTypeSelect, "fall");
    await user.selectOptions(severitySelect, "high");
    await user.selectOptions(statusSelect, "false");
    await user.click(screen.getByRole("button", { name: "Filtrele" }));

    await waitFor(() => {
      expect(getAlarms).toHaveBeenLastCalledWith({
        page: 1,
        limit: 10,
        alarmType: "fall",
        severity: "high",
        isResolved: "false",
      });
    });
  });
});
