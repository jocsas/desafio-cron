const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(
  process.env.DB_NAME || "cron_db",
  process.env.DB_USER || "cron_user",
  process.env.DB_PASS || "cron_pass",
  {
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 3306,
    dialect: "mariadb",
    logging: false,
  }
);

module.exports = sequelize;
