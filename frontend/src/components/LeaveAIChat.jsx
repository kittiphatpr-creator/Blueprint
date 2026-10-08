import { useState, useRef, useEffect } from "react";
import { Sparkles, X, Send } from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function LeaveAIChat() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const bottomRef = useRef(null);

  const suggestions = isAdmin
    ? ["สรุปวันลาคงเหลือของทุกคน", "ใครใช้วันลาป่วยมากที่สุด", "ลาพักร้อนเหลือน้อยกว่า 5 วันมีใครบ้าง"]
    : ["วันลาคงเหลือของฉัน", "ฉันลาป่วยไปแล้วกี่วัน", "ลาพักร้อนเหลือกี่วัน"];

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
        { role: "model", text: err.response?.data?.message || "ขออภัย เกิดข้อผิดพลาด กรุณาลองใหม่" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* ปุ่มลอยเปิดแชท */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed z-40 bottom-20 lg:bottom-6 right-3 sm:right-6 flex items-center justify-center gap-2 p-3 sm:px-4 sm:py-3 rounded-full bg-gradient-to-r from-red-800 to-red-600 text-white font-semibold text-sm shadow-xl shadow-red-900/30 hover:scale-105 active:scale-95 transition border border-white/20"
          title="ถาม AI เรื่องวันลา"
        >
          <Sparkles className="w-5 h-5 shrink-0" />
          <span className="hidden sm:inline">ถาม AI เรื่องวันลา</span>
        </button>
      )}

      {open && (
        <div className="fixed z-50 inset-x-2 bottom-20 lg:bottom-6 lg:inset-auto lg:right-6 w-auto sm:w-96 sm:left-auto h-[70vh] max-h-[560px] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-900 to-red-700 text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-sm leading-tight">ผู้ช่วย AI วันลา</p>
                <p className="text-[11px] text-red-100/80">
                  {isAdmin ? "ผู้ดูแลระบบ • ดูได้ทุกคน" : "ดูได้เฉพาะข้อมูลของคุณ"}
                </p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-white/15">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
            {messages.length === 0 && (
              <div className="text-center text-sm text-slate-500 mt-4 space-y-3">
                <p>สวัสดีครับ 👋 ถามเรื่องวันลาคงเหลือได้เลย</p>
                <div className="flex flex-col gap-2">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs hover:border-red-300 hover:text-red-800 transition"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed ${
                    m.role === "user"
                      ? "bg-red-800 text-white rounded-br-md"
                      : "bg-white border border-slate-200 text-slate-800 rounded-bl-md"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="px-4 py-3 rounded-2xl bg-white border border-slate-200 flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" />
                  <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:0.15s]" />
                  <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:0.3s]" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="p-3 border-t border-slate-200 flex gap-2 bg-white"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="พิมพ์คำถามเรื่องวันลา..."
              maxLength={1000}
              className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-3.5 rounded-xl bg-red-800 hover:bg-red-900 text-white disabled:opacity-40 transition"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
