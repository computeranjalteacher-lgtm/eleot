/**
 * Export single visit to PDF, Word, or CSV
 */

/**
 * Export visit to CSV
 */
export const exportVisitToCSV = (visit, envScores) => {
  const rows = [];
  
  // Header
  rows.push(['ELEOT Visit Report']);
  rows.push([]);
  
  // Visit info
  rows.push(['المعلم / Teacher', visit.teacher_name_snapshot || visit.teacher?.name_ar || '']);
  rows.push(['التاريخ / Date', visit.visit_date || '']);
  rows.push(['المادة / Subject', visit.subject || '']);
  rows.push(['الصف / Grade', visit.grade_key || '']);
  rows.push(['الجزء / Segment', visit.segment || '']);
  rows.push(['المشرف / Supervisor', visit.supervisor_email || '']);
  rows.push(['النتيجة الإجمالية / Overall Score', visit.overall_score || '']);
  rows.push([]);
  
  // Environment scores
  rows.push(['البيئة / Environment', 'الدرجة / Score', 'التبرير / Justification']);
  
  (envScores || []).forEach(env => {
    rows.push([
      `بيئة ${env.env_code} / Environment ${env.env_code}`,
      env.avg_score || '',
      (env.justification || '').replace(/\n/g, ' ')
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
  link.setAttribute('download', `visit-${visit.id || 'report'}-${Date.now()}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Export visit to Word (HTML-based)
 */
export const exportVisitToWord = (visit, envScores) => {
  const htmlContent = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <title>ELEOT Visit Report</title>
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
        .info-row {
          margin: 10px 0;
        }
        .info-label {
          font-weight: bold;
          display: inline-block;
          width: 150px;
        }
      </style>
    </head>
    <body>
      <h1>تقرير زيارة ELEOT</h1>
      
      <div>
        <div class="info-row">
          <span class="info-label">المعلم:</span>
          <span>${visit.teacher_name_snapshot || visit.teacher?.name_ar || ''}</span>
        </div>
        <div class="info-row">
          <span class="info-label">التاريخ:</span>
          <span>${visit.visit_date || ''}</span>
        </div>
        <div class="info-row">
          <span class="info-label">المادة:</span>
          <span>${visit.subject || '-'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">الصف:</span>
          <span>${visit.grade_key || '-'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">الجزء:</span>
          <span>${visit.segment || '-'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">المشرف:</span>
          <span>${visit.supervisor_email || ''}</span>
        </div>
        <div class="info-row">
          <span class="info-label">النتيجة الإجمالية:</span>
          <span>${visit.overall_score || '-'} / 4.0</span>
        </div>
      </div>
      
      ${visit.lesson_description ? `
        <h2>وصف الدرس</h2>
        <p>${visit.lesson_description.replace(/\n/g, '<br>')}</p>
      ` : ''}
      
      <h2>نتائج البيئات</h2>
      <table>
        <thead>
          <tr>
            <th>البيئة</th>
            <th>الدرجة</th>
            <th>التبرير</th>
          </tr>
        </thead>
        <tbody>
          ${(envScores || []).map(env => `
            <tr>
              <td>بيئة ${env.env_code}</td>
              <td>${env.avg_score || '-'} / 4.0</td>
              <td>${(env.justification || '').replace(/\n/g, '<br>')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      ${(envScores || []).some(env => env.recommendations_html) ? `
        <h2>التوصيات</h2>
        ${(envScores || []).filter(env => env.recommendations_html).map(env => `
          <div>
            <h3>بيئة ${env.env_code}</h3>
            <div>${env.recommendations_html}</div>
          </div>
        `).join('')}
      ` : ''}
    </body>
    </html>
  `;
  
  const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `visit-${visit.id || 'report'}-${Date.now()}.doc`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Export visit to PDF
 */
export const exportVisitToPDF = async (visit, envScores) => {
  // Try to use jsPDF if available, otherwise use simple approach
  try {
    const jsPDF = (await import('jspdf')).default;
    
    const doc = new jsPDF();
    doc.setR2L(true);
    
    let yPos = 20;
    
    // Title
    doc.setFontSize(18);
    doc.text('تقرير زيارة ELEOT', 105, yPos, { align: 'center' });
    yPos += 15;
    
    // Visit info
    doc.setFontSize(12);
    doc.text(`المعلم: ${visit.teacher_name_snapshot || visit.teacher?.name_ar || ''}`, 20, yPos);
    yPos += 8;
    doc.text(`التاريخ: ${visit.visit_date || ''}`, 20, yPos);
    yPos += 8;
    if (visit.subject) {
      doc.text(`المادة: ${visit.subject}`, 20, yPos);
      yPos += 8;
    }
    if (visit.grade_key) {
      doc.text(`الصف: ${visit.grade_key}`, 20, yPos);
      yPos += 8;
    }
    doc.text(`النتيجة الإجمالية: ${visit.overall_score || '-'} / 4.0`, 20, yPos);
    yPos += 15;
    
    // Environment scores table
    doc.setFontSize(14);
    doc.text('نتائج البيئات', 20, yPos);
    yPos += 10;
    
    doc.setFontSize(10);
    (envScores || []).forEach((env, index) => {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.text(`بيئة ${env.env_code}: ${env.avg_score || '-'} / 4.0`, 25, yPos);
      yPos += 6;
      
      if (env.justification) {
        const justification = doc.splitTextToSize(env.justification, 170);
        justification.forEach(line => {
          if (yPos > 250) {
            doc.addPage();
            yPos = 20;
          }
          doc.text(line, 30, yPos);
          yPos += 6;
        });
      }
      yPos += 5;
    });
    
    doc.save(`visit-${visit.id || 'report'}-${Date.now()}.pdf`);
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    // Fallback: use Word export instead
    exportVisitToWord(visit, envScores);
  }
};


