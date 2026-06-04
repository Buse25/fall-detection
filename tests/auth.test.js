const request = require("supertest");
const app = require("../src/app");
const User = require("../src/models/User");

describe("Auth endpoints", () => {
  const userPayload = {
    name: "Test User",
    email: "test@example.com",
    password: "password123",
  };

  const expectValidationError = (response, expectedPaths) => {
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Validation failed");
    expect(response.body.errors).toEqual(expect.any(Array));
    expect(response.body.errors.map((error) => error.path)).toEqual(
      expect.arrayContaining(expectedPaths)
    );
  };

  it("registers a user", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send(userPayload)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.token).toBeDefined();
    expect(response.body.user).toMatchObject({
      name: userPayload.name,
      email: userPayload.email,
    });
    expect(response.body.user.password).toBeUndefined();
  });

  it("rejects registration with missing fields", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({ email: "missing@example.com" })
      .expect(400);

    expectValidationError(response, ["name", "password"]);
  });

  it("rejects registration with invalid email and short password", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Test User",
        email: "not-an-email",
        password: "12345",
      })
      .expect(400);

    expectValidationError(response, ["email", "password"]);
  });

  it("rejects duplicate emails", async () => {
    await request(app).post("/api/auth/register").send(userPayload).expect(201);

    const response = await request(app)
      .post("/api/auth/register")
      .send(userPayload)
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("User already exists");
  });

  it("logs in a registered user", async () => {
    await request(app).post("/api/auth/register").send(userPayload).expect(201);

    const response = await request(app)
      .post("/api/auth/login")
      .send({
        email: userPayload.email,
        password: userPayload.password,
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.token).toBeDefined();
    expect(response.body.user.email).toBe(userPayload.email);
  });

  it("rejects login with an invalid password", async () => {
    await request(app).post("/api/auth/register").send(userPayload).expect(201);

    const response = await request(app)
      .post("/api/auth/login")
      .send({
        email: userPayload.email,
        password: "wrong-password",
      })
      .expect(401);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Invalid email or password");
  });

  it("rejects login with invalid email and missing password", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "not-an-email" })
      .expect(400);

    expectValidationError(response, ["email", "password"]);
  });

  it("returns the current user with a valid token", async () => {
    const registerResponse = await request(app)
      .post("/api/auth/register")
      .send(userPayload)
      .expect(201);

    const response = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${registerResponse.body.token}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.user.email).toBe(userPayload.email);
    expect(response.body.user.password).toBeUndefined();
  });

  it("rejects /me without a token", async () => {
    const response = await request(app).get("/api/auth/me").expect(401);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Not authorized, no token");
  });

  it("rejects /me with an invalid token", async () => {
    const response = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer invalid-token")
      .expect(401);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Not authorized, token failed");
  });

  it("rejects admin endpoint without a token", async () => {
    const response = await request(app).get("/api/admin/example").expect(401);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Not authorized, no token");
  });

  it("rejects admin endpoint with an invalid token", async () => {
    const response = await request(app)
      .get("/api/admin/example")
      .set("Authorization", "Bearer invalid-token")
      .expect(401);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Not authorized, token failed");
  });

  it("rejects admin endpoint for non-admin users", async () => {
    const registerResponse = await request(app)
      .post("/api/auth/register")
      .send(userPayload)
      .expect(201);

    const response = await request(app)
      .get("/api/admin/example")
      .set("Authorization", `Bearer ${registerResponse.body.token}`)
      .expect(403);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Admin access required");
  });

  it("allows admin users to access admin endpoint", async () => {
    const registerResponse = await request(app)
      .post("/api/auth/register")
      .send(userPayload)
      .expect(201);

    await User.findOneAndUpdate(
      { email: userPayload.email },
      { role: "admin" }
    );

    const response = await request(app)
      .get("/api/admin/example")
      .set("Authorization", `Bearer ${registerResponse.body.token}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe("Admin endpoint accessed successfully");
  });
});
