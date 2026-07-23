// Tests for the "no new Timesheet project entries for an inactive client" rule:
//  - saveDraftTimesheet rejects a brand-new (never-before-saved) daily entry
//    whose clientId belongs to an INACTIVE client
//  - saveDraftTimesheet still allows adding a new entry for an ACTIVE client
//  - saveDraftTimesheet still allows updating an entry that already exists,
//    even if its client has since gone INACTIVE (no regression for
//    previously-saved timesheet rows / already-added projects)
// Runs with the built-in Node test runner: `npm test` (node --test tests/)
// The Sequelize models are stubbed at the class level, so no database is needed.

import { test, afterEach } from "node:test";
import assert from "node:assert/strict";

import Client from "../src/models/client.model.js";
import Project from "../src/models/project.model.js";
import Timesheet from "../src/models/timesheet.model.js";
import TimeEntry from "../src/models/timeEntry.model.js";
import { saveDraftTimesheet } from "../src/services/employeeTimesheet.service.js";

const originals = {
  clientFindByPk: Client.findByPk,
  projectFindByPk: Project.findByPk,
  timesheetFindOne: Timesheet.findOne,
  timesheetCreate: Timesheet.create,
  timeEntryFindOne: TimeEntry.findOne,
  timeEntryFindOrCreate: TimeEntry.findOrCreate,
  timeEntryFindAll: TimeEntry.findAll,
};

const makeFakeTimesheet = (overrides = {}) => {
  const ts = { id: 1, userId: 1, weekStartDate: "2026-07-20", status: "DRAFT", ...overrides };
  ts.update = async (data) => {
    Object.assign(ts, data);
    return ts;
  };
  return ts;
};

afterEach(() => {
  Client.findByPk = originals.clientFindByPk;
  Project.findByPk = originals.projectFindByPk;
  Timesheet.findOne = originals.timesheetFindOne;
  Timesheet.create = originals.timesheetCreate;
  TimeEntry.findOne = originals.timeEntryFindOne;
  TimeEntry.findOrCreate = originals.timeEntryFindOrCreate;
  TimeEntry.findAll = originals.timeEntryFindAll;
});

test("saveDraftTimesheet rejects a brand-new entry for an inactive client", async () => {
  const timesheet = makeFakeTimesheet();
  Timesheet.findOne = async () => timesheet;
  TimeEntry.findOne = async () => null; // no existing entry for this project/day
  Client.findByPk = async (id) => ({ id, status: "INACTIVE" });
  TimeEntry.findOrCreate = async () => {
    throw new Error("TimeEntry.findOrCreate should not be reached for an inactive client");
  };

  await assert.rejects(
    saveDraftTimesheet(1, {
      weekStartDate: "2026-07-20",
      dailyEntries: [
        { entryDate: "2026-07-20", clientId: 5, projectId: 9, hours: "2", description: "work" },
      ],
    }),
    /The selected client is inactive\. You cannot proceed with creating a project for this client\./
  );
});

test("saveDraftTimesheet allows a brand-new entry for an active client", async () => {
  const timesheet = makeFakeTimesheet();
  Timesheet.findOne = async () => timesheet;
  TimeEntry.findOne = async () => null;
  Client.findByPk = async (id) => ({ id, name: "Acme", status: "ACTIVE" });
  Project.findByPk = async (id) => ({ id, name: "Website Revamp" });
  TimeEntry.findOrCreate = async ({ defaults }) => [{ ...defaults, id: 1, update: async () => {} }, true];
  TimeEntry.findAll = async () => [];

  const result = await saveDraftTimesheet(1, {
    weekStartDate: "2026-07-20",
    dailyEntries: [
      { entryDate: "2026-07-20", clientId: 5, projectId: 9, hours: "2", description: "work" },
    ],
  });
  assert.equal(result.timesheet.status, "DRAFT");
});

test("saveDraftTimesheet still updates an already-existing entry even if its client is now inactive", async () => {
  const timesheet = makeFakeTimesheet();
  Timesheet.findOne = async () => timesheet;
  const existing = { id: 42, status: "DRAFT", update: async (data) => Object.assign(existing, data) };
  TimeEntry.findOne = async () => existing;
  // Client.findByPk may still be called to backfill a display name; it must not block the update.
  Client.findByPk = async (id) => ({ id, name: "Acme", status: "INACTIVE" });
  // Sequelize's real findOrCreate: the row already exists, so `created` is false.
  TimeEntry.findOrCreate = async () => [existing, false];
  TimeEntry.findAll = async () => [existing];

  const result = await saveDraftTimesheet(1, {
    weekStartDate: "2026-07-20",
    dailyEntries: [
      { entryDate: "2026-07-20", clientId: 5, projectId: 9, hours: "3", description: "more work" },
    ],
  });
  assert.equal(result.timesheet.status, "DRAFT");
  assert.equal(existing.hours, 3);
});
