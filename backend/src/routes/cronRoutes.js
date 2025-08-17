const express = require("express");
const { v4: uuidv4 } = require("uuid");
const cronService = require("../services/cronService");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const cronJobs = await cronService.list();
    res.json(cronJobs);
  } catch (error) {
    console.error("Erro ao listar CRONs:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.get("/status-stream", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const sendStatus = async () => {
    const status = await cronService.getStatus();
    res.write(`data: ${JSON.stringify(status)}\n\n`);
  };

  const interval = setInterval(sendStatus, 2000);
  sendStatus();

  req.on("close", () => {
    clearInterval(interval);
    res.end();
  });
});

router.get("/:id", async (req, res) => {
  try {
    const cronJobs = await cronService.list();
    const cron = cronJobs.find((c) => c.id === req.params.id);

    if (!cron) {
      return res.status(404).json({ error: "CRON job not found" });
    }

    res.json(cron);
  } catch (error) {
    console.error("Erro ao buscar CRON:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { schedule, uri, httpMethod, body, timeZone } = req.body;

    if (!schedule || !uri) {
      return res.status(400).json({ error: "schedule e uri são obrigatórios" });
    }

    const cronData = {
      id: uuidv4(),
      schedule,
      uri,
      httpMethod: httpMethod || "POST",
      body,
      timeZone: timeZone || "UTC",
    };

    const createdCron = await cronService.create(cronData);

    res.status(201).json(createdCron);
  } catch (error) {
    console.error("Erro ao criar CRON:", error);
    res.status(500).json({
      error: "Erro ao criar CRON job",
      details: error.message,
    });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { schedule, uri, httpMethod, body, timeZone } = req.body;

    const updatedCron = await cronService.update({
      id: req.params.id,
      schedule,
      uri,
      httpMethod,
      body,
      timeZone,
    });

    res.json(updatedCron);
  } catch (error) {
    console.error("Erro ao atualizar CRON:", error);

    if (error.message === "CRON job not found") {
      return res.status(404).json({ error: "CRON job not found" });
    }

    res.status(500).json({
      error: "Erro ao atualizar CRON job",
      details: error.message,
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await cronService.delete(req.params.id);

    res.json({ message: "CRON job deleted successfully" });
  } catch (error) {
    console.error("Erro ao deletar CRON:", error);

    if (error.message === "CRON job not found") {
      return res.status(404).json({ error: "CRON job not found" });
    }

    res.status(500).json({
      error: "Erro ao deletar CRON job",
      details: error.message,
    });
  }
});

module.exports = router;
