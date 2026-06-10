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

  const expectValidationError = (response, expectedPaths) => {
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Validation failed");
    expect(response.body.errors).toEqual(expect.any(Array));
    expect(response.body.errors.map((error) => error.path)).toEqual(
      expect.arrayContaining(expectedPaths)
    );
  };

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

  it("rejects sensor endpoints with an invalid token", async () => {
    const endpoints = [
      { method: "post", url: "/api/sensor-data" },
      { method: "get", url: "/api/sensor-data" },
      { method: "get", url: "/api/sensor-data/latest" },
      { method: "get", url: "/api/sensor-data/falls" },
    ];

    for (const endpoint of endpoints) {
      const requestBuilder = request(app)[endpoint.method](endpoint.url).set(
        "Authorization",
        "Bearer invalid-token"
      );

      const response =
        endpoint.method === "post"
          ? await requestBuilder.send(buildSensorPayload()).expect(401)
          : await requestBuilder.expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Not authorized, token failed");
    }
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

    expectValidationError(response, [
      "deviceId",
      "accelerometer.x",
      "accelerometer.y",
      "accelerometer.z",
      "gyroscope.x",
      "gyroscope.y",
      "gyroscope.z",
    ]);
  });

  it("rejects invalid sensor numeric fields", async () => {
    const response = await request(app)
      .post("/api/sensor-data")
      .set("Authorization", `Bearer ${token}`)
      .send(
        buildSensorPayload({
          deviceId: 123,
          accelerometer: {
            x: "1",
            y: 0,
            z: 0,
          },
          gyroscope: {
            x: 0,
            y: "0",
            z: 0,
          },
        })
      )
      .expect(400);

    expectValidationError(response, [
      "deviceId",
      "accelerometer.x",
      "gyroscope.y",
    ]);
  });

  it("rejects invalid sensor timestamp", async () => {
    const response = await request(app)
      .post("/api/sensor-data")
      .set("Authorization", `Bearer ${token}`)
      .send(buildSensorPayload({ timestamp: "not-a-date" }))
      .expect(400);

    expectValidationError(response, ["timestamp"]);
  });

  it("lists sensor data newest first", async () => {
    await request(app)
      .post("/api/sensor-data")
      .set("Authorization", `Bearer ${token}`)
      .send(
        buildSensorPayload({
          deviceId: "old-device",
          timestamp: "2026-05-18T10:00:00.000Z",
        })
      )
      .expect(201);

    await wait(5);

    await request(app)
      .post("/api/sensor-data")
      .set("Authorization", `Bearer ${token}`)
      .send(
        buildSensorPayload({
          deviceId: "new-device",
          timestamp: "2026-05-19T10:00:00.000Z",
        })
      )
      .expect(201);

    const response = await request(app)
      .get("/api/sensor-data")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.count).toBe(2);
    expect(response.body.page).toBe(1);
    expect(response.body.limit).toBe(10);
    expect(response.body.total).toBe(2);
    expect(response.body.pages).toBe(1);
    expect(response.body.data[0].deviceId).toBe("new-device");
  });

  it("paginates sensor data", async () => {
    await request(app)
      .post("/api/sensor-data")
      .set("Authorization", `Bearer ${token}`)
      .send(
        buildSensorPayload({
          deviceId: "page-1",
          timestamp: "2026-05-18T10:00:00.000Z",
        })
      )
      .expect(201);

    await request(app)
      .post("/api/sensor-data")
      .set("Authorization", `Bearer ${token}`)
      .send(
        buildSensorPayload({
          deviceId: "page-2",
          timestamp: "2026-05-19T10:00:00.000Z",
        })
      )
      .expect(201);

    await request(app)
      .post("/api/sensor-data")
      .set("Authorization", `Bearer ${token}`)
      .send(
        buildSensorPayload({
          deviceId: "page-3",
          timestamp: "2026-05-20T10:00:00.000Z",
        })
      )
      .expect(201);

    const response = await request(app)
      .get("/api/sensor-data?page=2&limit=2")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.count).toBe(1);
    expect(response.body.page).toBe(2);
    expect(response.body.limit).toBe(2);
    expect(response.body.total).toBe(3);
    expect(response.body.pages).toBe(2);
    expect(response.body.data[0].deviceId).toBe("page-1");
  });

  it("filters sensor data by device, fall status, and timestamp range", async () => {
    await request(app)
      .post("/api/sensor-data")
      .set("Authorization", `Bearer ${token}`)
      .send(
        buildSensorPayload({
          deviceId: "watch-1",
          timestamp: "2026-05-18T10:00:00.000Z",
          accelerometer: {
            x: 3,
            y: 0,
            z: 0,
          },
        })
      )
      .expect(201);

    await request(app)
      .post("/api/sensor-data")
      .set("Authorization", `Bearer ${token}`)
      .send(
        buildSensorPayload({
          deviceId: "watch-1",
          timestamp: "2026-05-19T10:00:00.000Z",
        })
      )
      .expect(201);

    await request(app)
      .post("/api/sensor-data")
      .set("Authorization", `Bearer ${token}`)
      .send(
        buildSensorPayload({
          deviceId: "watch-2",
          timestamp: "2026-05-20T10:00:00.000Z",
          accelerometer: {
            x: 3,
            y: 0,
            z: 0,
          },
        })
      )
      .expect(201);

    const response = await request(app)
      .get(
        "/api/sensor-data?deviceId=watch-1&isFallDetected=true&startDate=2026-05-18T00:00:00.000Z&endDate=2026-05-18T23:59:59.999Z"
      )
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.count).toBe(1);
    expect(response.body.total).toBe(1);
    expect(response.body.data[0].deviceId).toBe("watch-1");
    expect(response.body.data[0].isFallDetected).toBe(true);
  });

  it("returns only sensor data for the authenticated user", async () => {
    await request(app)
      .post("/api/sensor-data")
      .set("Authorization", `Bearer ${token}`)
      .send(buildSensorPayload({ deviceId: "own-device" }))
      .expect(201);

    const otherUserResponse = await request(app).post("/api/auth/register").send({
      name: "Other Sensor User",
      email: "other-sensor@example.com",
      password: "password123",
    });

    await request(app)
      .post("/api/sensor-data")
      .set("Authorization", `Bearer ${otherUserResponse.body.token}`)
      .send(buildSensorPayload({ deviceId: "other-device" }))
      .expect(201);

    const response = await request(app)
      .get("/api/sensor-data")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.count).toBe(1);
    expect(response.body.total).toBe(1);
    expect(response.body.data[0].deviceId).toBe("own-device");
  });

  it("rejects invalid sensor data query params", async () => {
    const response = await request(app)
      .get(
        "/api/sensor-data?page=0&limit=101&isFallDetected=maybe&startDate=invalid-date&endDate=also-invalid"
      )
      .set("Authorization", `Bearer ${token}`)
      .expect(400);

    expectValidationError(response, [
      "page",
      "limit",
      "isFallDetected",
      "startDate",
      "endDate",
    ]);
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

  it("returns latest sensor data only for the authenticated user", async () => {
    await request(app)
      .post("/api/sensor-data")
      .set("Authorization", `Bearer ${token}`)
      .send(
        buildSensorPayload({
          deviceId: "own-latest",
          timestamp: "2026-05-18T10:00:00.000Z",
        })
      )
      .expect(201);

    const otherUserResponse = await request(app).post("/api/auth/register").send({
      name: "Other Latest User",
      email: "other-latest@example.com",
      password: "password123",
    });

    await request(app)
      .post("/api/sensor-data")
      .set("Authorization", `Bearer ${otherUserResponse.body.token}`)
      .send(
        buildSensorPayload({
          deviceId: "other-latest",
          timestamp: "2026-05-20T10:00:00.000Z",
        })
      )
      .expect(201);

    const response = await request(app)
      .get("/api/sensor-data/latest")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.data.deviceId).toBe("own-latest");
    expect(response.body.data.userId).toBe(userId);
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

  it("lists only fall detected data for the authenticated user", async () => {
    await request(app)
      .post("/api/sensor-data")
      .set("Authorization", `Bearer ${token}`)
      .send(
        buildSensorPayload({
          deviceId: "own-fall",
          accelerometer: {
            x: 3,
            y: 0,
            z: 0,
          },
        })
      )
      .expect(201);

    const otherUserResponse = await request(app).post("/api/auth/register").send({
      name: "Other Falls User",
      email: "other-falls@example.com",
      password: "password123",
    });

    await request(app)
      .post("/api/sensor-data")
      .set("Authorization", `Bearer ${otherUserResponse.body.token}`)
      .send(
        buildSensorPayload({
          deviceId: "other-fall",
          accelerometer: {
            x: 3,
            y: 0,
            z: 0,
          },
        })
      )
      .expect(201);

    const response = await request(app)
      .get("/api/sensor-data/falls")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.count).toBe(1);
    expect(response.body.data[0].deviceId).toBe("own-fall");
    expect(response.body.data[0].userId).toBe(userId);
  });
});
