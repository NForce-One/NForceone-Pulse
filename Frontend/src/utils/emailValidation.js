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

// Leading whitespace is removed silently: pressing Space before the first
// email character does nothing, and a pasted value has its leading spaces
// trimmed off before any validation runs.
const LEADING_WHITESPACE_REGEX = /^\s+/;

// Format: local-part @ domain-part ; domain-part must contain a dot and end
// with a top-level domain of at least 2 letters.
export const EMAIL_FORMAT_REGEX =
  /^[A-Za-z0-9._+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

// Removes any whitespace at the start of the value.
export function stripLeadingWhitespace(value) {
  return (value || "").replace(LEADING_WHITESPACE_REGEX, "");
}

// Strips every disallowed character (including spaces and special
// characters) from an email value. Used while typing/pasting so invalid
// characters never enter the input.
export function sanitizeEmailInput(value) {
  return stripLeadingWhitespace(value).replace(EMAIL_DISALLOWED_CHARS_REGEX, "");
}

// Applies the shared typing rules to a raw input value and returns the value
// to store plus the error to show.
//
// Surrounding whitespace is dropped silently — an email can never start or end
// with a space, so there is nothing to warn about. Whitespace *inside* the
// address, and every other disallowed character, still raises the existing
// invalid-character message.
export function processEmailInput(rawValue) {
  const raw = rawValue || "";
  const trimmed = raw.trim();
  const filtered = sanitizeEmailInput(trimmed);

  return {
    value:
      filtered.length > MAX_EMAIL_LENGTH
        ? filtered.slice(0, MAX_EMAIL_LENGTH)
        : filtered,
    error: filtered !== trimmed ? EMAIL_INVALID_CHAR_MESSAGE : "",
  };
}

// Why a keystroke-level guard is needed at all:
//
// `<input type="email">` applies its own value sanitization algorithm, which
// strips leading and trailing whitespace out of `.value`. So when a space is
// typed into an empty email field the browser paints it in the field while
// `.value` stays `""`. React compares against `""`, sees no change, and never
// fires `onChange` — meaning no state-level filtering can ever remove that
// space. It has to be stopped before the browser inserts it.

// The caret position cannot be used to decide this. `type="email"` inputs are
// not text controls, so browsers return `null` from `selectionStart` — there is
// no way to tell whether the caret sits at position 0. Any check that guesses
// lets a space through when the user clicks back to the start of an address that
// has already been typed.
//
// A space is never valid anywhere in an email address, so the rule that holds in
// every case is simply: no whitespace keystroke ever reaches the field. That
// makes a leading space impossible regardless of caret position.

// `onKeyDown` guard — refuses the Space key outright.
export function preventLeadingSpace(e) {
  if (e.key !== " " && e.key !== "Spacebar") return;
  e.preventDefault();
}

// `onBeforeInput` guard — refuses whitespace-only insertions that don't come
// from a plain Space keypress (IME, mobile keyboards, drag-and-drop).
//
// Only whitespace-ONLY insertions are cancelled. A paste or autofill that merely
// *starts* with whitespace must be allowed through, so that `onChange` can trim
// it — cancelling it here would drop the pasted address entirely.
export function preventLeadingSpaceBeforeInput(e) {
  const data = e.data;
  if (!data || !/^\s+$/.test(data)) return;
  e.preventDefault();
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
    const { value: nextValue, error: nextError } = processEmailInput(e.target.value);
    setValue(nextValue);
    applyError(nextError);
  };

  // Trim on blur, so a value that arrived by any route (autofill, paste,
  // programmatic set) is normalised once the user leaves the field.
  const handleBlur = () => {
    setValue((prev) => (prev || "").trim());
  };

  // Validated at submit time against the trimmed value, and the field is
  // normalised to match, so what is validated is what gets sent.
  const validate = () => {
    const normalized = (value || "").trim();
    if (normalized !== value) setValue(normalized);

    const result = validateEmail(normalized);
    applyError(result.error);
    if (!result.valid && inputRef.current) {
      inputRef.current.focus();
    }
    return result.valid;
  };

  return {
    value,
    setValue,
    error,
    handleChange,
    handleKeyDown: preventLeadingSpace,
    handleBeforeInput: preventLeadingSpaceBeforeInput,
    handleBlur,
    validate,
    inputRef,
  };
}
