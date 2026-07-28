import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Users } from "../pages/Users";
import * as api from "../services/api";

vi.mock("../services/api", () => ({
  fetchUsers: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  deleteUser: vi.fn(),
  toggleUserStatus: vi.fn(),
  getNextEmployeeId: vi.fn(),
}));

const existingUser = {
  id: 5,
  name: "Jane Doe",
  email: "jane@example.com",
  role: "EMPLOYEE",
  employeeId: 101,
  isActive: true,
};

const openEditForm = async (user) => {
  const nameCell = await screen.findByText("Jane Doe");
  const row = nameCell.closest("tr");
  const [editButton] = within(row).getAllByRole("button");
  await user.click(editButton);
  await screen.findByText("Edit User");
};

describe("Users page — Name field rules", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.fetchUsers.mockResolvedValue({ success: true, data: [existingUser] });
    api.getNextEmployeeId.mockResolvedValue({ success: true, data: { employeeId: 102 } });
    api.createUser.mockResolvedValue({ success: true, data: {} });
    api.updateUser.mockResolvedValue({ success: true, data: {} });
  });

  it("lets the admin enter a name when creating a user", async () => {
    const user = userEvent.setup();
    render(<Users />);
    await screen.findByText("Jane Doe");

    await user.click(screen.getByRole("button", { name: /add user/i }));
    const nameInput = await screen.findByPlaceholderText("Full Name");

    expect(nameInput.readOnly).toBe(false);
    await user.type(nameInput, "New Person");
    expect(nameInput).toHaveValue("New Person");

    await user.type(screen.getByPlaceholderText("Email"), "new.person@example.com");
    await user.type(screen.getByPlaceholderText("Password"), "Passw0rd!");
    await user.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => expect(api.createUser).toHaveBeenCalledTimes(1));
    expect(api.createUser.mock.calls[0][0]).toMatchObject({
      name: "New Person",
      email: "new.person@example.com",
    });
  });

  it("keeps the existing name field required on create", async () => {
    const user = userEvent.setup();
    render(<Users />);
    await screen.findByText("Jane Doe");

    await user.click(screen.getByRole("button", { name: /add user/i }));
    const nameInput = await screen.findByPlaceholderText("Full Name");

    expect(nameInput).toBeRequired();
  });

  it("lets the admin edit the name of an existing user", async () => {
    const user = userEvent.setup();
    render(<Users />);

    await openEditForm(user);
    const nameInput = screen.getByPlaceholderText("Full Name");

    expect(nameInput).toHaveValue("Jane Doe");
    expect(nameInput.readOnly).toBe(false);

    await user.clear(nameInput);
    await user.type(nameInput, "Janet Doe");
    expect(nameInput).toHaveValue("Janet Doe");
  });

  it("includes the updated name in the update payload but omits employeeId", async () => {
    const user = userEvent.setup();
    render(<Users />);

    await openEditForm(user);
    const nameInput = screen.getByPlaceholderText("Full Name");
    await user.clear(nameInput);
    await user.type(nameInput, "Janet Doe");
    await user.click(screen.getByRole("button", { name: "Update" }));

    await waitFor(() => expect(api.updateUser).toHaveBeenCalledTimes(1));
    const [id, payload] = api.updateUser.mock.calls[0];
    expect(id).toBe(5);
    expect(payload.name).toBe("Janet Doe");
    expect("employeeId" in payload).toBe(false);
    expect(payload.email).toBe("jane@example.com");
  });
});
