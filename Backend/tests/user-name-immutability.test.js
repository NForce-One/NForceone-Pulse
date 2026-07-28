// Tests for the Name-field rules in user management:
//  - name can be set when creating a user
//  - name can be changed by an admin through User Management (PUT /users/:id)
//  - name cannot be changed through the self-service profile API (PUT /users/me/profile)
//  - the allow-flag is server-controlled and cannot be spoofed via the request body
// Runs with the built-in Node test runner: `npm test` (node --test tests/)
// The Sequelize model is stubbed at the class level, so no database is needed.

import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

import User from "../src/models/user.model.js";
import * as userService from "../src/services/user.service.js";
import {
  updateUser as updateUserController,
  updateProfile as updateProfileController,
} from "../src/controllers/user.controller.js";

const originals = {
  findByPk: User.findByPk,
  findOne: User.findOne,
  create: User.create,
};

const makeFakeUser = (overrides = {}) => {
  const user = {
    id: 1,
    name: "Original Name",
    email: "original@example.com",
    role: "EMPLOYEE",
    department: "Engineering",
    lastUpdatePayload: null,
    ...overrides,
  };
  user.update = async (data) => {
    user.lastUpdatePayload = data;
    Object.assign(user, data);
    return user;
  };
  return user;
};

const makeFakeRes = () => {
  const res = { statusCode: 200, body: null };
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (payload) => {
    res.body = payload;
    return res;
  };
  return res;
};

beforeEach(() => {
  User.findOne = async () => null;
  User.create = async (data) => ({ ...data });
});

afterEach(() => {
  User.findByPk = originals.findByPk;
  User.findOne = originals.findOne;
  User.create = originals.create;
});

test("createUser stores the name entered by the admin", async () => {
  const created = await userService.createUser({
    name: "New Employee",
    email: "new.employee@example.com",
    password: "Passw0rd!",
    role: "EMPLOYEE",
  });

  assert.equal(created.name, "New Employee");
  assert.equal(created.email, "new.employee@example.com");
});

test("createUser still enforces the existing email and password validations", async () => {
  await assert.rejects(
    userService.createUser({
      name: "Weak Password",
      email: "weak@example.com",
      password: "short",
    }),
    /Password must be/
  );

  User.findOne = async () => makeFakeUser();
  await assert.rejects(
    userService.createUser({
      name: "Duplicate",
      email: "original@example.com",
      password: "Passw0rd!",
    }),
    /already exists/
  );
});

test("updateUser rejects a changed name by default (no allowNameChange flag)", async () => {
  const fakeUser = makeFakeUser();
  User.findByPk = async () => fakeUser;

  await assert.rejects(
    userService.updateUser(1, { name: "Tampered Name" }),
    /Name can only be updated by an administrator through User Management/
  );
  assert.equal(fakeUser.lastUpdatePayload, null);
  assert.equal(fakeUser.name, "Original Name");
});

test("updateUser allows a changed name when allowNameChange is true", async () => {
  const fakeUser = makeFakeUser();
  User.findByPk = async () => fakeUser;

  const updated = await userService.updateUser(1, { name: "New Name" }, { allowNameChange: true });

  assert.equal(fakeUser.lastUpdatePayload.name, "New Name");
  assert.equal(updated.name, "New Name");
});

test("updateUser rejects an empty name even when allowNameChange is true", async () => {
  const fakeUser = makeFakeUser();
  User.findByPk = async () => fakeUser;

  await assert.rejects(
    userService.updateUser(1, { name: "   " }, { allowNameChange: true }),
    /Name is required/
  );
});

test("updateUser allows other fields and drops an unchanged name as a no-op", async () => {
  const fakeUser = makeFakeUser();
  User.findByPk = async () => fakeUser;

  await userService.updateUser(1, {
    name: "Original Name",
    department: "Sales",
    role: "MANAGER",
    employeeId: 999,
  });

  assert.equal(fakeUser.lastUpdatePayload.department, "Sales");
  assert.equal(fakeUser.lastUpdatePayload.role, "MANAGER");
  assert.ok(!("name" in fakeUser.lastUpdatePayload));
  assert.ok(!("employeeId" in fakeUser.lastUpdatePayload));
  assert.equal(fakeUser.name, "Original Name");
});

test("PUT /users/:id controller (admin) successfully updates the name", async () => {
  const fakeUser = makeFakeUser();
  User.findByPk = async () => fakeUser;

  const req = { params: { id: 1 }, body: { name: "Admin Renamed" } };
  const res = makeFakeRes();
  await updateUserController(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(fakeUser.lastUpdatePayload.name, "Admin Renamed");
});

test("PUT /users/:id controller still returns 404 for a missing user", async () => {
  User.findByPk = async () => null;

  const req = { params: { id: 999 }, body: { department: "Sales" } };
  const res = makeFakeRes();
  await updateUserController(req, res);

  assert.equal(res.statusCode, 404);
  assert.match(res.body.message, /User not found/);
});

test("PUT /users/me/profile controller returns 400 when the name is changed", async () => {
  User.findByPk = async () => makeFakeUser();

  const req = { user: { id: 1 }, body: { name: "Tampered Name", department: "Sales" } };
  const res = makeFakeRes();
  await updateProfileController(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /Name can only be updated by an administrator through User Management/);
});

test("PUT /users/me/profile controller rejects a name change even if the request body claims admin intent", async () => {
  // allowNameChange is never read from req.body — only the admin controller sets it in code —
  // so a crafted Postman/devtools request body cannot bypass this rejection.
  User.findByPk = async () => makeFakeUser();

  const req = {
    user: { id: 1 },
    body: { name: "Tampered Name", allowNameChange: true, isAdmin: true },
  };
  const res = makeFakeRes();
  await updateProfileController(req, res);

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /Name can only be updated by an administrator through User Management/);
});

test("PUT /users/me/profile controller still updates other profile fields", async () => {
  const fakeUser = makeFakeUser();
  User.findByPk = async () => fakeUser;

  const req = {
    user: { id: 1 },
    body: { name: "Original Name", department: "Sales", defaultHours: 6 },
  };
  const res = makeFakeRes();
  await updateProfileController(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(fakeUser.lastUpdatePayload.department, "Sales");
  assert.equal(fakeUser.lastUpdatePayload.defaultHours, 6);
  assert.ok(!("name" in fakeUser.lastUpdatePayload));
});
