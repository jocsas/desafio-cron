const express = require('express');
const helmet = require('helmet')
const cors = require('cors')

const app = express();
const PORT = process.env.SERVER_API_PORT || 3001;

const whiteList = [
  'http://localhost:3000',
];

const corsOptions = {
  origin(origin, cb) {
    if (whiteList.indexOf(origin) !== -1 || !origin) {
      cb(null, true);
    } else {
      cb(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json());

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