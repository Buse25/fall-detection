const request = require("supertest");
const app = require("../src/app");
const EmergencyContact = require("../src/models/EmergencyContact");

const createAuthenticatedUser = async (
  email = "emergency-contact@example.com"
) => {
  const response = await request(app).post("/api/auth/register").send({
    name: "Emergency User",
    email,
    password: "password123",
  });

  return {
    token: response.body.token,
    userId: response.body.user.id,
  };
};

const buildContactPayload = (overrides = {}) => ({
  name: "Jane Doe",
  phone: "+905551112233",
  relationship: "Sister",
  ...overrides,
});

describe("Emergency contact endpoints", () => {
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
    const auth = await createAuthenticatedUser();
    token = auth.token;
    userId = auth.userId;
  });

  it("rejects requests without a token", async () => {
    const response = await request(app)
      .get("/api/emergency-contacts")
      .expect(401);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Not authorized, no token");
  });

  it("rejects requests with an invalid token", async () => {
    const response = await request(app)
      .get("/api/emergency-contacts")
      .set("Authorization", "Bearer invalid-token")
      .expect(401);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Not authorized, token failed");
  });

  it("creates an emergency contact for the authenticated user", async () => {
    const response = await request(app)
      .post("/api/emergency-contacts")
      .set("Authorization", `Bearer ${token}`)
      .send(buildContactPayload({ userId: "spoofed-user" }))
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      name: "Jane Doe",
      phone: "+905551112233",
      relationship: "Sister",
      isPrimary: false,
    });
    expect(response.body.data.userId).toBe(userId);
  });

  it("returns validation errors for missing required fields", async () => {
    const response = await request(app)
      .post("/api/emergency-contacts")
      .set("Authorization", `Bearer ${token}`)
      .send({})
      .expect(400);

    expectValidationError(response, ["name", "phone"]);
  });

  it("lists only the authenticated user's emergency contacts newest first", async () => {
    await request(app)
      .post("/api/emergency-contacts")
      .set("Authorization", `Bearer ${token}`)
      .send(buildContactPayload({ name: "Old Contact" }))
      .expect(201);

    await request(app)
      .post("/api/emergency-contacts")
      .set("Authorization", `Bearer ${token}`)
      .send(buildContactPayload({ name: "New Contact" }))
      .expect(201);

    const otherUser = await createAuthenticatedUser("other-contact@example.com");

    await request(app)
      .post("/api/emergency-contacts")
      .set("Authorization", `Bearer ${otherUser.token}`)
      .send(buildContactPayload({ name: "Other Contact" }))
      .expect(201);

    const response = await request(app)
      .get("/api/emergency-contacts")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.count).toBe(2);
    expect(response.body.data.map((contact) => contact.name)).toEqual([
      "New Contact",
      "Old Contact",
    ]);
    expect(
      response.body.data.every((contact) => contact.userId === userId)
    ).toBe(true);
  });

  it("gets an emergency contact by id", async () => {
    const createResponse = await request(app)
      .post("/api/emergency-contacts")
      .set("Authorization", `Bearer ${token}`)
      .send(buildContactPayload())
      .expect(201);

    const response = await request(app)
      .get(`/api/emergency-contacts/${createResponse.body.data._id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data._id).toBe(createResponse.body.data._id);
    expect(response.body.data.userId).toBe(userId);
  });

  it("prevents access to another user's emergency contact", async () => {
    const otherUser = await createAuthenticatedUser(
      "other-private-contact@example.com"
    );

    const createResponse = await request(app)
      .post("/api/emergency-contacts")
      .set("Authorization", `Bearer ${otherUser.token}`)
      .send(buildContactPayload({ name: "Private Contact" }))
      .expect(201);

    const response = await request(app)
      .get(`/api/emergency-contacts/${createResponse.body.data._id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(404);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Emergency contact not found");
  });

  it("updates an emergency contact", async () => {
    const createResponse = await request(app)
      .post("/api/emergency-contacts")
      .set("Authorization", `Bearer ${token}`)
      .send(buildContactPayload())
      .expect(201);

    const response = await request(app)
      .put(`/api/emergency-contacts/${createResponse.body.data._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Updated Contact",
        phone: "+905559998877",
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      name: "Updated Contact",
      phone: "+905559998877",
      relationship: "Sister",
    });
    expect(response.body.data.userId).toBe(userId);
  });

  it("marks other contacts as non-primary when one contact is primary", async () => {
    const firstResponse = await request(app)
      .post("/api/emergency-contacts")
      .set("Authorization", `Bearer ${token}`)
      .send(buildContactPayload({ name: "First", isPrimary: true }))
      .expect(201);

    const secondResponse = await request(app)
      .post("/api/emergency-contacts")
      .set("Authorization", `Bearer ${token}`)
      .send(buildContactPayload({ name: "Second", isPrimary: true }))
      .expect(201);

    const firstContact = await EmergencyContact.findById(
      firstResponse.body.data._id
    );
    const secondContact = await EmergencyContact.findById(
      secondResponse.body.data._id
    );

    expect(firstContact.isPrimary).toBe(false);
    expect(secondContact.isPrimary).toBe(true);

    await request(app)
      .put(`/api/emergency-contacts/${firstResponse.body.data._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ isPrimary: true })
      .expect(200);

    const updatedFirstContact = await EmergencyContact.findById(
      firstResponse.body.data._id
    );
    const updatedSecondContact = await EmergencyContact.findById(
      secondResponse.body.data._id
    );

    expect(updatedFirstContact.isPrimary).toBe(true);
    expect(updatedSecondContact.isPrimary).toBe(false);
  });

  it("deletes an emergency contact", async () => {
    const createResponse = await request(app)
      .post("/api/emergency-contacts")
      .set("Authorization", `Bearer ${token}`)
      .send(buildContactPayload())
      .expect(201);

    const response = await request(app)
      .delete(`/api/emergency-contacts/${createResponse.body.data._id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe(
      "Emergency contact deleted successfully"
    );
  });

  it("does not find a deleted emergency contact", async () => {
    const createResponse = await request(app)
      .post("/api/emergency-contacts")
      .set("Authorization", `Bearer ${token}`)
      .send(buildContactPayload())
      .expect(201);

    await request(app)
      .delete(`/api/emergency-contacts/${createResponse.body.data._id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const response = await request(app)
      .get(`/api/emergency-contacts/${createResponse.body.data._id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(404);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Emergency contact not found");
  });
});
