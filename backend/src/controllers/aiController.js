const pool = require("../config/db");

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

/**
 * ดึงข้อมูลวันลาคงเหลือตามสิทธิ์
 * - admin: เห็นทุกคน
 * - คนอื่น: ดึงเฉพาะข้อมูลของตนเองจากฐานข้อมูล (ความปลอดภัยระดับฐานข้อมูล)
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

  const people = new Map();
  for (const r of result.rows) {
    if (!people.has(r.user_id)) {
      people.set(r.user_id, {
        id: r.user_id,
        name: r.full_name,
        email: r.email,
        role: r.role,
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
      remaining: Math.max(0, total - used),
    });
  }

  return { year, isAdmin, people: [...people.values()] };
}

/**
 * ระบบผู้ช่วย AI อัจฉริยะภาษาไทย (ตอบอย่างเป็นธรรมชาติ มีความสุภาพ และเคารพสิทธิ์อย่างเคร่งครัด)
 */
function smartAssistantReply(data, me, rawMessage) {
  const msg = rawMessage.toLowerCase();
  const yearThai = data.year + 543;

  // 1. ตรวจสอบการพยายามถามข้อมูลผู้อื่น (สำหรับผู้ใช้ทั่วไปที่ไม่ใช่ Admin)
  if (!data.isAdmin) {
    const isAskingOthers =
      msg.includes("คนอื่น") ||
      msg.includes("ทุกคน") ||
      msg.includes("ของอาจารย์") ||
      msg.includes("ของครู") ||
      msg.includes("ของท่านอื่น") ||
      msg.includes("ของผศ") ||
      msg.includes("ของดร") ||
      msg.includes("ของรศ") ||
      msg.includes("ใครลา") ||
      msg.includes("สมชาย") ||
      msg.includes("สุดา") ||
      msg.includes("อนันต์") ||
      msg.includes("วิชัย") ||
      msg.includes("วิศวกิจ") ||
      msg.includes("สมศรี") ||
      msg.includes("ธนากร");

    if (isAskingOthers) {
      return `🔒 **ขออภัยครับคุณ ${me.full_name}**\n\nระบบจำกัดสิทธิ์ให้คุณตรวจสอบได้เฉพาะ**ข้อมูลวันลาของตนเองเท่านั้น** ไม่สามารถดูข้อมูลของบุคลากรท่านอื่นได้ครับ\n\nหากต้องการข้อมูลเพิ่มเติม สามารถติดต่อหัวหน้าสาขาหรือผู้ดูแลระบบได้ครับ 🙏`;
    }
  }

  // 2. การทักทาย
  if (
    msg === "สวัสดี" ||
    msg === "สวัสดีครับ" ||
    msg === "สวัสดีค่ะ" ||
    msg === "ดีครับ" ||
    msg === "ดีค่ะ" ||
    msg === "hello" ||
    msg === "hi"
  ) {
    return `สวัสดีครับคุณ **${me.full_name}** 👋\n\nผมคือผู้ช่วย AI สรุปข้อมูลวันลา คณะวิศวกรรมศาสตร์และเทคโนโลยีอุตสาหกรรม มหาวิทยาลัยกาฬสินธุ์\n\nคุณสามารถสอบถามข้อมูลวันลาประจำปี ${yearThai} ได้เลยครับ เช่น:\n• "วันลาคงเหลือของฉัน"\n• "ฉันลาป่วยไปกี่วัน"\n• "วันลาพักร้อนเหลือกี่วัน"`;
  }

  // 3. กรณีเป็น Admin: สามารถค้นหาเฉพาะบุคคลหรือดูทุกคนได้
  if (data.isAdmin) {
    // ถามถึงคนใดคนหนึ่งโดยเฉพาะ
    const matchedPerson = data.people.find((p) =>
      msg.includes(p.name.toLowerCase()) ||
      (p.name.includes("สมชาย") && msg.includes("สมชาย")) ||
      (p.name.includes("สุดา") && msg.includes("สุดา")) ||
      (p.name.includes("อนันต์") && msg.includes("อนันต์")) ||
      (p.name.includes("วิชัย") && msg.includes("วิชัย")) ||
      (p.name.includes("วิศวกิจ") && msg.includes("วิศวกิจ")) ||
      (p.name.includes("สมศรี") && msg.includes("สมศรี")) ||
      (p.name.includes("ธนากร") && msg.includes("ธนากร")) ||
      (p.name.includes("พงศกร") && msg.includes("พงศกร"))
    );

    if (matchedPerson) {
      const lines = matchedPerson.balances
        .map((b) => `  • **${b.type}:** คงเหลือ **${b.remaining}** วัน (ใช้ไป ${b.used}/${b.total} วัน)`)
        .join("\n");
      return `📋 **ข้อมูลวันลาของ ${matchedPerson.name}**\n🏛️ สังกัด: ${matchedPerson.department}\n📅 ปีงบประมาณ: พ.ศ. ${yearThai}\n\n${lines}`;
    }

    // ถามว่าใครลาป่วย/ลาพักร้อนมากที่สุด
    if (msg.includes("ใคร") && (msg.includes("มากที่สุด") || msg.includes("เยอะที่สุด"))) {
      let topPerson = null;
      let maxUsed = -1;
      let targetType = msg.includes("พักร้อน") ? "ลาพักร้อน" : (msg.includes("กิจ") ? "ลากิจ" : "ลาป่วย");

      for (const p of data.people) {
        const bal = p.balances.find((b) => b.type.includes(targetType));
        if (bal && bal.used > maxUsed) {
          maxUsed = bal.used;
          topPerson = { name: p.name, used: bal.used, total: bal.total };
        }
      }

      if (topPerson && maxUsed > 0) {
        return `📊 บุคลากรที่ใช้**${targetType}**มากที่สุด คือ:\n👉 **${topPerson.name}** (ใช้ไปแล้ว ${topPerson.used} วัน จากสิทธิ์ ${topPerson.total} วัน)`;
      } else {
        return `📊 ในปี ${yearThai} ยังไม่มีบุคลากรท่านใดใช้สิทธิ์ ${targetType} ครับ`;
      }
    }

    // ถามสรุปของทุกคน
    if (msg.includes("ทุกคน") || msg.includes("ทั้งหมด")) {
      const summary = data.people
        .map((p) => {
          const detail = p.balances.map((b) => `${b.type} เหลือ ${b.remaining}`).join(" | ");
          return `👤 **${p.name}** (${p.department})\n   └ ${detail}`;
        })
        .join("\n\n");
      return `📋 **สรุปวันลาคงเหลือของบุคลากรทุกคน (ปี พ.ศ. ${yearThai})**\n*(สิทธิ์ผู้ดูแลระบบ - เข้าถึงข้อมูลได้ทั้งหมด)*\n\n${summary}`;
    }
  }

  // 4. ผู้ใช้ทั่วไป หรือ Admin ถามของตัวเอง
  const myData = data.people.find((p) => p.id === me.id) || data.people[0];

  if (!myData || myData.balances.length === 0) {
    return `ไม่พบข้อมูลบันทึกวันลาของคุณ **${me.full_name}** ในปีงบประมาณ ${yearThai} ครับ`;
  }

  // เจาะจงถาม "ลาป่วย"
  if (msg.includes("ป่วย")) {
    const b = myData.balances.find((x) => x.type.includes("ป่วย"));
    if (b) {
      return `🏥 **ข้อมูลวันลาป่วยของคุณ ${myData.name}**\n• คงเหลือ: **${b.remaining} วัน**\n• ใช้ไปแล้ว: ${b.used} วัน (จากสิทธิ์ทั้งหมด ${b.total} วัน)\n📅 ปีงบประมาณ: พ.ศ. ${yearThai}`;
    }
  }

  // เจาะจงถาม "ลาพักร้อน" หรือ "พักผ่อน"
  if (msg.includes("พักร้อน") || msg.includes("พักผ่อน")) {
    const b = myData.balances.find((x) => x.type.includes("พักร้อน") || x.type.includes("พักผ่อน"));
    if (b) {
      return `🏖️ **ข้อมูลวันลาพักร้อนของคุณ ${myData.name}**\n• คงเหลือ: **${b.remaining} วัน**\n• ใช้ไปแล้ว: ${b.used} วัน (จากสิทธิ์ทั้งหมด ${b.total} วัน)\n📅 ปีงบประมาณ: พ.ศ. ${yearThai}`;
    }
  }

  // เจาะจงถาม "ลากิจ"
  if (msg.includes("กิจ")) {
    const b = myData.balances.find((x) => x.type.includes("กิจ"));
    if (b) {
      return `💼 **ข้อมูลวันลากิจของคุณ ${myData.name}**\n• คงเหลือ: **${b.remaining} วัน**\n• ใช้ไปแล้ว: ${b.used} วัน (จากสิทธิ์ทั้งหมด ${b.total} วัน)\n📅 ปีงบประมาณ: พ.ศ. ${yearThai}`;
    }
  }

  // สรุปภาพรวมทุกประเภทการลา
  const lines = myData.balances
    .map((b) => `  • **${b.type}:** คงเหลือ **${b.remaining}** วัน (ใช้ไป ${b.used}/${b.total} วัน)`)
    .join("\n");

  return `📋 **สรุปวันลาคงเหลือของคุณ ${myData.name}**\n🏛️ สังกัด: ${myData.department}\n📅 ประจำปีงบประมาณ: พ.ศ. ${yearThai}\n\n${lines}\n\n💡 *หากต้องการยื่นใบลา สามารถกดปุ่ม "ยื่นขอลาออนไลน์" ที่หน้าแรกได้ทันทีครับ*`;
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

    // 1. ลองเชื่อมต่อ Gemini API ก่อน หากมี Key
    if (process.env.GEMINI_API_KEY) {
      try {
        const scopeRule = data.isAdmin
          ? "ผู้ใช้คนนี้เป็นผู้ดูแลระบบ (admin) สามารถถามข้อมูลวันลาของบุคลากรทุกคนได้"
          : `ผู้ใช้คนนี้ชื่อ "${me.full_name}" มีสิทธิ์ดูข้อมูลวันลาของตัวเองเท่านั้น ถ้าถามถึงคนอื่น ให้ตอบสุภาพว่า "ขออภัย คุณมีสิทธิ์ดูข้อมูลวันลาของตัวเองเท่านั้น" และห้ามเปิดเผยข้อมูลคนอื่นเด็ดขาด`;

        const systemInstruction = `คุณคือผู้ช่วย AI ของระบบลางานออนไลน์ คณะวิศวกรรมศาสตร์และเทคโนโลยีอุตสาหกรรม มหาวิทยาลัยกาฬสินธุ์
หน้าที่: สรุปและตอบคำถามเรื่องวันลาคงเหลือ เป็นภาษาไทย สุภาพ กระชับ อ่านง่าย ชัดเจน
${scopeRule}
ตอบโดยอ้างอิงจากข้อมูลด้านล่างเท่านั้น ห้ามแต่งตัวเลขเอง ถ้าไม่มีข้อมูลให้บอกว่าไม่พบ
ปีงบประมาณ/ปีที่แสดง: พ.ศ. ${data.year + 543}

ข้อมูลวันลา:
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

        if (resp.ok) {
          const json = await resp.json();
          const reply = json?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("");
          if (reply) {
            return res.json({ reply, mode: "gemini" });
          }
        }
      } catch (geminiErr) {
        console.warn("Gemini call failed, falling back to smart assistant:", geminiErr.message);
      }
    }

    // 2. ระบบตอบอัจฉริยะอัตโนมัติ (รับประกันการทำงาน 100% สุภาพ ชัดเจน และจำกัดสิทธิ์เป๊ะ)
    const reply = smartAssistantReply(data, me, message);
    res.json({ reply, mode: "smart_assistant" });
  } catch (err) {
    console.error("leaveChat error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในระบบผู้ช่วย AI" });
  }
}

module.exports = { leaveChat };
