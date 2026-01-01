import { useEffect, useMemo, useState } from "react";
import { fetchVisitDetails, fetchVisits } from "../services/visitsService";

// Helpers
function fmtDate(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleString("ar-SA", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function downloadCSV(filename, rows) {
  const escape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = rows.map((r) => r.map(escape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function VisitsPage() {
  // Filters
  const [teacherName, setTeacherName] = useState("");
  const [subject, setSubject] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 50;

  // Data
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total]);

  // Selected visit details
  const [selectedId, setSelectedId] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [visitDetails, setVisitDetails] = useState(null); // {visit, envs}
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetchVisits({ teacherName, subject, dateFrom, dateTo, page, pageSize });
      setRows(res.rows);
      setTotal(res.total);
    } catch (e) {
      setError(e.message || "حدث خطأ أثناء جلب الزيارات");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  async function applyFilters() {
    setPage(1);
    await load();
  }

  async function openVisit(visitId) {
    setSelectedId(visitId);
    setVisitDetails(null);
    setDetailsLoading(true);
    setError("");
    try {
      const data = await fetchVisitDetails(visitId);
      setVisitDetails(data);
    } catch (e) {
      setError(e.message || "فشل جلب تفاصيل الزيارة");
    } finally {
      setDetailsLoading(false);
    }
  }

  // Export one visit CSV (Visit + Envs)
  function exportVisitCSV() {
    if (!visitDetails) return;
    const { visit, envs } = visitDetails;

    const header1 = ["Visit ID", "Teacher", "Subject", "Date", "Total Score", "Total Max", "Percent"];
    const row1 = [
      visit.visit_id,
      visit.teacher_name,
      visit.subject,
      visit.visit_ts,
      visit.total_score,
      visit.total_max,
      visit.percent,
    ];

    const header2 = ["Env Code", "Env Name AR", "Env Score", "Env Max", "Env %", "Details"];
    const rows2 = envs.map((e) => [
      e.env_code,
      e.env_name_ar,
      e.env_score,
      e.env_max,
      e.env_percent,
      e.details,
    ]);

    const all = [header1, row1, [], header2, ...rows2];
    downloadCSV(`visit_${visit.visit_id}.csv`, all);
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <h2 className="text-2xl font-bold mb-4">الزيارات</h2>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div>
              <label className="block text-sm mb-1">اسم المعلم</label>
              <input
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="مثال: سليمان"
              />
            </div>

            <div>
              <label className="block text-sm mb-1">المادة</label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="حاسب / رياضيات..."
              />
            </div>

            <div>
              <label className="block text-sm mb-1">من تاريخ</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm mb-1">إلى تاريخ</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>

            <div className="flex items-end gap-2">
              <button
                onClick={applyFilters}
                className="w-full bg-blue-600 text-white rounded-lg px-4 py-2 hover:bg-blue-700"
              >
                تطبيق
              </button>
              <button
                onClick={() => {
                  setTeacherName("");
                  setSubject("");
                  setDateFrom("");
                  setDateTo("");
                  setPage(1);
                  setSelectedId(null);
                  setVisitDetails(null);
                }}
                className="w-full bg-gray-200 rounded-lg px-4 py-2 hover:bg-gray-300"
              >
                مسح
              </button>
            </div>
          </div>

          <div className="mt-3 text-sm text-gray-600">
            الإجمالي: <span className="font-semibold">{total}</span> زيارة — الصفحة {page} من {totalPages}
          </div>
        </div>

        {/* Errors */}
        {error && (
          <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-3 mb-4">
            {error}
          </div>
        )}

        {/* Visits table */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100">
                <tr className="text-right">
                  <th className="px-3 py-3">المعلم</th>
                  <th className="px-3 py-3">المادة</th>
                  <th className="px-3 py-3">التاريخ</th>
                  <th className="px-3 py-3">النسبة %</th>
                  <th className="px-3 py-3">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td className="px-3 py-6 text-center" colSpan={5}>جاري التحميل...</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td className="px-3 py-6 text-center" colSpan={5}>لا توجد زيارات</td></tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.visit_id} className="border-t">
                      <td className="px-3 py-3">{r.teacher_name}</td>
                      <td className="px-3 py-3">{r.subject}</td>
                      <td className="px-3 py-3">{fmtDate(r.visit_ts)}</td>
                      <td className="px-3 py-3 font-semibold">{r.percent}</td>
                      <td className="px-3 py-3">
                        <button
                          onClick={() => openVisit(r.visit_id)}
                          className="bg-indigo-600 text-white rounded-lg px-3 py-1.5 hover:bg-indigo-700"
                        >
                          عرض
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between p-3 border-t">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-2 rounded-lg bg-gray-200 disabled:opacity-50"
            >
              السابق
            </button>
            <div className="text-sm">
              صفحة {page} / {totalPages}
            </div>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-2 rounded-lg bg-gray-200 disabled:opacity-50"
            >
              التالي
            </button>
          </div>
        </div>

        {/* Details panel */}
        <div className="mt-6 bg-white rounded-xl shadow p-4">
          <h3 className="text-lg font-bold mb-3">تفاصيل الزيارة</h3>

          {!selectedId ? (
            <div className="text-gray-600">اختر زيارة من الجدول لعرض تفاصيلها.</div>
          ) : detailsLoading ? (
            <div className="text-gray-600">جاري تحميل التفاصيل...</div>
          ) : !visitDetails ? (
            <div className="text-gray-600">لا توجد تفاصيل.</div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500">المعلم</div>
                  <div className="font-semibold">{visitDetails.visit.teacher_name}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500">المادة</div>
                  <div className="font-semibold">{visitDetails.visit.subject}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500">التاريخ</div>
                  <div className="font-semibold">{fmtDate(visitDetails.visit.visit_ts)}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500">النسبة</div>
                  <div className="font-semibold">{visitDetails.visit.percent}%</div>
                </div>
              </div>

              <div className="flex gap-2 mb-3">
                <button
                  onClick={exportVisitCSV}
                  className="bg-emerald-600 text-white rounded-lg px-4 py-2 hover:bg-emerald-700"
                >
                  Export CSV (زيارة واحدة)
                </button>
                {/* PDF/Word نربطها بعد ما تجهز مكتبات التصدير */}
                <button
                  disabled
                  className="bg-gray-200 rounded-lg px-4 py-2 opacity-60 cursor-not-allowed"
                >
                  PDF قريباً
                </button>
                <button
                  disabled
                  className="bg-gray-200 rounded-lg px-4 py-2 opacity-60 cursor-not-allowed"
                >
                  Word قريباً
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm border">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-2 border">الكود</th>
                      <th className="px-3 py-2 border">البيئة</th>
                      <th className="px-3 py-2 border">الدرجة</th>
                      <th className="px-3 py-2 border">الحد</th>
                      <th className="px-3 py-2 border">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visitDetails.envs.map((e) => (
                      <tr key={e.id} className="border-t">
                        <td className="px-3 py-2 border font-semibold">{e.env_code}</td>
                        <td className="px-3 py-2 border">{e.env_name_ar}</td>
                        <td className="px-3 py-2 border">{e.env_score}</td>
                        <td className="px-3 py-2 border">{e.env_max}</td>
                        <td className="px-3 py-2 border font-semibold">{e.env_percent}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
