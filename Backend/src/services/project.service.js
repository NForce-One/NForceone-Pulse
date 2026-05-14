import Project from "../models/project.model.js";
import Client from "../models/client.model.js";
import User from "../models/user.model.js";

// CREATE PROJECT
export const createProject = async (data) => {
  return await Project.create(data);
};

// GET ALL PROJECTS
export const getAllProjects = async () => {
  return await Project.findAll({
    include: [
      { model: Client, attributes: ["id", "name"] },
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