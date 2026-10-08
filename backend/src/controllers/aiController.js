const pool = require("../config/db");

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

/**
 * ดึงข้อมูลวันลาคงเหลือตามสิทธิ์
 * - admin: เห็นทุกคน
 * - คนอื่น: เห็นเฉพาะของตัวเองเท่านั้น (กรองที่ระดับ SQL ไม่ได้พึ่ง AI)
 */
async function fetchAllowedBalances(user) {
  const year = new Date().getFullYear();
  const isAdmin = user.role === "admin";

  const params = [year];
  let where = "lb.year = $1";
  if (!isAdmin) {
    params.push(user.id);
    where += " AND u.id = $2";
  }

  const result = await pool.query(
    `SELECT u.id AS user_id, u.full_name, u.email, u.role, d.name AS department_name,
            lt.name AS leave_type, lb.total_days, lb.used_days
       FROM leave_balances lb
       JOIN users u ON u.id = lb.user_id
       JOIN leave_types lt ON lt.id = lb.leave_type_id
       LEFT JOIN departments d ON d.id = u.department_id
      WHERE ${where}
      ORDER BY u.full_name, lt.id`,
    params
  );

  // จัดกลุ่มตามบุคคล
  const people = new Map();
  for (const r of result.rows) {
    if (!people.has(r.user_id)) {
      people.set(r.user_id, {
        name: r.full_name,
        email: r.email,
        department: r.department_name || "-",
        balances: [],
      });
    }
    const total = Number(r.total_days) || 0;
    const used = Number(r.used_days) || 0;
    people.get(r.user_id).balances.push({
      type: r.leave_type,
      total,
      used,
      remaining: total - used,
    });
  }

  return { year, isAdmin, people: [...people.values()] };
}

function buildPlainSummary(data) {
  if (data.people.length === 0) {
    return `ยังไม่พบข้อมูลวันลาของปี ${data.year + 543}`;
  }
  return data.people
    .map((p) => {
      const lines = p.balances
        .map((b) => `  • ${b.type}: คงเหลือ ${b.remaining} วัน (ใช้ไป ${b.used}/${b.total})`)
        .join("\n");
      return `${p.name} (${p.department})\n${lines}`;
    })
    .join("\n\n");
}

/**
 * POST /api/ai/leave-chat  { message, history? }
 */
async function leaveChat(req, res) {
  const message = String(req.body?.message || "").trim();
  const history = Array.isArray(req.body?.history) ? req.body.history.slice(-10) : [];

  if (!message) {
    return res.status(400).json({ message: "กรุณาพิมพ์คำถาม" });
  }
  if (message.length > 1000) {
    return res.status(400).json({ message: "คำถามยาวเกินไป (ไม่เกิน 1000 ตัวอักษร)" });
  }

  try {
    const userRes = await pool.query("SELECT id, full_name, role FROM users WHERE id = $1", [req.user.id]);
    const me = userRes.rows[0];
    if (!me) return res.status(401).json({ message: "ไม่พบผู้ใช้" });

    const data = await fetchAllowedBalances(me);

    // ถ้ายังไม่ได้ตั้ง API key ให้ตอบแบบสรุปธรรมดาแทน ระบบยังใช้ได้
    if (!process.env.GEMINI_API_KEY) {
      return res.json({
        reply: `📋 สรุปวันลาคงเหลือ ปี ${data.year + 543}\n\n${buildPlainSummary(data)}\n\n(โหมดสรุปอัตโนมัติ — ผู้ดูแลระบบยังไม่ได้ตั้งค่า GEMINI_API_KEY)`,
        mode: "fallback",
      });
    }

    const scopeRule = data.isAdmin
      ? "ผู้ใช้คนนี้เป็นผู้ดูแลระบบ (admin) สามารถถามข้อมูลวันลาของบุคลากรทุกคนได้"
      : `ผู้ใช้คนนี้ชื่อ "${me.full_name}" มีสิทธิ์ดูข้อมูลวันลาของตัวเองเท่านั้น ถ้าถามถึงคนอื่น ให้ตอบสุภาพว่า "ขออภัย คุณมีสิทธิ์ดูข้อมูลวันลาของตัวเองเท่านั้น" และห้ามเดาหรือแต่งข้อมูลของคนอื่น`;

    const systemInstruction = `คุณคือผู้ช่วย AI ของระบบลางานออนไลน์ คณะวิศวกรรมศาสตร์และเทคโนโลยีอุตสาหกรรม มหาวิทยาลัยกาฬสินธุ์
หน้าที่: สรุปและตอบคำถามเรื่องวันลาคงเหลือ เป็นภาษาไทย สุภาพ กระชับ อ่านง่าย
${scopeRule}
ตอบโดยอ้างอิงจากข้อมูลด้านล่างเท่านั้น ห้ามแต่งตัวเลขเอง ถ้าไม่มีข้อมูลให้บอกว่าไม่พบ
ถ้าคำถามไม่เกี่ยวกับการลา ให้บอกสั้นๆ ว่าช่วยได้เฉพาะเรื่องวันลา
ปีงบประมาณ/ปีที่แสดง: ${data.year} (พ.ศ. ${data.year + 543})

ข้อมูลวันลา (JSON):
${JSON.stringify(data.people)}`;

    const contents = [
      ...history
        .filter((h) => h && typeof h.text === "string" && (h.role === "user" || h.role === "model"))
        .map((h) => ({ role: h.role, parts: [{ text: h.text.slice(0, 2000) }] })),
      { role: "user", parts: [{ text: message }] },
    ];

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents,
          generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
        }),
      }
    );

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("Gemini API error:", resp.status, errText);
      return res.json({
        reply: `⚠️ ตอนนี้เชื่อมต่อ Gemini ไม่ได้ จึงแสดงสรุปแบบอัตโนมัติแทน\n\n📋 วันลาคงเหลือ ปี ${data.year + 543}\n\n${buildPlainSummary(data)}`,
        mode: "fallback",
      });
    }

    const json = await resp.json();
    const reply =
      json?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ||
      "ขออภัย ไม่สามารถสร้างคำตอบได้ กรุณาลองใหม่";

    res.json({ reply, mode: "gemini" });
  } catch (err) {
    console.error("leaveChat error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในระบบผู้ช่วย AI" });
  }
}

module.exports = { leaveChat };
