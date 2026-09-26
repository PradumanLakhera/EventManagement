import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./adminlogin.css";

function AdminLogin() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    const cleanUsername = username.trim();

    if (!cleanUsername || !password) {
      setError("Username and password are required.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "http://localhost:5000/api/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            username: cleanUsername,
            password
          })
        }
      );

      let data = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok) {
        sessionStorage.removeItem("meetafriendToken");

        setError(
          data.message ||
            "Invalid username or password."
        );

        return;
      }

      if (!data.token) {
        sessionStorage.removeItem("meetafriendToken");
        setError("Login succeeded, but no authentication token was received.");
        return;
      }

      sessionStorage.setItem(
        "meetafriendToken",
        data.token
      );

      navigate("/admin/dashboard", {
        replace: true
      });
    } catch {
      setError("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="admin-login">
      <section className="admin-login-left">
        <div className="admin-login-pattern" />

        <header className="admin-login-brand">
          <img
            src="/icon.png"
            alt="Heroes Dutch Comic Con"
          />

          <div className="admin-login-brand-text">
            <strong>Heroes Dutch Comic Con</strong>
            <span>EVENT MANAGEMENT</span>
          </div>
        </header>

        <div className="admin-login-intro">
          <span className="admin-login-label">
            ADMINISTRATION
          </span>

          <h1>
            Manage the
            <br />
            event.
          </h1>

          <p>
            Control rooms, participants and
            groups from one place.
          </p>
        </div>

        <div className="admin-login-footer">
          <span>HDCC</span>
          <span>ADMIN PORTAL</span>
        </div>
      </section>

      <section className="admin-login-right">
        <div className="admin-login-card">
          <div className="admin-login-heading">
            <span>ADMIN LOGIN</span>

            <h2>Welcome back.</h2>

            <p>
              Sign in to access the event
              dashboard.
            </p>
          </div>

          <form
            className="admin-login-form"
            onSubmit={handleSubmit}
          >
            <div className="admin-login-field">
              <label htmlFor="username">
                USERNAME
              </label>

              <div className="admin-login-input">
                <span className="admin-login-input-icon">
                  @
                </span>

                <input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(event) =>
                    setUsername(event.target.value)
                  }
                  autoComplete="username"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="admin-login-field">
              <label htmlFor="password">
                PASSWORD
              </label>

              <div className="admin-login-input">
                <span className="admin-login-input-icon">
                  •••
                </span>

                <input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  autoComplete="current-password"
                  disabled={loading}
                />
              </div>
            </div>

            {error && (
              <div className="admin-login-error">
                <span>!</span>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="admin-login-submit"
              disabled={loading}
            >
              <span>
                {loading
                  ? "Signing in..."
                  : "Sign in"}
              </span>

              {!loading && (
                <span className="admin-login-arrow">
                  →
                </span>
              )}
            </button>
          </form>

          <div className="admin-login-bottom">
            <span>
              Heroes Dutch Comic Con
            </span>

            <span>
              SECURE ADMIN ACCESS
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}

export default AdminLogin;