import { useState } from "react";

export default function UserAvatar({ src, name, size = "md", className = "" }) {
  const [error, setError] = useState(false);

  const isValidUrl =
    src &&
    typeof src === "string" &&
    (src.startsWith("http://") ||
      src.startsWith("https://") ||
      src.startsWith("/uploads/") ||
      src.startsWith("/") ||
      src.startsWith("data:image/"));

  const initial = name
    ? name
        .replace(
          /^(ศาสตราจารย์|รองศาสตราจารย์|ผู้ช่วยศาสตราจารย์|อาจารย์|ศ\.|รศ\.|ผศ\.|อ\.|ดร\.|นาย|นาง|นางสาว)\s*/g,
          ""
        )
        .trim()
        .charAt(0) || name.charAt(0)
    : "U";

  const sizeClasses = {
    xs: "w-6 h-6 text-[10px]",
    sm: "w-7 h-7 text-xs",
    md: "w-8 h-8 text-xs",
    lg: "w-10 h-10 text-sm",
    xl: "w-12 h-12 text-base",
    modal: "w-10 h-10 sm:w-12 sm:h-12 text-base",
  };

  const currentSize = sizeClasses[size] || sizeClasses.md;

  if (isValidUrl && !error) {
    return (
      <img
        src={src}
        alt={name || "Avatar"}
        onError={() => setError(true)}
        className={`${currentSize} rounded-xl object-cover shadow-2xs border border-slate-200/80 shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      className={`${currentSize} rounded-xl bg-gradient-to-br from-red-800 to-slate-900 text-white font-bold flex items-center justify-center shrink-0 shadow-2xs ${className}`}
    >
      {initial}
    </div>
  );
}
