import { useRef, useState } from "react";

// ============================================================
// Enterprise email validation.
// EVERY email input in the application must use this single,
// shared utility so the validation rules never diverge.
// ============================================================

export const MAX_EMAIL_LENGTH = 254;
export const MAX_LOCAL_PART_LENGTH = 64;

export const EMAIL_ERROR_MESSAGE = "Please enter a valid email address.";
export const EMAIL_INVALID_CHAR_MESSAGE =
  "Only letters, numbers, '.', '_', '-', '+' and '@' are allowed.";

// Every character allowed to appear in an email input while typing:
// letters, numbers, ".", "_", "-", "+" and "@". Everything else
// (including spaces and all special characters) is rejected.
export const EMAIL_ALLOWED_CHARS_REGEX = /^[A-Za-z0-9._+-@]*$/;

const EMAIL_DISALLOWED_CHARS_REGEX = /[^A-Za-z0-9._+-@]/g;

// Format: local-part @ domain-part ; domain-part must contain a dot and end
// with a top-level domain of at least 2 letters.
export const EMAIL_FORMAT_REGEX =
  /^[A-Za-z0-9._+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

// Strips every disallowed character (including spaces and special
// characters) from an email value. Used while typing/pasting so invalid
// characters never enter the input.
export function sanitizeEmailInput(value) {
  return (value || "").replace(EMAIL_DISALLOWED_CHARS_REGEX, "");
}

// Full format validation. Returns { valid, error }.
export function validateEmail(email) {
  const value = (email || "").trim();

  if (!value) return { valid: false, error: EMAIL_ERROR_MESSAGE };
  if (value.length > MAX_EMAIL_LENGTH) return { valid: false, error: EMAIL_ERROR_MESSAGE };
  if (value.includes(" ")) return { valid: false, error: EMAIL_ERROR_MESSAGE };

  const atCount = (value.match(/@/g) || []).length;
  if (atCount !== 1) return { valid: false, error: EMAIL_ERROR_MESSAGE };

  const [localPart, domainPart] = value.split("@");
  if (!localPart || !domainPart) return { valid: false, error: EMAIL_ERROR_MESSAGE };
  if (localPart.length > MAX_LOCAL_PART_LENGTH) return { valid: false, error: EMAIL_ERROR_MESSAGE };

  if (!EMAIL_FORMAT_REGEX.test(value)) return { valid: false, error: EMAIL_ERROR_MESSAGE };

  return { valid: true, error: "" };
}

// Hook that binds the shared validation to a single email input.
// Returns the input's value, error, onChange handler, submit validator and a
// ref to focus the field when validation fails.
export function useEmailValidation({ onError } = {}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  const applyError = (msg) => {
    setError(msg);
    if (onError) onError(msg);
  };

  const handleChange = (e) => {
    const raw = e.target.value || "";
    const filtered = sanitizeEmailInput(raw);
    const nextError =
      filtered !== raw ? EMAIL_INVALID_CHAR_MESSAGE : "";
    setValue(filtered.length > MAX_EMAIL_LENGTH ? filtered.slice(0, MAX_EMAIL_LENGTH) : filtered);
    applyError(nextError);
  };

  const validate = () => {
    const result = validateEmail(value);
    applyError(result.error);
    if (!result.valid && inputRef.current) {
      inputRef.current.focus();
    }
    return result.valid;
  };

  return { value, setValue, error, handleChange, validate, inputRef };
}
