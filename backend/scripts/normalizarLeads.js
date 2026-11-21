import "dotenv/config";
import { Op } from "sequelize";
import { sequelize, Lead } from "../models/index.js";

import {
  normalizarNome,
  normalizarLocalidade,
} from "../utils/normalizarDados.js";

const aplicar = process.argv.includes("--apply");

async function executar() {
  try {
    await sequelize.authenticate();

    let analisados = 0;
    let alterados = 0;
    let ultimoId = null;

    while (true) {
      const leads = await Lead.findAll({
        attributes: [
          "id",
          "nome",
          "cidade",
          "uf",
          "bairro",
        ],

        where: ultimoId
          ? { id: { [Op.gt]: ultimoId } }
          : {},

        order: [["id", "ASC"]],
        limit: 200,
        raw: true,
      });

      if (!leads.length) break;

      for (const lead of leads) {
        analisados++;

        const dados = {
          nome: normalizarNome(lead.nome),

          cidade:
            normalizarLocalidade(lead.cidade) ||
            "NÃO INFORMADA",

          uf:
            normalizarLocalidade(lead.uf) || null,

          bairro:
            normalizarLocalidade(lead.bairro) || null,
        };

        const possuiAlteracoes = Object.keys(dados).some(
          (campo) => dados[campo] !== lead[campo]
        );

        if (!possuiAlteracoes) continue;

        if (aplicar) {
          await Lead.update(dados, {
            where: { id: lead.id },
            silent: true,
          });
        }

        alterados++;
      }

      ultimoId = leads[leads.length - 1].id;
    }

    console.log({
      modo: aplicar ? "APLICAÇÃO" : "SIMULAÇÃO",
      analisados,
      alterados,
    });
  } catch (error) {
    console.error("Erro na normalização:", error.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

executar();