import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Session = sequelize.define(
  "Session",
  {
    tokenHash: {
      type: DataTypes.CHAR(64),
      primaryKey: true,
      allowNull: false,
    },

    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },

    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    tableName: "sessions",
    timestamps: true,
    underscored: true,
    updatedAt: false,
  }
);

export default Session;