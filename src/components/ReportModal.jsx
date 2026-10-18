import React, { useState } from "react";
import {
  exportToExcel,
  exportToPDF,
  exportToCSV,
  exportJSONBackup,
  parseBackupFile,
} from "../utils/exportHelpers";
import api from "../api/axios";

function ReportModal({
  isOpen,
  onClose,
  transactions = [],
  periodLabel = "All Time",
  summary = {},
  username = "User",
  userEmail = "",
  budget = "",
  onDataRestored,
}) {
  const [activeTab, setActiveTab] = useState("reports"); // "reports" or "backup"
  const [backupFile, setBackupFile] = useState(null);
  const [backupPreview, setBackupPreview] = useState(null);
  const [restoreMode, setRestoreMode] = useState("merge"); // "merge" or "replace"
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreStatus, setRestoreStatus] = useState(null); // { type: "success" | "error", message: string }

  // Email report state
  const [emailRecipient, setEmailRecipient] = useState(() => {
    return userEmail || localStorage.getItem("email") || "";
  });
  const [emailSending, setEmailSending] = useState(false);
  const [emailStatus, setEmailStatus] = useState(null);

  if (!isOpen) return null;

  const handleSendEmailReport = async () => {
    if (!emailRecipient.trim() || !emailRecipient.includes("@")) {
      setEmailStatus({ type: "error", message: "Please enter a valid email address." });
      return;
    }

    setEmailSending(true);
    setEmailStatus(null);

    try {
      const res = await api.post("reports/send-email/", {
        periodLabel,
        summary,
        email: emailRecipient.trim(),
      });
      setEmailStatus({
        type: "success",
        message: res.data.message || `Financial report emailed to ${emailRecipient}!`,
      });
    } catch (err) {
      setEmailStatus({
        type: "error",
        message: err.response?.data?.error || "Failed to send report email. Please try again.",
      });
    } finally {
      setEmailSending(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setBackupFile(file);
    setRestoreStatus(null);
    try {
      const parsed = await parseBackupFile(file);
      setBackupPreview(parsed);
    } catch (err) {
      setBackupPreview(null);
      setRestoreStatus({
        type: "error",
        message: err.message || "Failed to parse file",
      });
    }
  };

  const handleExecuteRestore = async () => {
    if (!backupPreview || !backupPreview.transactions) {
      setRestoreStatus({ type: "error", message: "Please choose a valid backup file first." });
      return;
    }

    if (
      restoreMode === "replace" &&
      !window.confirm(
        "WARNING: Replace mode will permanently delete your existing transactions and replace them with the backup data. Do you wish to continue?"
      )
    ) {
      return;
    }

    try {
      setIsRestoring(true);
      setRestoreStatus(null);

      const res = await api.post("backup/restore/", {
        transactions: backupPreview.transactions,
        mode: restoreMode,
      });

      setRestoreStatus({
        type: "success",
        message: res.data.message || "Backup successfully restored!",
      });

      setBackupFile(null);
      setBackupPreview(null);

      if (onDataRestored) {
        onDataRestored();
      }
    } catch (err) {
      console.error("Restore error:", err);
      const msg = err.response?.data?.error || err.message || "Failed to restore backup";
      setRestoreStatus({ type: "error", message: msg });
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="report-modal-backdrop" onClick={onClose}>
      <div
        className="report-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="report-modal-header">
          <div className="modal-title-wrap">
            <span className="modal-icon-badge">📑</span>
            <div>
              <h2 className="modal-title">Reports, Export & Data Backup</h2>
              <p className="modal-subtitle">
                Generate financial reports, email statements, download Excel, or backup data
              </p>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="modal-tab-bar">
          <button
            type="button"
            className={`modal-tab-btn ${activeTab === "reports" ? "active" : ""}`}
            onClick={() => setActiveTab("reports")}
          >
            📊 Financial Reports & Excel
          </button>
          <button
            type="button"
            className={`modal-tab-btn ${activeTab === "backup" ? "active" : ""}`}
            onClick={() => setActiveTab("backup")}
          >
            💾 Backup & Restore (JSON)
          </button>
        </div>

        {/* TAB 1: REPORTS & EXCEL */}
        {activeTab === "reports" && (
          <div className="modal-tab-content">
            {/* Active Period Summary Card */}
            <div className="report-period-preview-card">
              <div className="r-card-header">
                <span className="r-badge">Active Period</span>
                <span className="r-period-name">{periodLabel}</span>
              </div>
              <div className="r-kpi-grid">
                <div className="r-kpi">
                  <span className="r-kpi-lbl">Total Records</span>
                  <span className="r-kpi-val text-dim">{transactions.length}</span>
                </div>
                <div className="r-kpi">
                  <span className="r-kpi-lbl">Income</span>
                  <span className="r-kpi-val text-income">
                    ₹ {(summary.income || 0).toLocaleString()}
                  </span>
                </div>
                <div className="r-kpi">
                  <span className="r-kpi-lbl">Expenses</span>
                  <span className="r-kpi-val text-expense">
                    ₹ {(summary.expense || 0).toLocaleString()}
                  </span>
                </div>
                <div className="r-kpi">
                  <span className="r-kpi-lbl">Net Savings</span>
                  <span
                    className={`r-kpi-val ${
                      (summary.balance || 0) >= 0 ? "text-income" : "text-expense"
                    }`}
                  >
                    ₹ {(summary.balance || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Export Buttons Grid (4 Columns/Cards) */}
            <div className="export-action-grid">
              {/* Excel Card */}
              <div className="export-action-card card-excel">
                <div className="action-card-info">
                  <div className="format-badge excel-badge">📗 Microsoft Excel (.xlsx)</div>
                  <h3 className="format-title">Formatted Excel Workbook</h3>
                  <p className="format-desc">
                    Includes transaction records sheet with running balance, plus a financial
                    summary sheet tailored for this period.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-download btn-excel"
                  onClick={() =>
                    exportToExcel({
                      transactions,
                      periodLabel,
                      summary,
                      username,
                    })
                  }
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download Excel (.xlsx)
                </button>
              </div>

              {/* PDF Card */}
              <div className="export-action-card card-pdf">
                <div className="action-card-info">
                  <div className="format-badge pdf-badge">📄 Document (.pdf)</div>
                  <h3 className="format-title">Branded PDF Statement</h3>
                  <p className="format-desc">
                    Formatted multi-page report with header banner, KPI statistics, budget
                    analysis, and categorized transaction tables.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-download btn-pdf"
                  onClick={() =>
                    exportToPDF({
                      transactions,
                      periodLabel,
                      summary,
                      username,
                    })
                  }
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download PDF Report
                </button>
              </div>

              {/* Email Delivery Card */}
              <div className="export-action-card card-email">
                <div className="action-card-info">
                  <div className="format-badge email-badge">📧 Email Statement</div>
                  <h3 className="format-title">Send Report to Email</h3>
                  <p className="format-desc">
                    Send this period's financial summary directly to your registered or custom
                    email address.
                  </p>
                  <input
                    type="email"
                    value={emailRecipient}
                    onChange={(e) => setEmailRecipient(e.target.value)}
                    placeholder="Enter recipient email..."
                    className="modal-email-input"
                  />
                  {emailStatus && (
                    <div
                      className={`restore-status-alert ${
                        emailStatus.type === "success" ? "status-success" : "status-error"
                      }`}
                      style={{ marginTop: "8px", fontSize: "12px", padding: "6px 10px" }}
                    >
                      <span>{emailStatus.type === "success" ? "✅" : "❌"}</span>
                      <span>{emailStatus.message}</span>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  className="btn-download btn-email"
                  onClick={handleSendEmailReport}
                  disabled={emailSending}
                  style={{ marginTop: "12px" }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                  {emailSending ? "Sending Email..." : "Send Report via Email"}
                </button>
              </div>

              {/* CSV Card */}
              <div className="export-action-card card-csv">
                <div className="action-card-info">
                  <div className="format-badge csv-badge">📑 Raw Data (.csv)</div>
                  <h3 className="format-title">Universal CSV Spreadsheet</h3>
                  <p className="format-desc">
                    UTF-8 BOM encoded CSV file compatible with Excel, Google Sheets, Apple
                    Numbers, and database tools.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-download btn-csv"
                  onClick={() =>
                    exportToCSV({
                      transactions,
                      periodLabel,
                    })
                  }
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download CSV (.csv)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: BACKUP & RESTORE */}
        {activeTab === "backup" && (
          <div className="modal-tab-content">
            <div className="backup-section-split">
              {/* EXPORT BACKUP */}
              <div className="backup-box">
                <div className="backup-box-header">
                  <span className="box-icon">📤</span>
                  <div>
                    <h3 className="box-title">Export Full Data Backup</h3>
                    <p className="box-desc">
                      Save a complete JSON snapshot of all your transactions and budget settings.
                    </p>
                  </div>
                </div>

                <div className="backup-meta-list">
                  <div className="meta-row">
                    <span>Target Account:</span>
                    <strong>{username}</strong>
                  </div>
                  <div className="meta-row">
                    <span>Registered Email:</span>
                    <strong>{userEmail || localStorage.getItem("email") || "Not set"}</strong>
                  </div>
                  <div className="meta-row">
                    <span>Total Transactions:</span>
                    <strong>{transactions.length} records</strong>
                  </div>
                  <div className="meta-row">
                    <span>Monthly Budget Setting:</span>
                    <strong>{budget ? `₹ ${budget}` : "Not set"}</strong>
                  </div>
                </div>

                <button
                  type="button"
                  className="backup-action-btn export-backup-btn"
                  onClick={() =>
                    exportJSONBackup({
                      transactions,
                      username,
                      budget,
                    })
                  }
                >
                  Download JSON Backup File
                </button>
              </div>

              {/* RESTORE BACKUP */}
              <div className="backup-box">
                <div className="backup-box-header">
                  <span className="box-icon">📥</span>
                  <div>
                    <h3 className="box-title">Restore from Backup</h3>
                    <p className="box-desc">
                      Import transactions from an existing FinTrack `.json` backup file.
                    </p>
                  </div>
                </div>

                <div className="file-drop-zone">
                  <input
                    type="file"
                    id="backup-file-input"
                    accept=".json,application/json"
                    onChange={handleFileChange}
                    className="file-hidden-input"
                  />
                  <label htmlFor="backup-file-input" className="file-drop-label">
                    <span className="drop-icon">📁</span>
                    <span className="drop-text">
                      {backupFile ? backupFile.name : "Click to browse backup file (.json)"}
                    </span>
                    <span className="drop-hint">Max file size: 10MB</span>
                  </label>
                </div>

                {backupPreview && (
                  <div className="backup-preview-box">
                    <div className="preview-header">
                      <span className="preview-badge">Ready to Restore</span>
                      <span className="preview-count">
                        {backupPreview.count} transactions detected
                      </span>
                    </div>

                    <div className="restore-mode-picker">
                      <label className="mode-option">
                        <input
                          type="radio"
                          name="restoreMode"
                          value="merge"
                          checked={restoreMode === "merge"}
                          onChange={() => setRestoreMode("merge")}
                        />
                        <div>
                          <strong>Merge (Recommended)</strong>
                          <p>Appends backup transactions without deleting existing records.</p>
                        </div>
                      </label>

                      <label className="mode-option">
                        <input
                          type="radio"
                          name="restoreMode"
                          value="replace"
                          checked={restoreMode === "replace"}
                          onChange={() => setRestoreMode("replace")}
                        />
                        <div>
                          <strong className="text-danger">Replace (Overwrite)</strong>
                          <p>Clears existing transactions and replaces them with this file.</p>
                        </div>
                      </label>
                    </div>

                    <button
                      type="button"
                      className="backup-action-btn restore-now-btn"
                      onClick={handleExecuteRestore}
                      disabled={isRestoring}
                    >
                      {isRestoring
                        ? "Restoring Transactions..."
                        : `Restore ${backupPreview.count} Transactions (${
                            restoreMode === "merge" ? "Merge" : "Replace"
                          })`}
                    </button>
                  </div>
                )}

                {restoreStatus && (
                  <div
                    className={`restore-status-alert ${
                      restoreStatus.type === "success" ? "status-success" : "status-error"
                    }`}
                  >
                    <span>{restoreStatus.type === "success" ? "✅" : "❌"}</span>
                    <span>{restoreStatus.message}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="report-modal-footer">
          <span className="footer-tip">
            💡 Tip: Switch periods on the Dashboard to tailor exports to Daily, Monthly, or Yearly
            ranges.
          </span>
          <button type="button" className="footer-close-btn" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export default ReportModal;
