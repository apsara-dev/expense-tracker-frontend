import { useState } from "react";
import api from "../api/axios";
import "./auth.css";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    if (!username || !password) {
      alert("Please enter username and password");
      return;
    }

    try {
      const res = await api.post("login/", { username, password });

      localStorage.setItem("access", res.data.access);

      // clear fields
      setUsername("");
      setPassword("");

      window.location.href = "/dashboard";
    } catch (error) {
      alert("Invalid credentials");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>🔐 Login</h2>

        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="off"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
        />

        <button onClick={handleLogin}>Login</button>

        <p>
          New user? <a href="/register">Register</a>
        </p>
      </div>
    </div>
  );
}

export default Login;