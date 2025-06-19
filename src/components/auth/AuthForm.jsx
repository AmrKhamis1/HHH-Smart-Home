import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { authAPI } from "../../services/api";
import { validateInputs } from "../../utils/auth";
import "./AuthForm.css";
import logo from "/assets/logo.png";

const AuthForm = () => {
  const { login, isAuthenticated } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
    fname: "",
    lname: "",
    email: "",
    password: "",
    rPassword: "",
  });

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear errors when user starts typing
    if (error) setError("");
    if (success) setSuccess("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const validation = validateInputs(isSignUp, formData);
    if (!validation.isValid) {
      setError(validation.message);
      return;
    }

    setIsLoading(true);

    try {
      if (isSignUp) {
        const response = await authAPI.register(
          formData.fname,
          formData.lname,
          formData.email,
          formData.password
        );

        if (response.error) {
          setError(response.message || "Registration failed");
        } else {
          setSuccess("Account created successfully! You can now log in.");
          setIsSignUp(false);
          setFormData({
            fname: "",
            lname: "",
            email: formData.email,
            password: "",
            rPassword: "",
          });
        }
      } else {
        const response = await authAPI.login(formData.email, formData.password);

        if (response.error) {
          setError(response.error);
        } else {
          login(response.user, response.success);
        }
      }
    } catch (error) {
      setError(
        isSignUp
          ? "Registration failed. Please try again."
          : "Login failed. Please try again."
      );
      console.error("Auth error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setError("");
    setSuccess("");
    setFormData({
      fname: "",
      lname: "",
      email: "",
      password: "",
      rPassword: "",
    });
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          {!isSignUp && (
            <div className="logo-container">
              <div className="auth-logo">
                <img src={logo} width={"100px"} alt="logo" />
              </div>
            </div>
          )}
          <h1 className="auth-title">
            {isSignUp ? "Create Account" : "Login"}
          </h1>
          {!isSignUp && (
            <p className="auth-subtitle">Welcome! Please enter your details</p>
          )}
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          {isSignUp && (
            <div className="name-row">
              <div className="input-group">
                <label className="input-label">First Name</label>
                <input
                  type="text"
                  name="fname"
                  value={formData.fname}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="John"
                  required={isSignUp}
                />
              </div>
              <div className="input-group">
                <label className="input-label">Last Name</label>
                <input
                  type="text"
                  name="lname"
                  value={formData.lname}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="Doe"
                  required={isSignUp}
                />
              </div>
            </div>
          )}

          <div className="input-group">
            <label className="input-label">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="input-field"
              placeholder="example@gmail.com"
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label">Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className="input-field"
              placeholder="Enter your password"
              required
            />
          </div>

          {isSignUp && (
            <div className="input-group">
              <label className="input-label">Confirm Password</label>
              <input
                type="password"
                name="rPassword"
                value={formData.rPassword}
                onChange={handleInputChange}
                className="input-field"
                placeholder="Re-enter your password"
                required={isSignUp}
              />
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={isLoading}
          >
            {isLoading
              ? isSignUp
                ? "Creating Account..."
                : "Logging in..."
              : isSignUp
              ? "Sign Up"
              : "Login"}
          </button>
        </form>

        <div className="auth-footer">
          <button onClick={toggleMode} className="toggle-mode-btn">
            {isSignUp ? "Already have an account? " : "Don't have an account? "}
            <span className="toggle-mode-link">
              {isSignUp ? "Login" : "Sign Up"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthForm;
