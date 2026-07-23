// Tests for the "no project creation for an inactive client" rule:
//  - createProject rejects a clientId whose Client.status is INACTIVE
//  - createProject still works normally for an ACTIVE client or no client at all
//  - the rule is enforced at the service layer, so it also covers requests
//    that reach the API directly (bypassing the UI)
// Runs with the built-in Node test runner: `npm test` (node --test tests/)
// The Sequelize models are stubbed at the class level, so no database is needed.

import { test, afterEach } from "node:test";
import assert from "node:assert/strict";

import Client from "../src/models/client.model.js";
import Project from "../src/models/project.model.js";
import * as projectService from "../src/services/project.service.js";
import { createProject as createProjectController } from "../src/controllers/project.controller.js";

const originals = {
  clientFindByPk: Client.findByPk,
  projectCreate: Project.create,
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

afterEach(() => {
  Client.findByPk = originals.clientFindByPk;
  Project.create = originals.projectCreate;
});

test("createProject rejects a clientId that belongs to an inactive client", async () => {
  Client.findByPk = async (id) => ({ id, status: "INACTIVE" });
  Project.create = async () => {
    throw new Error("Project.create should not be called for an inactive client");
  };

  await assert.rejects(
    projectService.createProject({ name: "New Project", clientId: 5 }),
    /The selected client is inactive\. You cannot proceed with creating a project for this client\./
  );
});

test("createProject allows an active client through unchanged", async () => {
  Client.findByPk = async (id) => ({ id, status: "ACTIVE" });
  Project.create = async (data) => ({ id: 1, ...data });

  const project = await projectService.createProject({ name: "New Project", clientId: 5 });
  assert.equal(project.name, "New Project");
  assert.equal(project.clientId, 5);
});

test("createProject still works when no client is selected", async () => {
  Client.findByPk = async () => {
    throw new Error("Client.findByPk should not be called without a clientId");
  };
  Project.create = async (data) => ({ id: 1, ...data });

  const project = await projectService.createProject({ name: "New Project" });
  assert.equal(project.name, "New Project");
});

test("POST /projects controller returns 400 for an inactive client", async () => {
  Client.findByPk = async (id) => ({ id, status: "INACTIVE" });
  Project.create = async () => {
    throw new Error("Project.create should not be called for an inactive client");
  };

  const req = { body: { name: "New Project", clientId: 5 } };
  const res = makeFakeRes();
  await createProjectController(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.success, false);
  assert.match(
    res.body.message,
    /The selected client is inactive\. You cannot proceed with creating a project for this client\./
  );
});

test("POST /projects controller succeeds for an active client", async () => {
  Client.findByPk = async (id) => ({ id, status: "ACTIVE" });
  Project.create = async (data) => ({ id: 1, ...data });

  const req = { body: { name: "New Project", clientId: 5 } };
  const res = makeFakeRes();
  await createProjectController(req, res);

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.name, "New Project");
});
