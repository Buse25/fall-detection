const request = require("supertest");
const app = require("../src/app");
const Alarm = require("../src/models/Alarm");

const buildSensorPayload = (overrides = {}) => ({
  deviceId: "device-1",
  timestamp: "2026-05-18T10:00:00.000Z",
  accelerometer: {
    x: 3,
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

const registerUser = async (email, name = "Alarm User") => {
  const response = await request(app)
    .post("/api/auth/register")
    .send({
      name,
      email,
      password: "password123",
    })
    .expect(201);

  return response.body;
};

const createFallAlarm = async (token, payload = {}) => {
  const sensorResponse = await request(app)
    .post("/api/sensor-data")
    .set("Authorization", `Bearer ${token}`)
    .send(buildSensorPayload(payload))
    .expect(201);

  const alarm = await Alarm.findOne({
    sensorDataId: sensorResponse.body.data._id,
  });

  expect(alarm).toBeTruthy();

  return alarm;
};

describe("Alarm endpoints", () => {
  it("rejects alarm endpoints without a token", async () => {
    const user = await registerUser("alarm-owner@example.com");
    const alarm = await createFallAlarm(user.token);

    const endpoints = [
      { method: "get", url: "/api/alarms" },
      { method: "get", url: `/api/alarms/${alarm._id}` },
      { method: "patch", url: `/api/alarms/${alarm._id}/resolve` },
    ];

    for (const endpoint of endpoints) {
      const response = await request(app)[endpoint.method](endpoint.url).expect(
        401
      );

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Not authorized, no token");
    }
  });

  it("rejects alarm endpoints with an invalid token", async () => {
    const user = await registerUser("alarm-invalid@example.com");
    const alarm = await createFallAlarm(user.token);

    const endpoints = [
      { method: "get", url: "/api/alarms" },
      { method: "get", url: `/api/alarms/${alarm._id}` },
      { method: "patch", url: `/api/alarms/${alarm._id}/resolve` },
    ];

    for (const endpoint of endpoints) {
      const response = await request(app)[endpoint.method](endpoint.url)
        .set("Authorization", "Bearer invalid-token")
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Not authorized, token failed");
    }
  });

  it("lists only alarms for the authenticated user", async () => {
    const owner = await registerUser("alarm-list-owner@example.com", "Owner");
    const other = await registerUser("alarm-list-other@example.com", "Other");

    await createFallAlarm(owner.token, { deviceId: "owner-device" });
    await createFallAlarm(other.token, { deviceId: "other-device" });

    const response = await request(app)
      .get("/api/alarms")
      .set("Authorization", `Bearer ${owner.token}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.count).toBe(1);
    expect(response.body.data[0].deviceId).toBe("owner-device");
  });

  it("returns an alarm by id only for its owner", async () => {
    const owner = await registerUser("alarm-id-owner@example.com", "Owner");
    const other = await registerUser("alarm-id-other@example.com", "Other");
    const alarm = await createFallAlarm(owner.token, { deviceId: "owned" });

    const ownerResponse = await request(app)
      .get(`/api/alarms/${alarm._id}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .expect(200);

    expect(ownerResponse.body.success).toBe(true);
    expect(ownerResponse.body.data.deviceId).toBe("owned");

    const otherResponse = await request(app)
      .get(`/api/alarms/${alarm._id}`)
      .set("Authorization", `Bearer ${other.token}`)
      .expect(404);

    expect(otherResponse.body.success).toBe(false);
    expect(otherResponse.body.message).toBe("Alarm not found");
  });

  it("resolves only the authenticated user's alarm", async () => {
    const owner = await registerUser("alarm-resolve-owner@example.com", "Owner");
    const other = await registerUser("alarm-resolve-other@example.com", "Other");
    const alarm = await createFallAlarm(owner.token, { deviceId: "resolve-me" });

    const otherResponse = await request(app)
      .patch(`/api/alarms/${alarm._id}/resolve`)
      .set("Authorization", `Bearer ${other.token}`)
      .expect(404);

    expect(otherResponse.body.success).toBe(false);

    const response = await request(app)
      .patch(`/api/alarms/${alarm._id}/resolve`)
      .set("Authorization", `Bearer ${owner.token}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.isResolved).toBe(true);
    expect(response.body.data.resolvedAt).toBeDefined();

    const updatedAlarm = await Alarm.findById(alarm._id);

    expect(updatedAlarm.isResolved).toBe(true);
    expect(updatedAlarm.resolvedAt).toBeInstanceOf(Date);
  });
});
