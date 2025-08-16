const express = require('express');
const { v4: uuidv4 } = require('uuid');
const cronService = require('../services/cronService');

const router = express.Router();

const cronJobs = [];

router.get('/', (req, res) => {
  res.json(cronJobs);
});

router.get('/:id', (req, res) => {
  const cron = cronJobs.find(c => c.id === req.params.id);
  if (!cron) return res.status(404).json({ error: 'CRON job not found' });
  res.json(cron);
});

router.post('/', (req, res) => {
  const { schedule, uri, httpMethod, body, timeZone } = req.body;

  if (!schedule || !uri) {
    return res.status(400).json({ error: 'schedule e uri são obrigatórios' });
  }

  const cronData = {
    id: uuidv4(),
    schedule,
    uri,
    httpMethod,
    body,
    timeZone,
    active: true
  };

  cronJobs.push(cronData);

  cronService.create(cronData);

  res.status(201).json(cronData);
});

router.put('/:id', (req, res) => {
  const cron = cronJobs.find(c => c.id === req.params.id);
  if (!cron) return res.status(404).json({ error: 'CRON job not found' });

  const { schedule, uri, httpMethod, body, timeZone } = req.body;
  Object.assign(cron, { schedule, uri, httpMethod, body, timeZone });

  cronService.updateCron(cron.id, { schedule, uri, httpMethod, body, timeZone });

  res.json(cron);
});

router.delete('/:id', (req, res) => {
  const index = cronJobs.findIndex(c => c.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'CRON job not found' });

  const cron = cronJobs[index];

  cronService.stopCron(cron.id);
  cronJobs.splice(index, 1);

  res.json({ message: 'CRON job deleted successfully' });
});

module.exports = router;
