const cron = require("node-cron");
const axios = require("axios");
const Redis = require("ioredis");
const { v4: uuidv4 } = require("uuid");
const CronJob = require("../models/CronJob");

const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: process.env.REDIS_PORT || 6379,
});

// Redis para Pub/Sub
const redisSub = new Redis({
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
    this.instanceId = uuidv4(); // ID único da instância
    this.initPubSub();
  }

  // Inicializa Pub/Sub para sincronizar operações entre todas as instâncias
  initPubSub() {
    const channels = ["cron-created", "cron-updated", "cron-deleted"];
    redisSub.subscribe(...channels);
    
    redisSub.on("message", async (channel, message) => {
      try {
        const data = JSON.parse(message);
        
        // Ignora mensagens da própria instância para evitar loops
        if (data.instanceId === this.instanceId) return;
        
        switch (channel) {
          case "cron-created":
            await this.handleCronCreated(data.cronId);
            break;
          case "cron-updated":
            await this.handleCronUpdated(data.cronId);
            break;
          case "cron-deleted":
            await this.handleCronDeleted(data.cronId);
            break;
        }
      } catch (err) {
        console.error(`Erro ao processar mensagem Pub/Sub [${channel}]:`, err);
      }
    });
  }

  // Handlers para sincronização via Pub/Sub
  async handleCronCreated(cronId) {
    if (this.activeCrons.has(cronId)) return;
    
    const cronRecord = await CronJob.findByPk(cronId);
    if (cronRecord) {
      this.scheduleTask(cronRecord);
      console.log(`CRON ${cronId} iniciado via Pub/Sub`);
    }
  }

  async handleCronUpdated(cronId) {
    // Para a task atual se existir
    const task = this.activeCrons.get(cronId);
    if (task) {
      task.stop();
      this.activeCrons.delete(cronId);
    }

    // Busca a versão atualizada e reagenda
    const cronRecord = await CronJob.findByPk(cronId);
    if (cronRecord) {
      this.scheduleTask(cronRecord);
      console.log(`CRON ${cronId} atualizado via Pub/Sub`);
    }
  }

  async handleCronDeleted(cronId) {
    const task = this.activeCrons.get(cronId);
    if (task) {
      task.stop();
      this.activeCrons.delete(cronId);
      console.log(`CRON ${cronId} parado via Pub/Sub`);
    }
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

    this.scheduleTask(cronRecord);

    await redis.publish("cron-created", JSON.stringify({
      cronId: id,
      instanceId: this.instanceId
    }));

    console.log(`CRON ${id} criado e sincronizado (${schedule})`);
    return cronRecord;
  }

  scheduleTask(cronRecord) {
    const { id, timeZone } = cronRecord;

    const existingTask = this.activeCrons.get(id);
    if (existingTask) {
      existingTask.stop();
    }

    const task = cron.schedule(
      cronRecord.schedule,
      async () => {
        const lockKey = `cron-lock:${id}`;
        const lockValue = uuidv4();
        const lockTTL = 300;
        
        const acquired = await redis.set(lockKey, lockValue, "NX", "EX", lockTTL);
        if (!acquired) {
          console.log(`[${id}] Execução ignorada (lock já existe)`);
          return;
        }

        try {
          const fresh = await CronJob.findByPk(id);
          if (!fresh) {
            task.stop();
            this.activeCrons.delete(id);
            console.log(`CRON ${id} parado (não existe mais no DB)`);
            return;
          }

          const response = await axios({
            method: fresh.httpMethod,
            url: axiosUri(fresh.uri),
            data: typeof fresh.body === "string" 
              ? { message: fresh.body } 
              : fresh.body,
            headers: { "Content-Type": "application/json" },
            timeout: 30000
          });

          console.log(`[${id}] Executado com sucesso - Status: ${response.status}`);
          
          await redis.set(`cron-last-executed:${id}`, Date.now());
          
        } catch (err) {
          console.error(`[${id}] Erro na execução:`, {
            status: err.response?.status,
            data: err.response?.data,
            message: err.message
          });
        } finally {
          const currentValue = await redis.get(lockKey);
          if (currentValue === lockValue) {
            await redis.del(lockKey);
          }
        }
      },
      { 
        scheduled: false, 
        timeZone,
        runOnInit: false
      }
    );

    task.start();
    this.activeCrons.set(id, task);
  }

  async update({ id, schedule, uri, httpMethod, body, timeZone }) {
    const cronRecord = await CronJob.findByPk(id);
    if (!cronRecord) throw new Error("CRON job not found");

    const updatedCron = await cronRecord.update({
      schedule,
      uri,
      httpMethod,
      body,
      timeZone,
    });

    const task = this.activeCrons.get(id);
    if (task) {
      task.stop();
      this.activeCrons.delete(id);
    }

    this.scheduleTask(updatedCron);

    await redis.publish("cron-updated", JSON.stringify({
      cronId: id,
      instanceId: this.instanceId
    }));

    console.log(`CRON ${id} atualizado e sincronizado`);
    return updatedCron;
  }

  async delete(id) {
    const task = this.activeCrons.get(id);
    if (task) {
      task.stop();
      this.activeCrons.delete(id);
    }

    const cronRecord = await CronJob.findByPk(id);
    if (!cronRecord) throw new Error("CRON job not found");

    await cronRecord.destroy();

    await redis.publish("cron-deleted", JSON.stringify({
      cronId: id,
      instanceId: this.instanceId
    }));

    await Promise.all([
      redis.del(`cron-lock:${id}`),
      redis.del(`cron-last-executed:${id}`)
    ]);

    console.log(`CRON ${id} deletado e sincronizado`);
    return true;
  }

  async list() {
    const dbCrons = await CronJob.findAll({
      order: [['createdAt', 'DESC']]
    });
    
    const cronsList = await Promise.all(
      dbCrons.map(async (c) => {
        const lastExecuted = await redis.get(`cron-last-executed:${c.id}`);
        return {
          id: c.id,
          schedule: c.schedule,
          uri: c.uri,
          httpMethod: c.httpMethod,
          body: c.body,
          timeZone: c.timeZone,
          running: this.activeCrons.has(c.id),
          lastExecutedAt: lastExecuted ? new Date(parseInt(lastExecuted)) : null,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt
        };
      })
    );

    return cronsList;
  }

  async loadFromDB() {
    try {
      const dbCrons = await CronJob.findAll();
      let loaded = 0;
      
      for (const cronRecord of dbCrons) {
        if (!this.activeCrons.has(cronRecord.id)) {
          this.scheduleTask(cronRecord);
          loaded++;
        }
      }
      
      console.log(`${loaded} CRONs carregados do DB e iniciados na instância ${this.instanceId}`);
      return loaded;
    } catch (err) {
      console.error("Erro ao carregar CRONs do DB:", err);
      throw err;
    }
  }

  async getStatus() {
    const dbCrons = await CronJob.findAll();
    const status = await Promise.all(
      dbCrons.map(async (c) => {
        const lastExecuted = await redis.get(`cron-last-executed:${c.id}`);
        const isLocked = await redis.exists(`cron-lock:${c.id}`);
        
        return {
          id: c.id,
          schedule: c.schedule,
          uri: c.uri,
          running: this.activeCrons.has(c.id),
          lastExecutedAt: lastExecuted ? new Date(parseInt(lastExecuted)) : null,
          isLocked: Boolean(isLocked),
          instanceId: this.instanceId
        };
      })
    );
    
    return {
      instanceId: this.instanceId,
      totalCrons: status.length,
      activeCrons: this.activeCrons.size,
      crons: status
    };
  }

  async healthCheck() {
    try {
      await redis.ping();
      const dbCrons = await CronJob.findAll();
      
      return {
        status: "healthy",
        instanceId: this.instanceId,
        redis: "connected",
        database: "connected",
        totalCronsDB: dbCrons.length,
        activeCronsInstance: this.activeCrons.size
      };
    } catch (err) {
      return {
        status: "unhealthy",
        instanceId: this.instanceId,
        error: err.message
      };
    }
  }
}

module.exports = new CronService();