import { supabase } from "../services/supabase";

export default function Home() {
  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <h2 style={{ marginBottom: 8 }}>مرحبًا 👋</h2>
      <p style={{ marginTop: 0, color: "#555" }}>
        تم تسجيل الدخول بنجاح عبر Supabase.
      </p>

      <button
        onClick={logout}
        style={{
          marginTop: 16,
          padding: "10px 14px",
          borderRadius: 10,
          border: "1px solid #ddd",
          background: "#fff",
          cursor: "pointer",
        }}
      >
        تسجيل خروج
      </button>
    </div>
  );
}
