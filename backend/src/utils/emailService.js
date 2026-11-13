const nodemailer = require("nodemailer");

const SMTP_USER = process.env.EMAIL_USER || "kittiphat.pr@ksu.ac.th";
const SMTP_PASS = process.env.EMAIL_PASS || "nzuh naji xbds dhia";
const WEBHOOK_URL = process.env.EMAIL_WEBHOOK_URL || "https://script.google.com/macros/s/AKfycbzXmFRXTMEqKQ4iSDY0azyzcZcmFEsUmg1lDjIgpvovVzf71mtFRF6N_Y03rG2Boqww/exec";
const APP_URL = process.env.APP_URL || "https://engineering-faculty-app-qhvi.onrender.com";

/**
 * ส่งอีเมลแบบ Asynchronous รองรับทั้ง Google Apps Script Webhook (HTTPS) และ Nodemailer SMTP
 */
async function sendMail({ to, subject, html, text }) {
  if (!to) return;
  const recipients = Array.isArray(to) ? to.join(", ") : to;

  // 1. ถ้ามีการตั้งค่า EMAIL_WEBHOOK_URL (Google Apps Script Web App) ให้ส่งผ่าน HTTPS ซึ่งไม่โดนบล็อกพอร์ตบน Render
  if (WEBHOOK_URL) {
    try {
      const response = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: recipients,
          subject,
          html,
          text: text || subject,
        }),
        signal: AbortSignal.timeout(8000),
      });
      const resData = await response.json().catch(() => ({}));
      console.log(`[Email Webhook] ส่งอีเมลไปยัง ${recipients} สำเร็จ:`, resData);
      return { success: true, method: "webhook" };
    } catch (err) {
      console.error(`[Email Webhook Error] ไม่สามารถส่งผ่าน Webhook ไปยัง ${recipients}:`, err.message);
    }
  }

  // 2. ถ้าไม่มี Webhook หรือ Webhook ล้มเหลว ให้ใช้ Nodemailer SMTP (Port 587 STARTTLS)
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false, // ใช้ STARTTLS
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
      connectionTimeout: 5000,
      greetingTimeout: 4000,
      socketTimeout: 5000,
    });

    const info = await transporter.sendMail({
      from: `"ระบบบริหารคณะวิศวกรรมศาสตร์" <${SMTP_USER}>`,
      to: recipients,
      subject,
      html,
      text: text || subject,
    });

    console.log(`[Email SMTP] ส่งอีเมลไปยัง ${recipients} สำเร็จ (Message ID: ${info.messageId})`);
    return { success: true, method: "smtp" };
  } catch (err) {
    console.error(`[Email SMTP Error] ไม่สามารถส่งไปยัง ${recipients}:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * จัดรูปแบบวันที่เป็นภาษาไทย (เช่น 15 พ.ย. 2569)
 */
function formatThaiDate(dateStr) {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    const months = [
      "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
      "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
    ];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`;
  } catch {
    return dateStr;
  }
}

/**
 * 1. แจ้งเตือนเมื่อมีคำขอลาใหม่ (ส่งถึงหัวหน้าสาขา / ผู้ดูแลระบบ)
 */
async function sendNewLeaveNotification({ to, applicantName, leaveType, startDate, endDate, daysCount, reason }) {
  const subject = `[แจ้งเตือนคำขอลาใหม่] ${applicantName} ยื่นขอ${leaveType}`;
  const html = `
  <div style="font-family: 'Sarabun', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; padding: 24px; color: #1e293b;">
    <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
      
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #881337 0%, #be123c 100%); padding: 28px 24px; text-align: center; color: white;">
        <h2 style="margin: 0; font-size: 20px; font-weight: bold; letter-spacing: -0.5px;">คณะวิศวกรรมศาสตร์และเทคโนโลยีอุตสาหกรรม</h2>
        <p style="margin: 6px 0 0; opacity: 0.9; font-size: 14px;">ระบบสารสนเทศเพื่อการบริหารจัดการบุคลากรและการลา</p>
      </div>

      <!-- Content -->
      <div style="padding: 28px 24px;">
        <div style="display: inline-block; background-color: #fef2f2; border: 1px solid #fee2e2; border-radius: 8px; padding: 6px 14px; margin-bottom: 16px;">
          <span style="color: #991b1b; font-weight: bold; font-size: 13px;">📝 มีคำขอลาใหม่รอการพิจารณา</span>
        </div>

        <h3 style="margin: 0 0 16px; color: #0f172a; font-size: 18px;">เรียน ผู้มีอำนาจอนุมัติ / ผู้ดูแลระบบ</h3>
        <p style="margin: 0 0 20px; color: #475569; font-size: 15px; line-height: 1.6;">
          มีการยื่นคำขอลาใหม่ในระบบจากบุคลากร รายละเอียดดังนี้ครับ:
        </p>

        <!-- Data Card -->
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin-bottom: 24px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; width: 35%;">ผู้ยื่นขอลา:</td>
              <td style="padding: 8px 0; font-weight: bold; color: #0f172a;">${applicantName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;">ประเภทการลา:</td>
              <td style="padding: 8px 0; font-weight: bold; color: #881337;">${leaveType}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;">ช่วงวันที่ลา:</td>
              <td style="padding: 8px 0; color: #0f172a;">${formatThaiDate(startDate)} - ${formatThaiDate(endDate)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;">จำนวนวันลา:</td>
              <td style="padding: 8px 0; font-weight: bold; color: #0f172a;">${daysCount} วัน</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; vertical-align: top;">เหตุผลการลา:</td>
              <td style="padding: 8px 0; color: #334155;">${reason || "-"}</td>
            </tr>
          </table>
        </div>

        <!-- Action Button -->
        <div style="text-align: center; margin: 28px 0 12px;">
          <a href="${APP_URL}/leave-requests" 
             style="display: inline-block; background: linear-gradient(135deg, #881337 0%, #be123c 100%); color: #ffffff; text-decoration: none; font-weight: bold; padding: 12px 32px; border-radius: 10px; font-size: 15px; box-shadow: 0 4px 12px rgba(136, 19, 55, 0.25);">
            เข้าสู่ระบบเพื่อพิจารณาอนุมัติ &rarr;
          </a>
        </div>
      </div>

      <!-- Footer -->
      <div style="background-color: #f1f5f9; padding: 16px 24px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
        อีเมลนี้เป็นการแจ้งเตือนอัตโนมัติจากระบบ กรุณาอย่าตอบกลับอีเมลนี้<br/>
        มหาวิทยาลัยกาฬสินธุ์ • คณะวิศวกรรมศาสตร์และเทคโนโลยีอุตสาหกรรม
      </div>

    </div>
  </div>
  `;

  return sendMail({ to, subject, html });
}

/**
 * 2. แจ้งเตือนเมื่อคำขอลาได้รับการอนุมัติ (ส่งถึงผู้ยื่นขอลา)
 */
async function sendLeaveApprovedNotification({ to, applicantName, approverName, leaveType, startDate, endDate, daysCount }) {
  const subject = `[อนุมัติแล้ว] คำขอ${leaveType}ของคุณได้รับการอนุมัติเรียบร้อยแล้ว`;
  const html = `
  <div style="font-family: 'Sarabun', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; padding: 24px; color: #1e293b;">
    <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
      
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 28px 24px; text-align: center; color: white;">
        <h2 style="margin: 0; font-size: 20px; font-weight: bold;">คำขอลาได้รับการอนุมัติแล้ว ✅</h2>
        <p style="margin: 6px 0 0; opacity: 0.95; font-size: 14px;">ระบบบริหารจัดการบุคลากรและการลา คณะวิศวกรรมศาสตร์</p>
      </div>

      <!-- Content -->
      <div style="padding: 28px 24px;">
        <h3 style="margin: 0 0 16px; color: #0f172a; font-size: 18px;">เรียน คุณ${applicantName}</h3>
        <p style="margin: 0 0 20px; color: #475569; font-size: 15px; line-height: 1.6;">
          คำขอยื่นลาของคุณได้รับการพิจารณาและ <strong style="color: #059669;">อนุมัติเรียบร้อยแล้ว</strong> โดย <strong style="color: #0f172a;">${approverName}</strong>
        </p>

        <!-- Data Card -->
        <div style="background-color: #f0fdf4; border: 1px solid #dcfce7; border-radius: 12px; padding: 18px; margin-bottom: 24px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 8px 0; color: #166534; width: 35%;">ประเภทการลา:</td>
              <td style="padding: 8px 0; font-weight: bold; color: #14532d;">${leaveType}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #166534;">ช่วงวันที่ลา:</td>
              <td style="padding: 8px 0; font-weight: bold; color: #14532d;">${formatThaiDate(startDate)} - ${formatThaiDate(endDate)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #166534;">จำนวนวัน:</td>
              <td style="padding: 8px 0; font-weight: bold; color: #14532d;">${daysCount} วัน</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #166534;">ผู้อนุมัติ:</td>
              <td style="padding: 8px 0; color: #14532d;">${approverName}</td>
            </tr>
          </table>
        </div>

        <!-- Action Button -->
        <div style="text-align: center; margin: 28px 0 12px;">
          <a href="${APP_URL}/leave-requests" 
             style="display: inline-block; background: #059669; color: #ffffff; text-decoration: none; font-weight: bold; padding: 12px 32px; border-radius: 10px; font-size: 15px; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.25);">
            ดูประวัติการลาในระบบ &rarr;
          </a>
        </div>
      </div>

      <!-- Footer -->
      <div style="background-color: #f1f5f9; padding: 16px 24px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
        มหาวิทยาลัยกาฬสินธุ์ • คณะวิศวกรรมศาสตร์และเทคโนโลยีอุตสาหกรรม
      </div>

    </div>
  </div>
  `;

  return sendMail({ to, subject, html });
}

/**
 * 3. แจ้งเตือนเมื่อคำขอลาไม่ได้รับการอนุมัติ (ส่งถึงผู้ยื่นขอลา)
 */
async function sendLeaveRejectedNotification({ to, applicantName, approverName, leaveType, startDate, endDate, daysCount, reason }) {
  const subject = `[แจ้งผลคำขอลา] คำขอ${leaveType}ของคุณไม่ได้รับการอนุมัติ`;
  const html = `
  <div style="font-family: 'Sarabun', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; padding: 24px; color: #1e293b;">
    <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
      
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #e11d48 0%, #be123c 100%); padding: 28px 24px; text-align: center; color: white;">
        <h2 style="margin: 0; font-size: 20px; font-weight: bold;">ผลการพิจารณาคำขอลา</h2>
        <p style="margin: 6px 0 0; opacity: 0.95; font-size: 14px;">ระบบบริหารจัดการบุคลากรและการลา คณะวิศวกรรมศาสตร์</p>
      </div>

      <!-- Content -->
      <div style="padding: 28px 24px;">
        <h3 style="margin: 0 0 16px; color: #0f172a; font-size: 18px;">เรียน คุณ${applicantName}</h3>
        <p style="margin: 0 0 20px; color: #475569; font-size: 15px; line-height: 1.6;">
          คำขอยื่นลาของคุณ <strong style="color: #e11d48;">ไม่ได้รับการอนุมัติ</strong> โดย <strong style="color: #0f172a;">${approverName}</strong>
        </p>

        <!-- Data Card -->
        <div style="background-color: #fff1f2; border: 1px solid #ffe4e6; border-radius: 12px; padding: 18px; margin-bottom: 24px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 8px 0; color: #9f1239; width: 35%;">ประเภทการลา:</td>
              <td style="padding: 8px 0; font-weight: bold; color: #881337;">${leaveType}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #9f1239;">ช่วงวันที่ลา:</td>
              <td style="padding: 8px 0; color: #881337;">${formatThaiDate(startDate)} - ${formatThaiDate(endDate)} (${daysCount} วัน)</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #9f1239; vertical-align: top;">เหตุผลที่ไม่อนุมัติ:</td>
              <td style="padding: 8px 0; font-weight: bold; color: #e11d48;">${reason || "-"}</td>
            </tr>
          </table>
        </div>

        <div style="text-align: center; margin: 28px 0 12px;">
          <a href="${APP_URL}/leave-requests" 
             style="display: inline-block; background: #475569; color: #ffffff; text-decoration: none; font-weight: bold; padding: 12px 32px; border-radius: 10px; font-size: 15px;">
            เข้าสู่ระบบ &rarr;
          </a>
        </div>
      </div>

      <!-- Footer -->
      <div style="background-color: #f1f5f9; padding: 16px 24px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
        มหาวิทยาลัยกาฬสินธุ์ • คณะวิศวกรรมศาสตร์และเทคโนโลยีอุตสาหกรรม
      </div>

    </div>
  </div>
  `;

  return sendMail({ to, subject, html });
}

module.exports = {
  sendMail,
  sendNewLeaveNotification,
  sendLeaveApprovedNotification,
  sendLeaveRejectedNotification,
};
