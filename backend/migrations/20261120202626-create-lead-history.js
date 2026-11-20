module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("lead_history", {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
      },

      lead_id: {
        type: Sequelize.UUID,
        allowNull: false,
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

      type: {
        type: Sequelize.STRING(30),
        allowNull: false,
      },

      description: {
        type: Sequelize.TEXT,
        allowNull: false,
      },

      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    await queryInterface.addIndex("lead_history", [
      "lead_id",
      "created_at",
    ]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("lead_history");
  },
};