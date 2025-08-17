const express = require("express");
const sequelize = require("./models/index");
const helmet = require("helmet");
const cors = require("cors");
require("dotenv-flow").config();

const cronRoutes = require("./routes/cronRoutes.js");

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

app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

app.use("/api/crons", cronRoutes);

async function startServer() {
  try {
    sequelize.sync().then(() => {
      app.listen(PORT, () => {
        console.log(`Backend rodando na porta ${PORT}`);
      });
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
