const express = require("express");
const sequelize = require("./models/index");
const helmet = require("helmet");
const cors = require("cors");
require("dotenv-flow").config();

const cronRoutes = require("./routes/cronRoutes.js");
const cronService = require("./services/cronService.js");

const app = express();
const PORT = process.env.SERVER_API_PORT || 3001;

const whiteList = ["http://localhost:3000", "http://localhost:5173", "http://frontend.localhost"];

const corsOptions = {
  origin(origin, cb) {
    if (whiteList.indexOf(origin) !== -1 || !origin) {
      cb(null, true);
    } else {
      cb(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
};

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json());

app.get('/api/health', async (req, res) => {
  try {
    const health = await cronService.healthCheck();
    
    const statusCode = health.status === 'healthy' ? 200 : 503;
    
    res.status(statusCode).json({
      timestamp: new Date().toISOString(),
      ...health
    });
  } catch (err) {
    res.status(503).json({
      timestamp: new Date().toISOString(),
      status: 'error',
      error: err.message
    });
  }
});

app.use("/api/crons", cronRoutes);

async function startServer() {
  try {
    await sequelize.sync();

    await cronService.loadFromDB();

    app.listen(PORT, () => {
      console.log(`Backend rodando na porta ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
