import * as XLSX from "xlsx";
import jsPDF from "jspdf";

/**
 * Export transactions and period summary to a formatted Microsoft Excel (.xlsx) file
 */
export function exportToExcel({
  transactions = [],
  periodLabel = "All Time",
  summary = {},
  username = "User",
}) {
  const wb = XLSX.utils.book_new();

  // 1. Transactions Sheet
  let runningBalance = 0;
  // Compute running balance from oldest to newest, then present list
  const chronological = [...transactions].sort(
    (a, b) => new Date(a.date || 0) - new Date(b.date || 0)
  );

  const txData = chronological.map((t, idx) => {
    const amt = Number(t.amount || 0);
    if (t.type === "income") {
      runningBalance += amt;
    } else {
      runningBalance -= amt;
    }

    const d = t.date ? new Date(t.date) : null;
    return {
      "S.No": idx + 1,
      "Transaction ID": t.id || "N/A",
      "Date": d ? d.toISOString().slice(0, 10) : "N/A",
      "Time": d ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "N/A",
      "Title / Description": t.title || "Untitled",
      "Type": t.type ? t.type.toUpperCase() : "EXPENSE",
      "Amount (₹)": amt,
      "Running Balance (₹)": runningBalance,
    };
  });

  const wsTransactions = XLSX.utils.json_to_sheet(
    txData.length > 0
      ? txData
      : [
          {
            "S.No": "",
            "Transaction ID": "",
            "Date": "",
            "Time": "",
            "Title / Description": "No transactions for this period",
            "Type": "",
            "Amount (₹)": 0,
            "Running Balance (₹)": 0,
          },
        ]
  );

  // Auto-fit column widths
  wsTransactions["!cols"] = [
    { wch: 8 },  // S.No
    { wch: 16 }, // ID
    { wch: 14 }, // Date
    { wch: 12 }, // Time
    { wch: 32 }, // Title
    { wch: 12 }, // Type
    { wch: 16 }, // Amount
    { wch: 20 }, // Running Balance
  ];

  XLSX.utils.book_append_sheet(wb, wsTransactions, "Transactions");

  // 2. Summary Sheet
  const summaryRows = [
    { "Metric": "Account User", "Value": username },
    { "Metric": "Report Period", "Value": periodLabel },
    { "Metric": "Generated On", "Value": new Date().toLocaleString() },
    { "Metric": "Total Transactions", "Value": transactions.length },
    { "Metric": "Total Income (₹)", "Value": summary.income || 0 },
    { "Metric": "Total Expenses (₹)", "Value": summary.expense || 0 },
    { "Metric": "Net Balance (₹)", "Value": summary.balance || 0 },
    {
      "Metric": "Savings Rate (%)",
      "Value":
        summary.income > 0
          ? `${Math.max(0, Math.round((summary.balance / summary.income) * 100))}%`
          : "0%",
    },
  ];

  if (summary.budget > 0) {
    summaryRows.push(
      { "Metric": "Monthly Budget (₹)", "Value": summary.budget },
      { "Metric": "Monthly Spent (₹)", "Value": summary.monthlyExpense || 0 },
      { "Metric": "Remaining Budget (₹)", "Value": summary.remaining || 0 }
    );
  }

  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  wsSummary["!cols"] = [{ wch: 26 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, "Financial Summary");

  // Generate file name
  const safePeriod = periodLabel.replace(/[^a-zA-Z0-9_-]/g, "_");
  const fileName = `FinTrack_Report_${safePeriod}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Export transactions to CSV with UTF-8 BOM for Microsoft Excel compatibility
 */
export function exportToCSV({
  transactions = [],
  periodLabel = "All Time",
}) {
  const headers = ["S.No", "Transaction ID", "Date", "Title", "Type", "Amount (INR)"];
  const rows = transactions.map((t, idx) => {
    const d = t.date ? new Date(t.date).toISOString().slice(0, 10) : "N/A";
    const cleanTitle = (t.title || "").replace(/"/g, '""');
    return [
      idx + 1,
      t.id || "",
      d,
      `"${cleanTitle}"`,
      (t.type || "").toUpperCase(),
      Number(t.amount || 0),
    ].join(",");
  });

  const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const safePeriod = periodLabel.replace(/[^a-zA-Z0-9_-]/g, "_");
  const fileName = `FinTrack_Transactions_${safePeriod}_${new Date().toISOString().slice(0, 10)}.csv`;

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.setAttribute("download", fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export comprehensive PDF Report (Daily, Monthly, Yearly, or All Time)
 */
export function exportToPDF({
  transactions = [],
  periodLabel = "All Time",
  summary = {},
  username = "User",
}) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Top Accent Banner
  doc.setFillColor(99, 102, 241);
  doc.rect(0, 0, pageWidth, 26, "F");

  // Title & Subtitle
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text("FinTrack 2026 - Financial Report", 14, 14);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Period: ${periodLabel}`, 14, 21);
  doc.text(
    `Exported: ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
    pageWidth - 62,
    14
  );
  doc.text(`User: ${username}`, pageWidth - 62, 21);

  // KPI Summary Card Background
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 32, pageWidth - 28, 32, 3, 3, "F");
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 32, pageWidth - 28, 32, 3, 3, "S");

  // KPI Metrics
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text("TOTAL INCOME", 20, 40);
  doc.text("TOTAL EXPENSES", 68, 40);
  doc.text("NET BALANCE", 120, 40);
  doc.text("TRANSACTIONS", 168, 40);

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(16, 185, 129);
  doc.text(`INR ${(summary.income || 0).toLocaleString()}`, 20, 49);

  doc.setTextColor(244, 63, 94);
  doc.text(`INR ${(summary.expense || 0).toLocaleString()}`, 68, 49);

  const bal = summary.balance || 0;
  doc.setTextColor(bal >= 0 ? 16 : 244, bal >= 0 ? 185 : 63, bal >= 0 ? 129 : 94);
  doc.text(`INR ${bal.toLocaleString()}`, 120, 49);

  doc.setTextColor(30, 41, 59);
  doc.text(`${transactions.length}`, 168, 49);

  // Sub-metrics / budget if available
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(148, 163, 184);
  const savingsRate =
    summary.income > 0 ? Math.max(0, Math.round((bal / summary.income) * 100)) : 0;
  doc.text(`Savings Rate: ${savingsRate}%`, 120, 58);

  if (summary.budget > 0) {
    doc.text(
      `Budget: INR ${Number(summary.budget).toLocaleString()} (Remaining: INR ${(summary.remaining || 0).toLocaleString()})`,
      20,
      58
    );
  }

  // Table Header
  doc.setFillColor(241, 245, 249);
  doc.rect(14, 70, pageWidth - 28, 8, "F");

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Date", 18, 75.5);
  doc.text("Description", 50, 75.5);
  doc.text("Type", 130, 75.5);
  doc.text("Amount (INR)", 165, 75.5);

  let y = 84;
  let pageCount = 1;

  if (transactions.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.setTextColor(148, 163, 184);
    doc.text("No transactions recorded for this period.", 18, 88);
  } else {
    transactions.forEach((t, i) => {
      if (y > pageHeight - 20) {
        // Page footer
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`Page ${pageCount}`, pageWidth / 2 - 6, pageHeight - 10);

        doc.addPage();
        pageCount++;
        y = 22;

        // Table Header on next page
        doc.setFillColor(241, 245, 249);
        doc.rect(14, y - 8, pageWidth - 28, 8, "F");
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(71, 85, 105);
        doc.text("Date", 18, y - 2.5);
        doc.text("Description", 50, y - 2.5);
        doc.text("Type", 130, y - 2.5);
        doc.text("Amount (INR)", 165, y - 2.5);
        y += 6;
      }

      // Zebra striping
      if (i % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, y - 5, pageWidth - 28, 7.5, "F");
      }

      const formattedDate = t.date
        ? new Date(t.date).toLocaleDateString("en-IN", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : "N/A";

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);
      doc.text(formattedDate, 18, y);
      doc.text((t.title || "Untitled").substring(0, 36), 50, y);

      if (t.type === "income") {
        doc.setTextColor(16, 185, 129);
        doc.text("+ Income", 130, y);
      } else {
        doc.setTextColor(244, 63, 94);
        doc.text("- Expense", 130, y);
      }

      doc.setTextColor(30, 41, 59);
      doc.setFont("helvetica", "bold");
      doc.text(Number(t.amount || 0).toLocaleString(), 165, y);

      y += 8;
    });
  }

  // Footer on last page
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(148, 163, 184);
  doc.text(`Page ${pageCount}`, pageWidth / 2 - 6, pageHeight - 10);

  const safePeriod = periodLabel.replace(/[^a-zA-Z0-9_-]/g, "_");
  doc.save(`FinTrack_Report_${safePeriod}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

/**
 * Trigger client-side download of a JSON backup file
 */
export function exportJSONBackup({ transactions = [], username = "User", budget = "" }) {
  const backupObject = {
    appName: "FinTrack Expense Tracker",
    version: "2.0",
    exportedAt: new Date().toISOString(),
    username,
    budget,
    transactionCount: transactions.length,
    transactions,
  };

  const jsonStr = JSON.stringify(backupObject, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const fileName = `FinTrack_Backup_${username}_${new Date().toISOString().slice(0, 10)}.json`;

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.setAttribute("download", fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Validate and parse an uploaded JSON backup file
 */
export function parseBackupFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      return reject(new Error("No file selected"));
    }
    if (!file.name.endsWith(".json")) {
      return reject(new Error("Please upload a valid .json backup file"));
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        const txList = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed.transactions)
          ? parsed.transactions
          : null;

        if (!txList) {
          return reject(
            new Error("Invalid backup structure. Could not find a 'transactions' list.")
          );
        }

        resolve({
          metadata: {
            appName: parsed.appName || "Expense Tracker",
            exportedAt: parsed.exportedAt || null,
            username: parsed.username || null,
            budget: parsed.budget || null,
          },
          transactions: txList,
          count: txList.length,
        });
      } catch {
        reject(new Error("Failed to parse JSON file. The file may be corrupted."));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}
