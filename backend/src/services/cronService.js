const cron = require('node-cron');
const axios = require('axios');

class CronService {
  constructor() {
    this.activeCrons = new Map();
  }

  // Criar um novo CRON
  create({ id, schedule, uri, method = 'GET', body = null, timeZone = 'UTC' }) {
    console.log(id)
    if (!cron.validate(schedule)) {
      throw new Error('Invalid cron expression');
    }

    const task = cron.schedule(
      schedule,
      async () => {
        try {
          const response = await axios({
            method: method.toLowerCase(),
            url: uri,
            data: body,
            headers: { 'Content-Type': 'application/json' }
          });
          console.log(`[${id}] Executado - Status: ${response.status}`);
        } catch (err) {
          console.error(`[${id}] Erro: ${err.message}`);
        }
      },
      { scheduled: false, timezone: timeZone }
    );

    task.start();
    this.activeCrons.set(id, task);
    console.log(`CRON ${id} criado e iniciado (${schedule})`);
  }

  // Atualizar (na verdade recria)
  update(id, schedule, uri, method, body, timeZone) {
    this.delete(id);
    this.create(id, schedule, uri, method, body, timeZone);
    console.log(`CRON ${id} atualizado`);
  }

  // Deletar um CRON
  delete(id) {
    const task = this.activeCrons.get(id);
    if (task) {
      task.stop();
      this.activeCrons.delete(id);
      console.log(`CRON ${id} deletado`);
      return true;
    }
    return false;
  }

  // Listar todos os CRONs ativos
  list() {
    return Array.from(this.activeCrons.keys()).map((id) => ({
      id,
      running: this.activeCrons.get(id).running
    }));
  }
}

module.exports = new CronService();
