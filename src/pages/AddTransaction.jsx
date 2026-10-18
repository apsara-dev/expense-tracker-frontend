import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/axios";
import ThemeToggle from "../components/ThemeToggle";
import { getInitialTheme, applyTheme } from "../utils/theme";
import "./dashboard.css";
import "./auth.css";

const QUICK_TAGS = [
  { label: "Salary", type: "income", icon: "💼" },
  { label: "Freelance", type: "income", icon: "💻" },
  { label: "Investments", type: "income", icon: "📈" },
  { label: "Bonus", type: "income", icon: "🎁" },
  { label: "Groceries", type: "expense", icon: "🛒" },
  { label: "Rent / Housing", type: "expense", icon: "🏠" },
  { label: "Dining Out", type: "expense", icon: "🍔" },
  { label: "Utilities & Bills", type: "expense", icon: "⚡" },
  { label: "Transportation", type: "expense", icon: "🚗" },
  { label: "Shopping", type: "expense", icon: "🛍️" },
  { label: "Healthcare", type: "expense", icon: "💊" },
  { label: "Entertainment", type: "expense", icon: "🎬" },
];

function AddTransaction() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("expense");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const darkMode = getInitialTheme() === "dark";

  useEffect(() => {
    applyTheme(darkMode ? "dark" : "light");
    if (!localStorage.getItem("access")) {
      navigate("/login");
    }
  }, [darkMode, navigate]);

  // If in edit mode, fetch existing transaction
  useEffect(() => {
    if (editId) {
      const loadTransaction = async () => {
        try {
          setFetching(true);
          const res = await api.get(`transactions/${editId}/`);
          setTitle(res.data.title || "");
          setAmount(res.data.amount?.toString() || "");
          setType(res.data.type || "expense");
          if (res.data.date) {
            setDate(new Date(res.data.date).toISOString().slice(0, 10));
          }
        } catch (err) {
          setError("Failed to load transaction details.");
          console.error(err);
        } finally {
          setFetching(false);
        }
      };
      loadTransaction();
    }
  }, [editId]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError("");
    setSuccess("");

    if (!title.trim() || !amount) {
      setError("Please provide both a description and amount.");
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Please enter a valid positive amount.");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        title: title.trim(),
        amount: parsedAmount,
        type,
        date: new Date(date).toISOString(),
      };

      if (editId) {
        await api.put(`transactions/${editId}/`, payload);
        setSuccess("Transaction updated successfully!");
      } else {
        await api.post("transactions/", payload);
        setSuccess("Transaction recorded successfully!");
      }

      setTimeout(() => {
        navigate("/dashboard");
      }, 1000);
    } catch (err) {
      setError(
        err.response?.data?.error || "Failed to save transaction. Please check your network."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSelectQuickTag = (tag) => {
    setTitle(tag.label);
    setType(tag.type);
  };

  return (
    <div className={`dashboard-wrapper ${darkMode ? "theme-dark" : "theme-light"}`}>
      {/* Top Navbar */}
      <header className="dash-navbar">
        <div className="dash-nav-container">
          <div className="dash-brand">
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="back-nav-btn"
              title="Return to Dashboard"
            >
              ← Back to Dashboard
            </button>
          </div>

          <div className="dash-user-actions">
            <ThemeToggle showText={false} />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="dash-main-container">
        <div className="add-tx-page-card">
          <div className="add-tx-header">
            <span className="add-tx-icon-badge">
              {editId ? "✏️" : type === "income" ? "↗" : "↘"}
            </span>
            <div>
              <h1 className="add-tx-title">
                {editId ? "Edit Transaction" : "New Transaction"}
              </h1>
              <p className="add-tx-subtitle">
                {editId
                  ? "Update the record details below"
                  : "Record an income or expense with accurate tracking"}
              </p>
            </div>
          </div>

          {error && <div className="auth-alert-error">{error}</div>}
          {success && <div className="auth-alert-success">{success}</div>}
          {fetching && <div className="tx-loading-hint">Loading transaction details...</div>}

          <form onSubmit={handleSubmit} className="add-tx-form">
            {/* Type Switcher */}
            <div className="tx-type-selector">
              <button
                type="button"
                className={`tx-type-btn btn-type-income ${type === "income" ? "selected" : ""}`}
                onClick={() => setType("income")}
              >
                <span className="type-dot dot-income">●</span>
                <span>Income (Credit)</span>
              </button>

              <button
                type="button"
                className={`tx-type-btn btn-type-expense ${type === "expense" ? "selected" : ""}`}
                onClick={() => setType("expense")}
              >
                <span className="type-dot dot-expense">●</span>
                <span>Expense (Debit)</span>
              </button>
            </div>

            {/* Big Amount Input */}
            <div className="tx-amount-hero-box">
              <span className="hero-currency-symbol">₹</span>
              <input
                type="number"
                placeholder="0.00"
                step="any"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="hero-amount-input"
                autoFocus
                required
              />
            </div>

            {/* Quick Category Chips */}
            <div className="quick-tags-section">
              <span className="quick-tags-label">Quick Suggestions:</span>
              <div className="quick-tags-cloud">
                {QUICK_TAGS.filter((t) => t.type === type).map((t) => (
                  <button
                    key={t.label}
                    type="button"
                    onClick={() => handleSelectQuickTag(t)}
                    className={`quick-tag-chip ${title === t.label ? "active-chip" : ""}`}
                  >
                    <span>{t.icon}</span>
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Title / Description */}
            <div className="add-tx-field-group">
              <label htmlFor="tx-title-input" className="tx-field-label">
                Description / Title
              </label>
              <input
                id="tx-title-input"
                type="text"
                placeholder="e.g. Monthly Salary, Weekly Groceries, Electricity Bill..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="tx-field-input"
                required
              />
            </div>

            {/* Date Input */}
            <div className="add-tx-field-group">
              <label htmlFor="tx-date-input" className="tx-field-label">
                Transaction Date
              </label>
              <input
                id="tx-date-input"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="tx-field-input"
                required
              />
            </div>

            {/* Live Preview Card */}
            {amount && title && (
              <div className="tx-live-preview">
                <span className="preview-label">LIVE PREVIEW</span>
                <div
                  className={`transaction-item ${
                    type === "income" ? "border-income" : "border-expense"
                  }`}
                >
                  <div className="t-left">
                    <div
                      className={`t-icon-box ${
                        type === "income" ? "t-icon-income" : "t-icon-expense"
                      }`}
                    >
                      {type === "income" ? "↗" : "↘"}
                    </div>
                    <div className="t-details">
                      <h4 className="t-title">{title}</h4>
                      <span className="t-date">
                        {new Date(date).toLocaleDateString("en-IN", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="t-right">
                    <span
                      className={`t-amount ${type === "income" ? "text-income" : "text-expense"}`}
                    >
                      {type === "income" ? "+" : "-"} ₹ {Number(amount).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Submit & Cancel Buttons */}
            <div className="add-tx-action-row">
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="btn-tx-cancel"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={loading || fetching}
                className="btn-tx-submit"
              >
                {loading
                  ? "Saving Transaction..."
                  : editId
                  ? "Update Transaction ✓"
                  : "+ Save Transaction"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

export default AddTransaction;
