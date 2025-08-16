const express = require('express');

const app = express();
const PORT = process.env.SERVER_API_PORT || 3001;

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

async function startServer() {
  try {
    app.listen(PORT, () => {
      console.log(`Cron service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();