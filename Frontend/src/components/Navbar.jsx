import { useState } from "react";
import {
  BookMarked, BookOpen, Bookmark, LayoutDashboard, LibraryBig, LogOut, Menu, Users, X, ClipboardList,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ThemeToggle } from "../context/ThemeContext";

export default function Navbar() {
  const { user, logout, isStaff } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate("/login");
  };

  const linkClass = ({ isActive }) =>
    `nav-link${isActive ? " active" : ""}`;

  return (
    <header className="site-header">
      <nav className="nav-inner mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" aria-label="Main navigation">
        <NavLink to="/" className="brand" onClick={() => setMenuOpen(false)}>
          <span className="brand-mark"><BookOpen size={20} strokeWidth={2.2} /></span>
          <span className="brand-copy">
            <span className="brand-name">Page &amp; Pine</span>
            <span className="brand-caption">Library workspace</span>
          </span>
        </NavLink>

        <div className={`nav-links${menuOpen ? " is-open" : ""}`}>
          <NavLink to="/" end className={linkClass} onClick={() => setMenuOpen(false)}>
            <LayoutDashboard size={17} /> <span>Overview</span>
          </NavLink>
          <NavLink to="/books" className={linkClass} onClick={() => setMenuOpen(false)}>
            <LibraryBig size={17} /> <span>Catalog</span>
          </NavLink>
          {isStaff ? (
            <>
              <NavLink to="/members" className={linkClass} onClick={() => setMenuOpen(false)}>
                <Users size={17} /> <span>Members</span>
              </NavLink>
              <NavLink to="/issues" className={linkClass} onClick={() => setMenuOpen(false)}>
                <ClipboardList size={17} /> <span>Circulation</span>
              </NavLink>
              <NavLink to="/reservations" className={linkClass} onClick={() => setMenuOpen(false)}>
                <Bookmark size={17} /> <span>Reservations</span>
              </NavLink>
            </>
          ) : (
            <NavLink to="/my-books" className={linkClass} onClick={() => setMenuOpen(false)}>
              <BookMarked size={17} /> <span>My loans</span>
            </NavLink>
          )}
        </div>

        <div className="nav-actions">
          <ThemeToggle />
          <NavLink
            to="/profile"
            className="user-chip"
            title="My profile"
            onClick={() => setMenuOpen(false)}
          >
            <span className="user-avatar" aria-hidden="true">{user?.name?.trim()?.[0]?.toUpperCase() || "U"}</span>
            <span className="user-copy">
              <span className="user-name">{user?.name}</span>
              <span className="user-role">{user?.role}</span>
            </span>
          </NavLink>
          <button type="button" onClick={handleLogout} className="logout-button" aria-label="Log out">
            <LogOut size={17} /><span>Log out</span>
          </button>
          <button
            type="button"
            className="mobile-menu-button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </nav>
    </header>
  );
}