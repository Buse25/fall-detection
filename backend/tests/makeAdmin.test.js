const { execFile } = require("child_process");
const path = require("path");
const bcrypt = require("bcryptjs");
const User = require("../src/models/User");

const scriptPath = path.join(__dirname, "..", "scripts", "make-admin.js");

const runMakeAdmin = (username, env = {}) =>
  new Promise((resolve) => {
    execFile(
      process.execPath,
      [scriptPath, username],
      {
        env: {
          ...process.env,
          ...env,
        },
      },
      (error, stdout, stderr) => {
        resolve({
          code: error?.code || 0,
          stdout,
          stderr,
        });
      }
    );
  });

const createUser = async (name, role = "user") => {
  const password = await bcrypt.hash("password123", 10);

  return User.create({
    name,
    email: `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
    password,
    role,
  });
};

describe("make-admin script", () => {
  it("fails when the user cannot be found", async () => {
    const result = await runMakeAdmin("missing-user");

    expect(result.code).toBe(1);
    expect(result.stderr).toContain("User not found: missing-user");
  });

  it("promotes an existing user to admin", async () => {
    await createUser("regular-user");

    const result = await runMakeAdmin("regular-user");
    const user = await User.findOne({ name: "regular-user" });

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("regular-user is now an admin");
    expect(user.role).toBe("admin");
  });

  it("reports when the user is already an admin", async () => {
    await createUser("admin-user", "admin");

    const result = await runMakeAdmin("admin-user");

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("admin-user is already an admin");
  });

  it("fails when multiple users match the username", async () => {
    await createUser("duplicate-user");
    await User.create({
      name: "duplicate-user",
      email: "duplicate.second@example.com",
      password: await bcrypt.hash("password123", 10),
    });

    const result = await runMakeAdmin("duplicate-user");

    expect(result.code).toBe(1);
    expect(result.stderr).toContain("Multiple users found");
  });
});
