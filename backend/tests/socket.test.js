const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../src/models/User");

let mockIo;

jest.mock("socket.io", () => ({
  Server: jest.fn().mockImplementation(() => mockIo),
}));

const initSocket = require("../src/sockets/socket");

const runMiddleware = (middleware, socket) =>
  new Promise((resolve) => {
    middleware(socket, (error) => resolve(error));
  });

const createUserAndToken = async (email = "socket@example.com") => {
  const user = await User.create({
    name: "Socket User",
    email,
    password: "password123",
  });

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

  return { user, token };
};

describe("Socket authentication", () => {
  beforeEach(() => {
    mockIo = {
      use: jest.fn(),
      on: jest.fn(),
    };
  });

  it("authenticates a socket with handshake auth token", async () => {
    const { user, token } = await createUserAndToken();

    initSocket({});

    const middleware = mockIo.use.mock.calls[0][0];
    const socket = {
      handshake: {
        auth: { token },
        headers: {},
      },
    };

    const error = await runMiddleware(middleware, socket);

    expect(error).toBeUndefined();
    expect(socket.user._id.toString()).toBe(user._id.toString());
    expect(socket.user.password).toBeUndefined();
  });

  it("authenticates a socket with Bearer authorization header", async () => {
    const { user, token } = await createUserAndToken("header@example.com");

    initSocket({});

    const middleware = mockIo.use.mock.calls[0][0];
    const socket = {
      handshake: {
        auth: {},
        headers: {
          authorization: `Bearer ${token}`,
        },
      },
    };

    const error = await runMiddleware(middleware, socket);

    expect(error).toBeUndefined();
    expect(socket.user._id.toString()).toBe(user._id.toString());
  });

  it("rejects sockets without a valid user", async () => {
    const token = jwt.sign(
      { id: new mongoose.Types.ObjectId() },
      process.env.JWT_SECRET
    );

    initSocket({});

    const middleware = mockIo.use.mock.calls[0][0];
    const socket = {
      handshake: {
        auth: { token },
        headers: {},
      },
    };

    const error = await runMiddleware(middleware, socket);

    expect(error).toEqual(new Error("Authentication failed"));
    expect(socket.user).toBeUndefined();
  });

  it("uses authenticated user id in sensor_window logs", async () => {
    const { user } = await createUserAndToken("logs@example.com");
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    initSocket({});

    const connectionHandler = mockIo.on.mock.calls.find(
      ([eventName]) => eventName === "connection"
    )[1];
    const socket = {
      id: "socket-1",
      user,
      on: jest.fn(),
    };

    connectionHandler(socket);

    const sensorWindowHandler = socket.on.mock.calls.find(
      ([eventName]) => eventName === "sensor_window"
    )[1];

    sensorWindowHandler({
      userId: "spoofed-user",
      readings: [{}, {}],
    });

    expect(consoleSpy).toHaveBeenLastCalledWith(
      expect.stringContaining(`userId: ${user._id}`)
    );
    expect(consoleSpy).not.toHaveBeenLastCalledWith(
      expect.stringContaining("spoofed-user")
    );

    consoleSpy.mockRestore();
  });
});
