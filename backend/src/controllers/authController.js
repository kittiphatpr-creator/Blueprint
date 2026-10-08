const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const pool = require("../config/db");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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
      audience: process.env.GOOGLE_CLIENT_ID,
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
      [email]
    );
    let user = result.rows[0];

    if (!user) {
      const employee_code = `G-${Date.now()}`;
      const isOwnerAdmin = email.toLowerCase() === "phongsakorn.ka@ksu.ac.th" || email.toLowerCase().startsWith("admin");
      const defaultRole = isOwnerAdmin ? "admin" : "lecturer";

      const insertResult = await pool.query(
        `INSERT INTO users (employee_code, full_name, email, google_id, role, profile_image)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [employee_code, name || email, email, googleId, defaultRole, picture]
      );
      user = insertResult.rows[0];
    } else if (!user.google_id) {
      await pool.query("UPDATE users SET google_id = $1 WHERE id = $2", [googleId, user.id]);
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
    res.status(401).json({ message: "ตรวจสอบ Google Token ไม่สำเร็จ" });
  }
}

module.exports = { login, me, updateProfile, updateAvatar, changePassword, logout, loginWithGoogle };
