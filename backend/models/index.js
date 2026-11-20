import sequelize from "../config/database.js";
import User from "./user.js";
import Lead from "./lead.js";
import Atendimento from "./atendimento.js";
import Lembrete from "./lembrete.js";

User.hasMany(Lead, {
  foreignKey: "responsavelId",
  as: "leads",
});

Lead.belongsTo(User, {
  foreignKey: "responsavelId",
  as: "responsavel",
});

Lead.hasMany(Atendimento, {
  foreignKey: "leadId",
  as: "historico",
  onDelete: "RESTRICT",
});

Atendimento.belongsTo(Lead, {
  foreignKey: "leadId",
  as: "lead",
  onDelete: "RESTRICT",
});

User.hasMany(Atendimento, {
  foreignKey: "userId",
  as: "atendimentos",
  onDelete: "RESTRICT",
});

Atendimento.belongsTo(User, {
  foreignKey: "userId",
  as: "autor",
  onDelete: "RESTRICT",
});

// Leads e lembretes

Lead.hasOne(Lembrete, {
  foreignKey: "leadId",
  as: "lembrete",
  onDelete: "RESTRICT",
});

Lembrete.belongsTo(Lead, {
  foreignKey: "leadId",
  as: "lead",
  onDelete: "RESTRICT",
});

User.hasMany(Lembrete, {
  foreignKey: "userId",
  as: "lembretesCriados",
  onDelete: "RESTRICT",
});

Lembrete.belongsTo(User, {
  foreignKey: "userId",
  as: "criador",
  onDelete: "RESTRICT",
});

export {
  sequelize,
  User,
  Lead,
  Atendimento,
  Lembrete,
};