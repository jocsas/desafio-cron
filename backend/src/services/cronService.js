const cron = require("node-cron");
const axios = require("axios");
const Redis = require("ioredis");
const { v4: uuidv4 } = require("uuid");
const CronJob = require("../models/CronJob");

const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: process.env.REDIS_PORT || 6379,
});

const axiosUri = (uri) => {
  if (uri.includes("localhost") || uri.includes("127.0.0.1")) {
    return uri.replace(/localhost|127\.0\.0\.1/, "cron-receiver");
  }
  return uri;
};
class CronService {
  constructor() {
    this.activeCrons = new Map();
  }

  async create({
    id = uuidv4(),
    schedule,
    uri,
    httpMethod = "POST",
    body = null,
    timeZone = "UTC",
  }) {
    if (!cron.validate(schedule)) throw new Error("Invalid cron expression");

    const cronRecord = await CronJob.create({
      id,
      schedule,
      uri,
      httpMethod,
      body,
      timeZone,
    });

    const task = cron.schedule(
      schedule,
      async () => {
        const lockKey = `cron-lock:${id}`;
        const lockValue = uuidv4();
        const acquired = await redis.set(lockKey, lockValue, "NX", "EX", 60);
        if (!acquired) return;

        try {
          const response = await axios({
            method: httpMethod,
            url: axiosUri(uri),
            data: typeof body === "string" ? { message: body } : body,
            headers: { "Content-Type": "application/json" },
          });
          console.log(`[${id}] Executado - Status: ${response.status}`);
        } catch (err) {
          console.error(
            `[${id}] Erro:`,
            err.response?.data || err.message || err
          );
        } finally {
          const currentValue = await redis.get(lockKey);
          if (currentValue === lockValue) await redis.del(lockKey);
        }
      },
      { scheduled: false, timezone: timeZone }
    );

    task.start();
    this.activeCrons.set(id, task);
    console.log(`CRON ${id} criado e iniciado (${schedule})`);
    return cronRecord;
  }

  async update({ id, schedule, uri, httpMethod, body, timeZone }) {
    const cronRecord = await CronJob.findByPk(id);
    if (!cronRecord) throw new Error("CRON job not found");

    await cronRecord.update({ schedule, uri, httpMethod, body, timeZone });

    await this.delete(id);
    await this.create({ id, schedule, uri, httpMethod, body, timeZone });
    console.log(`CRON ${id} atualizado`);
    return cronRecord;
  }

  async delete(id) {
    const task = this.activeCrons.get(id);
    console.log(`Tentando deletar CRON ${id}, task:`, task);
    if (task) {
      task.stop();
      console.log(`CRON ${id} parado`);
      this.activeCrons.delete(id);
    }
    const cronRecord = await CronJob.findByPk(id);
    if (!cronRecord) throw new Error("CRON job not found");

    await cronRecord.destroy();
    console.log(`CRON ${id} deletado do DB`);
    return true;
  }

  async list() {
    const dbCrons = await CronJob.findAll();
    return dbCrons.map((c) => ({
      id: c.id,
      schedule: c.schedule,
      uri: c.uri,
      httpMethod: c.httpMethod,
      body: c.body,
      timeZone: c.timeZone,
      running: this.activeCrons.has(c.id),
    }));
  }

  async loadFromDB() {
    const dbCrons = await CronJob.findAll();
    for (const c of dbCrons) {
      if (!this.activeCrons.has(c.id)) {
        await this.create({
          id: c.id,
          schedule: c.schedule,
          uri: c.uri,
          httpMethod: c.httpMethod,
          body: c.body,
          timeZone: c.timeZone,
        });
      }
    }
    console.log("Todos CRONs do DB foram carregados.");
  }
}

module.exports = new CronService();
