import React from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SensorChart from "../components/SensorChart";

const lineSpy = vi.fn();
const lineChartSpy = vi.fn();
const xAxisSpy = vi.fn();

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }) => (
    <div data-testid="responsive-container" style={{ width: 800, height: 220 }}>
      {children}
    </div>
  ),
  LineChart: ({ children, data }) => {
    lineChartSpy(data);
    return <svg data-testid="line-chart">{children}</svg>;
  },
  Line: (props) => {
    lineSpy(props);
    return (
      <g data-testid={`line-${props.dataKey}`}>
        {props.dot && (
          <>
            {lineChartSpy.mock.calls.at(-1)?.[0]?.map((payload, index) => (
              <g key={`${props.dataKey}-${index}`} data-testid={`dot-${index}`}>
                {props.dot({ cx: 100 + index * 10, cy: 100, payload })}
              </g>
            ))}
          </>
        )}
      </g>
    );
  },
  XAxis: (props) => {
    xAxisSpy(props);
    return <g data-testid="x-axis" />;
  },
  YAxis: () => <g data-testid="y-axis" />,
  CartesianGrid: () => <g data-testid="cartesian-grid" />,
}));

const sensorData = [
  {
    timestamp: "2026-06-12T09:00:00.000Z",
    deviceId: "phone-123",
    accelerometer: { magnitude: 1.23 },
    gyroscopeMagnitude: 0.45,
    isFallDetected: false,
    isInactivity: false,
  },
  {
    timestamp: "2026-06-12T09:00:01.000Z",
    deviceId: "phone-123",
    accelerometer: { magnitude: 3.12 },
    gyroscope: { x: 0.3, y: 0.4, z: 0 },
    isFallDetected: true,
    isInactivity: false,
  },
  {
    timestamp: "2026-06-12T09:00:02.000Z",
    deviceId: "phone-123",
    accelerometer: { magnitude: 0.9 },
    isFallDetected: false,
    isInactivity: true,
  },
];

function renderChart(props = {}) {
  return render(
    <SensorChart
      data={props.data ?? sensorData}
      chartMode={props.chartMode ?? "live"}
      onChartModeChange={props.onChartModeChange ?? vi.fn()}
      devices={props.devices ?? ["phone-123", "phone-456"]}
      selectedDevice={props.selectedDevice ?? ""}
      onDeviceChange={props.onDeviceChange ?? vi.fn()}
    />
  );
}

describe("Senaryo 2.3.* — Sensör Grafiği (SensorChart)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("2.3.1 zaman aralığı kontrolleri seçilen pencereyi üst bileşene bildirir", async () => {
    const user = userEvent.setup();
    const onChartModeChange = vi.fn();

    renderChart({ chartMode: "live", onChartModeChange });

    await user.click(screen.getByRole("button", { name: "1 Saat" }));
    await user.click(screen.getByRole("button", { name: "24 Saat" }));

    expect(onChartModeChange).toHaveBeenNthCalledWith(1, "1h");
    expect(onChartModeChange).toHaveBeenNthCalledWith(2, "24h");
  });

  test("2.3.1 live modda X ekseni 60 saniyelik kayan zaman domain'i kullanır", () => {
    renderChart({ chartMode: "live" });

    const xAxisProps = xAxisSpy.mock.calls.at(-1)?.[0];
    expect(xAxisProps).toMatchObject({
      dataKey: "ts",
      type: "number",
      scale: "time",
    });
    expect(xAxisProps.domain[1] - xAxisProps.domain[0]).toBe(60_000);
  });

  test("2.3.2 cihaz filtresi değiştiğinde seçilen deviceId üst bileşene iletilir", async () => {
    const user = userEvent.setup();
    const onDeviceChange = vi.fn();

    renderChart({ onDeviceChange });

    await user.selectOptions(screen.getByRole("combobox"), "phone-123");

    expect(onDeviceChange).toHaveBeenCalledWith("phone-123");
    expect(screen.getByRole("option", { name: "phone-123" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "phone-456" })).toBeInTheDocument();
  });

  test("2.3.3 ivmeölçer ve jiroskop için iki ayrı Line render eder ve null-safe çalışır", () => {
    renderChart({
      data: [
        sensorData[0],
        {
          timestamp: "2026-06-12T09:00:03.000Z",
          accelerometer: { magnitude: 1.01 },
          isFallDetected: false,
          isInactivity: false,
        },
      ],
    });

    expect(screen.getByTestId("line-magnitude")).toBeInTheDocument();
    expect(screen.getByTestId("line-gyroscopeMag")).toBeInTheDocument();
    expect(lineSpy).toHaveBeenCalledWith(expect.objectContaining({ dataKey: "magnitude", stroke: "#004ac6" }));
    expect(lineSpy).toHaveBeenCalledWith(expect.objectContaining({ dataKey: "gyroscopeMag", stroke: "#e87811" }));
  });

  test("2.3.4 düşme ve hareketsizlik noktaları grafik üstünde olay işaretleriyle gösterilir", async () => {
    const { container } = renderChart();

    const eventMarkers = container.querySelectorAll('circle[stroke="#fff"]');
    expect(eventMarkers).toHaveLength(2);

    const markerGroups = container.querySelectorAll('g[style*="cursor"]');
    fireEvent.mouseEnter(markerGroups[0], { clientX: 100, clientY: 100 });

    expect(await screen.findByText("🚨 DÜŞME")).toBeInTheDocument();
  });

  test("2.3.4 tüm noktalar normal ise olay işareti render edilmez", () => {
    const { container } = renderChart({
      data: [
        {
          timestamp: "2026-06-12T09:00:00.000Z",
          accelerometer: { magnitude: 1 },
          gyroscopeMagnitude: 0.2,
          isFallDetected: false,
          isInactivity: false,
        },
      ],
    });

    expect(container.querySelectorAll('circle[stroke="#fff"]')).toHaveLength(0);
  });

  test("2.3.5 boş veride Recharts render edilmez ve bilgilendirici mesaj gösterilir", () => {
    renderChart({ data: [], chartMode: "1h" });

    expect(screen.getByText("Seçilen zaman aralığında veri yok")).toBeInTheDocument();
    expect(screen.queryByTestId("line-chart")).not.toBeInTheDocument();
  });

  test("2.3.6 çok fazla veri noktasında render edilebilir kalır", async () => {
    const bigData = Array.from({ length: 10_000 }, (_, index) => ({
      timestamp: new Date(Date.UTC(2026, 5, 12, 9, 0, index)).toISOString(),
      accelerometer: { magnitude: (index % 5) + 0.1 },
      gyroscopeMagnitude: index % 2 === 0 ? 0.3 : undefined,
      isFallDetected: false,
      isInactivity: false,
    }));

    renderChart({ data: bigData, chartMode: "24h" });

    await waitFor(() => {
      expect(screen.getByTestId("responsive-container")).toBeInTheDocument();
    });
    expect(screen.getByTestId("line-chart")).toBeInTheDocument();
    expect(within(screen.getByTestId("line-chart")).getByTestId("line-magnitude")).toBeInTheDocument();
  });
});
