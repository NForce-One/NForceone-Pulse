import * as projectService from "../services/project.service.js";

// CREATE
export const createProject = async (req, res) => {
  try {
    const project = await projectService.createProject(req.body);

    res.status(201).json({
      success: true,
      data: project,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// GET ALL
export const getProjects = async (req, res) => {
  try {
    const userId = req.query.userId || null;
    const status = req.query.status ? String(req.query.status).toUpperCase() : null;
    let projects = userId
      ? await projectService.getProjectsByUser(userId)
      : await projectService.getAllProjects(status);

    if (status && userId) {
      projects = projects.filter((p) => p.status === status);
    }

    res.json({
      success: true,
      data: projects,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// GET ONE
export const getProject = async (req, res) => {
  try {
    const project = await projectService.getProjectById(req.params.id);

    res.json({
      success: true,
      data: project,
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

// UPDATE
export const updateProject = async (req, res) => {
  try {
    const project = await projectService.updateProject(
      req.params.id,
      req.body
    );

    res.json({
      success: true,
      data: project,
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

// DELETE
export const deleteProject = async (req, res) => {
  try {
    const result = await projectService.deleteProject(req.params.id);

    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};