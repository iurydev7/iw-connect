module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("leads", "origem", {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: "plataforma",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("leads", "origem");
  },
};
