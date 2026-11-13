const nodemailer = require("nodemailer");

/**
 * สร้าง SMTP Transporter หากมีการตั้งค่า Environment Variables
 */
function getTransporter() {
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;

  if (!user || !pass) {
    return null;
  }

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "465", 10);

  // ถ้าเป็น Gmail สามารถใช้ service: 'gmail' ได้โดยตรง (ตัดช่องว่างใน App Password อัตโนมัติ)
  if (!host || host.includes("gmail.com") || user.endsWith("@gmail.com")) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: user.trim(),
        pass: pass.replace(/\s+/g, ""),
      },
    });
  }

  const secure = process.env.SMTP_SECURE === "false" || port === 587 ? false : true;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: user.trim(),
      pass: pass.trim(),
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
}

/**
 * ส่งอีเมลรหัสยืนยัน OTP สำหรับตั้งรหัสผ่านใหม่
 */
async function sendOtpEmail({ to, otp, userName }) {
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const from = process.env.SMTP_FROM || `"คณะวิศวกรรมศาสตร์ ม.กาฬสินธุ์" <${user || "noreply@ksu.ac.th"}>`;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="th">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>รหัสยืนยัน OTP สำหรับตั้งรหัสผ่านใหม่</title>
    </head>
    <body style="font-family: 'Sarabun', 'Segoe UI', Tahoma, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #1e293b;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
        <!-- Header -->
        <tr>
          <td style="background: linear-gradient(135deg, #991b1b 0%, #7f1d1d 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
            <h1 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px;">
              มหาวิทยาลัยกาฬสินธุ์
            </h1>
            <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.9; font-weight: 500;">
              คณะวิศวกรรมศาสตร์และเทคโนโลยีอุตสาหกรรม
            </p>
            <div style="display: inline-block; margin-top: 12px; background: rgba(255,255,255,0.18); padding: 4px 14px; border-radius: 20px; font-size: 11px; font-weight: 600;">
              ระบบบริหารจัดการบุคลากรและการลางานออนไลน์
            </div>
          </td>
        </tr>

        <!-- Content Body -->
        <tr>
          <td style="padding: 32px 28px;">
            <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 700; color: #0f172a;">
              รหัส OTP สำหรับตั้งรหัสผ่านใหม่
            </h2>
            <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #475569;">
              เรียน <strong>${userName || "บุคลากร"}</strong>,
            </p>
            <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #475569;">
              ท่านได้ทำการส่งคำขอตั้งรหัสผ่านใหม่สำหรับเข้าสู่ระบบ กรุณานำรหัสยืนยัน <strong>OTP 6 หลัก</strong> ด้านล่างนี้ไปกรอกในหน้าเว็บไซต์เพื่อยืนยันตัวตน:
            </p>

            <!-- OTP Box -->
            <div style="background-color: #fef2f2; border: 2px dashed #dc2626; border-radius: 14px; padding: 22px; text-align: center; margin: 24px 0;">
              <span style="font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 900; letter-spacing: 10px; color: #991b1b; display: inline-block; padding-left: 10px;">
                ${otp}
              </span>
            </div>

            <!-- Notice / Timer -->
            <div style="background-color: #f8fafc; border-left: 4px solid #991b1b; padding: 12px 16px; border-radius: 4px; margin-bottom: 24px;">
              <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.5;">
                ⏱️ <strong>รหัสนี้มีอายุการใช้งาน 10 นาที</strong> นับจากเวลาที่ส่งคำขอ<br>
                🔒 เพื่อความปลอดภัยสูงสุด กรุณาอย่าเปิดเผยรหัส OTP นี้แก่บุคคลอื่น
              </p>
            </div>

            <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #94a3b8;">
              หากท่านไม่ได้เป็นผู้ส่งคำขอตั้งรหัสผ่านใหม่นี้ กรุณาเพิกเฉยต่ออีเมลฉบับนี้ บัญชีและรหัสผ่านเดิมของท่านจะยังคงปลอดภัย ไม่มีการเปลี่ยนแปลงใดๆ
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center; font-size: 11px; color: #64748b;">
            <p style="margin: 0 0 4px 0; font-weight: 600;">
              คณะวิศวกรรมศาสตร์และเทคโนโลยีอุตสาหกรรม มหาวิทยาลัยกาฬสินธุ์
            </p>
            <p style="margin: 0; color: #94a3b8;">
              Kalasin University • Faculty of Engineering and Industrial Technology
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const transporter = getTransporter();

  if (!transporter) {
    console.error(`[OTP Email Service] ❌ ยังไม่ได้ตั้งค่า SMTP_USER และ SMTP_PASS ใน Environment Variables`);
    return {
      sent: false,
      reason: "SMTP_NOT_CONFIGURED",
    };
  }

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject: `[ม.กาฬสินธุ์] รหัส OTP สำหรับตั้งรหัสผ่านใหม่: ${otp}`,
      html: htmlContent,
    });

    console.log(`[OTP Email Service] ✅ ส่งอีเมล OTP ไปยัง ${to} สำเร็จ (Message ID: ${info.messageId})`);
    return {
      sent: true,
      messageId: info.messageId,
    };
  } catch (error) {
    console.error(`[OTP Email Service] ⚠️ ไม่สามารถส่งอีเมลผ่าน SMTP ได้:`, error.message);
    return {
      sent: false,
      reason: error.message,
    };
  }
}

module.exports = {
  sendOtpEmail,
};
