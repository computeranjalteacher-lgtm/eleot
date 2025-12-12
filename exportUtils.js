import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const exportToPDF = async (observation, evaluation) => {
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4'
  });

  const isRTL = evaluation.language === 'ar';

  // تحميل الترويسة
  const headerImage = '/header.png'; // يجب أن تكون داخل public/

  // إضافة الترويسة لكل صفحة
  const addHeader = () => {
    doc.addImage(headerImage, 'PNG', 10, 5, 190, 20);
    doc.setLineWidth(0.2);
    doc.line(10, 27, 200, 27);
  };

  addHeader();

  let yPos = 35;

  const addText = (text, x, y, options = {}) => {
    if (isRTL) {
      options = { ...options, align: 'right' };
      doc.text(text, 200 - x, y, options);
    } else {
      doc.text(text, x, y, options);
    }
  };

  // العنوان
  doc.setFontSize(18);
  addText(isRTL ? 'تقرير المراقبة - ELEOT' : 'ELEOT Observation Report', 105, yPos, { align: 'center' });
  yPos += 15;

  // تفاصيل الملاحظة
  doc.setFontSize(12);
  addText((isRTL ? 'التاريخ:' : 'Date:') + ' ' + observation.date, 20, yPos);
  yPos += 7;
  addText((isRTL ? 'اسم المعلم:' : 'Teacher Name:') + ' ' + observation.teacherName, 20, yPos);
  yPos += 7;
  addText(
    (isRTL ? 'البيئات المقيّمة:' : 'Environments:') + ' ' + observation.environments.join(', '),
    20,
    yPos
  );
  yPos += 10;

  // النتيجة العامة
  doc.setFontSize(14);
  addText((isRTL ? 'النتيجة الإجمالية:' : 'Overall Score:') + ' ' + evaluation.totalScore + '/4', 20, yPos);
  yPos += 15;

  // النتائج
  doc.setFontSize(11);
  evaluation.results.forEach((result) => {
    if (yPos > 260) {
      doc.addPage();
      addHeader();
      yPos = 35;
    }

    addText(`${result.environmentLabel} - ${result.criterion.id}`, 20, yPos);
    yPos += 6;

    const criterionLabel = isRTL ? result.criterion.label_ar : result.criterion.label_en;

    const wrappedCriterion = doc.splitTextToSize(criterionLabel, 170);
    wrappedCriterion.forEach((line) => {
      addText(line, 20, yPos);
      yPos += 6;
    });

    addText((isRTL ? 'الدرجة:' : 'Score:') + ` ${result.score}/4`, 20, yPos);
    yPos += 6;

    addText(isRTL ? 'التبرير:' : 'Justification:', 20, yPos);
    yPos += 6;

    const wrappedJust = doc.splitTextToSize(result.justification, 170);
    wrappedJust.forEach((line) => {
      if (yPos > 260) {
        doc.addPage();
        addHeader();
        yPos = 35;
      }
      addText(line, 20, yPos);
      yPos += 6;
    });

    yPos += 5;
  });

  // التوصيات
  if (evaluation.recommendations) {
    if (yPos > 250) {
      doc.addPage();
      addHeader();
      yPos = 35;
    }

    doc.setFontSize(14);
    doc.setTextColor(0, 128, 0);
    addText(isRTL ? 'التوصيات' : 'Recommendations', 20, yPos);
    doc.setTextColor(0, 0, 0);
    yPos += 10;

    const recommendationsText = evaluation.recommendations
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim();

    const wrappedRec = doc.splitTextToSize(recommendationsText, 170);
    wrappedRec.forEach((line) => {
      if (yPos > 260) {
        doc.addPage();
        addHeader();
        yPos = 35;
      }
      addText(line, 20, yPos);
      yPos += 6;
    });
  }

  doc.save(`ELEOT_Report_${observation.date.replace(/\//g, '_')}.pdf`);
};

/* -----------------------------------------------------------
                     Word Export (no changes needed)
------------------------------------------------------------ */
export const exportToWord = (observation, evaluation) => {
  const isRTL = evaluation.language === 'ar';

  let htmlContent = `
    <!DOCTYPE html>
    <html dir="${isRTL ? 'rtl' : 'ltr'}" lang="${evaluation.language}">
    <head>
      <meta charset="UTF-8">
      <title>ELEOT Observation Report</title>
      <style>
        body { font-family: Arial; margin: 20px; direction: ${isRTL ? 'rtl' : 'ltr'}; }
        h1 { color: #2196F3; text-align: center; }
        table { border-collapse: collapse; width: 100%; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: ${isRTL ? 'right' : 'left'}; }
        th { background-color: #2196F3; color: white; }
      </style>
    </head>
    <body>
      <img src="header.png" style="width:100%; margin-bottom:20px;">
      <h1>${isRTL ? 'تقرير المراقبة - ELEOT' : 'ELEOT Observation Report'}</h1>

      <p><strong>${isRTL ? 'التاريخ:' : 'Date:'}</strong> ${observation.date}</p>
      <p><strong>${isRTL ? 'اسم المعلم:' : 'Teacher Name:'}</strong> ${observation.teacherName}</p>
      <p><strong>${isRTL ? 'البيئات المقيّمة:' : 'Environments:'}</strong> ${observation.environments.join(', ')}</p>
      <p><strong>${isRTL ? 'النتيجة الإجمالية:' : 'Overall Score:'}</strong> ${evaluation.totalScore}/4</p>

      <table>
        <tr>
          <th>${isRTL ? 'البيئة' : 'Environment'}</th>
          <th>${isRTL ? 'المعيار' : 'Criterion'}</th>
          <th>${isRTL ? 'الدرجة' : 'Score'}</th>
          <th>${isRTL ? 'التبرير' : 'Justification'}</th>
        </tr>
  `;

  evaluation.results.forEach((result) => {
    const criterionLabel = isRTL ? result.criterion.label_ar : result.criterion.label_en;

    htmlContent += `
      <tr>
        <td>${result.environmentLabel}</td>
        <td>${result.criterion.id}: ${criterionLabel}</td>
        <td>${result.score}/4</td>
        <td>${result.justification}</td>
      </tr>`;
  });

  htmlContent += `
      </table>
      <div style="margin-top: 20px;">
        ${evaluation.recommendations}
      </div>
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = `ELEOT_Report_${observation.date.replace(/\//g, '_')}.doc`;
  link.click();

  URL.revokeObjectURL(url);
};
