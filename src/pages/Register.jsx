import { useState } from "react";
import api from "../api/axios";
import "./auth.css";

function Register() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleRegister = async () => {
    if (!username || !password) {
      alert("Please fill all fields");
      return;
    }

    try {
      await api.post("register/", { username, password });

      alert("User created successfully! Please login.");

      // clear fields
      setUsername("");
      setPassword("");

      window.location.href = "/login";
    } catch (error) {
      alert("Username already exists");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>📝 Register</h2>

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

        <button onClick={handleRegister}>Register</button>

        <p>
          Already have an account? <a href="/login">Login</a>
        </p>
      </div>
    </div>
  );
}

export default Register;