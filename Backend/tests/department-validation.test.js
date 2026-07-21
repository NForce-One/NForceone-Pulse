// Tests for the Department-field validation rules:
//  - only alphabetic characters (A-Z, a-z) and spaces are allowed
//  - digits and special characters are rejected on create and update
//  - values reaching the API directly (bypassing the UI) are rejected too
// Runs with the built-in Node test runner: `npm test` (node --test tests/)
// The Sequelize model is stubbed at the class level, so no database is needed.

import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

import User from "../src/models/user.model.js";
import * as userService from "../src/services/user.service.js";
import { updateProfile as updateProfileController } from "../src/controllers/user.controller.js";

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

test("createUser accepts departments made of letters and spaces", async () => {
  for (const department of ["Human Resources", "Information Technology", "Customer Support", "Sales"]) {
    const created = await userService.createUser({
      name: "New Employee",
      email: "new.employee@example.com",
      password: "Passw0rd!",
      department,
    });
    assert.equal(created.department, department);
  }
});

test("createUser still allows an omitted or empty department", async () => {
  const withoutDepartment = await userService.createUser({
    name: "No Department",
    email: "nodept@example.com",
    password: "Passw0rd!",
  });
  assert.equal(withoutDepartment.department, undefined);
});

test("createUser rejects departments with digits or special characters", async () => {
  for (const department of ["HR123", "IT@Team", "Sales#", "Finance_01", "Dev-Ops", "QA!", "HR2026"]) {
    await assert.rejects(
      userService.createUser({
        name: "New Employee",
        email: "new.employee@example.com",
        password: "Passw0rd!",
        department,
      }),
      /"Department" must contain only letters and spaces\./
    );
  }
});

test("updateUser accepts a letters-and-spaces department", async () => {
  const fakeUser = makeFakeUser();
  User.findByPk = async () => fakeUser;

  await userService.updateUser(1, { department: "Customer Support" });
  assert.equal(fakeUser.lastUpdatePayload.department, "Customer Support");
});

test("updateUser rejects invalid departments and leaves the user unmodified", async () => {
  for (const department of ["HR123", "IT@Team", "Sales#", "Finance_01", "Dev-Ops", "QA!", "HR2026", "   "]) {
    const fakeUser = makeFakeUser();
    User.findByPk = async () => fakeUser;

    await assert.rejects(
      userService.updateUser(1, { department }),
      /"Department" must contain only letters and spaces\./
    );
    assert.equal(fakeUser.lastUpdatePayload, null);
    assert.equal(fakeUser.department, "Engineering");
  }
});

test("updateUser without a department field keeps working", async () => {
  const fakeUser = makeFakeUser();
  User.findByPk = async () => fakeUser;

  await userService.updateUser(1, { defaultHours: 6 });
  assert.equal(fakeUser.lastUpdatePayload.defaultHours, 6);
  assert.equal(fakeUser.department, "Engineering");
});

test("PUT /users/me/profile controller returns 400 for an invalid department", async () => {
  const fakeUser = makeFakeUser();
  User.findByPk = async () => fakeUser;

  const req = { user: { id: 1 }, body: { department: "IT@Team", defaultHours: 8 } };
  const res = makeFakeRes();
  await updateProfileController(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /"Department" must contain only letters and spaces\./);
  assert.equal(fakeUser.lastUpdatePayload, null);
});

test("PUT /users/me/profile controller accepts a valid department", async () => {
  const fakeUser = makeFakeUser();
  User.findByPk = async () => fakeUser;

  const req = { user: { id: 1 }, body: { department: "Human Resources", defaultHours: 8 } };
  const res = makeFakeRes();
  await updateProfileController(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(fakeUser.lastUpdatePayload.department, "Human Resources");
});
