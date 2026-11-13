export default function LeaveBalanceCard({ balance }) {
  const { leave_type_name, total_days, used_days, remaining_days } = balance;
  const percentage = total_days > 0 ? Math.min(100, Math.round((used_days / total_days) * 100)) : 0;

  // เลือกลักษณะสีตามประเภทการลา
  let theme = {
    bar: "bg-blue-600",
    bg: "bg-blue-50/50",
    border: "border-blue-100",
    badge: "bg-blue-100 text-blue-800",
  };

  if (leave_type_name?.includes("ป่วย")) {
    theme = {
      bar: "bg-rose-500",
      bg: "bg-rose-50/50",
      border: "border-rose-100",
      badge: "bg-rose-100 text-rose-800",
    };
  } else if (leave_type_name?.includes("กิจ")) {
    theme = {
      bar: "bg-amber-500",
      bg: "bg-amber-50/50",
      border: "border-amber-100",
      badge: "bg-amber-100 text-amber-800",
    };
  } else if (leave_type_name?.includes("พักร้อน") || leave_type_name?.includes("พักผ่อน")) {
    theme = {
      bar: "bg-emerald-500",
      bg: "bg-emerald-50/50",
      border: "border-emerald-100",
      badge: "bg-emerald-100 text-emerald-800",
    };
  }

  return (
    <div className={`rounded-xl border ${theme.border} ${theme.bg} p-4 transition-all hover:shadow-xs`}>
      <div className="flex items-center justify-between">
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${theme.badge}`}>
          {leave_type_name}
        </span>
        <span className="text-xs text-slate-500 font-medium">
          สิทธิ์ {total_days} วัน/ปี
        </span>
      </div>

      <div className="mt-3 flex items-baseline justify-between">
        <div>
          <span className="text-2xl font-bold text-slate-900">{Number(remaining_days)}</span>
          <span className="ml-1 text-xs text-slate-500">วันคงเหลือ</span>
        </div>
        <div className="text-xs text-slate-600">
          ใช้ไปแล้ว <span className="font-semibold text-slate-800">{used_days}</span> วัน
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-3">
        <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${theme.bar}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="mt-1 flex justify-between text-[11px] text-slate-600">
          <span>อัตราการใช้ {percentage}%</span>
          <span>เหลือ {Number(remaining_days)} วัน</span>
        </div>
      </div>
    </div>
  );
}
