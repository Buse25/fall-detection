const request = require("supertest");
const app = require("../src/app");
const Alarm = require("../src/models/Alarm");

const wait = (milliseconds) =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });

const buildSensorPayload = (overrides = {}) => ({
  deviceId: "device-1",
  timestamp: "2026-05-18T10:00:00.000Z",
  accelerometer: {
    x: 1,
    y: 0,
    z: 0,
  },
  gyroscope: {
    x: 0,
    y: 0,
    z: 0,
  },
  ...overrides,
});

describe("SensorData endpoints", () => {
  let token;
  let userId;

  beforeEach(async () => {
    const response = await request(app).post("/api/auth/register").send({
      name: "Sensor User",
      email: "sensor@example.com",
      password: "password123",
    });

    token = response.body.token;
    userId = response.body.user.id;
  });

  it("rejects requests without a token", async () => {
    const response = await request(app)
      .post("/api/sensor-data")
      .send(buildSensorPayload())
      .expect(401);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Not authorized, no token");
  });

  it("creates sensor data and calculates magnitude", async () => {
    const response = await request(app)
      .post("/api/sensor-data")
      .set("Authorization", `Bearer ${token}`)
      .send(buildSensorPayload())
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.userId).toBe(userId);
    expect(response.body.data.accelerometer.magnitude).toBe(1);
    expect(response.body.data.isFallDetected).toBe(false);
    expect(response.body.data.fallScore).toBe(1);
  });

  it("ignores userId from the request body and uses the authenticated user", async () => {
    const response = await request(app)
      .post("/api/sensor-data")
      .set("Authorization", `Bearer ${token}`)
      .send(buildSensorPayload({ userId: "spoofed-user" }))
      .expect(201);

    expect(response.body.data.userId).toBe(userId);
  });

  it("rejects missing required sensor fields", async () => {
    const response = await request(app)
      .post("/api/sensor-data")
      .set("Authorization", `Bearer ${token}`)
      .send({})
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe(
      "deviceId, accelerometer and gyroscope are required"
    );
  });

  it("lists sensor data newest first", async () => {
    await request(app)
      .post("/api/sensor-data")
      .set("Authorization", `Bearer ${token}`)
      .send(buildSensorPayload({ deviceId: "old-device" }))
      .expect(201);

    await wait(5);

    await request(app)
      .post("/api/sensor-data")
      .set("Authorization", `Bearer ${token}`)
      .send(buildSensorPayload({ deviceId: "new-device" }))
      .expect(201);

    const response = await request(app)
      .get("/api/sensor-data")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.count).toBe(2);
    expect(response.body.data[0].deviceId).toBe("new-device");
  });

  it("returns latest sensor data", async () => {
    await request(app)
      .post("/api/sensor-data")
      .set("Authorization", `Bearer ${token}`)
      .send(buildSensorPayload({ deviceId: "latest-device" }))
      .expect(201);

    const response = await request(app)
      .get("/api/sensor-data/latest")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.deviceId).toBe("latest-device");
  });

  it("returns 404 when no latest sensor data exists", async () => {
    const response = await request(app)
      .get("/api/sensor-data/latest")
      .set("Authorization", `Bearer ${token}`)
      .expect(404);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("No sensor data found");
  });

  it("detects falls and creates an alarm", async () => {
    const response = await request(app)
      .post("/api/sensor-data")
      .set("Authorization", `Bearer ${token}`)
      .send(
        buildSensorPayload({
          accelerometer: {
            x: 3,
            y: 0,
            z: 0,
          },
        })
      )
      .expect(201);

    expect(response.body.data.isFallDetected).toBe(true);
    expect(response.body.data.fallScore).toBe(3);

    const alarm = await Alarm.findOne({
      sensorDataId: response.body.data._id,
    });

    expect(alarm).toBeTruthy();
    expect(alarm.userId).toBe(userId);
    expect(alarm.alarmType).toBe("fall");
    expect(alarm.severity).toBe("high");
  });

  it("lists only fall detected data", async () => {
    await request(app)
      .post("/api/sensor-data")
      .set("Authorization", `Bearer ${token}`)
      .send(buildSensorPayload());
    await request(app)
      .post("/api/sensor-data")
      .set("Authorization", `Bearer ${token}`)
      .send(
        buildSensorPayload({
          deviceId: "fall-device",
          accelerometer: {
            x: 3,
            y: 0,
            z: 0,
          },
        })
      );

    const response = await request(app)
      .get("/api/sensor-data/falls")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.count).toBe(1);
    expect(response.body.data[0].deviceId).toBe("fall-device");
  });
});
