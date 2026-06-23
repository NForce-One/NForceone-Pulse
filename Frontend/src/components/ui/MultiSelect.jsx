import React, { useState, useRef, useEffect, useMemo } from "react";

const MultiSelect = ({
  value = [],
  onChange,
  options = [],
  placeholder = "Select...",
  allLabel = "All",
  disabled = false,
  className = "",
  name,
}) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const ref = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setSearchTerm("");
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (open && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [open]);

  const optionValues = useMemo(() => options.map((o) => String(o.value)), [options]);
  const allSelected = useMemo(
    () => optionValues.length > 0 && optionValues.every((v) => value.includes(v)),
    [optionValues, value]
  );
  const someSelected = useMemo(
    () => value.length > 0 && value.length < optionValues.length,
    [value.length, optionValues.length]
  );

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    return options.filter((o) =>
      o.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [options, searchTerm]);

  const handleAllToggle = () => {
    if (allSelected) {
      onChange({ target: { name: name || "", value: [] } });
    } else {
      onChange({ target: { name: name || "", value: [...optionValues] } });
    }
    setSearchTerm("");
  };

  const handleOptionToggle = (optValue) => {
    const strVal = String(optValue);
    const newValue = value.includes(strVal)
      ? value.filter((v) => v !== strVal)
      : [...value, strVal];
    onChange({ target: { name: name || "", value: newValue } });
  };

  const removeChip = (e, chipValue) => {
    e.stopPropagation();
    const newValue = value.filter((v) => v !== chipValue);
    onChange({ target: { name: name || "", value: newValue } });
  };

  const displayText = () => {
    if (value.length === 0) return placeholder;
    if (allSelected) return allLabel;
    const selectedLabels = options
      .filter((o) => value.includes(String(o.value)))
      .map((o) => o.label);
    return selectedLabels.join(", ");
  };

  return (
    <div ref={ref} className={`relative ${className || ""}`} style={{ zIndex: 50 }}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => { if (!disabled) setOpen(!open); }}
        className={`flex items-center justify-between w-full h-10 rounded-lg border px-3 py-2 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#B33A2F] ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"} ${open ? "ring-2 ring-[#B33A2F]" : ""}`}
        style={open ? { borderColor: "#B33A2F" } : {}}
      >
        <div className="flex items-center gap-1 flex-1 min-w-0 overflow-hidden">
          {value.length > 0 && !allSelected ? (
            <div className="flex items-center gap-1 flex-wrap">
              {value.slice(0, 2).map((v) => {
                const opt = options.find((o) => String(o.value) === v);
                return opt ? (
                  <span
                    key={v}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-[#B33A2F]/10 text-[#B33A2F] border border-[#B33A2F]/20 whitespace-nowrap"
                  >
                    {opt.label}
                    <button
                      type="button"
                      onClick={(e) => removeChip(e, v)}
                      className="hover:text-[#992E25] focus:outline-none"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ) : null;
              })}
              {value.length > 2 && (
                <span className="text-xs text-[#64748B] whitespace-nowrap">+{value.length - 2}</span>
              )}
            </div>
          ) : (
            <span className={value.length === 0 ? "text-[#64748B]" : "text-[#1E293B]"}>
              {allSelected ? allLabel : displayText()}
            </span>
          )}
        </div>
        <svg className={`w-4 h-4 ml-2 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""} text-[#64748B]`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute left-0 right-0 mt-1 rounded-lg border border-[#E2E8F0] bg-white shadow-lg overflow-hidden"
          style={{ zIndex: 9999 }}
        >
          <div className="p-2 border-b border-[#E2E8F0]">
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search..."
              className="w-full h-8 px-2 rounded-md border border-[#E2E8F0] text-sm focus:outline-none focus:ring-1 focus:ring-[#B33A2F]"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <ul className="overflow-y-auto" style={{ maxHeight: "200px" }}>
            <li
              onClick={handleAllToggle}
              className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-[#F8FAFC] border-b border-[#E2E8F0]"
            >
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => { if (el) el.indeterminate = someSelected; }}
                onChange={handleAllToggle}
                className="w-4 h-4 rounded border-[#CBD5E1] text-[#B33A2F] focus:ring-[#B33A2F] cursor-pointer"
              />
              <span className="font-medium text-[#1E293B]">{allLabel}</span>
            </li>
            {filteredOptions.map((opt) => {
              const strVal = String(opt.value);
              const isSelected = value.includes(strVal);
              return (
                <li
                  key={strVal}
                  onClick={() => handleOptionToggle(strVal)}
                  className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer transition-colors duration-100 ${isSelected ? "bg-[#B33A2F]/5" : ""} hover:bg-[#F8FAFC]`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleOptionToggle(strVal)}
                    className="w-4 h-4 rounded border-[#CBD5E1] text-[#B33A2F] focus:ring-[#B33A2F] cursor-pointer"
                  />
                  <span className={isSelected ? "text-[#1E293B] font-medium" : "text-[#1E293B]"}>
                    {opt.label}
                  </span>
                </li>
              );
            })}
            {filteredOptions.length === 0 && (
              <li className="px-3 py-4 text-sm text-[#64748B] text-center">No results found</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default MultiSelect;
