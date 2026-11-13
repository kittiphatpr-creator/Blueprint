const { sendOtpEmail } = require("../utils/emailService");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const pool = require("../config/db");

const DEFAULT_GOOGLE_CLIENT_ID = "260624720228-3t6vmlo77nts8qlde1teqvakldkclf0a.apps.googleusercontent.com";
const googleClientId = process.env.GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID;
const googleClient = new OAuth2Client(googleClientId);

async function login(req, res) {
  let { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "กรุณากรอกอีเมลและรหัสผ่าน" });
  }

  email = String(email).trim().toLowerCase();
  password = String(password).trim();

  let emailAlt = email;
  if (email.endsWith("@ksu.ac.th")) {
    emailAlt = email.replace("@ksu.ac.th", "@eng.ac.th");
  } else if (email.endsWith("@eng.ac.th")) {
    emailAlt = email.replace("@eng.ac.th", "@ksu.ac.th");
  }

  try {
    const result = await pool.query(
      `SELECT u.*, d.name AS department_name 
       FROM users u 
       LEFT JOIN departments d ON d.id = u.department_id 
       WHERE LOWER(TRIM(u.email)) = LOWER(TRIM($1)) OR LOWER(TRIM(u.email)) = LOWER(TRIM($2))`,
      [email, emailAlt]
    );
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, department_id: user.department_id },
      process.env.JWT_SECRET || "faculty_super_secret_jwt_key_2026",
      { expiresIn: "8h" }
    );

    delete user.password_hash;

    res.json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในระบบ" });
  }
}

async function me(req, res) {
  try {
    const result = await pool.query(
      `SELECT u.id, u.employee_code, u.full_name, u.email, u.department_id, d.name AS department_name, 
              u.position, u.role, u.phone, u.profile_image
       FROM users u
       LEFT JOIN departments d ON d.id = u.department_id
       WHERE u.id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "ไม่พบผู้ใช้งาน" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในระบบ" });
  }
}

async function updateProfile(req, res) {
  const { full_name, phone, position, profile_image } = req.body;
  try {
    const result = await pool.query(
      `UPDATE users 
       SET full_name = COALESCE($1, full_name), 
           phone = COALESCE($2, phone), 
           position = COALESCE($3, position),
           profile_image = COALESCE($4, profile_image),
           updated_at = NOW()
       WHERE id = $5
       RETURNING id, employee_code, full_name, email, department_id, position, role, phone, profile_image`,
      [full_name, phone, position, profile_image || null, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "ไม่พบผู้ใช้งาน" });
    }

    const deptResult = await pool.query(
      `SELECT d.name AS department_name FROM departments d WHERE d.id = $1`,
      [result.rows[0].department_id]
    );
    const user = {
      ...result.rows[0],
      department_name: deptResult.rows[0]?.department_name || null,
    };

    res.json({ message: "อัปเดตข้อมูลส่วนตัวสำเร็จ", user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการอัปเดตข้อมูล" });
  }
}

async function updateAvatar(req, res) {
  try {
    let profile_image = null;
    if (req.body?.profile_image) {
      profile_image = req.body.profile_image;
    } else if (req.file) {
      profile_image = `/uploads/${req.file.filename}`;
    }

    if (!profile_image) {
      return res.status(400).json({ message: "กรุณาเลือกไฟล์รูปภาพ" });
    }

    const result = await pool.query(
      `UPDATE users 
       SET profile_image = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, employee_code, full_name, email, department_id, position, role, phone, profile_image`,
      [profile_image, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "ไม่พบผู้ใช้งาน" });
    }

    const deptResult = await pool.query(
      `SELECT d.name AS department_name FROM departments d WHERE d.id = $1`,
      [result.rows[0].department_id]
    );
    const user = {
      ...result.rows[0],
      department_name: deptResult.rows[0]?.department_name || null,
    };

    res.json({ message: "เปลี่ยนรูปภาพโปรไฟล์สำเร็จ", user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการเปลี่ยนรูปโปรไฟล์" });
  }
}

async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ message: "รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร" });
  }

  try {
    const userRes = await pool.query("SELECT password_hash FROM users WHERE id = $1", [req.user.id]);
    const user = userRes.rows[0];

    if (user && user.password_hash) {
      if (!currentPassword) {
        return res.status(400).json({ message: "กรุณากรอกรหัสผ่านปัจจุบัน" });
      }
      const match = await bcrypt.compare(currentPassword, user.password_hash);
      if (!match) {
        return res.status(400).json({ message: "รหัสผ่านปัจจุบันไม่ถูกต้อง" });
      }
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await pool.query("UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2", [
      newHash,
      req.user.id,
    ]);

    res.json({ message: "เปลี่ยนรหัสผ่านสำเร็จ" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน" });
  }
}

async function logout(req, res) {
  res.json({ message: "ออกจากระบบสำเร็จ" });
}

/**
 * POST /auth/google
 */
async function loginWithGoogle(req, res) {
  const { credential } = req.body;

  if (!credential) {
    return res.status(400).json({ message: "ไม่พบข้อมูลจาก Google" });
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: [googleClientId, DEFAULT_GOOGLE_CLIENT_ID, "231790850035-0f63f0dpqkeng3mh9783bg8ksposp3hg.apps.googleusercontent.com"],
    });
    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    const normalizedEmail = (email || "").trim().toLowerCase();

    // บังคับให้อนุญาตเฉพาะอีเมลมหาวิทยาลัยกาฬสินธุ์ (@ksu.ac.th) เท่านั้น
    if (!normalizedEmail.endsWith("@ksu.ac.th")) {
      return res.status(403).json({
        message: `ไม่มีสิทธิ์เข้าสู่ระบบ: บัญชี (${email}) ไม่ได้รับอนุญาต กรุณาใช้อีเมล @ksu.ac.th ของมหาวิทยาลัยกาฬสินธุ์เท่านั้น`,
      });
    }

    let result = await pool.query(
      `SELECT u.*, d.name AS department_name 
       FROM users u 
       LEFT JOIN departments d ON d.id = u.department_id 
       WHERE u.email = $1`,
      [normalizedEmail]
    );
    let user = result.rows[0];

    // กรณีเป็นผู้ใช้ใหม่ที่ยังไม่มีในฐานข้อมูล -> ให้หน้าบ้านเปิดฟอร์มสมัครสมาชิก
    if (!user) {
      return res.json({
        isNewUser: true,
        googleData: {
          email: normalizedEmail,
          name: name || "",
          picture: picture || "",
          googleId: googleId || "",
        },
      });
    }

    // กรณีมีบัญชีอยู่แล้ว แต่ยังไม่ได้ผูก google_id
    if (!user.google_id && googleId) {
      await pool.query("UPDATE users SET google_id = $1 WHERE id = $2", [googleId, user.id]);
      user.google_id = googleId;
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, department_id: user.department_id },
      process.env.JWT_SECRET || "faculty_super_secret_jwt_key_2026",
      { expiresIn: "8h" }
    );

    delete user.password_hash;

    res.json({ isNewUser: false, token, user });
  } catch (err) {
    console.error("Google login error:", err);
    res.status(401).json({ message: "ตรวจสอบ Google Token ไม่สำเร็จ" });
  }
}

/**
 * POST /auth/register-google
 * สมัครสมาชิกบุคลากรใหม่จากบัญชี Google และบันทึกลงฐานข้อมูล
 */
async function registerWithGoogle(req, res) {
  const { googleData, employee_code, full_name, department_id, position, role, phone } = req.body;

  if (!googleData || !googleData.email) {
    return res.status(400).json({ message: "ไม่พบข้อมูลบัญชี Google สำหรับการลงทะเบียน" });
  }

  const email = String(googleData.email).trim().toLowerCase();
  if (!email.endsWith("@ksu.ac.th")) {
    return res.status(403).json({
      message: `ไม่อนุญาตให้อีเมล (${email}) สมัครสมาชิก กรุณาใช้อีเมล @ksu.ac.th เท่านั้น`,
    });
  }

  if (!full_name || !employee_code) {
    return res.status(400).json({ message: "กรุณากรอกชื่อ-นามสกุล และรหัสบุคลากร" });
  }

  try {
    // ตรวจสอบว่ามีอีเมลหรือรหัสบุคลากรนี้ในระบบแล้วหรือไม่
    const existing = await pool.query(
      "SELECT id, email, employee_code FROM users WHERE email = $1 OR employee_code = $2",
      [email, employee_code.trim()]
    );

    if (existing.rows.length > 0) {
      if (existing.rows[0].email === email) {
        return res.status(400).json({ message: "อีเมลนี้ได้ทำการลงทะเบียนในระบบแล้ว กรุณาเข้าสู่ระบบ" });
      }
      return res.status(400).json({ message: `รหัสบุคลากร (${employee_code}) มีผู้ใช้งานในระบบแล้ว` });
    }

    const isOwnerAdmin = email === "phongsakorn.ka@ksu.ac.th" || email.startsWith("admin");
    const assignedRole = isOwnerAdmin ? "admin" : (role && ["lecturer", "head", "staff"].includes(role) ? role : "lecturer");
    const deptId = department_id ? parseInt(department_id, 10) : null;

    const insertResult = await pool.query(
      `INSERT INTO users (employee_code, full_name, email, google_id, department_id, position, role, phone, profile_image)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        employee_code.trim(),
        full_name.trim(),
        email,
        googleData.googleId || null,
        deptId,
        position ? position.trim() : "อาจารย์ประจำสาขา",
        assignedRole,
        phone ? phone.trim() : null,
        googleData.picture || null,
      ]
    );

    const user = insertResult.rows[0];

    // สร้างสิทธิ์วันลาเริ่มต้นให้บุคลากรใหม่ (Auto-seed leave balances)
    const currentYear = new Date().getFullYear();
    await pool.query(
      `INSERT INTO leave_balances (user_id, leave_type_id, year, total_days, used_days)
       SELECT $1, id, $2, max_days_per_year, 0
       FROM leave_types
       ON CONFLICT (user_id, leave_type_id, year) DO NOTHING`,
      [user.id, currentYear]
    );

    if (user.department_id) {
      const deptRes = await pool.query("SELECT name FROM departments WHERE id = $1", [user.department_id]);
      user.department_name = deptRes.rows[0]?.name;
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, department_id: user.department_id },
      process.env.JWT_SECRET || "faculty_super_secret_jwt_key_2026",
      { expiresIn: "8h" }
    );

    delete user.password_hash;

    res.status(201).json({ token, user, message: "ลงทะเบียนสมาชิกสำเร็จ ยินดีต้อนรับสู่ระบบ" });
  } catch (err) {
    console.error("registerWithGoogle error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการสมัครสมาชิก: " + err.message });
  }
}


// -------------------------------------------------------------
// ระบบลืมรหัสผ่านด้วยรหัสยืนยัน OTP ทางอีเมล (@ksu.ac.th)
// -------------------------------------------------------------

async function sendResetOtp(req, res) {
  let { email } = req.body;
  if (!email || !String(email).trim()) {
    return res.status(400).json({ message: "กรุณาระบุอีเมลสำหรับรับรหัส OTP" });
  }

  email = String(email).trim().toLowerCase();
  let emailAlt = email;
  if (email.endsWith("@ksu.ac.th")) {
    emailAlt = email.replace("@ksu.ac.th", "@eng.ac.th");
  } else if (email.endsWith("@eng.ac.th")) {
    emailAlt = email.replace("@eng.ac.th", "@ksu.ac.th");
  }

  try {
    const userRes = await pool.query(
      `SELECT id, email, full_name FROM users 
       WHERE LOWER(TRIM(email)) = LOWER(TRIM($1)) OR LOWER(TRIM(email)) = LOWER(TRIM($2))`,
      [email, emailAlt]
    );
    const user = userRes.rows[0];

    if (!user) {
      return res.status(404).json({ message: "ไม่พบบัญชีผู้ใช้งานที่ใช้อีเมลนี้ในระบบ กรุณาตรวจสอบอีเมลอีกครั้ง" });
    }

    // สุ่มรหัส OTP 6 หลัก
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // ล้างรหัส OTP เก่าของอีเมลนี้
    await pool.query(
      "DELETE FROM password_resets WHERE LOWER(TRIM(email)) = LOWER(TRIM($1)) OR LOWER(TRIM(email)) = LOWER(TRIM($2))",
      [email, user.email]
    );

    // บันทึกรหัส OTP ใหม่
    await pool.query(
      "INSERT INTO password_resets (email, otp, expires_at) VALUES ($1, $2, $3)",
      [user.email, otp, expiresAt]
    );

    // ส่งอีเมลไปยังที่อยู่อีเมลจริงของบุคลากร
    const mailResult = await sendOtpEmail({
      to: user.email,
      otp,
      userName: user.full_name,
    });

    const responsePayload = {
      success: true,
      email: user.email,
      message: `ส่งรหัสยืนยัน OTP ไปยัง ${user.email} เรียบร้อยแล้ว (รหัสมีอายุ 10 นาที)`,
    };

    // หากเซิร์ฟเวอร์ยังไม่ได้ตั้งค่า SMTP ใน Environment
    if (!mailResult.sent) {
      responsePayload.debugOtp = otp;
      responsePayload.hint = "บันทึกรหัส OTP สำหรับทดสอบแล้ว";
    }

    res.json(responsePayload);
  } catch (err) {
    console.error("sendResetOtp error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการส่งรหัส OTP: " + err.message });
  }
}

async function verifyResetOtp(req, res) {
  let { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ message: "กรุณาระบุอีเมลและรหัส OTP 6 หลัก" });
  }

  email = String(email).trim().toLowerCase();
  otp = String(otp).trim();

  let emailAlt = email.endsWith("@ksu.ac.th")
    ? email.replace("@ksu.ac.th", "@eng.ac.th")
    : email.replace("@eng.ac.th", "@ksu.ac.th");

  try {
    const resOtp = await pool.query(
      `SELECT * FROM password_resets 
       WHERE (LOWER(TRIM(email)) = LOWER(TRIM($1)) OR LOWER(TRIM(email)) = LOWER(TRIM($2)))
         AND otp = $3 
         AND expires_at > NOW()
       ORDER BY id DESC LIMIT 1`,
      [email, emailAlt, otp]
    );

    if (resOtp.rows.length === 0) {
      return res.status(400).json({ message: "รหัส OTP ไม่ถูกต้อง หรือหมดอายุแล้ว กรุณาลองใหม่อีกครั้ง" });
    }

    // สร้าง resetToken อายุ 15 นาที สำหรับขั้นถัดไป
    const resetToken = jwt.sign(
      { email: resOtp.rows[0].email, purpose: "password_reset" },
      process.env.JWT_SECRET || "faculty_super_secret_jwt_key_2026",
      { expiresIn: "15m" }
    );

    res.json({
      success: true,
      message: "ยืนยันรหัส OTP ถูกต้อง",
      resetToken,
      email: resOtp.rows[0].email,
    });
  } catch (err) {
    console.error("verifyResetOtp error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการตรวจสอบรหัส OTP: " + err.message });
  }
}

async function resetPasswordWithOtp(req, res) {
  let { email, otp, resetToken, newPassword } = req.body;

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ message: "รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร" });
  }

  let verifiedEmail = null;

  // ตรวจสอบผ่าน resetToken
  if (resetToken) {
    try {
      const decoded = jwt.verify(
        resetToken,
        process.env.JWT_SECRET || "faculty_super_secret_jwt_key_2026"
      );
      if (decoded.purpose === "password_reset" && decoded.email) {
        verifiedEmail = decoded.email;
      }
    } catch (e) {
      // Token invalid or expired
    }
  }

  // หากไม่มี resetToken ให้ตรวจสอบจาก email + otp ตรงๆ
  if (!verifiedEmail && email && otp) {
    email = String(email).trim().toLowerCase();
    otp = String(otp).trim();
    let emailAlt = email.endsWith("@ksu.ac.th")
      ? email.replace("@ksu.ac.th", "@eng.ac.th")
      : email.replace("@eng.ac.th", "@ksu.ac.th");

    const check = await pool.query(
      `SELECT * FROM password_resets 
       WHERE (LOWER(TRIM(email)) = LOWER(TRIM($1)) OR LOWER(TRIM(email)) = LOWER(TRIM($2)))
         AND otp = $3 
         AND expires_at > NOW()
       ORDER BY id DESC LIMIT 1`,
      [email, emailAlt, otp]
    );

    if (check.rows.length > 0) {
      verifiedEmail = check.rows[0].email;
    }
  }

  if (!verifiedEmail) {
    return res.status(400).json({ message: "เซสชันการรีเซ็ตรหัสผ่านหมดอายุหรือไม่ถูกต้อง กรุณาขอรหัส OTP ใหม่อีกครั้ง" });
  }

  try {
    const newHash = await bcrypt.hash(newPassword, 10);
    const updateRes = await pool.query(
      `UPDATE users 
       SET password_hash = $1, updated_at = NOW() 
       WHERE LOWER(TRIM(email)) = LOWER(TRIM($2))
       RETURNING id, full_name, email`,
      [newHash, verifiedEmail]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ message: "ไม่พบบัญชีผู้ใช้งานที่ต้องการเปลี่ยนรหัสผ่าน" });
    }

    // ลบ OTP ที่ใช้งานแล้ว
    await pool.query(
      "DELETE FROM password_resets WHERE LOWER(TRIM(email)) = LOWER(TRIM($1))",
      [verifiedEmail]
    );

    res.json({
      success: true,
      message: "เปลี่ยนรหัสผ่านใหม่สำเร็จแล้ว สามารถเข้าสู่ระบบด้วยรหัสผ่านใหม่ได้ทันที",
      email: verifiedEmail,
    });
  } catch (err) {
    console.error("resetPasswordWithOtp error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน: " + err.message });
  }
}

module.exports = {
  sendResetOtp,
  verifyResetOtp,
  resetPasswordWithOtp,
  login,
  me,
  updateProfile,
  updateAvatar,
  changePassword,
  logout,
  loginWithGoogle,
  registerWithGoogle,
};
