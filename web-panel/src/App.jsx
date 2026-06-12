/**
 * App.jsx — React Router yönlendirici + Korumalı rota mantığı
 */
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

import LoginPage        from "./pages/LoginPage";
import DashboardPage    from "./pages/DashboardPage";
import DevicesPage      from "./pages/DevicesPage";
import AlarmHistoryPage from "./pages/AlarmHistoryPage";
import ProfilePage      from "./pages/ProfilePage";

/**
 * ProtectedRoute:
 *  1. token yoksa → /login
 *  2. user.role !== 'admin' ise → localStorage temizle, /login
 *     (localStorage'dan eski user kaldığında ikinci savunma katmanı)
 */
function ProtectedRoute({ children }) {
  const { token, user, logout } = useAuth();

  if (!token) return <Navigate to="/login" replace />;

  // Rol kontrolü: admin olmayan token'lar frontend'den de engellenir
  if (user && user.role !== "admin") {
    logout(); // token + user temizle
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/devices"
          element={
            <ProtectedRoute>
              <DevicesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/alarms"
          element={
            <ProtectedRoute>
              <AlarmHistoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        {/* Kök → dashboard */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* 404 → dashboard */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
