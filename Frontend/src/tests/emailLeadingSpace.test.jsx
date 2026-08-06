import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { Login } from "../pages/Login";
import * as api from "../services/api";
import {
  processEmailInput,
  preventLeadingSpace,
  preventLeadingSpaceBeforeInput,
  validateEmail,
  EMAIL_INVALID_CHAR_MESSAGE,
  EMAIL_ERROR_MESSAGE,
} from "../utils/emailValidation";

vi.mock("../services/api", () => ({ loginUser: vi.fn() }));
vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ login: vi.fn() }) }));

// Login's theme effect reads matchMedia, which jsdom doesn't implement.
beforeEach(() => {
  window.matchMedia = vi.fn().mockReturnValue({ matches: false });
});

const renderLogin = () =>
  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  );

const emailField = () => screen.getByPlaceholderText("you@company.com");

// jsdom applies the `type="email"` value-sanitization algorithm itself, so a
// leading space never survives in jsdom whether or not the guard exists.
// Asserting on `input.value` for a typed space therefore proves nothing here —
// what these tests pin down is that the guard is wired to the field and cancels
// the keystroke, which is what stops the browser painting it.
const dispatchSpaceKeydown = (input) => {
  const event = new KeyboardEvent("keydown", {
    key: " ",
    bubbles: true,
    cancelable: true,
  });
  input.dispatchEvent(event);
  return event.defaultPrevented;
};

describe("Login email field — whitespace rules", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.loginUser.mockResolvedValue({ user: { role: "EMPLOYEE" }, token: "t" });
  });

  it("cancels the Space keystroke on an empty field", () => {
    renderLogin();

    expect(dispatchSpaceKeydown(emailField())).toBe(true);
    // Silently dropped — no error message for a leading space.
    expect(screen.queryByText(EMAIL_INVALID_CHAR_MESSAGE)).toBeNull();
  });

  // The regression this fix is about: the caret cannot be read on a type=email
  // input, so a guard that inspects it lets a space through once the field has
  // content — exactly the "click back to the start and type a space" case.
  it("cancels Space after a valid email has been entered, whatever the caret position", async () => {
    const user = userEvent.setup();
    renderLogin();
    const input = emailField();

    await user.click(input);
    await user.keyboard("user@example.com");

    expect(dispatchSpaceKeydown(input)).toBe(true);
    expect(input).toHaveValue("user@example.com");
  });

  it("trims leading and trailing spaces from a pasted email, with no error", async () => {
    const user = userEvent.setup();
    renderLogin();
    const input = emailField();

    await user.click(input);
    await user.paste("   jane@example.com   ");

    expect(input).toHaveValue("jane@example.com");
    expect(screen.queryByText(EMAIL_INVALID_CHAR_MESSAGE)).toBeNull();
  });

  it("trims leading spaces from a pasted email", async () => {
    const user = userEvent.setup();
    renderLogin();
    const input = emailField();

    await user.click(input);
    await user.paste("   jane@example.com");

    expect(input).toHaveValue("jane@example.com");
    expect(screen.queryByText(EMAIL_INVALID_CHAR_MESSAGE)).toBeNull();
  });

  it("trims trailing spaces from a pasted email", async () => {
    const user = userEvent.setup();
    renderLogin();
    const input = emailField();

    await user.click(input);
    await user.paste("jane@example.com   ");

    expect(input).toHaveValue("jane@example.com");
    expect(screen.queryByText(EMAIL_INVALID_CHAR_MESSAGE)).toBeNull();
  });

  it("keeps the field clean when a space is pasted in front of an existing address", async () => {
    const user = userEvent.setup();
    renderLogin();
    const input = emailField();

    await user.click(input);
    await user.paste("  user@example.com");
    await user.paste("  ");

    expect(input).toHaveValue("user@example.com");
  });

  it("rejects internal spaces with the existing error message", async () => {
    const user = userEvent.setup();
    renderLogin();
    const input = emailField();

    await user.click(input);
    await user.paste("user @example.com");

    expect(input).toHaveValue("user@example.com");
    expect(screen.getByText(EMAIL_INVALID_CHAR_MESSAGE)).toBeInTheDocument();
  });

  it("types a normal email through untouched", async () => {
    const user = userEvent.setup();
    renderLogin();
    const input = emailField();

    await user.click(input);
    await user.keyboard("jane@example.com");

    expect(input).toHaveValue("jane@example.com");
    expect(screen.queryByText(EMAIL_INVALID_CHAR_MESSAGE)).toBeNull();
  });

  it("accepts a browser-autofill style value set in one shot", async () => {
    const user = userEvent.setup();
    renderLogin();
    const input = emailField();

    // Autofill lands as a single insertion rather than per-character typing.
    await user.click(input);
    await user.paste("autofill.user@company.com");

    expect(input).toHaveValue("autofill.user@company.com");
    expect(screen.queryByText(EMAIL_INVALID_CHAR_MESSAGE)).toBeNull();
  });

  it("submits the trimmed email and logs in normally", async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.click(emailField());
    await user.paste("  jane@example.com  ");
    await user.type(screen.getByPlaceholderText("Enter your password"), "Passw0rd!");
    await user.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() => expect(api.loginUser).toHaveBeenCalledTimes(1));
    expect(api.loginUser.mock.calls[0][0]).toEqual({
      email: "jane@example.com",
      password: "Passw0rd!",
    });
  });

  it("blocks submission and shows the existing message for an invalid email", async () => {
    const user = userEvent.setup();
    renderLogin();

    // "bad@bad" satisfies the browser's own type=email check but fails the
    // project's stricter format rule, so our handler is the one that rejects it.
    await user.click(emailField());
    await user.paste("bad@bad");
    await user.type(screen.getByPlaceholderText("Enter your password"), "Passw0rd!");
    await user.click(screen.getByRole("button", { name: /login/i }));

    expect(screen.getByText(EMAIL_ERROR_MESSAGE)).toBeInTheDocument();
    expect(api.loginUser).not.toHaveBeenCalled();
  });
});

describe("Email whitespace helpers", () => {
  it("drops surrounding whitespace silently", () => {
    expect(processEmailInput("   ")).toEqual({ value: "", error: "" });
    expect(processEmailInput("  jane@example.com")).toEqual({
      value: "jane@example.com",
      error: "",
    });
    expect(processEmailInput("jane@example.com   ")).toEqual({
      value: "jane@example.com",
      error: "",
    });
  });

  it("flags whitespace inside the address", () => {
    expect(processEmailInput("user @example.com")).toEqual({
      value: "user@example.com",
      error: EMAIL_INVALID_CHAR_MESSAGE,
    });
    expect(processEmailInput("user@ example.com")).toEqual({
      value: "user@example.com",
      error: EMAIL_INVALID_CHAR_MESSAGE,
    });
  });

  it("cancels Space regardless of value or reported caret position", () => {
    const pressSpace = (value, selectionStart) => {
      const e = { key: " ", target: { value, selectionStart }, preventDefault: vi.fn() };
      preventLeadingSpace(e);
      return e.preventDefault.mock.calls.length > 0;
    };

    expect(pressSpace("", 0)).toBe(true); // empty field
    expect(pressSpace("", null)).toBe(true); // type=email reports a null caret
    expect(pressSpace("user@example.com", 0)).toBe(true); // caret sent to the start
    expect(pressSpace("user@example.com", null)).toBe(true); // caret unknowable
    expect(pressSpace("user@example.com", 16)).toBe(true); // no space anywhere
  });

  it("leaves every other key alone", () => {
    const pressKey = (key) => {
      const e = { key, target: { value: "user@example.com", selectionStart: null }, preventDefault: vi.fn() };
      preventLeadingSpace(e);
      return e.preventDefault.mock.calls.length > 0;
    };

    // Navigation, editing and normal characters must all still work.
    ["a", "@", ".", "Backspace", "Tab", "Enter", "ArrowLeft", "Home", "Delete"].forEach(
      (key) => expect(pressKey(key)).toBe(false)
    );
  });

  it("cancels whitespace-only beforeinput but lets a leading-space paste through", () => {
    const beforeInput = (data, value) => {
      const e = { data, target: { value, selectionStart: null }, preventDefault: vi.fn() };
      preventLeadingSpaceBeforeInput(e);
      return e.preventDefault.mock.calls.length > 0;
    };

    expect(beforeInput(" ", "")).toBe(true); // a typed space
    expect(beforeInput(" ", "user@example.com")).toBe(true); // ...also mid-edit
    expect(beforeInput("\t", "user@example.com")).toBe(true); // any whitespace
    // A paste must survive so onChange can trim it — cancelling would lose it.
    expect(beforeInput("  jane@example.com", "")).toBe(false);
    expect(beforeInput("jane@example.com", "")).toBe(false);
  });

  it("treats any whitespace in the address as invalid at submit time", () => {
    expect(validateEmail("jane@example.com").valid).toBe(true);
    expect(validateEmail("  jane@example.com  ").valid).toBe(true); // trimmed first
    expect(validateEmail("user @example.com").valid).toBe(false);
    expect(validateEmail("user@ example.com").valid).toBe(false);
    expect(validateEmail("bad@bad").valid).toBe(false);
  });
});
