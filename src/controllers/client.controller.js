import * as clientService from "../services/client.service.js";

// CREATE
export const createClient = async (req, res) => {
  try {
    const client = await clientService.createClient(req.body);

    res.status(201).json({
      success: true,
      data: client,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// GET ALL
export const getClients = async (req, res) => {
  try {
    const userId = req.query.userId || null;
    const status = req.query.status ? String(req.query.status).toUpperCase() : null;
    let clients = userId
      ? await clientService.getClientsByUser(userId)
      : await clientService.getAllClients(status);

    if (status && userId) {
      clients = clients.filter((c) => c.status === status);
    }

    res.json({
      success: true,
      data: clients,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// UPDATE
export const updateClient = async (req, res) => {
  try {
    const client = await clientService.updateClient(
      req.params.id,
      req.body
    );

    res.json({
      success: true,
      data: client,
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

// DELETE
export const deleteClient = async (req, res) => {
  try {
    const result = await clientService.deleteClient(req.params.id);

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