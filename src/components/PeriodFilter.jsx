import React from "react";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function PeriodFilter({
  period,
  setPeriod,
  selectedDate,
  setSelectedDate,
  selectedMonth,
  setSelectedMonth,
  selectedYear,
  setSelectedYear,
  periodLabel,
  transactionCount,
}) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  // Navigation helpers
  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear((prev) => prev - 1);
    } else {
      setSelectedMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear((prev) => prev + 1);
    } else {
      setSelectedMonth((prev) => prev + 1);
    }
  };

  const handlePrevYear = () => {
    setSelectedYear((prev) => prev - 1);
  };

  const handleNextYear = () => {
    setSelectedYear((prev) => prev + 1);
  };

  const yearsRange = [];
  for (let y = currentYear - 5; y <= currentYear + 5; y++) {
    yearsRange.push(y);
  }

  return (
    <div className="period-filter-wrapper">
      <div className="period-filter-header">
        {/* Period Selector Tabs */}
        <div className="period-tabs">
          <button
            type="button"
            className={`period-tab-btn ${period === "all" ? "active" : ""}`}
            onClick={() => setPeriod("all")}
          >
            All Time
          </button>
          <button
            type="button"
            className={`period-tab-btn ${period === "daily" ? "active" : ""}`}
            onClick={() => setPeriod("daily")}
          >
            Daily
          </button>
          <button
            type="button"
            className={`period-tab-btn ${period === "monthly" ? "active" : ""}`}
            onClick={() => setPeriod("monthly")}
          >
            Monthly
          </button>
          <button
            type="button"
            className={`period-tab-btn ${period === "yearly" ? "active" : ""}`}
            onClick={() => setPeriod("yearly")}
          >
            Yearly
          </button>
        </div>

        {/* Current Period Badge */}
        <div className="period-status-badge">
          <span className="period-status-dot"></span>
          <span className="period-status-text">{periodLabel}</span>
          <span className="period-count-tag">{transactionCount} records</span>
        </div>
      </div>

      {/* Dynamic Period Controls Sub-bar */}
      {period !== "all" && (
        <div className="period-controls-subbar">
          {/* DAILY CONTROLS */}
          {period === "daily" && (
            <div className="period-controls-wrap">
              <div className="period-nav-row">
                <button
                  type="button"
                  className="period-nav-btn"
                  onClick={handlePrevDay}
                  title="Previous Day"
                >
                  ◀ Prev
                </button>

                <div className="period-input-center">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="period-date-input"
                  />
                </div>

                <button
                  type="button"
                  className="period-nav-btn"
                  onClick={handleNextDay}
                  title="Next Day"
                >
                  Next ▶
                </button>
              </div>

              <div className="period-quick-action-row">
                <button
                  type="button"
                  className={`period-quick-btn ${selectedDate === todayStr ? "current" : ""}`}
                  onClick={() => setSelectedDate(todayStr)}
                >
                  📍 Jump to Today ({todayStr})
                </button>
              </div>
            </div>
          )}

          {/* MONTHLY CONTROLS */}
          {period === "monthly" && (
            <div className="period-controls-wrap">
              <div className="period-nav-row">
                <button
                  type="button"
                  className="period-nav-btn"
                  onClick={handlePrevMonth}
                  title="Previous Month"
                >
                  ◀ Prev
                </button>

                <div className="period-dropdowns-group">
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="period-select month-select"
                  >
                    {MONTH_NAMES.map((name, index) => (
                      <option key={name} value={index}>
                        {name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="period-select year-select"
                  >
                    {yearsRange.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  className="period-nav-btn"
                  onClick={handleNextMonth}
                  title="Next Month"
                >
                  Next ▶
                </button>
              </div>

              <div className="period-quick-action-row">
                <button
                  type="button"
                  className={`period-quick-btn ${
                    selectedMonth === currentMonth && selectedYear === currentYear
                      ? "current"
                      : ""
                  }`}
                  onClick={() => {
                    setSelectedMonth(currentMonth);
                    setSelectedYear(currentYear);
                  }}
                >
                  📍 Current Month ({MONTH_NAMES[currentMonth]} {currentYear})
                </button>
              </div>
            </div>
          )}

          {/* YEARLY CONTROLS */}
          {period === "yearly" && (
            <div className="period-controls-wrap">
              <div className="period-nav-row">
                <button
                  type="button"
                  className="period-nav-btn"
                  onClick={handlePrevYear}
                  title="Previous Year"
                >
                  ◀ Prev
                </button>

                <div className="period-input-center">
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="period-select year-select"
                  >
                    {yearsRange.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  className="period-nav-btn"
                  onClick={handleNextYear}
                  title="Next Year"
                >
                  Next ▶
                </button>
              </div>

              <div className="period-quick-action-row">
                <button
                  type="button"
                  className={`period-quick-btn ${selectedYear === currentYear ? "current" : ""}`}
                  onClick={() => setSelectedYear(currentYear)}
                >
                  📍 Current Year ({currentYear})
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default PeriodFilter;
