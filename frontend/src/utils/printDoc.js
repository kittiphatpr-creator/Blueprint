import { formatThaiDate, formatThaiDateTime } from "./dateUtils";

/**
 * ฟังก์ชันสร้างและสั่งพิมพ์เอกสารทางการ A4 ในหน้าต่างแยก (100% Clean Print & PDF ไม่ติดพื้นหลัง ไม่ขาว)
 */
export function printOfficialDocument(htmlBody, title = "เอกสารทางการ_มหาวิทยาลัยกาฬสินธุ์") {
  const printWindow = window.open("", "_blank", "width=900,height=1100");
  if (!printWindow) {
    alert("กรุณาอนุญาตให้เบราว์เซอร์เปิด Pop-up เพื่อพิมพ์เอกสารทางการ");
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="th">
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700;800&display=swap" rel="stylesheet">
      <style>
        @page {
          size: A4 portrait;
          margin: 12mm 15mm 12mm 15mm;
        }
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        body {
          font-family: 'Sarabun', 'TH Sarabun New', 'Segoe UI', Tahoma, sans-serif;
          font-size: 13.5pt;
          line-height: 1.55;
          color: #000000;
          background: #ffffff;
          padding: 10px 20px;
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #000000;
          padding-bottom: 10px;
          margin-bottom: 14px;
        }
        .header h1 {
          font-size: 18pt;
          font-weight: 800;
          margin-bottom: 3px;
        }
        .header h2 {
          font-size: 13pt;
          font-weight: 600;
        }
        .badge {
          display: inline-block;
          margin-top: 8px;
          padding: 2px 14px;
          border: 1px solid #000000;
          border-radius: 4px;
          font-weight: bold;
          font-size: 12.5pt;
        }
        .meta-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 12px;
          font-size: 12.5pt;
        }
        .subject-row {
          margin-bottom: 12px;
          font-size: 13pt;
        }
        .content-para {
          text-align: justify;
          text-indent: 2.5em;
          margin-bottom: 10px;
          line-height: 1.6;
        }
        .table-balance {
          width: 100%;
          border-collapse: collapse;
          margin: 14px 0;
          font-size: 12pt;
        }
        .table-balance th, .table-balance td {
          border: 1px solid #000000;
          padding: 5px 8px;
          text-align: center;
        }
        .table-balance th {
          background-color: #f4f4f4;
          font-weight: bold;
        }
        .signature-row {
          margin-top: 18px;
          display: flex;
          justify-content: flex-end;
          text-align: center;
        }
        .signature-box {
          width: 250px;
          font-size: 12.5pt;
        }
        .approval-grid {
          display: flex;
          gap: 12px;
          margin-top: 16px;
          padding-top: 12px;
          border-top: 1.5px solid #000000;
        }
        .approval-col {
          flex: 1;
          border: 1px solid #000000;
          padding: 10px;
          border-radius: 4px;
          font-size: 11.5pt;
          text-align: center;
        }
        .approval-col p {
          margin-bottom: 4px;
        }
        .footer-stamp {
          margin-top: 18px;
          text-align: center;
          font-size: 9pt;
          color: #555555;
          border-top: 1px solid #cccccc;
          padding-top: 4px;
        }
        @media print {
          body {
            padding: 0;
          }
        }
      </style>
    </head>
    <body>
      ${htmlBody}
      <script>
        setTimeout(function() {
          window.print();
        }, 300);
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

/**
 * สร้าง HTML สำหรับใบลาทางการของมหาวิทยาลัยกาฬสินธุ์ (ตรงตามแบบฟอร์มทางการของคณะวิศวะ 100%)
 * รองรับ: ลาป่วย, ลากิจส่วนตัว, ลาพักผ่อน (ลาพักร้อน)
 */
export function generateLeaveRequestHTML(request, user) {
  const reqUser = request.user || user || {};
  const isApproved = request.status === "approved";
  const typeName = (request.leave_type_name || "").toLowerCase();
  const isVacation = typeName.includes("พักผ่อน") || typeName.includes("พักร้อน");
  const isSick = typeName.includes("ป่วย");
  const isPersonal = typeName.includes("กิจ");

  const deptName = reqUser.department_name || request.department_name || "ภาควิชาวิศวกรรมคอมพิวเตอร์";
  const positionTitle = reqUser.position || request.position || "อาจารย์";
  const empCode = reqUser.employee_code || request.employee_code || "-";
  const fullName = reqUser.full_name || request.full_name || "บุคลากร";
  const phone = reqUser.phone || request.phone || "081-234-5678";
  const email = reqUser.email || request.email || "-";
  const approver = request.approver_name || "รศ.ดร.วิศวกิจ นวัตกรรม";

  // Role title in official Thai gov terms
  let roleTitle = "พนักงานมหาวิทยาลัย";
  if (reqUser.role === "admin" || reqUser.role === "head") roleTitle = "ข้าราชการ / พนักงานมหาวิทยาลัย (สายวิชาการ)";
  else if (reqUser.role === "staff") roleTitle = "พนักงานมหาวิทยาลัย (สายสนับสนุนวิชาการ)";
  else roleTitle = "พนักงานมหาวิทยาลัย (สายวิชาการ)";

  if (isVacation) {
    // ==========================================
    // ๑. แบบใบลาพักผ่อน มหาวิทยาลัยกาฬสินธุ์ (ทางการ)
    // ==========================================
    return `
      <div style="text-align: center; margin-bottom: 12px;">
        <img src="/logo.png" style="width: 55px; height: 55px; object-contain; margin-bottom: 4px;" alt="มกส." />
        <h1 style="font-size: 17pt; font-weight: bold; margin: 0; line-height: 1.3;">แบบใบลาพักผ่อน</h1>
        <h2 style="font-size: 13.5pt; font-weight: bold; margin: 0; line-height: 1.3;">มหาวิทยาลัยกาฬสินธุ์</h2>
        <p style="font-size: 10.5pt; color: #333; margin-top: 2px;">คณะวิศวกรรมศาสตร์และเทคโนโลยีอุตสาหกรรม</p>
      </div>

      <div style="display: flex; justify-content: space-between; font-size: 12pt; margin-bottom: 8px;">
        <div><strong>เลขที่คำขอ:</strong> ENG-LV-${String(request.id).padStart(5, "0")}</div>
        <div style="text-align: right;">
          วันที่ <strong>${formatThaiDate(request.created_at || new Date())}</strong>
        </div>
      </div>

      <div style="font-size: 12.5pt; margin-bottom: 10px; line-height: 1.5;">
        <p><strong>เรื่อง:</strong> ขออนุญาตลาพักผ่อน</p>
        <p><strong>เรียน:</strong> อธิการบดีมหาวิทยาลัยกาฬสินธุ์ (ผ่านคณบดีคณะวิศวกรรมศาสตร์และเทคโนโลยีอุตสาหกรรม)</p>
      </div>

      <div style="text-indent: 2.5em; text-align: justify; font-size: 12.5pt; line-height: 1.75; margin-bottom: 8px;">
        ข้าพเจ้า <strong>${fullName}</strong> ประเภทบุคลากร <strong>${roleTitle}</strong> 
        รหัสประจำตัว <strong>${empCode}</strong> ตำแหน่ง <strong>${positionTitle}</strong> 
        สังกัด <strong>${deptName} คณะวิศวกรรมศาสตร์และเทคโนโลยีอุตสาหกรรม</strong>
        มีวันลาพักผ่อนสะสม <strong>${request.accumulated_days || 0}</strong> วันทำการ 
        มีสิทธิ์ลาพักผ่อนประจำปีนี้อีก <strong>10</strong> วันทำการ 
        รวมเป็น <strong>${(request.accumulated_days || 0) + 10}</strong> วันทำการ
      </div>

      <div style="text-indent: 2.5em; text-align: justify; font-size: 12.5pt; line-height: 1.75; margin-bottom: 8px;">
        ขอลาพักผ่อนตั้งแต่วันที่ <strong>${formatThaiDate(request.start_date)}</strong> ถึงวันที่ 
        <strong>${formatThaiDate(request.end_date)}</strong> มีกำหนด <strong>${request.days_count} วันทำการ</strong> 
        เนื่องจาก <strong>${request.reason || "พักผ่อนประจำปี"}</strong>
      </div>

      <div style="text-indent: 2.5em; text-align: justify; font-size: 12.5pt; line-height: 1.75; margin-bottom: 12px;">
        ในระหว่างลาจะติดต่อข้าพเจ้าได้ที่ <strong>คณะวิศวกรรมศาสตร์ มหาวิทยาลัยกาฬสินธุ์</strong> 
        เบอร์โทรศัพท์ <strong>${phone}</strong> หรืออีเมล <strong>${email}</strong>
      </div>

      <div style="display: flex; gap: 14px; margin-bottom: 12px;">
        <!-- สถิติการลาพักผ่อน -->
        <div style="flex: 1.1; border: 1px solid #000; padding: 6px 10px; border-radius: 4px; font-size: 10.5pt;">
          <p style="font-weight: bold; text-align: center; margin-bottom: 4px; border-bottom: 1px solid #000; padding-bottom: 2px;">
            สถิติการลาพักผ่อนในปีงบประมาณนี้
          </p>
          <table style="width: 100%; border-collapse: collapse; text-align: center; font-size: 10.5pt;">
            <tr>
              <th style="border: 1px solid #000; padding: 3px;">รายการ</th>
              <th style="border: 1px solid #000; padding: 3px;">จำนวนครั้ง</th>
              <th style="border: 1px solid #000; padding: 3px;">จำนวนวัน</th>
            </tr>
            <tr>
              <td style="border: 1px solid #000; text-align: left; padding: 2px 6px;">ลามาแล้ว</td>
              <td style="border: 1px solid #000;">${request.prev_count || "-"}</td>
              <td style="border: 1px solid #000;">${request.used_days || 0}</td>
            </tr>
            <tr style="background-color: #f9f9f9; font-weight: bold;">
              <td style="border: 1px solid #000; text-align: left; padding: 2px 6px;">ลาครั้งนี้</td>
              <td style="border: 1px solid #000;">1</td>
              <td style="border: 1px solid #000;">${request.days_count}</td>
            </tr>
            <tr>
              <td style="border: 1px solid #000; text-align: left; padding: 2px 6px;">รวมเป็น</td>
              <td style="border: 1px solid #000;">${(request.prev_count || 0) + 1}</td>
              <td style="border: 1px solid #000;">${(Number(request.used_days) || 0) + Number(request.days_count)}</td>
            </tr>
          </table>
        </div>

        <!-- ช่องลงชื่อผู้ขอลา -->
        <div style="flex: 0.9; text-align: center; display: flex; flex-direction: column; justify-content: center; font-size: 11pt;">
          <p style="margin-bottom: 20px;">ขอแสดงความนับถือ</p>
          <p style="border-bottom: 1px dotted #000; width: 75%; margin: 0 auto; padding-bottom: 2px; font-weight: bold;">
            ( ${fullName} )
          </p>
          <p style="margin-top: 3px; font-size: 10pt;">${positionTitle}</p>
          <p style="font-size: 9.5pt; color: #555;">วันที่ ${formatThaiDate(request.created_at || new Date())}</p>
        </div>
      </div>

      <!-- ส่วนการพิจารณาอนุมัติ 3 ลำดับตามฟอร์ม มกส. -->
      <div style="display: grid; grid-template-columns: 1fr 1fr 1.1fr; gap: 8px; border-top: 1.5px solid #000; padding-top: 10px; font-size: 10pt;">
        <!-- ๑. ความเห็นผู้บังคับบัญชาชั้นต้น -->
        <div style="border: 1px solid #000; padding: 6px; border-radius: 4px; text-align: center;">
          <p style="font-weight: bold; margin-bottom: 4px;">๑. ความเห็นผู้บังคับบัญชาชั้นต้น</p>
          <p style="text-align: left; font-size: 9.5pt; margin-bottom: 14px;">[✓] เห็นควรอนุญาต<br/>[ ] ไม่เห็นควรอนุญาต</p>
          <p style="border-bottom: 1px dotted #000; width: 85%; margin: 0 auto 2px auto; font-weight: bold;">( ${approver} )</p>
          <p style="font-size: 9pt;">หัวหน้าสาขาวิชา</p>
          <p style="font-size: 8.5pt; color: #666;">วันที่ ${formatThaiDate(request.approved_at || request.created_at)}</p>
        </div>

        <!-- ๒. ผู้ตรวจสอบวันลา -->
        <div style="border: 1px solid #000; padding: 6px; border-radius: 4px; text-align: center;">
          <p style="font-weight: bold; margin-bottom: 4px;">๒. ผู้ตรวจสอบสิทธิ์วันลา</p>
          <p style="text-align: left; font-size: 9.5pt; margin-bottom: 14px;">[✓] ตรวจสอบสิทธิ์แล้ว<br/>วันลาถูกต้องตามระเบียบ</p>
          <p style="border-bottom: 1px dotted #000; width: 85%; margin: 0 auto 2px auto; font-weight: bold;">( นางสาวสมศรี จัดการงาน )</p>
          <p style="font-size: 9pt;">เจ้าหน้าที่บริหารงานบุคคล</p>
          <p style="font-size: 8.5pt; color: #666;">วันที่ ${formatThaiDate(request.created_at || new Date())}</p>
        </div>

        <!-- ๓. คำสั่งผู้มีอำนาจ -->
        <div style="border: 1px solid #000; padding: 6px; border-radius: 4px; text-align: center;">
          <p style="font-weight: bold; margin-bottom: 4px;">๓. คำสั่งผู้มีอำนาจพิจารณา</p>
          <p style="text-align: left; font-size: 10pt; font-weight: bold; margin-bottom: 8px;">
            [${isApproved ? "✓" : " "}] อนุญาต &nbsp;&nbsp;&nbsp; [${!isApproved && request.status === "rejected" ? "✓" : " "}] ไม่อนุมัติ
          </p>
          <p style="border-bottom: 1px dotted #000; width: 85%; margin: 0 auto 2px auto; font-weight: bold;">( คณบดีคณะวิศวกรรมศาสตร์ฯ )</p>
          <p style="font-size: 9pt;">ปฏิบัติราชการแทนอธิการบดี มกส.</p>
          <p style="font-size: 8.5pt; color: #666;">${request.approved_at ? "อนุมัติเมื่อ: " + formatThaiDateTime(request.approved_at) : "ลงนามอิเล็กทรอนิกส์"}</p>
        </div>
      </div>

      <div style="text-align: center; font-size: 8pt; color: #666; margin-top: 10px; border-top: 1px solid #ccc; padding-top: 3px;">
        เอกสารนี้สร้างขึ้นโดยระบบสารสนเทศบุคลากรและการลางานออนไลน์ มหาวิทยาลัยกาฬสินธุ์ (Electronic Leave System)
      </div>
    `;
  } else {
    // ==========================================
    // ๒. แบบใบลาป่วย / ลาคลอดบุตร / ลากิจส่วนตัว มหาวิทยาลัยกาฬสินธุ์ (ทางการ)
    // ==========================================
    return `
      <div style="text-align: center; margin-bottom: 12px;">
        <img src="/logo.png" style="width: 55px; height: 55px; object-contain; margin-bottom: 4px;" alt="มกส." />
        <h1 style="font-size: 16.5pt; font-weight: bold; margin: 0; line-height: 1.3;">แบบใบลาป่วย / ลาคลอดบุตร / ลากิจส่วนตัว</h1>
        <h2 style="font-size: 13.5pt; font-weight: bold; margin: 0; line-height: 1.3;">มหาวิทยาลัยกาฬสินธุ์</h2>
        <p style="font-size: 10.5pt; color: #333; margin-top: 2px;">คณะวิศวกรรมศาสตร์และเทคโนโลยีอุตสาหกรรม</p>
      </div>

      <div style="display: flex; justify-content: space-between; font-size: 12pt; margin-bottom: 8px;">
        <div><strong>เลขที่คำขอ:</strong> ENG-LV-${String(request.id).padStart(5, "0")}</div>
        <div style="text-align: right;">
          วันที่ <strong>${formatThaiDate(request.created_at || new Date())}</strong>
        </div>
      </div>

      <div style="font-size: 12.5pt; margin-bottom: 10px; line-height: 1.5;">
        <p><strong>เรื่อง:</strong> ขอลา &nbsp;&nbsp; 
          [${isSick ? "✓" : " "}] <strong>ลาป่วย</strong> &nbsp;&nbsp;&nbsp;&nbsp;
          [${isPersonal ? "✓" : " "}] <strong>ลากิจส่วนตัว</strong> &nbsp;&nbsp;&nbsp;&nbsp;
          [ ] <strong>ลาคลอดบุตร</strong>
        </p>
        <p><strong>เรียน:</strong> อธิการบดีมหาวิทยาลัยกาฬสินธุ์ (ผ่านคณบดีคณะวิศวกรรมศาสตร์และเทคโนโลยีอุตสาหกรรม)</p>
      </div>

      <div style="text-indent: 2.5em; text-align: justify; font-size: 12.5pt; line-height: 1.75; margin-bottom: 8px;">
        ข้าพเจ้า <strong>${fullName}</strong> เป็นบุคลากรประเภท <strong>${roleTitle}</strong> 
        รหัสประจำตัว <strong>${empCode}</strong> ตำแหน่ง <strong>${positionTitle}</strong> 
        สังกัด <strong>${deptName} คณะวิศวกรรมศาสตร์และเทคโนโลยีอุตสาหกรรม</strong>
      </div>

      <div style="text-indent: 2.5em; text-align: justify; font-size: 12.5pt; line-height: 1.75; margin-bottom: 8px;">
        มีความประสงค์ขอ <strong>${request.leave_type_name}</strong> เนื่องจาก <strong>${request.reason || "มีอาการป่วย/มีภารกิจจำเป็นส่วนตัว"}</strong>
        ตั้งแต่วันที่ <strong>${formatThaiDate(request.start_date)}</strong> ถึงวันที่ 
        <strong>${formatThaiDate(request.end_date)}</strong> มีกำหนด <strong>${request.days_count} วันทำการ</strong>
      </div>

      <div style="text-indent: 2.5em; text-align: justify; font-size: 12.5pt; line-height: 1.75; margin-bottom: 12px;">
        ในระหว่างลาจะติดต่อข้าพเจ้าได้ที่ <strong>คณะวิศวกรรมศาสตร์ มหาวิทยาลัยกาฬสินธุ์</strong> 
        เบอร์โทรศัพท์ <strong>${phone}</strong> หรืออีเมล <strong>${email}</strong>
      </div>

      <div style="display: flex; gap: 14px; margin-bottom: 12px;">
        <!-- สถิติการลาป่วย/ลากิจ -->
        <div style="flex: 1.1; border: 1px solid #000; padding: 6px 10px; border-radius: 4px; font-size: 10.5pt;">
          <p style="font-weight: bold; text-align: center; margin-bottom: 4px; border-bottom: 1px solid #000; padding-bottom: 2px;">
            สถิติการลาในปีงบประมาณนี้
          </p>
          <table style="width: 100%; border-collapse: collapse; text-align: center; font-size: 10.5pt;">
            <tr>
              <th style="border: 1px solid #000; padding: 3px;">ประเภทการลา</th>
              <th style="border: 1px solid #000; padding: 3px;">ลามาแล้ว (วัน)</th>
              <th style="border: 1px solid #000; padding: 3px;">ลาครั้งนี้ (วัน)</th>
              <th style="border: 1px solid #000; padding: 3px;">รวมเป็น (วัน)</th>
            </tr>
            <tr ${isSick ? 'style="font-weight: bold; background-color: #f9f9f9;"' : ''}>
              <td style="border: 1px solid #000; text-align: left; padding: 2px 6px;">ลาป่วย (สิทธิ์ ๓๐ วัน)</td>
              <td style="border: 1px solid #000;">${isSick ? (request.used_days || 0) : "-"}</td>
              <td style="border: 1px solid #000;">${isSick ? request.days_count : "-"}</td>
              <td style="border: 1px solid #000;">${isSick ? (Number(request.used_days || 0) + Number(request.days_count)) : "-"}</td>
            </tr>
            <tr ${isPersonal ? 'style="font-weight: bold; background-color: #f9f9f9;"' : ''}>
              <td style="border: 1px solid #000; text-align: left; padding: 2px 6px;">ลากิจส่วนตัว (สิทธิ์ ๑๐ วัน)</td>
              <td style="border: 1px solid #000;">${isPersonal ? (request.used_days || 0) : "-"}</td>
              <td style="border: 1px solid #000;">${isPersonal ? request.days_count : "-"}</td>
              <td style="border: 1px solid #000;">${isPersonal ? (Number(request.used_days || 0) + Number(request.days_count)) : "-"}</td>
            </tr>
          </table>
        </div>

        <!-- ช่องลงชื่อผู้ขอลา -->
        <div style="flex: 0.9; text-align: center; display: flex; flex-direction: column; justify-content: center; font-size: 11pt;">
          <p style="margin-bottom: 20px;">ขอแสดงความนับถือ</p>
          <p style="border-bottom: 1px dotted #000; width: 75%; margin: 0 auto; padding-bottom: 2px; font-weight: bold;">
            ( ${fullName} )
          </p>
          <p style="margin-top: 3px; font-size: 10pt;">${positionTitle}</p>
          <p style="font-size: 9.5pt; color: #555;">วันที่ ${formatThaiDate(request.created_at || new Date())}</p>
        </div>
      </div>

      <!-- ส่วนการพิจารณาอนุมัติ 3 ลำดับตามฟอร์ม มกส. -->
      <div style="display: grid; grid-template-columns: 1fr 1fr 1.1fr; gap: 8px; border-top: 1.5px solid #000; padding-top: 10px; font-size: 10pt;">
        <!-- ๑. ความเห็นผู้บังคับบัญชาชั้นต้น -->
        <div style="border: 1px solid #000; padding: 6px; border-radius: 4px; text-align: center;">
          <p style="font-weight: bold; margin-bottom: 4px;">๑. ความเห็นผู้บังคับบัญชาชั้นต้น</p>
          <p style="text-align: left; font-size: 9.5pt; margin-bottom: 14px;">[✓] เห็นควรอนุญาต<br/>[ ] ไม่เห็นควรอนุญาต</p>
          <p style="border-bottom: 1px dotted #000; width: 85%; margin: 0 auto 2px auto; font-weight: bold;">( ${approver} )</p>
          <p style="font-size: 9pt;">หัวหน้าสาขาวิชา</p>
          <p style="font-size: 8.5pt; color: #666;">วันที่ ${formatThaiDate(request.approved_at || request.created_at)}</p>
        </div>

        <!-- ๒. ผู้ตรวจสอบวันลา -->
        <div style="border: 1px solid #000; padding: 6px; border-radius: 4px; text-align: center;">
          <p style="font-weight: bold; margin-bottom: 4px;">๒. ผู้ตรวจสอบสิทธิ์วันลา</p>
          <p style="text-align: left; font-size: 9.5pt; margin-bottom: 14px;">[✓] ตรวจสอบสิทธิ์แล้ว<br/>วันลาถูกต้องตามระเบียบ</p>
          <p style="border-bottom: 1px dotted #000; width: 85%; margin: 0 auto 2px auto; font-weight: bold;">( นางสาวสมศรี จัดการงาน )</p>
          <p style="font-size: 9pt;">เจ้าหน้าที่บริหารงานบุคคล</p>
          <p style="font-size: 8.5pt; color: #666;">วันที่ ${formatThaiDate(request.created_at || new Date())}</p>
        </div>

        <!-- ๓. คำสั่งผู้มีอำนาจ -->
        <div style="border: 1px solid #000; padding: 6px; border-radius: 4px; text-align: center;">
          <p style="font-weight: bold; margin-bottom: 4px;">๓. คำสั่งผู้มีอำนาจพิจารณา</p>
          <p style="text-align: left; font-size: 10pt; font-weight: bold; margin-bottom: 8px;">
            [${isApproved ? "✓" : " "}] อนุญาต &nbsp;&nbsp;&nbsp; [${!isApproved && request.status === "rejected" ? "✓" : " "}] ไม่อนุมัติ
          </p>
          <p style="border-bottom: 1px dotted #000; width: 85%; margin: 0 auto 2px auto; font-weight: bold;">( คณบดีคณะวิศวกรรมศาสตร์ฯ )</p>
          <p style="font-size: 9pt;">ปฏิบัติราชการแทนอธิการบดี มกส.</p>
          <p style="font-size: 8.5pt; color: #666;">${request.approved_at ? "อนุมัติเมื่อ: " + formatThaiDateTime(request.approved_at) : "ลงนามอิเล็กทรอนิกส์"}</p>
        </div>
      </div>

      <div style="text-align: center; font-size: 8pt; color: #666; margin-top: 10px; border-top: 1px solid #ccc; padding-top: 3px;">
        เอกสารนี้สร้างขึ้นโดยระบบสารสนเทศบุคลากรและการลางานออนไลน์ มหาวิทยาลัยกาฬสินธุ์ (Electronic Leave System)
      </div>
    `;
  }
}

/**
 * สร้าง HTML สำหรับแบบฟอร์มเปล่าทางการ / เอกสารคณะ (Templates)
 */
export function generateTemplateHTML(doc, user) {
  const title = doc.title || "";
  const category = doc.category || "";

  if (title.includes("เดินทาง") || title.includes("ประชุม")) {
    return `
      <div class="header">
        <h1>บันทึกข้อความ</h1>
        <h2>คณะวิศวกรรมศาสตร์และเทคโนโลยีอุตสาหกรรม มหาวิทยาลัยกาฬสินธุ์</h2>
        <div class="badge">แบบขออนุมัติเดินทางไปปฏิบัติงานและประชุมวิชาการ</div>
      </div>

      <div class="meta-row">
        <div>
          <p><strong>หน่วยงาน:</strong> ภาควิชาวิศวกรรมคอมพิวเตอร์ / สำนักงานคณบดี</p>
          <p><strong>เรื่อง:</strong> ขออนุมัติเดินทางไปปฏิบัติงาน ประชุมวิชาการ และนำเสนอผลงานวิจัย</p>
        </div>
        <div style="text-align: right;">
          <p><strong>วันที่:</strong> ${formatThaiDate(new Date())}</p>
          <p><strong>เรียน:</strong> คณบดีคณะวิศวกรรมศาสตร์ฯ</p>
        </div>
      </div>

      <div class="content-para">
        ด้วยข้าพเจ้า <strong>${user?.full_name || "...................................................."}</strong> 
        ตำแหน่ง <strong>${user?.position || "อาจารย์ประจำสาขาวิชา"}</strong> 
        สังกัด <strong>${user?.department_name || "คณะวิศวกรรมศาสตร์และเทคโนโลยีอุตสาหกรรม"}</strong> 
        มีความประสงค์จะเดินทางไปปฏิบัติงาน/ประชุมวิชาการ ณ ............................................................................ 
        ระหว่างวันที่ ............................................. ถึงวันที่ ............................................. รวมระยะเวลา ................... วัน
      </div>

      <div class="content-para">
        ในการนี้ ข้าพเจ้าได้ดำเนินการจัดตารางสอนชดเชยและมอบหมายงานในหน้าที่ให้อาจารย์ ................................................................ 
        ปฏิบัติหน้าที่แทนเรียบร้อยแล้ว โดยไม่กระทบต่อการจัดการเรียนการสอนและภารกิจของทางราชการ
      </div>

      <div class="signature-row">
        <div class="signature-box">
          <p style="border-bottom: 1px dotted #000; padding-bottom: 4px; font-weight: bold;">
            ( ${user?.full_name || "...................................................."} )
          </p>
          <p style="margin-top: 3px; font-size: 11pt;">ผู้ขออนุมัติ</p>
          <p style="font-size: 10pt; color: #444;">วันที่ ${formatThaiDate(new Date())}</p>
        </div>
      </div>

      <div class="approval-grid">
        <div class="approval-col">
          <p style="font-weight: bold; margin-bottom: 8px;">ความเห็นของหัวหน้าสาขาวิชา</p>
          <p style="margin: 20px 0 4px 0;">( ................................................................ )</p>
          <p style="font-size: 10pt; color: #555;">หัวหน้าสาขาวิชา</p>
        </div>
        <div class="approval-col">
          <p style="font-weight: bold; margin-bottom: 8px;">คำสั่งคณบดีคณะวิศวกรรมศาสตร์ฯ</p>
          <p style="margin: 20px 0 4px 0;">( ................................................................ )</p>
          <p style="font-size: 10pt; color: #555;">คณบดีคณะวิศวกรรมศาสตร์ฯ</p>
        </div>
      </div>

      <div class="footer-stamp">
        เอกสารอิเล็กทรอนิกส์ คณะวิศวกรรมศาสตร์และเทคโนโลยีอุตสาหกรรม มหาวิทยาลัยกาฬสินธุ์
      </div>
    `;
  }

  if (title.includes("ลา") || title.includes("พักผ่อน") || title.includes("ป่วย")) {
    return `
      <div class="header">
        <h1>มหาวิทยาลัยกาฬสินธุ์</h1>
        <h2>คณะวิศวกรรมศาสตร์และเทคโนโลยีอุตสาหกรรม</h2>
        <div class="badge">แบบใบลา (ลาป่วย • ลากิจส่วนตัว • ลาพักผ่อน)</div>
      </div>

      <div class="meta-row">
        <div>
          <p><strong>เขียนที่:</strong> มหาวิทยาลัยกาฬสินธุ์</p>
        </div>
        <div style="text-align: right;">
          <p><strong>วันที่:</strong> ${formatThaiDate(new Date())}</p>
        </div>
      </div>

      <div class="subject-row">
        <p><strong>เรื่อง:</strong> ขออนุญาตลา ( [ ] ลาป่วย &nbsp;&nbsp; [ ] ลากิจส่วนตัว &nbsp;&nbsp; [ ] ลาพักผ่อน )</p>
        <p style="margin-top: 3px;"><strong>เรียน:</strong> คณบดีคณะวิศวกรรมศาสตร์และเทคโนโลยีอุตสาหกรรม (ผ่านหัวหน้าสาขาวิชา)</p>
      </div>

      <div class="content-para">
        ข้าพเจ้า <strong>${user?.full_name || "...................................................."}</strong> 
        รหัสประจำตัว <strong>${user?.employee_code || "......................."}</strong> 
        ตำแหน่ง <strong>${user?.position || "อาจารย์ประจำสาขาวิชา"}</strong> 
        สังกัด <strong>${user?.department_name || "คณะวิศวกรรมศาสตร์และเทคโนโลยีอุตสาหกรรม"}</strong>
      </div>

      <div class="content-para">
        มีความประสงค์ขอลาเนื่องจาก .................................................................................................................................... 
        ตั้งแต่วันที่ ........................................ ถึงวันที่ ........................................ มีกำหนด ........... วันทำการ
      </div>

      <div class="content-para">
        ในระหว่างการลานี้ ข้าพเจ้าสามารถติดต่อได้ที่เบอร์โทรศัพท์ <strong>${user?.phone || "...................................................."}</strong> 
        อีเมล <strong>${user?.email || "................................@ksu.ac.th"}</strong>
      </div>

      <table class="table-balance">
        <thead>
          <tr>
            <th>ประเภทการลา</th>
            <th>สิทธิ์วันลาปีนี้</th>
            <th>ลามาแล้ว (วัน)</th>
            <th>ลาครั้งนี้ (วัน)</th>
            <th>คงเหลือ (วัน)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="font-weight: bold;">ลาพักผ่อนประจำปี</td>
            <td>๑๐</td>
            <td>........</td>
            <td>........</td>
            <td>........</td>
          </tr>
          <tr>
            <td style="font-weight: bold;">ลาป่วย / ลากิจ</td>
            <td>๓๐ / ๑๐</td>
            <td>........</td>
            <td>........</td>
            <td>........</td>
          </tr>
        </tbody>
      </table>

      <div class="approval-grid">
        <div class="approval-col">
          <p style="font-weight: bold; margin-bottom: 6px;">ความเห็นของหัวหน้าสาขาวิชา</p>
          <p style="font-size: 11pt; margin-bottom: 12px;">[ ] เห็นควรอนุญาต &nbsp;&nbsp; [ ] ไม่เห็นควรอนุญาต</p>
          <p style="font-weight: bold;">( ................................................................ )</p>
          <p style="font-size: 10pt; color: #555;">หัวหน้าสาขาวิชา</p>
        </div>

        <div class="approval-col">
          <p style="font-weight: bold; margin-bottom: 6px;">คำสั่งคณบดีคณะวิศวกรรมศาสตร์ฯ</p>
          <p style="font-size: 11pt; margin-bottom: 12px;">[ ] อนุมัติ &nbsp;&nbsp; [ ] ไม่อนุมัติ</p>
          <p style="font-weight: bold;">( ................................................................ )</p>
          <p style="font-size: 10pt; color: #555;">คณบดีคณะวิศวกรรมศาสตร์ฯ</p>
        </div>
      </div>

      <div class="footer-stamp">
        เอกสารอิเล็กทรอนิกส์ คณะวิศวกรรมศาสตร์และเทคโนโลยีอุตสาหกรรม มหาวิทยาลัยกาฬสินธุ์
      </div>
    `;
  }

  // เอกสารทั่วไป / ระเบียบ / คู่มือ
  return `
    <div class="header">
      <h1>${title}</h1>
      <h2>มหาวิทยาลัยกาฬสินธุ์ • คณะวิศวกรรมศาสตร์และเทคโนโลยีอุตสาหกรรม</h2>
      <div class="badge">หมวดหมู่: ${category}</div>
    </div>

    <div class="content-para" style="margin-top: 20px;">
      เอกสารนี้เป็นเอกสารและแบบฟอร์มมาตรฐานของคณะวิศวกรรมศาสตร์และเทคโนโลยีอุตสาหกรรม มหาวิทยาลัยกาฬสินธุ์ 
      สำหรับให้อาจารย์ บุคลากร และเจ้าหน้าที่ใช้ในการดำเนินงานทางราชการ
    </div>

    <div style="margin: 20px 0; padding: 15px; border: 1px solid #000; border-radius: 4px; font-size: 12.5pt;">
      <p style="font-weight: bold; margin-bottom: 8px;">สาระสำคัญและข้อปฏิบัติ:</p>
      <ul style="padding-left: 24px; line-height: 1.7;">
        <li>บุคลากรสามารถยื่นคำขอและติดตามสถานะได้ผ่านระบบสารสนเทศออนไลน์ตลอด ๒๔ ชั่วโมง</li>
        <li>การยื่นขออนุมัติลางานล่วงหน้าควรดำเนินการก่อนวันเดินทางอย่างน้อย ๓ วันทำการ</li>
        <li>เอกสารนี้ได้รับการรับรองความถูกต้องตามระเบียบมหาวิทยาลัยกาฬสินธุ์ ว่าด้วยการบริหารงานบุคคล</li>
      </ul>
    </div>

    <div class="footer-stamp" style="margin-top: 40px;">
      ฝ่ายบริหารงานบุคคลและเทคโนโลยีสารสนเทศ คณะวิศวกรรมศาสตร์และเทคโนโลยีอุตสาหกรรม มหาวิทยาลัยกาฬสินธุ์
    </div>
  `;
}
