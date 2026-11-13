const pool = require("../config/db");
const {
  sendNewLeaveNotification,
  sendLeaveApprovedNotification,
  sendLeaveRejectedNotification,
} = require("../utils/emailService");

async function getMyRequests(req, res) {
  try {
    const result = await pool.query(
      `SELECT lr.*, lr.days_count::float AS days_count, lt.name AS leave_type_name, u.full_name,
              approver.full_name AS approver_name
       FROM leave_requests lr
       JOIN leave_types lt ON lt.id = lr.leave_type_id
       JOIN users u ON u.id = lr.user_id
       LEFT JOIN users approver ON approver.id = lr.approved_by
       WHERE lr.user_id = $1
       ORDER BY lr.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในระบบ" });
  }
}

/**
 * GET /leave-requests?status=&department_id=
 * head เห็นเฉพาะคำขอของคนในสาขาตัวเอง, staff/admin เห็นทั้งหมด
 */
async function getAllRequests(req, res) {
  const { status, department_id } = req.query;
  const { role, department_id: myDept } = req.user;

  const conditions = [];
  const values = [];

  if (status) {
    values.push(status);
    conditions.push(`lr.status = $${values.length}`);
  }

  if (department_id) {
    values.push(department_id);
    conditions.push(`u.department_id = $${values.length}`);
  } else if (role === "head") {
    if (myDept) {
      values.push(myDept);
      conditions.push(`u.department_id = $${values.length}`);
    }
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  try {
    const result = await pool.query(
      `SELECT lr.*, lr.days_count::float AS days_count, lt.name AS leave_type_name, 
              u.full_name, u.employee_code, u.position, u.department_id,
              d.name AS department_name,
              approver.full_name AS approver_name
       FROM leave_requests lr
       JOIN leave_types lt ON lt.id = lr.leave_type_id
       JOIN users u ON u.id = lr.user_id
       LEFT JOIN departments d ON d.id = u.department_id
       LEFT JOIN users approver ON approver.id = lr.approved_by
       ${whereClause}
       ORDER BY lr.created_at DESC`,
      values
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในระบบ" });
  }
}

async function create(req, res) {
  const { leave_type_id, start_date, end_date, days_count, reason, attachment_url } = req.body;

  if (!leave_type_id || !start_date || !end_date || !days_count) {
    return res.status(400).json({ message: "กรุณาระบุประเภทการลา วันที่ และจำนวนวันให้ครบถ้วน" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO leave_requests (user_id, leave_type_id, start_date, end_date, days_count, reason, attachment_url, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7, 'pending')
       RETURNING *`,
      [req.user.id, leave_type_id, start_date, end_date, days_count, reason, attachment_url || null]
    );

    const leaveRequest = result.rows[0];

    // ดึงชื่อผู้ยื่นลา และสังกัด
    const userRes = await pool.query("SELECT full_name, department_id FROM users WHERE id = $1", [req.user.id]);
    const senderName = userRes.rows[0]?.full_name || "บุคลากร";
    const userDept = userRes.rows[0]?.department_id;

    // 1. แจ้งเตือนในระบบ (In-App Notification) ให้หัวหน้าสาขา และ Admin
    await pool.query(
      `INSERT INTO notifications (user_id, type, message, related_id)
       SELECT id, 'leave_request', $1, $2
       FROM users 
       WHERE (role = 'head' AND department_id = $3) OR role = 'admin'`,
      [`มีคำขอลาใหม่จาก ${senderName} รอการพิจารณาอนุมัติ`, leaveRequest.id, userDept]
    );

    // 2. ส่งอีเมลแจ้งเตือน (Email Notification) หาหัวหน้าสาขา และ Admin (เบื้องหลัง ไม่บล็อกหน้าเว็บ)
    (async () => {
      try {
        const ltRes = await pool.query("SELECT name FROM leave_types WHERE id = $1", [leave_type_id]);
        const leaveTypeName = ltRes.rows[0]?.name || "การลา";

        const approversRes = await pool.query(
          `SELECT email FROM users 
           WHERE ((role = 'head' AND department_id = $1) OR role = 'admin') 
             AND email IS NOT NULL`,
          [userDept]
        );
        const approverEmails = approversRes.rows.map(r => r.email).filter(Boolean);

        if (approverEmails.length > 0) {
          await sendNewLeaveNotification({
            to: approverEmails,
            applicantName: senderName,
            leaveType: leaveTypeName,
            startDate: start_date,
            endDate: end_date,
            daysCount: days_count,
            reason: reason || "-"
          });
        }
      } catch (emailErr) {
        console.error("[Email Notification Error - Create Leave]:", emailErr.message);
      }
    })();

    res.status(201).json(leaveRequest);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการบันทึกคำขอลา" });
  }
}

async function approve(req, res) {
  try {
    const result = await pool.query(
      `UPDATE leave_requests
       SET status='approved', approved_by=$1, approved_at=NOW()
       WHERE id=$2
       RETURNING *`,
      [req.user.id, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "ไม่พบคำขอลา" });
    }

    const leave = result.rows[0];
    const leaveYear = new Date(leave.start_date).getFullYear();

    // หักวันลาใน leave_balances (Upsert และซิงค์ยอดจากคำขอลาที่อนุมัติ)
    await pool.query(
      `INSERT INTO leave_balances (user_id, leave_type_id, year, total_days, used_days)
       SELECT $1, $2, $3, lt.max_days_per_year, $4
       FROM leave_types lt WHERE lt.id = $5
       ON CONFLICT (user_id, leave_type_id, year)
       DO UPDATE SET used_days = (
         SELECT COALESCE(SUM(lr.days_count), 0)
         FROM leave_requests lr
         WHERE lr.user_id = $1
           AND lr.leave_type_id = $2
           AND lr.status = 'approved'
           AND EXTRACT(YEAR FROM lr.start_date) = $3
       )`,
      [leave.user_id, leave.leave_type_id, leaveYear, Number(leave.days_count), leave.leave_type_id]
    );

    // ดึงชื่อผู้อนุมัติ
    const approverRes = await pool.query("SELECT full_name FROM users WHERE id = $1", [req.user.id]);
    const approverName = approverRes.rows[0]?.full_name || "ผู้มีอำนาจอนุมัติ";

    // 1. แจ้งเตือนในระบบ (In-App Notification) แก่ผู้ยื่นขอลา
    await pool.query(
      `INSERT INTO notifications (user_id, type, message, related_id)
       VALUES ($1, 'leave_result', $2, $3)`,
      [leave.user_id, `คำขอลาของคุณได้รับการอนุมัติเรียบร้อยแล้ว โดย ${approverName}`, leave.id]
    );

    // 2. ส่งอีเมลแจ้งผลการอนุมัติ (Email Notification) แก่ผู้ยื่นขอลา (เบื้องหลัง)
    (async () => {
      try {
        const appRes = await pool.query(
          `SELECT u.email, u.full_name, lt.name AS leave_type_name
           FROM users u
           JOIN leave_types lt ON lt.id = $2
           WHERE u.id = $1`,
          [leave.user_id, leave.leave_type_id]
        );
        const applicant = appRes.rows[0];

        if (applicant?.email) {
          await sendLeaveApprovedNotification({
            to: applicant.email,
            applicantName: applicant.full_name,
            approverName,
            leaveType: applicant.leave_type_name,
            startDate: leave.start_date,
            endDate: leave.end_date,
            daysCount: leave.days_count
          });
        }
      } catch (emailErr) {
        console.error("[Email Notification Error - Approve Leave]:", emailErr.message);
      }
    })();

    res.json(leave);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในระบบ" });
  }
}

async function reject(req, res) {
  const { reason } = req.body;

  try {
    const result = await pool.query(
      `UPDATE leave_requests
       SET status='rejected', approved_by=$1, approved_at=NOW(), reject_reason=$2
       WHERE id=$3
       RETURNING *`,
      [req.user.id, reason || "ไม่อนุมัติ", req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "ไม่พบคำขอลา" });
    }

    const leave = result.rows[0];

    // ดึงชื่อผู้พิจารณา
    const rejecterRes = await pool.query("SELECT full_name FROM users WHERE id = $1", [req.user.id]);
    const approverName = rejecterRes.rows[0]?.full_name || "ผู้มีอำนาจพิจารณา";

    // 1. แจ้งเตือนในระบบ (In-App Notification) แก่ผู้ยื่นขอลา
    await pool.query(
      `INSERT INTO notifications (user_id, type, message, related_id)
       VALUES ($1, 'leave_result', $2, $3)`,
      [
        leave.user_id,
        `คำขอลาของคุณไม่ได้รับการอนุมัติ ${reason ? `(เหตุผล: ${reason})` : ""}`,
        leave.id,
      ]
    );

    // 2. ส่งอีเมลแจ้งผลการไม่อนุมัติ (Email Notification) แก่ผู้ยื่นขอลา (เบื้องหลัง)
    (async () => {
      try {
        const appRes = await pool.query(
          `SELECT u.email, u.full_name, lt.name AS leave_type_name
           FROM users u
           JOIN leave_types lt ON lt.id = $2
           WHERE u.id = $1`,
          [leave.user_id, leave.leave_type_id]
        );
        const applicant = appRes.rows[0];

        if (applicant?.email) {
          await sendLeaveRejectedNotification({
            to: applicant.email,
            applicantName: applicant.full_name,
            approverName,
            leaveType: applicant.leave_type_name,
            startDate: leave.start_date,
            endDate: leave.end_date,
            daysCount: leave.days_count,
            reason: reason || "ไม่อนุมัติ"
          });
        }
      } catch (emailErr) {
        console.error("[Email Notification Error - Reject Leave]:", emailErr.message);
      }
    })();

    res.json(leave);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในระบบ" });
  }
}

async function getBalance(req, res) {
  const userId = req.params.userId || req.user.id;
  const year = req.query.year ? parseInt(req.query.year) : new Date().getFullYear();

  try {
    // 1. ตรวจสอบและ Auto-seed leave_balances หากยังไม่มีสำหรับปีนี้
    await pool.query(
      `INSERT INTO leave_balances (user_id, leave_type_id, year, total_days, used_days)
       SELECT $1, lt.id, $2, lt.max_days_per_year, 0
       FROM leave_types lt
       ON CONFLICT (user_id, leave_type_id, year) DO NOTHING`,
      [userId, year]
    );

    // 2. ดึงข้อมูลยอดวันลาพร้อมชื่อประเภท (คำนวณวันลาที่ใช้จริงจากคำขอที่อนุมัติแบบเรียลไทม์)
    const result = await pool.query(
      `SELECT lb.id, lb.user_id, lb.leave_type_id, lb.year, 
              lb.total_days::float AS total_days, 
              COALESCE((
                SELECT SUM(lr.days_count) 
                FROM leave_requests lr 
                WHERE lr.user_id = lb.user_id 
                  AND lr.leave_type_id = lb.leave_type_id 
                  AND lr.status = 'approved'
                  AND EXTRACT(YEAR FROM lr.start_date) = lb.year
              ), 0)::float AS used_days,
              (lb.total_days - COALESCE((
                SELECT SUM(lr.days_count) 
                FROM leave_requests lr 
                WHERE lr.user_id = lb.user_id 
                  AND lr.leave_type_id = lb.leave_type_id 
                  AND lr.status = 'approved'
                  AND EXTRACT(YEAR FROM lr.start_date) = lb.year
              ), 0))::float AS remaining_days,
              lt.name AS leave_type_name, lt.max_days_per_year
       FROM leave_balances lb
       JOIN leave_types lt ON lt.id = lb.leave_type_id
       WHERE lb.user_id = $1 AND lb.year = $2
       ORDER BY lt.id ASC`,
      [userId, year]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงยอดวันลาคงเหลือ" });
  }
}

/**
 * GET /leave-requests/calendar?month=&year=&department_id=
 */
async function getCalendar(req, res) {
  const { month, year, department_id } = req.query;

  const conditions = ["lr.status = 'approved'"];
  const values = [];

  if (month && year) {
    values.push(year, month);
    conditions.push(
      `EXTRACT(YEAR FROM lr.start_date) = $${values.length - 1} AND EXTRACT(MONTH FROM lr.start_date) = $${values.length}`
    );
  } else if (year) {
    values.push(year);
    conditions.push(`EXTRACT(YEAR FROM lr.start_date) = $${values.length}`);
  }

  if (department_id) {
    values.push(department_id);
    conditions.push(`u.department_id = $${values.length}`);
  }

  try {
    const result = await pool.query(
      `SELECT lr.id, lr.start_date, lr.end_date, lr.days_count::float AS days_count, lr.reason,
              u.full_name, u.position, u.employee_code,
              d.name AS department_name, lt.name AS leave_type_name
       FROM leave_requests lr
       JOIN users u ON u.id = lr.user_id
       LEFT JOIN departments d ON d.id = u.department_id
       JOIN leave_types lt ON lt.id = lr.leave_type_id
       WHERE ${conditions.join(" AND ")}
       ORDER BY lr.start_date ASC`,
      values
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในระบบ" });
  }
}

module.exports = {
  getMyRequests,
  getAllRequests,
  create,
  approve,
  reject,
  getBalance,
  getCalendar,
};
