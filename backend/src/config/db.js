const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
require("dotenv").config();

let useSqlite = false;
let sqliteDb = null;
let pgPool = null;

// ลองเชื่อมต่อ PostgreSQL ถ้ามี (รองรับ DATABASE_URL จาก Cloud เช่น Render, Supabase, Neon)
if (process.env.DATABASE_URL) {
  pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes("sslmode=disable") || process.env.DATABASE_URL.includes("localhost")
      ? false
      : { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000,
  });
} else {
  pgPool = new Pool({
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432", 10),
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "engineering_db",
    connectionTimeoutMillis: 2000,
  });
}

pgPool.on("error", (err) => {
  // Suppress uncaught error events when falling back
});

// ฟังก์ชันสร้างและ Seed ข้อมูลลง SQLite อัตโนมัติ
function initSqlite() {
  const { DatabaseSync } = require("node:sqlite");
  const dbPath = path.join(__dirname, "../../engineering.db");
  sqliteDb = new DatabaseSync(dbPath);

  // Enable WAL and foreign keys
  sqliteDb.exec("PRAGMA journal_mode = WAL;");
  sqliteDb.exec("PRAGMA foreign_keys = ON;");

  // Create Tables
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      head_user_id INTEGER
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_code TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      google_id TEXT UNIQUE,
      department_id INTEGER,
      position TEXT,
      role TEXT NOT NULL CHECK (role IN ('lecturer', 'head', 'staff', 'admin')),
      phone TEXT,
      profile_image TEXT,
      created_at DATETIME DEFAULT (datetime('now', 'localtime')),
      updated_at DATETIME DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS leave_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      max_days_per_year INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS leave_balances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      leave_type_id INTEGER NOT NULL,
      year INTEGER NOT NULL,
      total_days REAL NOT NULL DEFAULT 0,
      used_days REAL NOT NULL DEFAULT 0,
      UNIQUE (user_id, leave_type_id, year)
    );

    CREATE TABLE IF NOT EXISTS leave_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      leave_type_id INTEGER NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      days_count REAL NOT NULL,
      reason TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
      approved_by INTEGER,
      approved_at DATETIME,
      reject_reason TEXT,
      attachment_url TEXT,
      created_at DATETIME DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      posted_by INTEGER,
      image_url TEXT,
      attachment_url TEXT,
      created_at DATETIME DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      title TEXT NOT NULL,
      file_url TEXT NOT NULL,
      category TEXT,
      uploaded_at DATETIME DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT,
      message TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      related_id INTEGER,
      created_at DATETIME DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS password_resets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      otp TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT (datetime('now', 'localtime'))
    );
  `);

  // Migration for existing tables: add attachment_url if missing
  try {
    sqliteDb.exec("ALTER TABLE announcements ADD COLUMN attachment_url TEXT;");
  } catch (e) {
    // Column already exists
  }

  // Seed Initial Data if empty
  const userCountStmt = sqliteDb.prepare("SELECT COUNT(*) AS count FROM users");
  const userCount = userCountStmt.get().count;

  if (userCount === 0) {
    console.log("⚡ กำลังสร้างข้อมูลเริ่มต้นอัตโนมัติในฐานข้อมูล Local (SQLite)...");

    // Leave types
    sqliteDb.exec(`
      INSERT OR IGNORE INTO leave_types (id, name, max_days_per_year) VALUES
        (1, 'ลาป่วย', 30),
        (2, 'ลากิจ', 10),
        (3, 'ลาพักร้อน', 10);
    `);

    // Departments
    sqliteDb.exec(`
      INSERT OR IGNORE INTO departments (id, name) VALUES
        (1, 'ภาควิชาวิศวกรรมคอมพิวเตอร์'),
        (2, 'ภาควิชาวิศวกรรมไฟฟ้า'),
        (3, 'ภาควิชาวิศวกรรมโยธา'),
        (4, 'ภาควิชาวิศวกรรมเครื่องกล'),
        (5, 'ภาควิชาวิศวกรรมอุตสาหการ');
    `);

    const pwAdmin = bcrypt.hashSync("admin1234", 10);
    const pwHead = bcrypt.hashSync("head1234", 10);
    const pwStaff = bcrypt.hashSync("staff1234", 10);
    const pwUser = bcrypt.hashSync("user1234", 10);

    const insertUser = sqliteDb.prepare(`
      INSERT OR REPLACE INTO users (id, employee_code, full_name, email, password_hash, department_id, position, role, phone)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertUser.run(1, "ENG-ADM01", "ผู้ดูแลระบบ คณะวิศวกรรมศาสตร์", "admin@ksu.ac.th", pwAdmin, 1, "ผู้อำนวยการฝ่ายเทคโนโลยีสารสนเทศ", "admin", "02-123-4567");
    insertUser.run(2, "ENG-STF01", "นางสาวสมศรี จัดการงาน", "staff@ksu.ac.th", pwStaff, null, "เจ้าหน้าที่บริหารงานทั่วไป (งานบุคคล)", "staff", "02-123-4568");
    insertUser.run(3, "ENG-HOD01", "รศ.ดร.วิศวกิจ นวัตกรรม", "head.cpe@ksu.ac.th", pwHead, 1, "หัวหน้าภาควิชาวิศวกรรมคอมพิวเตอร์", "head", "081-234-5678");
    insertUser.run(4, "ENG-HOD02", "ศ.ดร.ธนากร ไฟฟ้าพลังงาน", "head.ee@ksu.ac.th", pwHead, 2, "หัวหน้าภาควิชาวิศวกรรมไฟฟ้า", "head", "082-345-6789");
    insertUser.run(5, "ENG-LEC01", "ผศ.ดร.สมชาย ปัญญาประดิษฐ์", "somchai.cpe@ksu.ac.th", pwUser, 1, "อาจารย์ประจำภาควิชาวิศวกรรมคอมพิวเตอร์", "lecturer", "083-456-7890");
    insertUser.run(6, "ENG-LEC02", "อ.ดร.สุดา สัญญาณอัจฉริยะ", "suda.ee@ksu.ac.th", pwUser, 2, "อาจารย์ประจำภาควิชาวิศวกรรมไฟฟ้า", "lecturer", "084-567-8901");
    insertUser.run(7, "ENG-LEC03", "ผศ.อนันต์ โครงสร้างมั่นคง", "anant.ce@ksu.ac.th", pwUser, 3, "อาจารย์ประจำภาควิชาวิศวกรรมโยธา", "lecturer", "085-678-9012");
    insertUser.run(8, "ENG-LEC04", "อ.วิชัย ยานยนต์พลังงานใหม่", "wichai.me@ksu.ac.th", pwUser, 4, "อาจารย์ประจำภาควิชาวิศวกรรมเครื่องกล", "lecturer", "086-789-0123");

    // Head user in departments
    sqliteDb.exec("UPDATE departments SET head_user_id = 3 WHERE id = 1;");
    sqliteDb.exec("UPDATE departments SET head_user_id = 4 WHERE id = 2;");

    // Leave Balances for all users
    const currentYear = new Date().getFullYear();
    const insertBalance = sqliteDb.prepare(`
      INSERT OR IGNORE INTO leave_balances (user_id, leave_type_id, year, total_days, used_days)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (let uId = 1; uId <= 8; uId++) {
      for (let y = currentYear - 1; y <= currentYear; y++) {
        insertBalance.run(uId, 1, y, 30, uId === 5 ? 2 : 0);
        insertBalance.run(uId, 2, y, 10, uId === 5 ? 1 : (uId === 6 ? 1 : 0));
        insertBalance.run(uId, 3, y, 10, 0);
      }
    }

    // Sample Leave requests
    sqliteDb.exec(`
      INSERT INTO leave_requests (user_id, leave_type_id, start_date, end_date, days_count, reason, status) VALUES
        (5, 3, date('now', '+5 days'), date('now', '+6 days'), 2, 'พักผ่อนประจำปีกับครอบครัว', 'pending'),
        (5, 1, date('now', '-10 days'), date('now', '-9 days'), 2, 'มีไข้หวัด ปวดศีรษะ (มีใบรับรองแพทย์)', 'approved'),
        (6, 2, date('now'), date('now'), 1, 'ติดต่อราชการทำหนังสือเดินทางเพื่อเข้าร่วมสัมมนาวิชาการ', 'approved');
    `);

    // Sample Announcements
    sqliteDb.exec(`
      INSERT INTO announcements (title, content, posted_by) VALUES
        ('ประกาศปฏิทินวันหยุดราชการและการปฏิบัติงานประจำภาคการศึกษา', 'ขอความร่วมมือคณาจารย์และบุคลากรทุกท่านตรวจสอบปฏิทินการปฏิบัติงานและกำหนดการยื่นขออนุมัติต่างๆ ประจำภาคเรียนผ่านระบบออนไลน์', 1),
        ('เปิดรับสมัครข้อเสนอโครงการวิจัยเพื่อขอรับทุนสนับสนุน ประจำปีงบประมาณ', 'ฝ่ายวิจัยและนวัตกรรม คณะวิศวกรรมศาสตร์ ขอเชิญชวนอาจารย์และนักวิจัยยื่นข้อเสนอโครงการวิจัยเพื่อขอรับทุนสนับสนุน สามารถดาวน์โหลดแบบฟอร์มได้ที่เมนูคลังเอกสาร', 1),
        ('การส่งเสริมระบบสำนักงานไร้กระดาษ (Paperless) ภายในคณะวิศวกรรมศาสตร์', 'คณะวิศวกรรมศาสตร์ได้พัฒนาระบบยื่นคำขอลางานและจัดเก็บข้อมูลบุคลากรออนไลน์ เพื่อลดขั้นตอนการใช้กระดาษและเพิ่มความสะดวกรวดเร็วในการทำงาน', 1);
    `);

    // Sample Documents
    sqliteDb.exec(`
      INSERT INTO documents (user_id, title, file_url, category) VALUES
        (1, 'แบบฟอร์มขออนุมัติเดินทางไปปฏิบัติงานและประชุมวิชาการ', '/uploads/sample-travel-form.pdf', 'แบบฟอร์มการลาและขออนุมัติ'),
        (1, 'คู่มือการใช้งานระบบสารสนเทศบุคลากรและลางานออนไลน์', '/uploads/manual-hr-system.pdf', 'คู่มือและระเบียบข้อบังคับ'),
        (1, 'ระเบียบมหาวิทยาลัยว่าด้วยการลาของบุคลากร', '/uploads/leave-regulation.pdf', 'คู่มือและระเบียบข้อบังคับ'),
        (1, 'แบบฟอร์มขอรับทุนสนับสนุนการวิจัยและตีพิมพ์ผลงาน', '/uploads/research-fund-form.docx', 'เอกสารงานวิจัยและวิชาการ');
    `);

    // Sample Notification
    sqliteDb.exec(`
      INSERT INTO notifications (user_id, type, message, is_read) VALUES
        (3, 'leave_request', 'มีคำขอลาพักร้อนใหม่จาก ผศ.ดร.สมชาย ปัญญาประดิษฐ์ รอการอนุมัติ', 0);
    `);

    console.log("✅ สร้างข้อมูลเริ่มต้นใน SQLite สำเร็จเรียบร้อย พร้อมใช้งานทันที!");
  }
}

// แปลงคำสั่ง SQL ของ PostgreSQL ให้เป็นคำสั่งที่ SQLite เข้าใจได้
function transformPgToSqlite(sql, originalParams = []) {
  let s = sql;

  // ILIKE -> LIKE
  s = s.replace(/\bILIKE\b/gi, "LIKE");

  // NOW() -> datetime('now', 'localtime')
  s = s.replace(/\bNOW\(\)/gi, "datetime('now', 'localtime')");

  // CURRENT_DATE -> date('now', 'localtime')
  s = s.replace(/\bCURRENT_DATE\b/gi, "date('now', 'localtime')");

  // COALESCE with EXCLUDED or types
  s = s.replace(/::float/gi, "");
  s = s.replace(/::integer/gi, "");
  s = s.replace(/::int/gi, "");

  // EXTRACT(YEAR FROM col) -> strftime('%Y', col)
  s = s.replace(/EXTRACT\s*\(\s*YEAR\s+FROM\s+([a-zA-Z0-9_.]+)\s*\)/gi, "cast(strftime('%Y', $1) as integer)");
  // EXTRACT(MONTH FROM col) -> strftime('%m', col)
  s = s.replace(/EXTRACT\s*\(\s*MONTH\s+FROM\s+([a-zA-Z0-9_.]+)\s*\)/gi, "cast(strftime('%m', $1) as integer)");

  // ON CONFLICT (...) DO NOTHING -> INSERT OR IGNORE
  if (/ON\s+CONFLICT\s*(\([^)]+\))?\s*DO\s+NOTHING/gi.test(s)) {
    s = s.replace(/INSERT\s+INTO/gi, "INSERT OR IGNORE INTO");
    s = s.replace(/ON\s+CONFLICT\s*(\([^)]+\))?\s*DO\s+NOTHING/gi, "");
  }

  // Remap $1, $2, ... to ? and reorder params array accurately
  const paramIndices = [];
  s = s.replace(/\$(\d+)/g, (_, num) => {
    paramIndices.push(parseInt(num, 10) - 1);
    return "?";
  });

  const transformedParams = paramIndices.length > 0 
    ? paramIndices.map((idx) => originalParams[idx]) 
    : originalParams;

  return { sql: s, params: transformedParams };
}

// Unified Database Client
const dbClient = {
  async query(sqlText, params = []) {
    // ถ้ายังไม่ได้ตัดสินใจว่าจะใช้ PG หรือ SQLite
    if (!useSqlite && pgPool) {
      try {
        const res = await pgPool.query(sqlText, params);
        return res;
      } catch (err) {
        if (err.code === "ECONNREFUSED" || err.code === "28P01" || err.code === "3D000" || err.message.includes("connect")) {
          console.log("⚠️ ไม่พบ PostgreSQL Server หรือเชื่อมต่อไม่ได้ -> สลับมาใช้ฐานข้อมูล Local SQLite อัตโนมัติ!");
          useSqlite = true;
          initSqlite();
        } else {
          throw err;
        }
      }
    }

    if (useSqlite) {
      if (!sqliteDb) initSqlite();

      const { sql: transformedSql, params: transformedParams } = transformPgToSqlite(sqlText, params);
      const trimmed = transformedSql.trim();
      const isSelect = trimmed.toUpperCase().startsWith("SELECT");
      const hasReturning = trimmed.toUpperCase().includes("RETURNING");

      try {
        const stmt = sqliteDb.prepare(transformedSql);

        if (isSelect || hasReturning) {
          const rows = stmt.all(...transformedParams);
          return { rows: rows || [], rowCount: rows ? rows.length : 0 };
        } else {
          const result = stmt.run(...transformedParams);
          return { rows: [], rowCount: result.changes };
        }
      } catch (sqliteErr) {
        console.error("SQLite Query Error:", sqliteErr.message, "SQL:", transformedSql, "Params:", transformedParams);
        throw sqliteErr;
      }
    }

    return await pgPool.query(sqlText, params);
  },

  async end() {
    if (pgPool) {
      try {
        await pgPool.end();
      } catch {}
    }
  },
};

// ฟังก์ชันสร้างหรืออัปเดตบัญชี Admin ประจำระบบอัตโนมัติ
async function ensureAdminUser() {
  try {
    const adminEmail = "phongsakorn.ka@ksu.ac.th";
    const adminPass = "1469900689920";
    const pwHash = await bcrypt.hash(adminPass, 10);

    const checkRes = await dbClient.query(
      "SELECT id FROM users WHERE LOWER(email) = LOWER($1)",
      [adminEmail]
    );

    if (checkRes.rows && checkRes.rows.length > 0) {
      await dbClient.query(
        "UPDATE users SET password_hash = $1, role = 'admin' WHERE id = $2",
        [pwHash, checkRes.rows[0].id]
      );
      console.log(`✅ อัปเดตสิทธิ์ Admin และรหัสผ่านให้บัญชี: ${adminEmail} เรียบร้อย`);
    } else {
      await dbClient.query(
        `INSERT INTO users (employee_code, full_name, email, password_hash, department_id, position, role, phone)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          "ENG-ADM00",
          "พงศกร (ผู้ดูแลระบบ)",
          adminEmail,
          pwHash,
          1,
          "ผู้ดูแลระบบ คณะวิศวกรรมศาสตร์",
          "admin",
          "02-123-4567",
        ]
      );
      console.log(`✅ เพิ่มบัญชี Admin ประจำระบบ: ${adminEmail} เรียบร้อยแล้ว`);
    }
  } catch (err) {
    console.error("⚠️ ไม่สามารถสร้าง/อัปเดตบัญชี Admin อัตโนมัติได้:", err.message);
  }
}

// ฟังก์ชันสร้างตารางและ Seed ข้อมูลลง PostgreSQL อัตโนมัติ (กรณีเพิ่งเชื่อมต่อ DB บน Cloud ใหม่)
async function initPostgres() {
  try {
    const checkTable = await pgPool.query(`
      SELECT to_regclass('public.users') AS exists;
    `);

    if (!checkTable.rows[0].exists) {
      console.log("⚡ กำลังสร้างโครงสร้างตารางและข้อมูลตั้งต้นใน PostgreSQL บน Cloud อัตโนมัติ...");
      const schemaPath = path.join(__dirname, "../../schema.sql");
      if (fs.existsSync(schemaPath)) {
        const schemaSql = fs.readFileSync(schemaPath, "utf-8");
        await pgPool.query(schemaSql);
      }

      // Seed ข้อมูลบัญชีเริ่มต้น
      const pwAdmin = await bcrypt.hash("admin1234", 10);
      const pwHead = await bcrypt.hash("head1234", 10);
      const pwStaff = await bcrypt.hash("staff1234", 10);
      const pwUser = await bcrypt.hash("user1234", 10);

      const users = [
        ["ENG-ADM01", "ผู้ดูแลระบบ คณะวิศวกรรมศาสตร์", "admin@eng.ac.th", pwAdmin, 1, "ผู้อำนวยการฝ่ายเทคโนโลยีสารสนเทศ", "admin", "02-123-4567"],
        ["ENG-STF01", "นางสาวสมศรี จัดการงาน", "staff@eng.ac.th", pwStaff, null, "เจ้าหน้าที่บริหารงานทั่วไป (งานบุคคล)", "staff", "081-234-5678"],
        ["ENG-HOD01", "รศ.ดร.วิศวกิจ นวัตกรรม", "head.cpe@eng.ac.th", pwHead, 1, "หัวหน้าภาควิชาวิศวกรรมคอมพิวเตอร์", "head", "082-345-6789"],
        ["ENG-HOD02", "ศ.ดร.ธนากร ไฟฟ้าพลังงาน", "head.ee@eng.ac.th", pwHead, 2, "หัวหน้าภาควิชาวิศวกรรมไฟฟ้า", "head", "083-456-7890"],
        ["ENG-LEC01", "ผศ.ดร.สมชาย ปัญญาประดิษฐ์", "somchai.cpe@eng.ac.th", pwUser, 1, "อาจารย์ประจำภาควิชาวิศวกรรมคอมพิวเตอร์", "lecturer", "084-567-8901"],
        ["ENG-LEC02", "อ.ดร.สุดา สัญญาณอัจฉริยะ", "suda.ee@eng.ac.th", pwUser, 2, "อาจารย์ประจำภาควิชาวิศวกรรมไฟฟ้า", "lecturer", "085-678-9012"],
        ["ENG-LEC03", "ผศ.อนันต์ โครงสร้างมั่นคง", "anant.ce@eng.ac.th", pwUser, 3, "อาจารย์ประจำภาควิชาวิศวกรรมโยธา", "lecturer", "089-012-3456"],
        ["ENG-LEC04", "อ.วิชัย ยานยนต์พลังงานใหม่", "wichai.me@eng.ac.th", pwUser, 4, "อาจารย์ประจำภาควิชาวิศวกรรมเครื่องกล", "lecturer", "086-789-0123"],
      ];

      for (const u of users) {
        await pgPool.query(
          `INSERT INTO users (employee_code, full_name, email, password_hash, department_id, position, role, phone)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (email) DO NOTHING`,
          u
        );
      }

      // Add attachment_url column if needed
      try {
        await pgPool.query("ALTER TABLE announcements ADD COLUMN IF NOT EXISTS image_url TEXT;");
        await pgPool.query("ALTER TABLE announcements ADD COLUMN IF NOT EXISTS attachment_url TEXT;");
      } catch (e) {}
    try {
      await pgPool.query("CREATE TABLE IF NOT EXISTS password_resets (id SERIAL PRIMARY KEY, email VARCHAR(255) NOT NULL, otp VARCHAR(10) NOT NULL, expires_at TIMESTAMP NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);");
    } catch (e) {}

      console.log("✅ สร้างตารางและข้อมูลเริ่มต้นใน PostgreSQL สำเร็จเรียบร้อย!");
    } else {
      try {
        await pgPool.query("ALTER TABLE announcements ADD COLUMN IF NOT EXISTS image_url TEXT;");
        await pgPool.query("ALTER TABLE announcements ADD COLUMN IF NOT EXISTS attachment_url TEXT;");
      } catch (e) {}
    }
  } catch (err) {
    console.error("⚠️ ไม่สามารถสร้างตารางเริ่มต้นใน PostgreSQL ได้:", err.message);
  }
}

// ทดสอบ Connection ทันทีตอนเริ่มระบบ
(async function testInit() {
  try {
    await pgPool.query("SELECT 1");
    console.log("✅ เชื่อมต่อฐานข้อมูล PostgreSQL สำเร็จ");
    await initPostgres();
  } catch (err) {
    console.log("ℹ️ ไม่พบ PostgreSQL (หรือยังไม่ได้เปิด pgAdmin) -> สลับใช้งาน Local SQLite อัตโนมัติ พร้อมใช้งานทันที!");
    useSqlite = true;
    initSqlite();
  }
  await ensureAdminUser();
  try {
    await dbClient.query(`
      UPDATE leave_balances
      SET used_days = COALESCE((
        SELECT SUM(lr.days_count)
        FROM leave_requests lr
        WHERE lr.user_id = leave_balances.user_id
          AND lr.leave_type_id = leave_balances.leave_type_id
          AND lr.status = 'approved'
          AND EXTRACT(YEAR FROM lr.start_date) = leave_balances.year
      ), 0)
    `);
  } catch (e) {
    console.log("Sync leave balances note:", e.message);
  }
})();

module.exports = dbClient;
