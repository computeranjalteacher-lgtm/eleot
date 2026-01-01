import jsPDF from 'jspdf';

/**
 * Export to PDF
 */
export const exportToPDF = (observationData, language) => {
  const doc = new jsPDF();
  const isRTL = language === 'ar';
  
  // Set direction
  if (isRTL) {
    doc.setR2L(true);
  }
  
  let yPos = 20;
  
  // Title
  doc.setFontSize(18);
  doc.text(isRTL ? 'تقرير المراقبة ELEOT' : 'ELEOT Observation Report', 105, yPos, { align: 'center' });
  yPos += 15;
  
  // Teacher name and date
  doc.setFontSize(12);
  if (observationData.teacherName) {
    doc.text(`${isRTL ? 'اسم المعلم:' : 'Teacher Name:'} ${observationData.teacherName}`, 20, yPos);
    yPos += 10;
  }
  if (observationData.date) {
    const date = new Date(observationData.date).toLocaleDateString();
    doc.text(`${isRTL ? 'التاريخ:' : 'Date:'} ${date}`, 20, yPos);
    yPos += 10;
  }
  
  yPos += 5;
  
  // Scores table
  doc.setFontSize(14);
  doc.text(isRTL ? 'النتائج' : 'Results', 20, yPos);
  yPos += 10;
  
  doc.setFontSize(10);
  observationData.criteria.forEach((item, index) => {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    
    const criterionLabel = language === 'ar' ? item.criterion.label_ar : item.criterion.label_en;
    doc.text(`${item.id}: ${criterionLabel}`, 20, yPos);
    yPos += 5;
    doc.text(`${isRTL ? 'الدرجة:' : 'Score:'} ${item.score}/4`, 25, yPos);
    yPos += 5;
    doc.text(item.justification, 25, yPos, { maxWidth: 170 });
    yPos += 10;
  });
  
  // Recommendations
  if (observationData.recommendations) {
    if (yPos > 200) {
      doc.addPage();
      yPos = 20;
    }
    
    yPos += 10;
    doc.setFontSize(14);
    doc.setTextColor(0, 128, 0); // Green
    doc.text(isRTL ? 'التوصيات' : 'Recommendations', 20, yPos);
    doc.setTextColor(0, 0, 0); // Black
    yPos += 10;
    
    doc.setFontSize(10);
    // Remove HTML tags for PDF
    const text = observationData.recommendations.replace(/<[^>]*>/g, '\n');
    const lines = doc.splitTextToSize(text, 170);
    lines.forEach(line => {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(line, 20, yPos);
      yPos += 5;
    });
  }
  
  // Save
  doc.save(`eleot-report-${Date.now()}.pdf`);
};

/**
 * Export to Word (HTML blob)
 */
export const exportToWord = (observationData, language) => {
  const isRTL = language === 'ar';
  
  let html = `
    <!DOCTYPE html>
    <html dir="${isRTL ? 'rtl' : 'ltr'}" lang="${language}">
    <head>
      <meta charset="UTF-8">
      <title>${isRTL ? 'تقرير المراقبة ELEOT' : 'ELEOT Observation Report'}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; direction: ${isRTL ? 'rtl' : 'ltr'}; }
        h1 { color: #2196F3; text-align: center; }
        h3 { color: green; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: ${isRTL ? 'right' : 'left'}; }
        th { background-color: #2196F3; color: white; }
        .score { font-weight: bold; }
      </style>
    </head>
    <body>
      <h1>${isRTL ? 'تقرير المراقبة ELEOT' : 'ELEOT Observation Report'}</h1>
      
      ${observationData.teacherName ? `<p><strong>${isRTL ? 'اسم المعلم:' : 'Teacher Name:'}</strong> ${observationData.teacherName}</p>` : ''}
      ${observationData.date ? `<p><strong>${isRTL ? 'التاريخ:' : 'Date:'}</strong> ${new Date(observationData.date).toLocaleDateString()}</p>` : ''}
      
      <h2>${isRTL ? 'النتائج' : 'Results'}</h2>
      <table>
        <thead>
          <tr>
            <th>${isRTL ? 'المعيار' : 'Criterion'}</th>
            <th>${isRTL ? 'الدرجة' : 'Score'}</th>
            <th>${isRTL ? 'التبرير' : 'Justification'}</th>
          </tr>
        </thead>
        <tbody>
  `;
  
  observationData.criteria.forEach(item => {
    const criterionLabel = language === 'ar' ? item.criterion.label_ar : item.criterion.label_en;
    html += `
      <tr>
        <td>${item.id}: ${criterionLabel}</td>
        <td class="score">${item.score}/4</td>
        <td>${item.justification}</td>
      </tr>
    `;
  });
  
  html += `
        </tbody>
      </table>
      
      ${observationData.recommendations ? `<div>${observationData.recommendations}</div>` : ''}
    </body>
    </html>
  `;
  
  const blob = new Blob(['\ufeff', html], { type: 'application/msword;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `eleot-report-${Date.now()}.doc`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Copy all text to clipboard
 */
export const copyAllText = async (observationData, language) => {
  const isRTL = language === 'ar';
  
  let text = `${isRTL ? 'تقرير المراقبة ELEOT' : 'ELEOT Observation Report'}\n\n`;
  
  if (observationData.teacherName) {
    text += `${isRTL ? 'اسم المعلم:' : 'Teacher Name:'} ${observationData.teacherName}\n`;
  }
  if (observationData.date) {
    text += `${isRTL ? 'التاريخ:' : 'Date:'} ${new Date(observationData.date).toLocaleDateString()}\n`;
  }
  
  text += `\n${isRTL ? 'النتائج:' : 'Results:'}\n`;
  
  observationData.criteria.forEach(item => {
    const criterionLabel = language === 'ar' ? item.criterion.label_ar : item.criterion.label_en;
    text += `\n${item.id}: ${criterionLabel}\n`;
    text += `${isRTL ? 'الدرجة:' : 'Score:'} ${item.score}/4\n`;
    text += `${isRTL ? 'التبرير:' : 'Justification:'} ${item.justification}\n`;
  });
  
  if (observationData.recommendations) {
    text += `\n${observationData.recommendations.replace(/<[^>]*>/g, '\n')}\n`;
  }
  
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Error copying text:', error);
    return false;
  }
};



