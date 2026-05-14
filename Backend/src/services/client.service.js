import Client from "../models/client.model.js";

// CREATE
export const createClient = async (data) => {
  return await Client.create(data);
};

// GET ALL
export const getAllClients = async () => {
  return await Client.findAll();
};

// GET CLIENTS BY USER FROM TIME ENTRIES
export const getClientsByUser = async (userId) => {
  const TimeEntry = (await import("../models/timeEntry.model.js")).default;
  const entries = await TimeEntry.findAll({
    where: { userId },
    attributes: ["clientId", "client"],
    group: ["clientId", "client"],
  });

  const clients = [];
  const seenIds = new Set();
  const seenNames = new Set();

  for (const entry of entries) {
    if (entry.clientId && !seenIds.has(entry.clientId)) {
      seenIds.add(entry.clientId);
      const client = await Client.findByPk(entry.clientId);
      if (client) clients.push(client);
    } else if (entry.client && !seenNames.has(entry.client)) {
      seenNames.add(entry.client);
      clients.push({ id: null, name: entry.client });
    }
  }

  return clients;
};

// GET BY ID
export const getClientById = async (id) => {
  return await Client.findByPk(id);
};

// UPDATE
export const updateClient = async (id, data) => {
  const client = await Client.findByPk(id);

  if (!client) {
    throw new Error("Client not found");
  }

  await client.update(data);
  return client;
};

// DELETE
export const deleteClient = async (id) => {
  const client = await Client.findByPk(id);

  if (!client) {
    throw new Error("Client not found");
  }

  await client.destroy();
  return { message: "Client deleted successfully" };
};