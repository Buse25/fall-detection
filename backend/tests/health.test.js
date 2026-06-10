const request = require("supertest");
const app = require("../src/app");

describe("Health endpoints", () => {
  it("returns 200 for /health with production middleware enabled", async () => {
    const response = await request(app).get("/health").expect(200);

    expect(response.body.status).toBe("OK");
    expect(response.body.service).toBe("fall-detection-backend");
    expect(response.body.timestamp).toBeDefined();
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["ratelimit-limit"]).toBeDefined();
  });

  it("returns 200 for /api/health with production middleware enabled", async () => {
    const response = await request(app).get("/api/health").expect(200);

    expect(response.body.status).toBe("OK");
    expect(response.body.service).toBe("fall-detection-backend");
    expect(response.body.timestamp).toBeDefined();
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["ratelimit-limit"]).toBeDefined();
  });
});
