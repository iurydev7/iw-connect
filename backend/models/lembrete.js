import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Lembrete = sequelize.define(
  "Lembrete",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    leadId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
    },

    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },

    scheduledAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },

    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "pendente",
      validate: {
        isIn: [[
          "pendente",
          "concluido",
          "cancelado",
        ]],
      },
    },

    resolvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "reminders",
    timestamps: true,
    underscored: true,
  }
);

export default Lembrete;