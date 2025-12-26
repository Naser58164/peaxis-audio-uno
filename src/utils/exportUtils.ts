import type { ExaminationAttempt } from '@/hooks/useExamination';

interface AnalyticsData {
  averageScore: number;
  passRate: number;
  totalExams: number;
  completedExams: number;
  scoresByScenario: { name: string; avgScore: number; exams: number }[];
  improvementData: { exam: string; score: number; date: string }[];
}

export function exportToCSV(attempts: ExaminationAttempt[], scenarios: { id: string; name: string }[]) {
  const headers = ['Student ID', 'Scenario', 'Started At', 'Completed At', 'Score', 'Max Score', 'Percentage', 'Status'];
  
  const rows = attempts.map(a => {
    const scenario = scenarios.find(s => s.id === a.scenario_id);
    const percentage = a.total_score && a.max_score 
      ? Math.round((a.total_score / a.max_score) * 100) 
      : '';
    const status = a.completed_at 
      ? (percentage && percentage >= 70 ? 'Passed' : 'Failed')
      : 'In Progress';
    
    return [
      a.student_id,
      scenario?.name || 'Unknown',
      new Date(a.started_at).toLocaleString(),
      a.completed_at ? new Date(a.completed_at).toLocaleString() : '',
      a.total_score ?? '',
      a.max_score ?? '',
      percentage ? `${percentage}%` : '',
      status,
    ].join(',');
  });

  const csv = [headers.join(','), ...rows].join('\n');
  downloadFile(csv, 'examination-results.csv', 'text/csv');
}

export function exportAnalyticsSummary(analytics: AnalyticsData) {
  const lines = [
    'Performance Analytics Summary',
    `Generated: ${new Date().toLocaleString()}`,
    '',
    'Overall Statistics',
    `Average Score,${analytics.averageScore}%`,
    `Pass Rate,${analytics.passRate}%`,
    `Total Exams,${analytics.totalExams}`,
    `Completed Exams,${analytics.completedExams}`,
    '',
    'Scores by Scenario',
    'Scenario,Average Score,Number of Exams',
    ...analytics.scoresByScenario.map(s => `${s.name},${s.avgScore}%,${s.exams}`),
    '',
    'Recent Score Trend',
    'Exam,Score,Date',
    ...analytics.improvementData.map(d => `${d.exam},${d.score}%,${d.date}`),
  ];

  const csv = lines.join('\n');
  downloadFile(csv, 'analytics-summary.csv', 'text/csv');
}

export function exportToPDF(analytics: AnalyticsData, attempts: ExaminationAttempt[]) {
  // Create a simple HTML report that can be printed as PDF
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Performance Analytics Report</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
    h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
    h2 { color: #666; margin-top: 30px; }
    .stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin: 20px 0; }
    .stat-card { background: #f5f5f5; padding: 20px; border-radius: 8px; }
    .stat-value { font-size: 32px; font-weight: bold; color: #333; }
    .stat-label { color: #666; font-size: 14px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #f5f5f5; font-weight: bold; }
    .footer { margin-top: 40px; text-align: center; color: #999; font-size: 12px; }
  </style>
</head>
<body>
  <h1>Performance Analytics Report</h1>
  <p>Generated: ${new Date().toLocaleString()}</p>
  
  <div class="stats">
    <div class="stat-card">
      <div class="stat-value">${analytics.averageScore}%</div>
      <div class="stat-label">Average Score</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${analytics.passRate}%</div>
      <div class="stat-label">Pass Rate</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${analytics.totalExams}</div>
      <div class="stat-label">Total Exams</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${analytics.completedExams}</div>
      <div class="stat-label">Completed Exams</div>
    </div>
  </div>

  <h2>Scores by Scenario</h2>
  <table>
    <thead>
      <tr><th>Scenario</th><th>Average Score</th><th>Exams</th></tr>
    </thead>
    <tbody>
      ${analytics.scoresByScenario.map(s => `
        <tr><td>${s.name}</td><td>${s.avgScore}%</td><td>${s.exams}</td></tr>
      `).join('')}
    </tbody>
  </table>

  <h2>Recent Examination Attempts</h2>
  <table>
    <thead>
      <tr><th>Exam</th><th>Score</th><th>Date</th></tr>
    </thead>
    <tbody>
      ${analytics.improvementData.map(d => `
        <tr><td>${d.exam}</td><td>${d.score}%</td><td>${d.date}</td></tr>
      `).join('')}
    </tbody>
  </table>

  <div class="footer">
    <p>Auscultation Training System - Performance Report</p>
  </div>
</body>
</html>
  `;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, '_blank');
  
  if (printWindow) {
    printWindow.onload = () => {
      printWindow.print();
    };
  }
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
