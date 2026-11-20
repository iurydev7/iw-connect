module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("leads", {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },

      nome: {
        type: Sequelize.STRING(150),
        allowNull: false,
      },

      telefone: {
        type: Sequelize.STRING(16),
        allowNull: false,
        unique: true,
      },

      cidade: {
        type: Sequelize.STRING(120),
        allowNull: true,
      },

      uf: {
        type: Sequelize.STRING(2),
        allowNull: true,
      },

      bairro: {
        type: Sequelize.STRING(120),
        allowNull: true,
      },

      status: {
        type: Sequelize.STRING(40),
        allowNull: false,
        defaultValue: "Pendente",
      },

      assigned_user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },

      data_entrada: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },

      data_contatado: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },

      archived_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    await queryInterface.addIndex("leads", ["status"]);
    await queryInterface.addIndex("leads", ["uf", "cidade"]);
    await queryInterface.addIndex("leads", ["assigned_user_id"]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("leads");
  },
};