const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
};

let mockSearchParams = {};
let mockPathname = "/(tabs)/home";

global.__setExpoRouterParams = (params) => {
  mockSearchParams = params;
};

global.__setExpoRouterPathname = (pathname) => {
  mockPathname = pathname;
};

global.__getExpoRouter = () => mockRouter;

jest.mock("expo-router", () => ({
  router: mockRouter,
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockSearchParams,
  usePathname: () => mockPathname,
  Redirect: ({ href }) => `Redirect:${href}`,
  Stack: Object.assign(({ children }) => children, {
    Screen: ({ children }) => children,
  }),
  Tabs: Object.assign(({ children }) => children, {
    Screen: ({ children }) => children,
  }),
}));

jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  const { Text } = require("react-native");
  const MockIcon = ({ name }) => React.createElement(Text, null, name);
  return {
    MaterialIcons: MockIcon,
    MaterialCommunityIcons: MockIcon,
  };
});

jest.mock("react-native-safe-area-context", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    SafeAreaView: ({ children, ...props }) => React.createElement(View, props, children),
    SafeAreaProvider: ({ children }) => React.createElement(View, null, children),
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});

jest.mock("expo-sensors", () => {
  const createSensor = () => ({
    setUpdateInterval: jest.fn(),
    addListener: jest.fn((listener) => ({
      remove: jest.fn(),
      __listener: listener,
    })),
    isAvailableAsync: jest.fn(() => Promise.resolve(true)),
  });
  return {
    Accelerometer: createSensor(),
    Gyroscope: createSensor(),
  };
});

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

jest.mock("socket.io-client", () => ({
  io: jest.fn(),
}));

beforeEach(() => {
  mockRouter.push.mockClear();
  mockRouter.replace.mockClear();
  mockRouter.back.mockClear();
  mockSearchParams = {};
  mockPathname = "/(tabs)/home";
});
