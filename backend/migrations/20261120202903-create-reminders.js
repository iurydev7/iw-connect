module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("reminders", {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
      },

      lead_id: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        references: {
          model: "leads",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },

      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },

      scheduled_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },

      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      status: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: "pendente",
      },

      resolved_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },

      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    await queryInterface.addIndex("reminders", [
      "status",
      "scheduled_at",
    ]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("reminders");
  },
};