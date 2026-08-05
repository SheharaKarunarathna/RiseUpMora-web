export default function F() {
  return (
    <div style={{ display: "flex", gap: 12, padding: 12, background: "#222", alignItems: "flex-start" }}>
      {[390, 900].map((w) => (
        <div key={w}>
          <div style={{ color: "#fff", font: "700 12px sans-serif", marginBottom: 6 }}>{w}px</div>
          <iframe src="/dev-preview-guide-temp" style={{ width: w, height: 1450, border: "2px solid #0af", background: "#fff" }} />
        </div>
      ))}
    </div>
  );
}
