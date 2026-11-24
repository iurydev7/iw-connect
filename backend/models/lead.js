import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Lead = sequelize.define(
  "Lead",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    nome: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },

    telefone: {
      type: DataTypes.STRING(16),
      allowNull: false,
      unique: true,
    },

    cidade: {
      type: DataTypes.STRING(120),
    },

    uf: {
      type: DataTypes.STRING(2),
    },

    bairro: {
      type: DataTypes.STRING(120),
    },

    origem: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "plataforma",
      validate: {
        isIn: [["plataforma", "manual"]],
      },
    },

    status: {
      type: DataTypes.STRING(40),
      defaultValue: "Pendente",
      allowNull: false,
      validate: {
        isIn: [[
          "Pendente",
          "Contatado",
          "Em negociação",
          "Aguardando retorno",
          "Sem resposta",
          "Contato inexistente",
          "Sem interesse",
          "Convertido",
          "Tratado",
        ]],
      },
    },

    responsavelId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "assigned_user_id",
    },

    dataContatado: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "leads",
    timestamps: true,
    underscored: true,
    paranoid: true,
    createdAt: "dataEntrada",
    deletedAt: "archivedAt",
  }
);

export default Lead;