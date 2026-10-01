export function ReportSummary() {
  return (
    <div className="overview-banner">
      <div className="score-ring">
        <svg viewBox="0 0 80 80" aria-label="Sample health score 86 of 100">
          <circle cx="40" cy="40" r="33" />
          <circle cx="40" cy="40" r="33" className="score-arc" />
        </svg>
        <span>86</span>
      </div>
      <div className="health-copy">
        <div>
          Looking healthy.<span>ROOM TO IMPROVE</span>
        </div>
        <p>A solid foundation, with a few things worth a closer look.</p>
      </div>
      <div className="summary-metric">
        <strong>6</strong>
        <span>Technologies</span>
      </div>
      <div className="summary-metric">
        <strong>42</strong>
        <span>Requests</span>
      </div>
      <div className="summary-metric">
        <strong className="amber">3</strong>
        <span>Findings</span>
      </div>
      <div className="scan-stamp">
        <span className="green-dot" />
        ANALYSIS COMPLETE<small>Sample duration: 8.42s</small>
      </div>
    </div>
  );
}
