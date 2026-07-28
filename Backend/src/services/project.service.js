import Project from "../models/project.model.js";
import Client from "../models/client.model.js";
import User from "../models/user.model.js";

const PROJECT_NAME_MAX_LENGTH = 100;
const projectNameRegex = /^[A-Za-z\s]+$/;

const validateProjectName = (name) => {
  if (!name || !name.trim()) {
    throw new Error("Project name is required");
  }
  if (name.length > PROJECT_NAME_MAX_LENGTH) {
    throw new Error(`Project name cannot exceed ${PROJECT_NAME_MAX_LENGTH} characters`);
  }
  if (!projectNameRegex.test(name)) {
    throw new Error("Only alphabetic characters (A-Z) and spaces are allowed.");
  }
};

// CREATE PROJECT
export const createProject = async (data) => {
  validateProjectName(data.name);
  return await Project.create(data);
};

// GET ALL PROJECTS
export const getAllProjects = async (status = null) => {
  const clientInclude = { model: Client, attributes: ["id", "name", "status"] };
  if (status) {
    // Also exclude projects whose client no longer matches the requested status
    // (e.g. an ACTIVE project left behind after its client was deactivated).
    clientInclude.where = { status };
    clientInclude.required = true;
  }

  return await Project.findAll({
    where: status ? { status } : undefined,
    include: [
      clientInclude,
      { model: User, as: "Manager", attributes: ["id", "name"] },
    ],
    order: [["createdAt", "DESC"]],
  });
};

// GET PROJECTS BY USER FROM TIME ENTRIES
export const getProjectsByUser = async (userId) => {
  const TimeEntry = (await import("../models/timeEntry.model.js")).default;
  const entries = await TimeEntry.findAll({
    where: { userId },
    attributes: ["projectId", "project"],
    group: ["projectId", "project"],
  });

  const projects = [];
  const seenIds = new Set();
  const seenNames = new Set();

  for (const entry of entries) {
    if (entry.projectId && !seenIds.has(entry.projectId)) {
      seenIds.add(entry.projectId);
      const proj = await Project.findByPk(entry.projectId);
      if (proj) projects.push(proj);
    } else if (entry.project && !seenNames.has(entry.project)) {
      seenNames.add(entry.project);
      projects.push({ id: null, name: entry.project });
    }
  }

  return projects;
};

// GET SINGLE PROJECT
export const getProjectById = async (id) => {
  const project = await Project.findByPk(id);

  if (!project) {
    throw new Error("Project not found");
  }

  return project;
};

// UPDATE PROJECT
export const updateProject = async (id, data) => {
  const project = await Project.findByPk(id);

  if (!project) {
    throw new Error("Project not found");
  }

  if (data.name !== undefined) {
    validateProjectName(data.name);
  }

  if (data.clientId && Number(data.clientId) !== project.clientId) {
    const client = await Client.findByPk(data.clientId);
    if (client && client.status === "INACTIVE") {
      throw new Error(
        "The selected client is inactive. You cannot proceed with creating a project for this client."
      );
    }
  }

  await project.update(data);
  return project;
};

// DELETE PROJECT
export const deleteProject = async (id) => {
  const project = await Project.findByPk(id);

  if (!project) {
    throw new Error("Project not found");
  }

  await project.destroy();

  return { message: "Project deleted successfully" };
};