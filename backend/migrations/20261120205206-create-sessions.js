module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("sessions", {
      token_hash: {
        type: Sequelize.CHAR(64),
        primaryKey: true,
        allowNull: false,
      },

      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },

      expires_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },

      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    await queryInterface.addIndex("sessions", [
      "expires_at",
    ]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("sessions");
  },
};