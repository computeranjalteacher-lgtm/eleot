/**
 * Export teacher report to PDF, Word, or CSV
 */

/**
 * Export teacher report to CSV
 */
export const exportTeacherReportToCSV = (teacher, report) => {
  const rows = [];
  
  // Header
  rows.push(['ELEOT Teacher Report']);
  rows.push([]);
  
  // Teacher info
  rows.push(['المعلم / Teacher', teacher.name_ar || '']);
  rows.push(['إجمالي الزيارات / Total Visits', report.totalVisits]);
  rows.push([]);
  
  // Average per environment (Best 3)
  rows.push(['متوسط الدرجات (أفضل 3 زيارات) / Average Scores (Best 3 Visits)']);
  rows.push(['البيئة / Environment', 'المتوسط / Average']);
  
  ['A', 'B', 'C', 'D', 'E', 'F', 'G'].forEach(envCode => {
    const avg = report.avgPerEnvironment[envCode];
    rows.push([
      `بيئة ${envCode} / Environment ${envCode}`,
      avg !== null && avg !== undefined ? avg.toFixed(2) : '-'
    ]);
  });
  
  rows.push([]);
  
  // Improvement comparison
  if (report.improvement) {
    rows.push(['مقارنة التحسن / Improvement Comparison']);
    rows.push(['التغيير في النتيجة الإجمالية / Overall Score Change', report.improvement.deltaOverall.toFixed(2)]);
    rows.push([]);
    rows.push(['التغيير لكل بيئة / Change per Environment']);
    rows.push(['البيئة / Environment', 'التغيير / Delta']);
    
    Object.entries(report.improvement.deltaPerEnv).forEach(([envCode, delta]) => {
      if (delta !== null && delta !== undefined) {
        rows.push([`بيئة ${envCode} / Environment ${envCode}`, delta.toFixed(2)]);
      }
    });
    
    rows.push([]);
    rows.push(['البيئات الضعيفة / Weak Environments', report.improvement.weakEnvironments.join(', ')]);
  }
  
  // Best 3 visits details
  rows.push([]);
  rows.push(['أفضل 3 زيارات / Best 3 Visits']);
  rows.push(['التاريخ / Date', 'النتيجة الإجمالية / Overall Score']);
  
  (report.best3Visits || []).forEach(visit => {
    rows.push([
      visit.visit_date || '',
      visit.overall_score || '-'
    ]);
  });
  
  // Convert to CSV string
  const csvContent = rows.map(row => 
    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
  ).join('\n');
  
  // Add BOM for Excel Arabic support
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `teacher-report-${teacher.id || 'report'}-${Date.now()}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Export teacher report to Word (HTML-based)
 */
export const exportTeacherReportToWord = (teacher, report) => {
  const htmlContent = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <title>ELEOT Teacher Report</title>
      <style>
        body {
          font-family: 'Arial', 'Times New Roman', sans-serif;
          direction: rtl;
          margin: 20px;
          line-height: 1.6;
        }
        h1 {
          color: #2563eb;
          text-align: center;
          border-bottom: 2px solid #2563eb;
          padding-bottom: 10px;
        }
        h2 {
          color: #1e40af;
          margin-top: 30px;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 5px;
        }
        h3 {
          color: #374151;
          margin-top: 20px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 12px;
          text-align: right;
        }
        th {
          background-color: #2563eb;
          color: white;
          font-weight: bold;
        }
        tr:nth-child(even) {
          background-color: #f9fafb;
        }
        .kpi-card {
          display: inline-block;
          background: #f0f9ff;
          border: 1px solid #0ea5e9;
          border-radius: 8px;
          padding: 15px;
          margin: 10px;
          min-width: 150px;
        }
        .kpi-value {
          font-size: 24px;
          font-weight: bold;
          color: #0ea5e9;
        }
        .kpi-label {
          color: #64748b;
          font-size: 14px;
        }
        .status-good {
          color: #10b981;
          font-weight: bold;
        }
        .status-weak {
          color: #ef4444;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <h1>تقرير المعلم - ELEOT</h1>
      
      <div>
        <div class="kpi-card">
          <div class="kpi-value">${teacher.name_ar || ''}</div>
          <div class="kpi-label">المعلم</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value">${report.totalVisits}</div>
          <div class="kpi-label">إجمالي الزيارات</div>
        </div>
      </div>
      
      <h2>متوسط الدرجات (أفضل 3 زيارات)</h2>
      <table>
        <thead>
          <tr>
            <th>البيئة</th>
            <th>المتوسط</th>
          </tr>
        </thead>
        <tbody>
          ${['A', 'B', 'C', 'D', 'E', 'F', 'G'].map(envCode => {
            const avg = report.avgPerEnvironment[envCode];
            return `
              <tr>
                <td>بيئة ${envCode}</td>
                <td>${avg !== null && avg !== undefined ? avg.toFixed(2) : '-'}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
      
      ${report.improvement ? `
        <h2>مقارنة التحسن</h2>
        <p><strong>التغيير في النتيجة الإجمالية:</strong> ${report.improvement.deltaOverall.toFixed(2)}</p>
        
        <table>
          <thead>
            <tr>
              <th>البيئة</th>
              <th>أول زيارة</th>
              <th>آخر زيارة</th>
              <th>التغيير</th>
              <th>الحالة</th>
            </tr>
          </thead>
          <tbody>
            ${['A', 'B', 'C', 'D', 'E', 'F', 'G'].map(envCode => {
              const firstScore = report.improvement.firstVisit.envScores?.find(s => s.env_code === envCode)?.avg_score;
              const lastScore = report.improvement.lastVisit.envScores?.find(s => s.env_code === envCode)?.avg_score;
              const delta = report.improvement.deltaPerEnv[envCode];
              const isWeak = report.improvement.weakEnvironments?.includes(envCode);
              
              return `
                <tr>
                  <td>بيئة ${envCode}</td>
                  <td>${firstScore || '-'}</td>
                  <td>${lastScore || '-'}</td>
                  <td>${delta !== null && delta !== undefined ? delta.toFixed(2) : '-'}</td>
                  <td class="${isWeak ? 'status-weak' : 'status-good'}">
                    ${isWeak ? 'ضعيف' : 'جيد'}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
        
        <p><strong>البيئات الضعيفة:</strong> ${report.improvement.weakEnvironments.join('، ')}</p>
      ` : ''}
      
      <h2>أفضل 3 زيارات</h2>
      <table>
        <thead>
          <tr>
            <th>التاريخ</th>
            <th>النتيجة الإجمالية</th>
          </tr>
        </thead>
        <tbody>
          ${(report.best3Visits || []).map(visit => `
            <tr>
              <td>${visit.visit_date || ''}</td>
              <td>${visit.overall_score || '-'} / 4.0</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `;
  
  const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `teacher-report-${teacher.id || 'report'}-${Date.now()}.doc`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Export teacher report to PDF
 */
export const exportTeacherReportToPDF = async (teacher, report) => {
  try {
    const jsPDF = (await import('jspdf')).default;
    
    const doc = new jsPDF();
    doc.setR2L(true);
    
    let yPos = 20;
    
    // Title
    doc.setFontSize(18);
    doc.text('تقرير المعلم - ELEOT', 105, yPos, { align: 'center' });
    yPos += 15;
    
    // Teacher info
    doc.setFontSize(14);
    doc.text(`المعلم: ${teacher.name_ar || ''}`, 20, yPos);
    yPos += 10;
    doc.text(`إجمالي الزيارات: ${report.totalVisits}`, 20, yPos);
    yPos += 15;
    
    // Average per environment
    doc.setFontSize(14);
    doc.text('متوسط الدرجات (أفضل 3 زيارات)', 20, yPos);
    yPos += 10;
    
    doc.setFontSize(10);
    ['A', 'B', 'C', 'D', 'E', 'F', 'G'].forEach(envCode => {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      const avg = report.avgPerEnvironment[envCode];
      doc.text(
        `بيئة ${envCode}: ${avg !== null && avg !== undefined ? avg.toFixed(2) : '-'} / 4.0`,
        20,
        yPos
      );
      yPos += 8;
    });
    
    // Improvement comparison
    if (report.improvement) {
      yPos += 5;
      if (yPos > 200) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(14);
      doc.text('مقارنة التحسن', 20, yPos);
      yPos += 10;
      
      doc.setFontSize(10);
      doc.text(`التغيير في النتيجة الإجمالية: ${report.improvement.deltaOverall.toFixed(2)}`, 20, yPos);
      yPos += 10;
      
      if (report.improvement.weakEnvironments.length > 0) {
        doc.text(
          `البيئات الضعيفة: ${report.improvement.weakEnvironments.join('، ')}`,
          20,
          yPos
        );
        yPos += 10;
      }
    }
    
    doc.save(`teacher-report-${teacher.id || 'report'}-${Date.now()}.pdf`);
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    // Fallback: use Word export instead
    exportTeacherReportToWord(teacher, report);
  }
};


