import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import ChatWidget from "./ChatWidget";
import { useAuth } from "../context/AuthContext";

export default function Layout() {
  const { user } = useAuth();

  return (
    <div className="app-shell min-h-screen">
      <Navbar />
      <main className="app-main mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
      {user?.role === "member" && <ChatWidget />}
    </div>
  );
}