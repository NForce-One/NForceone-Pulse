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
