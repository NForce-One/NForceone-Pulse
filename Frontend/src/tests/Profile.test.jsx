import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Profile } from "../pages/Profile";
import * as api from "../services/api";

vi.mock("../services/api", () => ({
  getMe: vi.fn(),
  updateProfile: vi.fn(),
  changePassword: vi.fn(),
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: { id: 1 } }),
}));

// the profile object must be referentially stable across renders:
// Profile.jsx has a useEffect keyed on it, and a fresh object per render
// would re-run the effect (and re-render) forever
const mockProfile = vi.hoisted(() => ({
  name: "Jane Doe",
  email: "jane@example.com",
  role: "EMPLOYEE",
  department: "Engineering",
  defaultHours: 8,
}));

vi.mock("../hooks/useCachedData", () => ({
  useCachedData: () => ({
    data: mockProfile,
    isLoading: false,
    refresh: vi.fn(),
  }),
  clearPageCache: vi.fn(),
}));

describe("Profile page — Name field rules", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.updateProfile.mockResolvedValue({ success: true, data: {} });
  });

  it("shows the name as a disabled field for an existing user", async () => {
    render(<Profile />);

    const nameInput = await screen.findByDisplayValue("Jane Doe");
    expect(nameInput).toBeDisabled();
  });

  it("omits the name from the profile update payload", async () => {
    const user = userEvent.setup();
    render(<Profile />);
    await screen.findByDisplayValue("Jane Doe");

    await user.click(screen.getByRole("button", { name: /update profile/i }));

    await waitFor(() => expect(api.updateProfile).toHaveBeenCalledTimes(1));
    const payload = api.updateProfile.mock.calls[0][0];
    expect("name" in payload).toBe(false);
    expect(payload).toMatchObject({ department: "Engineering", defaultHours: 8 });
  });
});

const DEPARTMENT_ERROR_MESSAGE = '"Department" must contain only letters and spaces.';

describe("Profile page — Department field validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.updateProfile.mockResolvedValue({ success: true, data: {} });
  });

  const getDepartmentInput = async () => {
    render(<Profile />);
    return await screen.findByDisplayValue("Engineering");
  };

  it("strips digits and special characters while typing and shows the validation message", async () => {
    const user = userEvent.setup();
    const departmentInput = await getDepartmentInput();

    await user.clear(departmentInput);
    await user.type(departmentInput, "HR123");
    expect(departmentInput).toHaveValue("HR");
    expect(screen.getByText(DEPARTMENT_ERROR_MESSAGE)).toBeInTheDocument();

    await user.clear(departmentInput);
    await user.type(departmentInput, "IT@Team!");
    expect(departmentInput).toHaveValue("ITTeam");
    expect(screen.getByText(DEPARTMENT_ERROR_MESSAGE)).toBeInTheDocument();
  });

  it("clears the validation message as soon as a valid character is entered", async () => {
    const user = userEvent.setup();
    const departmentInput = await getDepartmentInput();

    await user.clear(departmentInput);
    await user.type(departmentInput, "HR2026");
    expect(departmentInput).toHaveValue("HR");
    expect(screen.getByText(DEPARTMENT_ERROR_MESSAGE)).toBeInTheDocument();

    await user.type(departmentInput, " Team");
    expect(departmentInput).toHaveValue("HR Team");
    expect(screen.queryByText(DEPARTMENT_ERROR_MESSAGE)).not.toBeInTheDocument();
  });

  it("sanitizes pasted input to letters and spaces and shows the validation message", async () => {
    const user = userEvent.setup();
    const departmentInput = await getDepartmentInput();

    await user.clear(departmentInput);
    await user.click(departmentInput);
    await user.paste("Finance_01");
    expect(departmentInput).toHaveValue("Finance");
    expect(screen.getByText(DEPARTMENT_ERROR_MESSAGE)).toBeInTheDocument();
  });

  it("allows letters and spaces", async () => {
    const user = userEvent.setup();
    const departmentInput = await getDepartmentInput();

    await user.clear(departmentInput);
    await user.type(departmentInput, "Human Resources");
    expect(departmentInput).toHaveValue("Human Resources");

    await user.click(screen.getByRole("button", { name: /update profile/i }));

    await waitFor(() => expect(api.updateProfile).toHaveBeenCalledTimes(1));
    expect(api.updateProfile.mock.calls[0][0]).toMatchObject({
      department: "Human Resources",
    });
  });

  it("blocks submission when the department is empty", async () => {
    const user = userEvent.setup();
    const departmentInput = await getDepartmentInput();

    await user.clear(departmentInput);
    await user.click(screen.getByRole("button", { name: /update profile/i }));

    expect(await screen.findByText("Department is required")).toBeInTheDocument();
    expect(api.updateProfile).not.toHaveBeenCalled();
  });
});
