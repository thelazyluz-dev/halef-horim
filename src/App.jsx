import { useState, useRef, useEffect } from "react";
import html2canvas from "html2canvas";

const IS_DEV = import.meta.env.DEV;

const AVATARS = [
  "https://api.dicebear.com/7.x/adventurer/svg?seed=mom1&backgroundColor=ffdfbf",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=dad1&backgroundColor=c0aede",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=mom2&backgroundColor=d1f4d1",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=dad2&backgroundColor=ffd6d6",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=mom3&backgroundColor=ffecd2",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=dad3&backgroundColor=d6eaff",
];

const MATCH_PERCENT = () => Math.floor(Math.random() * 15) + 85;
const TODAY = new Date().toLocaleDateString("he-IL");
const CONTRACT_NO = () => Math.floor(Math.random() * 90000) + 10000;

export default function App() {
  const [apiKey, setApiKey] = useState(() => IS_DEV ? "dev" : (localStorage.getItem("anthropic_key") || ""));
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [apiError, setApiError] = useState("");
  const [step, setStep] = useState("form"); // form | loading | match | contract | signed
  const [formData, setFormData] = useState({ name: "", age: "", reason: "", wantedParents: "" });
  const [match, setMatch] = useState(null);
  const [percent, setPercent] = useState(0);
  const [loadingText, setLoadingText] = useState("");
  const [checkedCount, setCheckedCount] = useState(0);
  const [signature, setSignature] = useState("");
  const [contractNo] = useState(CONTRACT_NO());
  const [drawing, setDrawing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const canvasRef = useRef(null);
  const lastPos = useRef(null);
  const signedRef = useRef(null);
  const countIntervalRef = useRef(null);

  // Animated counter during loading
  useEffect(() => {
    if (step === "loading") {
      const target = Math.floor(Math.random() * 700) + 300;
      setCheckedCount(0);
      countIntervalRef.current = setInterval(() => {
        setCheckedCount((prev) => {
          const next = prev + Math.floor(Math.random() * 12) + 3;
          if (next >= target) {
            clearInterval(countIntervalRef.current);
            return target;
          }
          return next;
        });
      }, 80);
    } else {
      clearInterval(countIntervalRef.current);
    }
    return () => clearInterval(countIntervalRef.current);
  }, [step]);

  const handleSubmit = async () => {
    if (!formData.name || !formData.age || !formData.reason) return;
    setApiError("");
    setStep("loading");

    const texts = [
      "🔍 סורקים מאגר הורים זמינים...",
      "📊 מנתחים תלונות נגד ההורים הנוכחיים...",
      "🧬 בודקים התאמה גנטית לפיצות...",
      "🛋️ מחפשים הורים עם ספה נוחה...",
      "✅ נמצאה התאמה מושלמת!",
    ];
    let i = 0;
    setLoadingText(texts[0]);
    const interval = setInterval(() => {
      i++;
      if (i < texts.length) setLoadingText(texts[i]);
      else clearInterval(interval);
    }, 900);

    const prompt = `אתה מחולל הורים פיקטיביים לאפליקציה הומוריסטית לילדים.
ילד בשם ${formData.name}, בן/בת ${formData.age}, רוצה להחליף הורים כי: "${formData.reason}".
הוא/היא מחפש הורים שהם: "${formData.wantedParents || "לא פירט"}".

צור זוג הורים פיקטיביים מצחיקים. החזר JSON בלבד (ללא backticks):
{
  "momName": "שם האמא",
  "dadName": "שם האבא",
  "location": "עיר מגורים מצחיקה",
  "tagline": "סלוגן שלהם כהורים (משפט קצר מצחיק)",
  "momDesc": "תיאור האמא בשתי משפטים מצחיק",
  "dadDesc": "תיאור האבא בשתי משפטים מצחיק",
  "perks": ["הטבה 1", "הטבה 2", "הטבה 3", "הטבה 4"],
  "warning": "אזהרה קטנה מצחיקה אחת",
  "clause1": "סעיף חוזה מצחיק ראשון (חובת הילד)",
  "clause2": "סעיף חוזה מצחיק שני (זכות הילד)",
  "clause3": "סעיף חוזה מצחיק שלישי (תנאי ביטול)"
}`;

    try {
      const url = IS_DEV ? "/api/messages" : "https://api.anthropic.com/v1/messages";
      const headers = { "Content-Type": "application/json", "anthropic-version": "2023-06-01" };
      if (!IS_DEV) {
        headers["x-api-key"] = apiKey;
        headers["anthropic-dangerous-direct-browser-access"] = "true";
      }
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: "claude-3-5-haiku-20241022",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message || "שגיאת API");
      const text = data.content.map((b) => b.text || "").join("");
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      const momAvatar = AVATARS[Math.floor(Math.random() * 3)];
      const dadAvatar = AVATARS[3 + Math.floor(Math.random() * 3)];
      setMatch({ ...parsed, momAvatar, dadAvatar });
      setPercent(MATCH_PERCENT());
      setTimeout(() => setStep("match"), 4600);
    } catch (e) {
      console.error(e);
      setApiError(e.message || "שגיאה לא ידועה");
      setStep("error");
    }
  };

  // Download signed contract as image
  const downloadContract = async () => {
    if (!signedRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(signedRef.current, { scale: 2, useCORS: true, backgroundColor: "#fff" });
      const link = document.createElement("a");
      link.download = `חוזה-הורים-${formData.name}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      setDownloading(false);
    }
  };

  // Share on WhatsApp
  const shareWhatsApp = () => {
    const msg = `🎉 החלפתי הורים!\n\n👩 ${match.momName} ו-👨 ${match.dadName} מ${match.location}\n"${match.tagline}"\n\nגם אתה/את רוצה לנסות? 👪\nhttps://github.com/thelazyluz-dev/halef-horim`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  // Canvas drawing
  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  };

  const startDraw = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    lastPos.current = pos;
    setDrawing(true);
  };

  const draw = (e) => {
    if (!drawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const pos = getPos(e, canvas);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1a1a6e";
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
  };

  const endDraw = () => {
    setDrawing(false);
    setSignature(canvasRef.current.toDataURL());
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    setSignature("");
  };

  const saveApiKey = () => {
    const trimmed = apiKeyInput.trim();
    if (!trimmed.startsWith("sk-ant-")) return;
    localStorage.setItem("anthropic_key", trimmed);
    setApiKey(trimmed);
  };

  if (!IS_DEV && !apiKey) {
    return (
      <div style={styles.root}>
        <div style={styles.header}>
          <div style={styles.logo}>👪 החלף הורים</div>
          <div style={styles.tagline}>כי לפעמים צריך שדרוג</div>
        </div>
        <div style={styles.card} className="fadeIn">
          <div style={styles.cardTitle}>🔑 הגדרה ראשונית</div>
          <div style={styles.cardSub}>כדי להשתמש באפליקציה, הזן מפתח Anthropic API</div>
          <div style={styles.field}>
            <label>Anthropic API Key</label>
            <input
              placeholder="sk-ant-..."
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              type="password"
              dir="ltr"
            />
          </div>
          <button
            style={{ ...styles.btn, opacity: apiKeyInput.startsWith("sk-ant-") ? 1 : 0.5 }}
            disabled={!apiKeyInput.startsWith("sk-ant-")}
            onClick={saveApiKey}
          >
            🚀 התחל!
          </button>
          <div style={styles.disclaimer}>
            המפתח נשמר רק בדפדפן שלך ולא נשלח לשום שרת.{" "}
            <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer" style={{ color: "#ff7043" }}>קבל מפתח בחינם</a>
          </div>
        </div>
        <style>{`.fadeIn { animation: fadeIn 0.5s ease forwards; } @keyframes fadeIn { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }`}</style>
      </div>
    );
  }

  return (
    <div style={styles.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fredoka+One&family=Rubik:wght@400;500;700&family=IM+Fell+English&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes stamp { 0%{transform:scale(3) rotate(-15deg);opacity:0} 60%{transform:scale(0.9) rotate(-15deg);opacity:1} 100%{transform:scale(1) rotate(-15deg);opacity:1} }
        @keyframes confetti { 0%{transform:translateY(-10px) rotate(0deg);opacity:1} 100%{transform:translateY(80px) rotate(720deg);opacity:0} }
        @keyframes countUp { from{opacity:0.4} to{opacity:1} }
        .bounce { animation: bounce 1s infinite; }
        .fadeIn { animation: fadeIn 0.5s ease forwards; }
        .stamp-anim { animation: stamp 0.5s cubic-bezier(.17,.67,.35,1.2) forwards; }
        .count-flash { animation: countUp 0.1s ease; }
        input, textarea {
          font-family: 'Rubik', sans-serif; font-size: 15px;
          border: 2px solid #ffd4c2; border-radius: 14px; padding: 12px 16px;
          width: 100%; background: #fff; color: #333; outline: none;
          transition: border 0.2s; direction: rtl;
        }
        input:focus, textarea:focus { border-color: #ff7043; }
        textarea { resize: vertical; min-height: 80px; }
        label { font-size: 13px; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 6px; }
        canvas { touch-action: none; cursor: crosshair; }
      `}</style>

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.logo}>👪 החלף הורים</div>
        <div style={styles.tagline}>כי לפעמים צריך שדרוג</div>
      </div>

      {/* FORM */}
      {step === "form" && (
        <div style={styles.card} className="fadeIn">
          <div style={styles.cardTitle}>📋 פרסם את עצמך</div>
          <div style={styles.cardSub}>מלא פרטים ונמצא לך הורים מתאימים</div>
          <div style={styles.field}>
            <label>שם הילד/ה</label>
            <input placeholder="איך קוראים לך?" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
          </div>
          <div style={styles.field}>
            <label>גיל</label>
            <input type="number" placeholder="כמה שנים סבלת?" value={formData.age} onChange={(e) => setFormData({ ...formData, age: e.target.value })} />
          </div>
          <div style={styles.field}>
            <label>למה אתה רוצה להחליף הורים?</label>
            <textarea placeholder="פרט את תלונותיך... (לדוג': לא קונים לי מה שאני רוצה, מכריחים לאכול ירקות)" value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} />
          </div>
          <div style={styles.field}>
            <label>איזה הורים אתה מחפש?</label>
            <textarea placeholder="תאר את ההורים החלומיים שלך... (אופציונלי)" value={formData.wantedParents} onChange={(e) => setFormData({ ...formData, wantedParents: e.target.value })} />
          </div>
          <button style={{ ...styles.btn, opacity: formData.name && formData.age && formData.reason ? 1 : 0.5 }} onClick={handleSubmit} disabled={!formData.name || !formData.age || !formData.reason}>
            🔍 מצא לי הורים חדשים!
          </button>
          {apiError && <div style={styles.errorBox}>❌ {apiError}</div>}
          <div style={styles.disclaimer}>⚠️ שירות זה הוא בדיחה בלבד. ההורים שלך אוהבים אותך גם כשאתה מעצבן.</div>
        </div>
      )}

      {/* ERROR */}
      {step === "error" && (
        <div style={styles.card} className="fadeIn">
          <div style={{ textAlign: "center", marginBottom: 16, fontSize: 48 }}>😵</div>
          <div style={{ ...styles.cardTitle, color: "#c62828" }}>משהו השתבש</div>
          <div style={{ ...styles.errorBox, marginBottom: 16 }}>
            <strong>שגיאה:</strong> {apiError}
          </div>
          <button style={styles.btn} onClick={() => { setStep("form"); setApiError(""); }}>
            🔄 חזור ונסה שוב
          </button>
          {!IS_DEV && (
            <button style={{ ...styles.btn, background: "#888", marginTop: 10 }} onClick={() => {
              localStorage.removeItem("anthropic_key");
              setApiKey("");
              setStep("form");
              setApiError("");
            }}>
              🔑 שנה מפתח API
            </button>
          )}
        </div>
      )}

      {/* LOADING */}
      {step === "loading" && (
        <div style={{ ...styles.card, textAlign: "center" }} className="fadeIn">
          <div style={{ fontSize: 64, marginBottom: 20 }} className="bounce">🔍</div>
          <div style={styles.loadTitle}>מחפשים הורים...</div>
          <div style={styles.loadSub}>{loadingText}</div>
          <div style={styles.progressBar}><div style={styles.progressFill} /></div>
          <div style={styles.counterWrap}>
            <span style={styles.counterNum}>{checkedCount.toLocaleString("he-IL")}</span>
            <span style={styles.counterLabel}> זוגות הורים נבדקו עד כה</span>
          </div>
        </div>
      )}

      {/* MATCH */}
      {step === "match" && match && (
        <div className="fadeIn">
          <div style={styles.matchBanner}>
            <div style={{ fontSize: 40 }}>🎉</div>
            <div style={styles.matchTitle}>נמצאה התאמה!</div>
            <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 15, marginTop: 4 }}>{percent}% התאמה</div>
          </div>
          <div style={styles.card}>
            <div style={styles.parentsRow}>
              <div style={styles.parentCard}>
                <img src={match.momAvatar} alt="mom" style={styles.avatar} />
                <div style={styles.parentName}>{match.momName}</div>
                <div style={styles.parentRole}>👩 אמא</div>
                <div style={styles.parentDesc}>{match.momDesc}</div>
              </div>
              <div style={{ fontSize: 28, flexShrink: 0 }}>💕</div>
              <div style={styles.parentCard}>
                <img src={match.dadAvatar} alt="dad" style={styles.avatar} />
                <div style={styles.parentName}>{match.dadName}</div>
                <div style={styles.parentRole}>👨 אבא</div>
                <div style={styles.parentDesc}>{match.dadDesc}</div>
              </div>
            </div>
            <div style={styles.locationBadge}>📍 {match.location}</div>
            <div style={styles.taglineBig}>"{match.tagline}"</div>
            <div style={styles.perksTitle}>✨ מה מגיע לך:</div>
            <div style={{ marginBottom: 14 }}>
              {match.perks.map((p, i) => <div key={i} style={styles.perk}>✅ {p}</div>)}
            </div>
            <div style={styles.warningBox}>⚠️ {match.warning}</div>
            <div style={styles.btnRow}>
              <button style={{ ...styles.btn, background: "#4CAF50" }} onClick={() => setStep("contract")}>
                💌 אני רוצה אותם!
              </button>
              <button style={{ ...styles.btn, background: "#ff7043" }} onClick={() => { setStep("form"); setMatch(null); }}>
                🔄 חפש שוב
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONTRACT */}
      {step === "contract" && match && (
        <div className="fadeIn">
          <div style={styles.contractWrap}>
            <div style={styles.contractHeader}>
              <div style={styles.contractSeal}>⚖️</div>
              <div style={styles.contractTitle}>חוזה העברת הורות רשמי</div>
              <div style={styles.contractSubtitle}>משרד ניהול הורים — מדינת ישראל</div>
              <div style={styles.contractNo}>מס' חוזה: {contractNo} | תאריך: {TODAY}</div>
            </div>

            <div style={styles.contractBody}>
              <p style={styles.contractIntro}>
                הסכם זה נחתם בין <strong>{formData.name}</strong>, בן/בת {formData.age}, המכונה להלן "הילד/ה",
                לבין <strong>{match.momName}</strong> ו-<strong>{match.dadName}</strong> מ{match.location}, המכונים להלן "ההורים החדשים".
              </p>

              <div style={styles.clauseTitle}>סעיפי החוזה:</div>

              <div style={styles.clause}>
                <span style={styles.clauseNum}>סעיף א׳</span>
                <span>{match.clause1}</span>
              </div>
              <div style={styles.clause}>
                <span style={styles.clauseNum}>סעיף ב׳</span>
                <span>{match.clause2}</span>
              </div>
              <div style={styles.clause}>
                <span style={styles.clauseNum}>סעיף ג׳</span>
                <span>{match.clause3}</span>
              </div>
              <div style={styles.clause}>
                <span style={styles.clauseNum}>סעיף ד׳</span>
                <span>ההורים הביולוגיים יישמרו בארכיון ויוחזרו במקרה של חרטה תוך 30 שנים.</span>
              </div>

              <div style={styles.sigSection}>
                <div style={styles.sigLabel}>חתימת הילד/ה — "{formData.name}"</div>
                <div style={styles.canvasWrap}>
                  <canvas
                    ref={canvasRef}
                    width={320}
                    height={100}
                    style={styles.sigCanvas}
                    onMouseDown={startDraw}
                    onMouseMove={draw}
                    onMouseUp={endDraw}
                    onMouseLeave={endDraw}
                    onTouchStart={startDraw}
                    onTouchMove={draw}
                    onTouchEnd={endDraw}
                  />
                  <div style={styles.sigLine} />
                  <div style={styles.sigHint}>חתום כאן עם האצבע 👆</div>
                </div>
                {signature && (
                  <button onClick={clearCanvas} style={styles.clearBtn}>🗑️ נקה חתימה</button>
                )}
              </div>

              <button
                style={{ ...styles.btn, opacity: signature ? 1 : 0.45, marginTop: 16 }}
                disabled={!signature}
                onClick={() => setStep("signed")}
              >
                ✍️ חתום וסגור עסקה!
              </button>
              {!signature && <div style={{ textAlign: "center", fontSize: 12, color: "#aaa", marginTop: 8 }}>יש לחתום לפני האישור</div>}
            </div>
          </div>
        </div>
      )}

      {/* SIGNED */}
      {step === "signed" && match && (
        <div className="fadeIn">
          <div style={styles.card}>
            <div style={{ position: "relative", height: 0 }}>
              {["🎊","🎉","⭐","🎈","✨"].map((e, i) => (
                <span key={i} style={{
                  position: "absolute",
                  top: -20,
                  left: `${15 + i * 18}%`,
                  fontSize: 22,
                  animation: `confetti 1.5s ${i * 0.15}s ease-out forwards`,
                }}>{e}</span>
              ))}
            </div>

            {/* Capturable section */}
            <div ref={signedRef} style={{ background: "#fff", padding: "8px 0" }}>
              <div style={styles.signedDoc}>
                <div style={styles.stampWrap}>
                  <div className="stamp-anim" style={styles.stamp}>
                    <div style={{ fontSize: 26 }}>✅</div>
                    <div style={styles.stampText}>אושר!</div>
                  </div>
                </div>
                <div style={styles.signedTitle}>החוזה נחתם בהצלחה!</div>
                <div style={styles.signedSub}>מס׳ {contractNo}</div>

                <div style={styles.signedParents}>
                  <img src={match.momAvatar} style={styles.signedAvatar} alt="mom" />
                  <div style={{ fontSize: 20 }}>❤️</div>
                  <img src={match.dadAvatar} style={styles.signedAvatar} alt="dad" />
                </div>

                <div style={styles.signedNames}>{match.momName} & {match.dadName}</div>
                <div style={{ fontSize: 13, color: "#999", marginBottom: 4 }}>מ{match.location}</div>
                <div style={styles.signedMsg}>
                  מזל טוב {formData.name}! ההורים החדשים שלך יגיעו אליך תוך 3-5 ימי עסקים. 📦<br />
                  <span style={{ fontSize: 12 }}>(אוקי, זו בדיחה. אבל ההורים שלך אוהבים אותך 💙)</span>
                </div>
              </div>
            </div>

            <div style={{ ...styles.btnRow, marginTop: 12 }}>
              <button style={{ ...styles.btn, background: "#25D366" }} onClick={shareWhatsApp}>
                📱 שתף בוואטסאפ
              </button>
              <button style={{ ...styles.btn, background: "#5c6bc0" }} onClick={downloadContract} disabled={downloading}>
                {downloading ? "⏳ שומר..." : "📥 הורד תמונה"}
              </button>
            </div>
            <div style={{ marginTop: 10 }}>
              <button style={{ ...styles.btn, background: "#ff7043" }} onClick={() => { setStep("form"); setMatch(null); setSignature(""); clearCanvas(); }}>
                🔄 פרסם ילד אחר
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  root: { fontFamily: "'Rubik', sans-serif", maxWidth: 480, margin: "0 auto", minHeight: "100vh", background: "linear-gradient(135deg, #fff5f0 0%, #fff0f9 100%)", paddingBottom: 40, direction: "rtl" },
  header: { background: "linear-gradient(135deg, #ff7043, #ff4081)", padding: "28px 24px 24px", textAlign: "center", borderRadius: "0 0 32px 32px", boxShadow: "0 6px 24px rgba(255,112,67,0.3)", marginBottom: 24 },
  logo: { fontFamily: "'Fredoka One', cursive", fontSize: 32, color: "#fff", letterSpacing: 1 },
  tagline: { color: "rgba(255,255,255,0.85)", fontSize: 14, marginTop: 4 },
  card: { background: "#fff", borderRadius: 24, padding: 24, margin: "0 16px 16px", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" },
  cardTitle: { fontFamily: "'Fredoka One', cursive", fontSize: 22, color: "#ff7043", marginBottom: 4 },
  cardSub: { color: "#999", fontSize: 14, marginBottom: 20 },
  field: { marginBottom: 16 },
  btn: { width: "100%", padding: "15px", background: "linear-gradient(135deg, #ff7043, #ff4081)", color: "#fff", border: "none", borderRadius: 16, fontSize: 17, fontFamily: "'Fredoka One', cursive", cursor: "pointer", letterSpacing: 0.5, boxShadow: "0 4px 16px rgba(255,64,129,0.3)", display: "block" },
  disclaimer: { textAlign: "center", fontSize: 12, color: "#bbb", marginTop: 14, lineHeight: 1.5 },
  errorBox: { background: "#fff0f0", border: "1px solid #ffcccc", borderRadius: 12, padding: 12, fontSize: 13, color: "#c62828", marginTop: 12, textAlign: "center", lineHeight: 1.5 },
  loadTitle: { fontFamily: "'Fredoka One', cursive", fontSize: 24, color: "#ff7043", marginBottom: 8 },
  loadSub: { color: "#666", fontSize: 15, marginBottom: 24, minHeight: 24 },
  progressBar: { height: 10, background: "#ffd4c2", borderRadius: 99, overflow: "hidden", margin: "0 auto", maxWidth: 260 },
  progressFill: { height: "100%", background: "linear-gradient(90deg, #ff7043, #ff4081)", borderRadius: 99, width: "85%", transition: "width 4.5s ease" },
  counterWrap: { marginTop: 20, fontSize: 14, color: "#aaa" },
  counterNum: { fontFamily: "'Fredoka One', cursive", fontSize: 28, color: "#ff7043" },
  counterLabel: { fontSize: 13, color: "#bbb" },
  matchBanner: { textAlign: "center", padding: "20px 16px", background: "linear-gradient(135deg, #ff7043, #ff4081)", margin: "0 16px 16px", borderRadius: 20, boxShadow: "0 4px 16px rgba(255,64,129,0.3)" },
  matchTitle: { fontFamily: "'Fredoka One', cursive", fontSize: 26, color: "#fff", marginTop: 4 },
  parentsRow: { display: "flex", alignItems: "center", gap: 12, marginBottom: 16 },
  parentCard: { flex: 1, textAlign: "center", background: "#fff8f6", borderRadius: 16, padding: 12 },
  avatar: { width: 72, height: 72, borderRadius: "50%", border: "3px solid #ffd4c2", marginBottom: 8 },
  parentName: { fontFamily: "'Fredoka One', cursive", fontSize: 16, color: "#333" },
  parentRole: { fontSize: 12, color: "#aaa", marginBottom: 6 },
  parentDesc: { fontSize: 12, color: "#666", lineHeight: 1.5 },
  locationBadge: { display: "inline-block", background: "#fff0f9", color: "#ff4081", borderRadius: 99, padding: "5px 14px", fontSize: 13, fontWeight: 700, marginBottom: 10 },
  taglineBig: { fontFamily: "'Fredoka One', cursive", fontSize: 17, color: "#ff7043", marginBottom: 16, lineHeight: 1.4 },
  perksTitle: { fontWeight: 700, fontSize: 14, color: "#555", marginBottom: 8 },
  perk: { fontSize: 14, color: "#444", padding: "5px 0", borderBottom: "1px solid #f5f5f5" },
  warningBox: { background: "#fff8e1", border: "1px solid #ffe082", borderRadius: 12, padding: 12, fontSize: 13, color: "#795548", marginBottom: 16, lineHeight: 1.5 },
  btnRow: { display: "flex", gap: 10 },

  // Contract
  contractWrap: { margin: "0 16px 16px", background: "#fffdf5", borderRadius: 24, boxShadow: "0 4px 24px rgba(0,0,0,0.10)", overflow: "hidden", border: "2px solid #e8d8b0" },
  contractHeader: { background: "linear-gradient(135deg, #1a1a6e, #2d2d9a)", padding: "24px 20px 20px", textAlign: "center" },
  contractSeal: { fontSize: 36, marginBottom: 6 },
  contractTitle: { fontFamily: "'IM Fell English', serif", fontSize: 20, color: "#f5e6c8", letterSpacing: 1 },
  contractSubtitle: { color: "rgba(245,230,200,0.7)", fontSize: 13, marginTop: 4 },
  contractNo: { color: "rgba(245,230,200,0.5)", fontSize: 11, marginTop: 8, fontFamily: "monospace" },
  contractBody: { padding: 20 },
  contractIntro: { fontSize: 14, color: "#444", lineHeight: 1.7, marginBottom: 18, padding: 14, background: "#f9f4e8", borderRadius: 12, borderRight: "3px solid #c8a84b" },
  clauseTitle: { fontWeight: 700, fontSize: 13, color: "#888", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 },
  clause: { display: "flex", gap: 10, marginBottom: 12, fontSize: 14, color: "#333", lineHeight: 1.6, alignItems: "flex-start" },
  clauseNum: { background: "#1a1a6e", color: "#f5e6c8", borderRadius: 8, padding: "2px 8px", fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 2 },
  sigSection: { marginTop: 24, borderTop: "1px dashed #ddd", paddingTop: 16 },
  sigLabel: { fontSize: 13, fontWeight: 700, color: "#555", marginBottom: 10 },
  canvasWrap: { position: "relative", background: "#f8f8ff", borderRadius: 12, overflow: "hidden", border: "1px solid #ddd" },
  sigCanvas: { display: "block", width: "100%", height: 100 },
  sigLine: { position: "absolute", bottom: 28, left: 16, right: 16, height: 1, background: "#ccc" },
  sigHint: { position: "absolute", bottom: 8, left: 0, right: 0, textAlign: "center", fontSize: 11, color: "#bbb" },
  clearBtn: { background: "none", border: "none", fontSize: 12, color: "#aaa", cursor: "pointer", marginTop: 6, padding: "4px 0" },

  // Signed
  signedDoc: { textAlign: "center", padding: "16px 0 8px", position: "relative" },
  stampWrap: { display: "flex", justifyContent: "center", marginBottom: 12 },
  stamp: { background: "#e8f5e9", border: "3px solid #4CAF50", borderRadius: 16, padding: "10px 20px", display: "inline-flex", flexDirection: "column", alignItems: "center", transformOrigin: "center" },
  stampText: { fontFamily: "'Fredoka One', cursive", fontSize: 20, color: "#2e7d32", marginTop: 2 },
  signedTitle: { fontFamily: "'Fredoka One', cursive", fontSize: 24, color: "#333", marginBottom: 4 },
  signedSub: { fontSize: 12, color: "#aaa", fontFamily: "monospace", marginBottom: 16 },
  signedParents: { display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 8 },
  signedAvatar: { width: 60, height: 60, borderRadius: "50%", border: "3px solid #ffd4c2" },
  signedNames: { fontFamily: "'Fredoka One', cursive", fontSize: 18, color: "#ff7043", marginBottom: 4 },
  signedMsg: { fontSize: 14, color: "#666", lineHeight: 1.7, margin: "16px 0", padding: 14, background: "#fff8f6", borderRadius: 12 },
};
