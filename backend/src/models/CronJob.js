const { DataTypes } = require("sequelize");
const sequelize = require("./index");

const CronJob = sequelize.define("CronJob", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  schedule: { type: DataTypes.STRING, allowNull: false },
  uri: { type: DataTypes.STRING, allowNull: false },
  httpMethod: { type: DataTypes.STRING, defaultValue: "POST" },
  body: { type: DataTypes.JSON, defaultValue: {} },
  timeZone: { type: DataTypes.STRING, defaultValue: "UTC" },
});

module.exports = CronJob;
