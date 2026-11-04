const pool = require("../config/db");

/**
 * GET /dashboard/summary
 * ส่งคืนข้อมูลสรุปสถิติตาม Role
 */
async function getSummary(req, res) {
  const { role, department_id, id } = req.user;

  try {
    let scopeCondition = "";
    let scopeValue = [];

    if (role === "head" && department_id) {
      scopeCondition = "WHERE u.department_id = $1";
      scopeValue = [department_id];
    } else if (role === "lecturer") {
      scopeCondition = "WHERE u.id = $1";
      scopeValue = [id];
    }

    // 1. จำนวนบุคลากร
    const totalEmployeesRes = await pool.query(
      `SELECT COUNT(*) AS count FROM users u ${scopeCondition}`,
      scopeValue
    );
    const totalEmployees = parseInt(totalEmployeesRes.rows[0]?.count || 0, 10);

    // 2. จำนวนสาขาวิชา
    const totalDeptsRes = await pool.query(`SELECT COUNT(*) AS count FROM departments`);
    const totalDepartments = parseInt(totalDeptsRes.rows[0]?.count || 0, 10);

    // 3. สถิติคำขอลา
    const leaveStatsRes = await pool.query(
      `SELECT lr.status, COUNT(*) AS count
       FROM leave_requests lr
       JOIN users u ON u.id = lr.user_id
       ${scopeCondition}
       GROUP BY lr.status`,
      scopeValue
    );

    const pendingCount = parseInt(leaveStatsRes.rows.find((r) => r.status === "pending")?.count || 0, 10);
    const approvedCount = parseInt(leaveStatsRes.rows.find((r) => r.status === "approved")?.count || 0, 10);
    const rejectedCount = parseInt(leaveStatsRes.rows.find((r) => r.status === "rejected")?.count || 0, 10);

    // 4. สถิติการลาแยกตามประเภท
    const leaveByTypeRes = await pool.query(
      `SELECT lt.name AS leave_type_name, COUNT(lr.id) AS count, COALESCE(SUM(lr.days_count), 0)::float AS total_days
       FROM leave_types lt
       LEFT JOIN leave_requests lr ON lr.leave_type_id = lt.id AND lr.status = 'approved'
       LEFT JOIN users u ON u.id = lr.user_id
       ${scopeCondition ? scopeCondition : ""}
       GROUP BY lt.id, lt.name
       ORDER BY lt.id`,
      scopeValue
    );

    // 5. ผู้ที่กำลังลางานในวันนี้ (Leaves Today)
    const leavesTodayRes = await pool.query(
      `SELECT lr.id, lr.start_date, lr.end_date, lr.days_count, lr.reason,
              u.full_name, u.position, d.name AS department_name, lt.name AS leave_type_name
       FROM leave_requests lr
       JOIN users u ON u.id = lr.user_id
       LEFT JOIN departments d ON d.id = u.department_id
       JOIN leave_types lt ON lt.id = lr.leave_type_id
       WHERE lr.status = 'approved' 
         AND CURRENT_DATE BETWEEN lr.start_date AND lr.end_date
       ${role === "head" && department_id ? "AND u.department_id = $1" : ""}
       ORDER BY lr.start_date ASC`,
      role === "head" && department_id ? [department_id] : []
    );

    // 6. ยอดวันลาคงเหลือของผู้ใช้ปัจจุบัน (Current User Leave Balances)
    const currentYear = new Date().getFullYear();
    // Auto-seed if needed
    await pool.query(
      `INSERT INTO leave_balances (user_id, leave_type_id, year, total_days, used_days)
       SELECT $1, lt.id, $2, lt.max_days_per_year, 0
       FROM leave_types lt
       ON CONFLICT (user_id, leave_type_id, year) DO NOTHING`,
      [id, currentYear]
    );

    const myBalancesRes = await pool.query(
      `SELECT lb.leave_type_id, lb.total_days::float AS total_days, 
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
              lt.name AS leave_type_name
       FROM leave_balances lb
       JOIN leave_types lt ON lt.id = lb.leave_type_id
       WHERE lb.user_id = $1 AND lb.year = $2
       ORDER BY lt.id ASC`,
      [id, currentYear]
    );

    // 7. รายการคำขอล่าสุด
    const recentLeavesRes = await pool.query(
      `SELECT lr.id, lr.start_date, lr.end_date, lr.days_count, lr.status, lr.created_at,
              u.full_name, d.name AS department_name, lt.name AS leave_type_name
       FROM leave_requests lr
       JOIN users u ON u.id = lr.user_id
       LEFT JOIN departments d ON d.id = u.department_id
       JOIN leave_types lt ON lt.id = lr.leave_type_id
       ${scopeCondition}
       ORDER BY lr.created_at DESC
       LIMIT 5`,
      scopeValue
    );

    // 8. ประกาศข่าวสารล่าสุด
    const recentAnnouncementsRes = await pool.query(
      `SELECT a.id, a.title, a.content, a.image_url, a.attachment_url, a.created_at, u.full_name AS posted_by_name
       FROM announcements a
       LEFT JOIN users u ON u.id = a.posted_by
       ORDER BY a.created_at DESC
       LIMIT 3`
    );

    res.json({
      total_employees: totalEmployees,
      total_departments: totalDepartments,
      leave_pending: pendingCount,
      leave_approved: approvedCount,
      leave_rejected: rejectedCount,
      leave_by_type: leaveByTypeRes.rows,
      leaves_today: leavesTodayRes.rows,
      my_balances: myBalancesRes.rows,
      recent_leaves: recentLeavesRes.rows,
      recent_announcements: recentAnnouncementsRes.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงข้อมูล Dashboard" });
  }
}

module.exports = { getSummary };
