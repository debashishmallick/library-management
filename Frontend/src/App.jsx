import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Books from "./pages/Books";
import Issues from "./pages/Issues";
import Members from "./pages/Members";
import MyBooks from "./pages/MyBooks";
import Reservations from "./pages/Reservations";
import Profile from "./pages/Profile";

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Toaster position="top-right" />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Any logged-in user */}
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/books" element={<Books />} />
                <Route path="/my-books" element={<MyBooks />} />
                <Route path="/profile" element={<Profile />} />
              </Route>
            </Route>

            {/* Staff only */}
            <Route element={<ProtectedRoute roles={["admin", "librarian"]} />}>
              <Route element={<Layout />}>
                <Route path="/members" element={<Members />} />
                <Route path="/issues" element={<Issues />} />
                <Route path="/reservations" element={<Reservations />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}