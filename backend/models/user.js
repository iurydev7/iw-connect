import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },

    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },

    email: {
      type: DataTypes.STRING(254),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },

    passwordHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: "password_hash",
    },

    role: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "consultor",
    },
  },
  {
  tableName: "users",
  timestamps: true,
  underscored: true,
  paranoid: true,
  deletedAt: "deletedAt",
}
);

export default User;