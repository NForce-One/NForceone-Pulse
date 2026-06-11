import React, { useState, useRef, useEffect } from "react";

const CustomSelect = ({ value, onChange, options, placeholder, disabled, className, name, buttonClassName }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selected = options.find((o) => String(o.value) === String(value));
  const isWhite = (buttonClassName || "").includes("text-white");

  return (
    <div ref={ref} className={`relative ${className || ""}`} style={{ zIndex: 50 }}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={`flex items-center justify-between w-full h-10 rounded-lg border px-3 py-2 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#B33A2F] ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"} ${open ? "ring-2 ring-[#B33A2F]" : ""} ${buttonClassName || ""}`}
        style={open ? { borderColor: "#B33A2F" } : {}}
      >
        <span className={isWhite ? "text-white" : selected ? "text-[#1E293B]" : "text-[#64748B]"}>
          {selected ? selected.label : placeholder || "Select..."}
        </span>
        <svg className={`w-4 h-4 ml-2 transition-transform ${open ? "rotate-180" : ""} ${isWhite ? "text-white" : "text-[#64748B]"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <ul
          className="absolute left-0 right-0 mt-1 rounded-lg border border-[#E2E8F0] bg-white shadow-lg overflow-y-auto"
          style={{ top: "100%", maxHeight: "200px", zIndex: 9999 }}
        >
          {options.map((opt) => (
            <li
              key={opt.value}
              onClick={() => { onChange({ target: { name: name || opt.name || "", value: String(opt.value) } }); setOpen(false); }}
              className={`px-3 py-2 text-sm cursor-pointer transition-colors duration-100 ${String(opt.value) === String(value) ? "bg-[#B33A2F] text-white" : "text-[#1E293B] hover:bg-[#F8FAFC]"}`}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default CustomSelect;
