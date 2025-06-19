import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./Header.css";
import logo from "/assets/logo.png";

const Header = () => {
  const { logout } = useAuth();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      logout();
    }
  };

  return (
    <header className="header">
      <div className="header-container">
        <div className="header-left">
          <Link to="/dashboard" className="logo">
            <img src={logo} width={"30px"} alt="logo" />
            {/* <span className="logo-text">HHH</span> */}
            <span className="logo-subtitle">SMART HOME SYSTEM</span>
          </Link>
        </div>

        <nav className="header-nav">
          <Link
            to="/dashboard"
            className={`nav-link ${isActive("/dashboard") ? "active" : ""}`}
          >
            Dashboard
          </Link>
          <Link
            to="/3d-home"
            className={`nav-link ${isActive("/3d-home") ? "active" : ""}`}
          >
            3D Home
          </Link>
        </nav>

        <div className="header-right">
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
