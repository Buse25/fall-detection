const request = require("supertest");
const app = require("../src/app");
const User = require("../src/models/User");

const wait = (milliseconds) =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });

const buildUserPayload = (email, name = "Test User") => ({
  name,
  email,
  password: "password123",
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

const registerUser = async (payload) => {
  const response = await request(app)
    .post("/api/auth/register")
    .send(payload)
    .expect(201);

  return response.body;
};

const registerAdmin = async () => {
  const admin = await registerUser(
    buildUserPayload("admin@example.com", "Admin User")
  );

  await User.findOneAndUpdate(
    { email: admin.user.email },
    { role: "admin" }
  );

  return admin;
};

describe("Admin dashboard endpoints", () => {
  it("allows admin users to access dashboard endpoints", async () => {
    const admin = await registerAdmin();

    await request(app)
      .get("/api/admin/users")
      .set("Authorization", `Bearer ${admin.token}`)
      .expect(200);

    await request(app)
      .get("/api/admin/falls")
      .set("Authorization", `Bearer ${admin.token}`)
      .expect(200);

    await request(app)
      .get("/api/admin/dashboard")
      .set("Authorization", `Bearer ${admin.token}`)
      .expect(200);
  });

  it("rejects normal users from dashboard endpoints", async () => {
    const user = await registerUser(buildUserPayload("user@example.com"));

    const endpoints = [
      "/api/admin/users",
      "/api/admin/falls",
      "/api/admin/dashboard",
    ];

    for (const endpoint of endpoints) {
      const response = await request(app)
        .get(endpoint)
        .set("Authorization", `Bearer ${user.token}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Admin access required");
    }
  });

  it("rejects dashboard endpoints without a token", async () => {
    const endpoints = [
      "/api/admin/users",
      "/api/admin/falls",
      "/api/admin/dashboard",
    ];

    for (const endpoint of endpoints) {
      const response = await request(app).get(endpoint).expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Not authorized, no token");
    }
  });

  it("lists users without passwords newest first", async () => {
    const admin = await registerAdmin();

    await wait(5);
    await registerUser(buildUserPayload("new-user@example.com", "New User"));

    const response = await request(app)
      .get("/api/admin/users")
      .set("Authorization", `Bearer ${admin.token}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.count).toBe(2);
    expect(response.body.data[0].email).toBe("new-user@example.com");
    expect(response.body.data[0].password).toBeUndefined();
    expect(response.body.data[1].password).toBeUndefined();
  });

  it("paginates fall records for all users newest first", async () => {
    const admin = await registerAdmin();
    const firstUser = await registerUser(buildUserPayload("first@example.com"));
    const secondUser = await registerUser(buildUserPayload("second@example.com"));

    await request(app)
      .post("/api/sensor-data")
      .set("Authorization", `Bearer ${firstUser.token}`)
      .send(
        buildSensorPayload({
          deviceId: "old-fall",
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
      .set("Authorization", `Bearer ${secondUser.token}`)
      .send(
        buildSensorPayload({
          deviceId: "middle-fall",
          timestamp: "2026-05-19T10:00:00.000Z",
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
      .set("Authorization", `Bearer ${firstUser.token}`)
      .send(
        buildSensorPayload({
          deviceId: "new-fall",
          timestamp: "2026-05-20T10:00:00.000Z",
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
      .set("Authorization", `Bearer ${secondUser.token}`)
      .send(buildSensorPayload({ deviceId: "not-a-fall" }))
      .expect(201);

    const response = await request(app)
      .get("/api/admin/falls?page=2&limit=2")
      .set("Authorization", `Bearer ${admin.token}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.count).toBe(1);
    expect(response.body.page).toBe(2);
    expect(response.body.limit).toBe(2);
    expect(response.body.total).toBe(3);
    expect(response.body.pages).toBe(2);
    expect(response.body.data[0].deviceId).toBe("old-fall");
    expect(response.body.data[0].isFallDetected).toBe(true);
  });

  it("returns dashboard totals and latest records", async () => {
    const admin = await registerAdmin();
    const firstUser = await registerUser(buildUserPayload("first@example.com"));
    const secondUser = await registerUser(buildUserPayload("second@example.com"));

    await request(app)
      .post("/api/sensor-data")
      .set("Authorization", `Bearer ${firstUser.token}`)
      .send(
        buildSensorPayload({
          deviceId: "old-normal",
          timestamp: "2026-05-18T10:00:00.000Z",
        })
      )
      .expect(201);

    await request(app)
      .post("/api/sensor-data")
      .set("Authorization", `Bearer ${firstUser.token}`)
      .send(
        buildSensorPayload({
          deviceId: "middle-fall",
          timestamp: "2026-05-19T10:00:00.000Z",
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
      .set("Authorization", `Bearer ${secondUser.token}`)
      .send(
        buildSensorPayload({
          deviceId: "new-fall",
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
      .get("/api/admin/dashboard")
      .set("Authorization", `Bearer ${admin.token}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.totalUsers).toBe(3);
    expect(response.body.data.totalSensorRecords).toBe(3);
    expect(response.body.data.totalFalls).toBe(2);
    expect(response.body.data.latestFalls).toHaveLength(2);
    expect(response.body.data.latestFalls[0].deviceId).toBe("new-fall");
    expect(response.body.data.latestSensorRecords).toHaveLength(3);
    expect(response.body.data.latestSensorRecords[0].deviceId).toBe("new-fall");
  });
});
