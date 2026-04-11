import { useEffect, useState } from "react";
import api from "../api/axios";
import { Pie, Bar } from "react-chartjs-2";
import { motion } from "framer-motion";
import "./dashboard.css";
import jsPDF from "jspdf";

import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from "chart.js";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement
);

function Dashboard() {
  const [transactions, setTransactions] = useState([]);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("income");

  const [budget, setBudget] = useState(
    localStorage.getItem("budget") || ""
  );

  const [darkMode, setDarkMode] = useState(false);
  const [editId, setEditId] = useState(null);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const fetchTransactions = async () => {
    const res = await api.get("transactions/");
    setTransactions(res.data);
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  // 💾 SAVE BUDGET
  const handleBudgetSave = () => {
    localStorage.setItem("budget", budget);
    alert("Budget saved!");
  };

  const handleAdd = async () => {
    if (!title || !amount) {
      alert("Fill all fields");
      return;
    }

    if (editId) {
      await api.put(`transactions/${editId}/`, {
        title,
        amount: parseFloat(amount),
        type,
      });
      setEditId(null);
    } else {
      await api.post("transactions/", {
        title,
        amount: parseFloat(amount),
        type,
      });
    }

    setTitle("");
    setAmount("");
    setType("income");
    fetchTransactions();
  };

  const handleDelete = async (id) => {
    await api.delete(`transactions/${id}/`);
    fetchTransactions();
  };

  const handleEdit = (t) => {
    setTitle(t.title);
    setAmount(t.amount);
    setType(t.type);
    setEditId(t.id);
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  // 💰 TOTAL
  const income = transactions
    .filter((t) => t.type === "income")
    .reduce((a, t) => a + t.amount, 0);

  const expense = transactions
    .filter((t) => t.type === "expense")
    .reduce((a, t) => a + t.amount, 0);

  // 📅 MONTHLY
  const currentMonth = new Date().getMonth();

  const monthlyExpense = transactions
    .filter(
      (t) =>
        new Date(t.date).getMonth() === currentMonth &&
        t.type === "expense"
    )
    .reduce((a, t) => a + t.amount, 0);

  // 💰 BUDGET CALCULATION
  const remaining = budget ? budget - monthlyExpense : 0;

  const isExceeded = remaining < 0;

  // 📄 PDF
  const handleDownload = () => {
    const doc = new jsPDF();

    doc.text("Expense Tracker Report", 20, 20);
    doc.text(`Income: ₹ ${income}`, 20, 30);
    doc.text(`Expense: ₹ ${expense}`, 20, 40);

    let y = 60;

    transactions.forEach((t, i) => {
      doc.text(
        `${i + 1}. ${t.title} - ₹${t.amount} (${t.type})`,
        20,
        y
      );
      y += 10;
    });

    doc.save("report.pdf");
  };

  // 📊 PIE
  const pieData = {
    labels: ["Income", "Expense"],
    datasets: [
      {
        data: [income, expense],
        backgroundColor: ["#22c55e", "#ef4444"],
      },
    ],
  };

  return (
    <div className={darkMode ? "container dark" : "container"}>
      <motion.div className="card" initial={{opacity:0,y:50}} animate={{opacity:1,y:0}}>

        {/* HEADER */}
        <div className="header">
          <h1>💰 Expense Tracker</h1>

          <div className="header-buttons">
            <button onClick={() => setDarkMode(!darkMode)}>
              {darkMode ? "☀" : "🌙"}
            </button>

            <button onClick={handleDownload}>📄</button>

            <button className="logout" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>

        {/* 🎯 BUDGET SECTION */}
        <div className="budget-box">
          <input
            type="number"
            placeholder="Set Monthly Budget"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
          />
          <button onClick={handleBudgetSave}>Save</button>

          <div className="budget-info">
            <p>Budget: ₹ {budget || 0}</p>
            <p>Spent: ₹ {monthlyExpense}</p>
            <p className={isExceeded ? "red" : "green"}>
              Remaining: ₹ {remaining}
            </p>

            {isExceeded && (
              <p className="warning">⚠️ Budget Exceeded!</p>
            )}
          </div>
        </div>

        {/* FORM */}
        <div className="form">
          <input placeholder="Title" value={title} onChange={(e)=>setTitle(e.target.value)} />
          <input type="number" placeholder="Amount" value={amount} onChange={(e)=>setAmount(e.target.value)} />
          <select value={type} onChange={(e)=>setType(e.target.value)}>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>

          <motion.button whileTap={{scale:0.9}} onClick={handleAdd}>
            {editId ? "Update" : "Add"}
          </motion.button>
        </div>

        {/* PIE */}
        <div className="chart">
          <Pie data={pieData} />
        </div>

        {/* SEARCH */}
        <div className="filter-box">
          <input placeholder="Search..." value={search} onChange={(e)=>setSearch(e.target.value)} />
          <select value={filter} onChange={(e)=>setFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
        </div>

        {/* LIST */}
        <div className="transactions">
          {transactions
            .filter(t =>
              t.title.toLowerCase().includes(search.toLowerCase()) ||
              t.type.toLowerCase().includes(search.toLowerCase())
            )
            .filter(t => filter==="all" ? true : t.type===filter)
            .map((t)=>(
              <div key={t.id} className="item">
                <div>
                  <p>{t.title}</p>
                  <small>₹ {t.amount} ({t.type})</small>
                </div>

                <div className="actions">
                  <button onClick={()=>handleEdit(t)}>Edit</button>
                  <button onClick={()=>handleDelete(t.id)}>Delete</button>
                </div>
              </div>
            ))}
        </div>

      </motion.div>
    </div>
  );
}

export default Dashboard;