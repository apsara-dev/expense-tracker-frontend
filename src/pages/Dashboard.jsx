import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { Doughnut, Bar } from "react-chartjs-2";
import { motion, AnimatePresence } from "framer-motion";
import "./dashboard.css";

import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
} from "chart.js";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
);

import { getInitialTheme, applyTheme } from "../utils/theme";
import { exportToExcel } from "../utils/exportHelpers";
import PeriodFilter from "../components/PeriodFilter";
import ReportModal from "../components/ReportModal";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function Dashboard() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [budget, setBudget] = useState(
    () => localStorage.getItem("budget") || ""
  );
  const [darkMode, setDarkMode] = useState(() => getInitialTheme() === "dark");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [budgetSavedToast, setBudgetSavedToast] = useState(false);

  // 📅 Period Filtering & Reports State
  const [period, setPeriod] = useState("all"); // "all" | "daily" | "monthly" | "yearly"
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const username = localStorage.getItem("username") || "User";
  const userEmail = localStorage.getItem("email") || "";

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const res = await api.get("transactions/");
      setTransactions(res.data);
    } catch (err) {
      console.error("Failed to fetch transactions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  useEffect(() => {
    applyTheme(darkMode ? "dark" : "light");
  }, [darkMode]);

  const toggleTheme = () => {
    const nextMode = !darkMode;
    setDarkMode(nextMode);
    applyTheme(nextMode ? "dark" : "light");
  };

  // 💾 SAVE BUDGET
  const handleBudgetSave = () => {
    localStorage.setItem("budget", budget);
    setBudgetSavedToast(true);
    setTimeout(() => setBudgetSavedToast(false), 2500);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this transaction?")) {
      return;
    }
    try {
      await api.delete(`transactions/${id}/`);
      fetchTransactions();
    } catch (err) {
      console.error("Failed to delete transaction:", err);
      alert("Failed to delete transaction.");
    }
  };

  const handleEdit = (t) => {
    navigate(`/add-transaction?edit=${t.id}`);
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  // 🏷️ FRIENDLY PERIOD LABEL
  const periodLabel = useMemo(() => {
    if (period === "daily") {
      const d = new Date(selectedDate);
      return `Daily (${d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })})`;
    }
    if (period === "monthly") {
      return `Monthly (${MONTH_NAMES[selectedMonth]} ${selectedYear})`;
    }
    if (period === "yearly") {
      return `Yearly (${selectedYear})`;
    }
    return "All Time";
  }, [period, selectedDate, selectedMonth, selectedYear]);

  // 🎯 PERIOD-FILTERED TRANSACTIONS
  const periodTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (!t.date) return period === "all";
      const d = new Date(t.date);
      if (period === "daily") {
        return d.toISOString().slice(0, 10) === selectedDate;
      }
      if (period === "monthly") {
        return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
      }
      if (period === "yearly") {
        return d.getFullYear() === selectedYear;
      }
      return true;
    });
  }, [transactions, period, selectedDate, selectedMonth, selectedYear]);

  // 💰 PERIOD TOTALS & CALCULATIONS
  const income = useMemo(() => {
    return periodTransactions
      .filter((t) => t.type === "income")
      .reduce((a, t) => a + Number(t.amount || 0), 0);
  }, [periodTransactions]);

  const expense = useMemo(() => {
    return periodTransactions
      .filter((t) => t.type === "expense")
      .reduce((a, t) => a + Number(t.amount || 0), 0);
  }, [periodTransactions]);

  const balance = income - expense;

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const monthlyExpense = useMemo(() => {
    return transactions
      .filter((t) => {
        if (!t.date || t.type !== "expense") return false;
        const d = new Date(t.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((a, t) => a + Number(t.amount || 0), 0);
  }, [transactions, currentMonth, currentYear]);

  const parsedBudget = parseFloat(budget) || 0;
  const remaining = parsedBudget ? parsedBudget - monthlyExpense : 0;
  const isExceeded = parsedBudget > 0 && remaining < 0;
  const budgetPercentage =
    parsedBudget > 0 ? Math.min(Math.round((monthlyExpense / parsedBudget) * 100), 100) : 0;

  // 📊 DOUGHNUT CHART DATA
  const doughnutData = {
    labels: ["Income", "Expense"],
    datasets: [
      {
        data: income === 0 && expense === 0 ? [1, 0] : [income, expense],
        backgroundColor:
          income === 0 && expense === 0
            ? ["#94a3b8", "#e2e8f0"]
            : ["#10b981", "#f43f5e"],
        borderWidth: 0,
        hoverOffset: 6,
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "70%",
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          usePointStyle: true,
          padding: 10,
          boxWidth: 8,
          color: darkMode ? "#94a3b8" : "#475569",
          font: { size: 11, weight: "600" },
        },
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            if (income === 0 && expense === 0) return "No data";
            return ` ${context.label}: ₹ ${context.parsed.toLocaleString()}`;
          },
        },
      },
    },
  };

  // 📊 DYNAMIC BAR CHART CONFIG (DAILY / MONTHLY / YEARLY)
  const barChartConfig = useMemo(() => {
    if (period === "monthly") {
      const daysCount = new Date(selectedYear, selectedMonth + 1, 0).getDate();
      const labels = Array.from({ length: daysCount }, (_, i) => `${i + 1}`);
      const dailyIncome = new Array(daysCount).fill(0);
      const dailyExpense = new Array(daysCount).fill(0);

      periodTransactions.forEach((t) => {
        if (!t.date) return;
        const d = new Date(t.date);
        const dayIdx = d.getDate() - 1;
        if (dayIdx >= 0 && dayIdx < daysCount) {
          if (t.type === "income") {
            dailyIncome[dayIdx] += Number(t.amount || 0);
          } else {
            dailyExpense[dayIdx] += Number(t.amount || 0);
          }
        }
      });

      return {
        title: `Daily Breakdown (${MONTH_NAMES[selectedMonth]} ${selectedYear})`,
        data: {
          labels,
          datasets: [
            {
              label: "Income (₹)",
              data: dailyIncome,
              backgroundColor: "rgba(16, 185, 129, 0.85)",
              borderRadius: 4,
            },
            {
              label: "Expense (₹)",
              data: dailyExpense,
              backgroundColor: "rgba(244, 63, 94, 0.85)",
              borderRadius: 4,
            },
          ],
        },
      };
    }

    if (period === "yearly") {
      const labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const monthlyInc = new Array(12).fill(0);
      const monthlyExp = new Array(12).fill(0);

      periodTransactions.forEach((t) => {
        if (!t.date) return;
        const d = new Date(t.date);
        const m = d.getMonth();
        if (m >= 0 && m < 12) {
          if (t.type === "income") {
            monthlyInc[m] += Number(t.amount || 0);
          } else {
            monthlyExp[m] += Number(t.amount || 0);
          }
        }
      });

      return {
        title: `Monthly Comparison (${selectedYear})`,
        data: {
          labels,
          datasets: [
            {
              label: "Income (₹)",
              data: monthlyInc,
              backgroundColor: "rgba(16, 185, 129, 0.85)",
              borderRadius: 6,
            },
            {
              label: "Expense (₹)",
              data: monthlyExp,
              backgroundColor: "rgba(244, 63, 94, 0.85)",
              borderRadius: 6,
            },
          ],
        },
      };
    }

    return {
      title: period === "daily" ? `Cash Flow for ${selectedDate}` : "Overall Inflow vs. Outflow",
      data: {
        labels: ["Total Income", "Total Expenses"],
        datasets: [
          {
            label: "Amount (₹)",
            data: [income, expense],
            backgroundColor: ["rgba(16, 185, 129, 0.85)", "rgba(244, 63, 94, 0.85)"],
            borderRadius: 8,
            borderSkipped: false,
            maxBarThickness: 42,
          },
        ],
      },
    };
  }, [period, selectedYear, selectedMonth, selectedDate, periodTransactions, income, expense]);

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: period === "monthly" || period === "yearly",
        position: "top",
        labels: {
          color: darkMode ? "#94a3b8" : "#475569",
          font: { weight: "600", size: 10 },
          boxWidth: 8,
          padding: 8,
        },
      },
      tooltip: {
        callbacks: {
          label: (ctx) => ` ₹ ${ctx.parsed.y.toLocaleString()}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: darkMode ? "#94a3b8" : "#64748b",
          font: { weight: "600", size: 11 },
          maxRotation: 0,
        },
      },
      y: {
        grid: {
          color: darkMode ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.06)",
        },
        ticks: {
          color: darkMode ? "#94a3b8" : "#64748b",
          font: { size: 10 },
          callback: (val) => `₹${val}`,
        },
      },
    },
  };

  // FILTERED TRANSACTIONS FOR LIST
  const filteredTransactions = periodTransactions
    .filter((t) => {
      const matchSearch =
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.type.toLowerCase().includes(search.toLowerCase()) ||
        t.amount.toString().includes(search);
      const matchFilter = filter === "all" ? true : t.type === filter;
      return matchSearch && matchFilter;
    })
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  return (
    <div className={`dashboard-wrapper ${darkMode ? "theme-dark" : "theme-light"}`}>
      {/* 🌟 GLASS TOP NAVBAR */}
      <header className="dash-navbar">
        <div className="dash-nav-container">
          <div className="nav-top-row">
            <div className="dash-brand">
              <span className="brand-badge-icon">💎</span>
              <div>
                <h1 className="brand-title">FinTrack</h1>
                <p className="brand-subtitle">Smart Wealth & Expense Hub</p>
              </div>
            </div>

            <div className="nav-profile-group">
              <div className="user-pill" title={`Account: ${username} (${userEmail || "No email"})`}>
                <span className="user-avatar">{username.charAt(0).toUpperCase()}</span>
                <span className="user-name">{username}</span>
              </div>

              <button
                onClick={toggleTheme}
                className="action-btn theme-btn"
                title={darkMode ? "Switch to White Mode" : "Switch to Dark Mode"}
                aria-label={darkMode ? "Switch to White Mode" : "Switch to Dark Mode"}
              >
                {darkMode ? "☀️ Light" : "🌙 Dark"}
              </button>

              <button
                onClick={handleLogout}
                className="action-btn logout-btn"
                title="Sign Out"
              >
                Logout
              </button>
            </div>
          </div>

          <div className="nav-buttons-group">
            {/* Prominent New Transaction Primary Button */}
            <button
              onClick={() => navigate("/add-transaction")}
              className="action-btn new-tx-primary-btn"
              title="Record a New Income or Expense"
            >
              ➕ New Transaction
            </button>

            {/* Quick 1-Click Excel Export */}
            <button
              onClick={() =>
                exportToExcel({
                  transactions: periodTransactions,
                  periodLabel,
                  summary: {
                    income,
                    expense,
                    balance,
                    budget: parsedBudget,
                    monthlyExpense,
                    remaining,
                  },
                  username,
                })
              }
              className="action-btn excel-quick-btn"
              title="Download Formatted Excel File (.xlsx)"
            >
              📗 Excel
            </button>

            {/* Reports & Backup Hub Modal Trigger */}
            <button
              onClick={() => setIsReportModalOpen(true)}
              className="action-btn export-btn"
              title="Open Reports, Exports & Backup Center"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="15"
                height="15"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span>Reports</span>
            </button>
          </div>
        </div>
      </header>

      {/* 🚀 MAIN CONTENT CONTAINER */}
      <main className="dash-main-container">
        {/* ========================================================= */}
        {/* 0. PERIOD FILTER SELECTOR (DAILY, MONTHLY, YEARLY, ALL)  */}
        {/* ========================================================= */}
        <PeriodFilter
          period={period}
          setPeriod={setPeriod}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
          selectedYear={selectedYear}
          setSelectedYear={setSelectedYear}
          periodLabel={periodLabel}
          transactionCount={periodTransactions.length}
        />

        {/* ========================================================= */}
        {/* 1. STATS OVERVIEW CARDS (4-COLUMN RESPONSIVE GRID)      */}
        {/* ========================================================= */}
        <section className="stats-grid">
          {/* Net Balance Card */}
          <motion.div
            className="stat-card balance-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="stat-card-header">
              <span className="stat-label">Net Balance ({periodLabel})</span>
              <span className="stat-icon-bubble">💳</span>
            </div>
            <div className="stat-value">
              ₹ {balance.toLocaleString()}
            </div>
            <div className="stat-footer">
              <span className={`status-pill ${balance >= 0 ? "surplus" : "deficit"}`}>
                {balance >= 0 ? "● Positive Surplus" : "● Deficit State"}
              </span>
            </div>
          </motion.div>

          {/* Total Income Card */}
          <motion.div
            className="stat-card income-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
          >
            <div className="stat-card-header">
              <span className="stat-label">Income ({periodLabel})</span>
              <span className="stat-icon-bubble income-bubble">↗</span>
            </div>
            <div className="stat-value text-income">
              +₹ {income.toLocaleString()}
            </div>
            <div className="stat-footer">
              <span className="stat-hint">
                {periodTransactions.filter((t) => t.type === "income").length} credit records
              </span>
            </div>
          </motion.div>

          {/* Total Expenses Card */}
          <motion.div
            className="stat-card expense-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <div className="stat-card-header">
              <span className="stat-label">Expenses ({periodLabel})</span>
              <span className="stat-icon-bubble expense-bubble">↘</span>
            </div>
            <div className="stat-value text-expense">
              -₹ {expense.toLocaleString()}
            </div>
            <div className="stat-footer">
              <span className="stat-hint">
                {income > 0 ? `${((expense / income) * 100).toFixed(0)}% of income` : "Tracked outflow"}
              </span>
            </div>
          </motion.div>

          {/* Monthly Budget Card */}
          <motion.div
            className="stat-card budget-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
          >
            <div className="stat-card-header">
              <span className="stat-label">Monthly Target Budget</span>
              <span className="stat-icon-bubble budget-bubble">🎯</span>
            </div>

            <div className="budget-input-row">
              <input
                type="number"
                placeholder="Set budget (₹)"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="budget-quick-input"
              />
              <button onClick={handleBudgetSave} className="budget-quick-btn">
                Save
              </button>
            </div>

            {budgetSavedToast && (
              <span className="budget-toast">✓ Budget saved!</span>
            )}

            {parsedBudget > 0 ? (
              <div className="budget-progress-container">
                <div className="progress-info-row">
                  <span>Spent: ₹{monthlyExpense.toLocaleString()}</span>
                  <span className={isExceeded ? "text-danger" : "text-muted"}>
                    {budgetPercentage}%
                  </span>
                </div>
                <div className="progress-bar-track">
                  <div
                    className={`progress-bar-fill ${isExceeded ? "fill-danger" : "fill-primary"}`}
                    style={{ width: `${budgetPercentage}%` }}
                  />
                </div>
                <div className="budget-status-row">
                  {isExceeded ? (
                    <span className="budget-badge badge-warning">
                      ⚠️ Over budget by ₹{Math.abs(remaining).toLocaleString()}
                    </span>
                  ) : (
                    <span className="budget-badge badge-success">
                      ₹{remaining.toLocaleString()} remaining
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <p className="budget-empty-hint">Set a monthly limit to monitor spending</p>
            )}
          </motion.div>
        </section>

        {/* ========================================================= */}
        {/* 2. VISUAL ANALYTICS & CHARTS SECTION                     */}
        {/* ========================================================= */}
        <section className="analytics-section">
          <div className="section-header-row">
            <div>
              <h2 className="section-title">📊 Financial Analytics & Trend Reports</h2>
              <p className="section-subtitle">Real-time allocation and breakdown for {periodLabel}</p>
            </div>
            <button
              onClick={() => setIsReportModalOpen(true)}
              className="period-quick-btn"
            >
              📄 View Full Report
            </button>
          </div>

          <div className="charts-grid">
            {/* Doughnut Chart Card */}
            <div className="chart-card">
              <div className="chart-card-top">
                <div>
                  <h3 className="chart-card-title">Expense vs. Income Ratio</h3>
                  <span className="chart-card-subtitle">{periodLabel} Cash Distribution</span>
                </div>
              </div>
              <div className="chart-canvas-wrapper doughnut-wrapper">
                <Doughnut data={doughnutData} options={doughnutOptions} />
                <div className="doughnut-center-info">
                  <span className="center-info-label">Net Flow</span>
                  <span className="center-info-val">₹ {(income + expense).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Bar Chart Card */}
            <div className="chart-card">
              <div className="chart-card-top">
                <div>
                  <h3 className="chart-card-title">{barChartConfig.title}</h3>
                  <span className="chart-card-subtitle">
                    {period === "monthly"
                      ? "Day-by-day cashflow this month"
                      : period === "yearly"
                      ? "Month-by-month cashflow this year"
                      : "Volume comparison"}
                  </span>
                </div>
              </div>
              <div className="chart-canvas-wrapper bar-wrapper">
                <Bar data={barChartConfig.data} options={barOptions} />
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 3. TRANSACTION RECORDS SECTION (FULL WIDTH & CLEAN)      */}
        {/* ========================================================= */}
        <section className="full-width-section">
          <div className="content-card list-card">
            <div className="card-header flex-between">
              <div>
                <h3 className="card-title">Transaction Records</h3>
                <p className="card-desc">
                  Showing {filteredTransactions.length} of {periodTransactions.length} items in{" "}
                  <strong>{periodLabel}</strong>
                </p>
              </div>

              {/* Filter & Search Bar */}
              <div className="filter-controls">
                <button
                  type="button"
                  onClick={() => navigate("/add-transaction")}
                  className="action-btn new-tx-primary-btn"
                  title="Record a New Transaction"
                >
                  ➕ Add Transaction
                </button>

                <div className="search-input-wrap">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search records..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">All Types</option>
                  <option value="income">Income Only</option>
                  <option value="expense">Expenses Only</option>
                </select>
              </div>
            </div>

            {/* Transactions List */}
            <div className="transactions-scroll-area">
              {loading ? (
                <div className="empty-state">
                  <span className="empty-emoji">⏳</span>
                  <p className="empty-title">Loading transactions...</p>
                </div>
              ) : (
                <AnimatePresence>
                  {filteredTransactions.length > 0 ? (
                    filteredTransactions.map((t) => {
                      const isIncome = t.type === "income";
                      const formattedDate = t.date
                        ? new Date(t.date).toLocaleDateString("en-IN", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "Today";

                      return (
                        <motion.div
                          key={t.id}
                          className={`transaction-item ${isIncome ? "border-income" : "border-expense"}`}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          layout
                        >
                          <div className="t-left">
                            <div className={`t-icon-box ${isIncome ? "t-icon-income" : "t-icon-expense"}`}>
                              {isIncome ? "↗" : "↘"}
                            </div>
                            <div className="t-details">
                              <h4 className="t-title">{t.title}</h4>
                              <span className="t-date">{formattedDate}</span>
                            </div>
                          </div>

                          <div className="t-right">
                            <span className={`t-amount ${isIncome ? "text-income" : "text-expense"}`}>
                              {isIncome ? "+" : "-"} ₹ {Number(t.amount).toLocaleString()}
                            </span>

                            <div className="t-actions">
                              <button
                                onClick={() => handleEdit(t)}
                                className="t-action-btn edit-btn"
                                title="Edit Transaction"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => handleDelete(t.id)}
                                className="t-action-btn delete-btn"
                                title="Delete Transaction"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })
                  ) : (
                    <div className="empty-state">
                      <span className="empty-emoji">📂</span>
                      <p className="empty-title">No transactions found</p>
                      <p className="empty-subtitle">
                        {periodTransactions.length === 0
                          ? `No records found for ${periodLabel}. Click "+ Add Transaction" above to create one!`
                          : "Try adjusting your search query or type filter"}
                      </p>
                      <button
                        type="button"
                        onClick={() => navigate("/add-transaction")}
                        className="action-btn new-tx-primary-btn"
                        style={{ marginTop: "14px" }}
                      >
                        ➕ Add Transaction
                      </button>
                    </div>
                  )}
                </AnimatePresence>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* 📊 REPORTS, EXPORTS & BACKUP MODAL */}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        transactions={periodTransactions}
        periodLabel={periodLabel}
        summary={{
          income,
          expense,
          balance,
          budget: parsedBudget,
          monthlyExpense,
          remaining,
        }}
        username={username}
        userEmail={userEmail}
        budget={budget}
        onDataRestored={fetchTransactions}
      />
    </div>
  );
}

export default Dashboard;