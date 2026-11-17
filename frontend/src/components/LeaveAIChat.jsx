import { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  X,
  Send,
  User,
  RotateCcw,
  Bot,
  HeartPulse,
  Briefcase,
  Palmtree,
  Calendar,
  ShieldCheck,
  Building,
} from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

/**
 * แปลงข้อความตัวหนา **text** และตัวเอียง *text* ให้เป็น HTML tag สวยงาม
 */
function renderInlineMarkdown(text) {
  if (!text) return "";
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-bold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    const subParts = part.split(/(\*[^*]+\*)/g);
    return subParts.map((sub, sIdx) => {
      if (sub.startsWith("*") && sub.endsWith("*")) {
        return (
          <span key={`${index}-${sIdx}`} className="italic text-slate-500">
            {sub.slice(1, -1)}
          </span>
        );
      }
      return sub;
    });
  });
}

/**
 * การ์ดแสดงวันลาของบุคลากรแต่ละคน (สำหรับสรุปรายคน / ทุกคน)
 */
function PersonBalanceCard({ name, department, leaveDetails }) {
  // แยกรายการวันลา เช่น "ลาป่วย เหลือ 30 | ลากิจส่วนตัว เหลือ 0 | ลาพักผ่อน เหลือ 10"
  const leaveItems = leaveDetails
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);

  const getLeaveMeta = (text) => {
    if (text.includes("ป่วย")) {
      return {
        label: "ลาป่วย",
        icon: HeartPulse,
        bg: "bg-rose-50 border-rose-100 text-rose-800",
        badge: "bg-rose-100 text-rose-900",
      };
    }
    if (text.includes("กิจ")) {
      return {
        label: "ลากิจส่วนตัว",
        icon: Briefcase,
        bg: "bg-amber-50 border-amber-100 text-amber-800",
        badge: "bg-amber-100 text-amber-900",
      };
    }
    return {
      label: "ลาพักผ่อน",
      icon: Palmtree,
      bg: "bg-emerald-50 border-emerald-100 text-emerald-800",
      badge: "bg-emerald-100 text-emerald-900",
    };
  };

  return (
    <div className="bg-slate-50/80 hover:bg-slate-50 border border-slate-200/90 rounded-2xl p-3 shadow-2xs transition-all my-2">
      {/* Header บุคลากร */}
      <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-200/60">
        <div className="flex items-center gap-2 truncate">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-red-800 to-red-600 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-2xs">
            <User className="w-4 h-4" />
          </div>
          <span className="font-bold text-slate-900 text-xs sm:text-sm truncate">
            {name}
          </span>
        </div>
        {department && department !== "-" && (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white text-slate-600 border border-slate-200 shrink-0 shadow-2xs flex items-center gap-1">
            <Building className="w-2.5 h-2.5 text-slate-400" />
            <span className="truncate max-w-[110px]">{department}</span>
          </span>
        )}
      </div>

      {/* Grid ยอดวันลาคงเหลือ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
        {leaveItems.map((item, idx) => {
          const meta = getLeaveMeta(item);
          const Icon = meta.icon;
          // สกัดเฉพาะตัวเลขวันคงเหลือ
          const numMatch = item.match(/เหลือ\s*(\d+(\.\d+)?)/);
          const remainingNum = numMatch ? numMatch[1] : item.replace(/.*เหลือ\s*/, "");

          return (
            <div
              key={idx}
              className={`flex items-center justify-between p-2 rounded-xl border text-xs ${meta.bg}`}
            >
              <div className="flex items-center gap-1.5 truncate">
                <Icon className="w-3.5 h-3.5 shrink-0 opacity-80" />
                <span className="text-[11px] font-semibold truncate">
                  {meta.label}
                </span>
              </div>
              <span className={`px-1.5 py-0.5 rounded-md font-bold text-xs shrink-0 ${meta.badge}`}>
                {remainingNum} วัน
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * เรนเดอร์ข้อความของ AI ให้เป็นบล็อกสวยงาม
 */
function FormattedAiMessage({ text }) {
  if (!text) return null;

  const lines = text.split("\n");
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (!line) {
      i++;
      continue;
    }

    // 1. ตรวจจับการ์ดรายชื่อบุคลากร (รูปแบบ: 👤 **ชื่อ** (สังกัด) \n └ ลาป่วย เหลือ X | ...)
    if (line.startsWith("👤")) {
      const match = line.match(/👤\s*\*\*([^*]+)\*\*(?:\s*\(([^)]+)\))?/);
      if (match) {
        const name = match[1];
        const department = match[2] || "-";

        // ตรวจสอบบรรทัดถัดไปว่ามียอดวันลา "└ ..." หรือไม่
        let leaveDetails = "";
        if (i + 1 < lines.length && (lines[i + 1].includes("└") || lines[i + 1].includes("เหลือ"))) {
          leaveDetails = lines[i + 1].replace(/.*└\s*/, "").trim();
          i++; // ข้ามบรรทัดยอดวันลาไป
        }

        elements.push(
          <PersonBalanceCard
            key={`person-${i}`}
            name={name}
            department={department}
            leaveDetails={leaveDetails}
          />
        );
        i++;
        continue;
      }
    }

    // 2. หัวข้อหลัก (📋, 📊, 🏥, 🏖️, 💼, 🔒)
    if (
      line.startsWith("📋") ||
      line.startsWith("📊") ||
      line.startsWith("🏥") ||
      line.startsWith("🏖️") ||
      line.startsWith("💼") ||
      line.startsWith("🔒")
    ) {
      elements.push(
        <div
          key={`header-${i}`}
          className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2 pt-1 pb-1"
        >
          {renderInlineMarkdown(line)}
        </div>
      );
      i++;
      continue;
    }

    // 3. ป้ายข้อความกำกับสิทธิ์ / หมายเหตุ *(...)*
    if (line.startsWith("*(") && line.endsWith(")*")) {
      elements.push(
        <div key={`badge-${i}`} className="my-1">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-50 text-red-800 border border-red-100">
            <ShieldCheck className="w-3.5 h-3.5" />
            {line.slice(2, -2)}
          </span>
        </div>
      );
      i++;
      continue;
    }

    // 4. บรรทัดข้อความแบบหัวข้อย่อย • หรือ -
    if (line.startsWith("•") || line.startsWith("-") || line.startsWith("  •")) {
      elements.push(
        <div key={`bullet-${i}`} className="flex items-start gap-2 text-xs sm:text-sm pl-1 py-0.5 text-slate-700">
          <span className="text-red-700 font-bold mt-0.5">•</span>
          <span className="flex-1">{renderInlineMarkdown(line.replace(/^[•\-\s]+/, ""))}</span>
        </div>
      );
      i++;
      continue;
    }

    // 5. ข้อความทั่วไป
    elements.push(
      <p key={`p-${i}`} className="text-xs sm:text-sm leading-relaxed text-slate-800">
        {renderInlineMarkdown(line)}
      </p>
    );
    i++;
  }

  return <div className="space-y-1.5">{elements}</div>;
}

export default function LeaveAIChat() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const bottomRef = useRef(null);

  const suggestions = isAdmin
    ? [
        { label: "สรุปวันลาคงเหลือของทุกคน", icon: "📋" },
        { label: "ใครใช้วันลาป่วยมากที่สุด", icon: "🏥" },
        { label: "ลาพักผ่อนเหลือน้อยกว่า 5 วันมีใครบ้าง", icon: "🌴" },
      ]
    : [
        { label: "วันลาคงเหลือของฉัน", icon: "📊" },
        { label: "ฉันลาป่วยไปแล้วกี่วัน", icon: "🏥" },
        { label: "ลาพักผ่อนเหลือกี่วัน", icon: "🌴" },
      ];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput("");
    const history = messages.map((m) => ({ role: m.role, text: m.text }));
    setMessages((prev) => [...prev, { role: "user", text: msg }]);
    setLoading(true);
    try {
      const { data } = await api.post("/ai/leave-chat", { message: msg, history }, { timeout: 30000 });
      setMessages((prev) => [...prev, { role: "model", text: data.reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "model", text: err.response?.data?.message || "ขออภัย เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้งครับ" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
  };

  return (
    <>
      {/* ปุ่มลอยเปิดแชท */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed z-40 bottom-20 lg:bottom-6 right-3 sm:right-6 flex items-center justify-center gap-2 p-3 sm:px-4 sm:py-3 rounded-full bg-gradient-to-r from-red-800 to-red-600 hover:from-red-900 hover:to-red-700 text-white font-semibold text-sm shadow-xl shadow-red-900/30 hover:shadow-red-900/40 hover:scale-105 active:scale-95 transition-all border border-white/25 cursor-pointer"
          title="ถาม AI เรื่องวันลา"
        >
          <div className="relative">
            <Sparkles className="w-5 h-5 shrink-0 animate-pulse text-amber-200" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-white" />
          </div>
          <span className="hidden sm:inline font-bold tracking-wide">ถาม AI เรื่องวันลา</span>
        </button>
      )}

      {/* หน้าต่างแชท AI */}
      {open && (
        <div className="fixed z-50 inset-x-2 bottom-20 lg:bottom-6 lg:inset-auto lg:right-6 w-auto sm:w-[420px] sm:left-auto h-[75vh] max-h-[600px] bg-white rounded-3xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header สวยงาม */}
          <div className="bg-gradient-to-r from-red-950 via-red-900 to-red-800 text-white px-4 py-3.5 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-xs border border-white/20 flex items-center justify-center text-amber-300 shadow-inner">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm leading-tight text-white">ผู้ช่วย AI วันลา</h3>
                  <span className="flex items-center gap-1 text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-1.5 py-0.2 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    ออนไลน์
                  </span>
                </div>
                <p className="text-[11px] text-red-200/90 mt-0.5">
                  {isAdmin ? "สิทธิ์ผู้ดูแลระบบ • เข้าถึงข้อมูลทุกคน" : "ข้อมูลเฉพาะของคุณ"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearChat}
                  title="เริ่มการสนทนาใหม่"
                  className="p-1.5 rounded-xl text-red-200 hover:text-white hover:bg-white/15 transition cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-xl text-red-200 hover:text-white hover:bg-white/15 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* กล่องข้อความแชท */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/70">
            {messages.length === 0 && (
              <div className="mt-3 space-y-4">
                <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-800 mx-auto flex items-center justify-center shadow-inner">
                    <Bot className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-sm text-slate-800">
                    สวัสดีครับคุณ {user?.full_name} 👋
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed max-w-[280px] mx-auto">
                    ผมคือผู้ช่วย AI สรุปข้อมูลวันลา คณะวิศวกรรมศาสตร์ สอบถามข้อมูลวันลาคงเหลือได้เลยครับ
                  </p>
                </div>

                {/* คำถามแนะนำ (Suggestions) */}
                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider px-1">
                    คำถามแนะนำที่พบบ่อย:
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {suggestions.map((s) => (
                      <button
                        key={s.label}
                        type="button"
                        onClick={() => send(s.label)}
                        className="w-full px-3 py-2.5 rounded-xl bg-white hover:bg-red-50/50 border border-slate-200 hover:border-red-200 text-slate-700 hover:text-red-900 text-xs font-semibold shadow-2xs hover:shadow-xs transition active:scale-98 flex items-center gap-2 text-left cursor-pointer"
                      >
                        <span className="text-sm shrink-0">{s.icon}</span>
                        <span className="flex-1 truncate">{s.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* รายการข้อความ */}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex gap-2 ${
                  m.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {/* AI Avatar */}
                {m.role === "model" && (
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-red-800 to-red-600 text-white flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                    <Sparkles className="w-4 h-4 text-amber-200" />
                  </div>
                )}

                {/* Message Bubble */}
                <div
                  className={`max-w-[88%] text-xs sm:text-sm leading-relaxed transition ${
                    m.role === "user"
                      ? "px-4 py-2.5 rounded-2xl rounded-tr-xs bg-gradient-to-r from-red-800 to-red-700 text-white shadow-xs font-medium"
                      : "p-3.5 rounded-2xl rounded-tl-xs bg-white border border-slate-200/90 text-slate-800 shadow-xs space-y-2 w-full"
                  }`}
                >
                  {m.role === "user" ? (
                    m.text
                  ) : (
                    <FormattedAiMessage text={m.text} />
                  )}
                </div>
              </div>
            ))}

            {/* กำลังพิมพ์... (Loading) */}
            {loading && (
              <div className="flex items-center gap-2 justify-start">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-red-800 to-red-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <Sparkles className="w-4 h-4 text-amber-200 animate-spin" />
                </div>
                <div className="px-4 py-3 rounded-2xl rounded-tl-xs bg-white border border-slate-200/90 shadow-2xs flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500">AI กำลังวิเคราะห์ข้อมูล</span>
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-bounce [animation-delay:0.15s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-bounce [animation-delay:0.3s]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* ช่องพิมพ์ข้อความ (Input Bar) */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="p-3 border-t border-slate-200 bg-white flex items-center gap-2 shadow-sm"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="พิมพ์คำถามเรื่องวันลา..."
              maxLength={1000}
              className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-500 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-red-800/20 focus:border-red-800 transition"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="w-10 h-10 rounded-xl bg-gradient-to-r from-red-800 to-red-700 hover:from-red-900 hover:to-red-800 text-white flex items-center justify-center shadow-xs transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
              title="ส่งคำถาม"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
