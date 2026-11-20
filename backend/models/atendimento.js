import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Atendimento = sequelize.define(
  "Atendimento",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    leadId: {
      type: DataTypes.UUID,
      allowNull: false,
    },

    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },

    type: {
      type: DataTypes.STRING(30),
      allowNull: false,
      validate: {
        isIn: [[
          "importacao",
          "reserva",
          "status",
          "observacao",
          "retorno",
          "arquivamento",
        ]],
      },
    },

    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
  },
  {
    tableName: "lead_history",
    timestamps: true,
    underscored: true,
    updatedAt: false,
  }
);

export default Atendimento;