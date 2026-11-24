import { apiRequest } from "./api.js";

export function listar(filtros = {}) {
  const params = new URLSearchParams();

  Object.entries(filtros).forEach(([chave, valor]) => {
    if (valor !== "" && valor != null) {
      params.set(chave, valor);
    }
  });

  return apiRequest(`/leads?${params.toString()}`);
}

export async function importar(leads) {
  const total = {
    importados: 0,
    duplicados: 0,
    invalidos: 0,
  };

  for (let i = 0; i < leads.length; i += 500) {
    const resultado = await apiRequest("/leads/import", {
      method: "POST",
      body: JSON.stringify({
        leads: leads.slice(i, i + 500),
      }),
    });

    total.importados += resultado.importados;
    total.duplicados += resultado.duplicados;
    total.invalidos += resultado.invalidos;
  }

  return total;
}

export function distribuir(leadIds, consultorId) {
  return apiRequest("/leads/distribute", {
    method: "POST",
    body: JSON.stringify({
      leadIds,
      consultorId,
    }),
  });
}

export function alterarStatus(id, status) {
  return apiRequest(`/leads/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function remover(id) {
  return apiRequest(`/leads/${id}`, {
    method: "DELETE",
  });
}

export function removerEmMassa(leadIds) {
  return apiRequest("/leads/bulk", {
    method: "DELETE",
    body: JSON.stringify({ leadIds }),
  });
}

export function obterIndicadores(responsavel) {
  const params = new URLSearchParams();

  if (responsavel) {
    params.set("responsavel", responsavel);
  }

  const queryString = params.toString();
  const query = queryString ? `?${queryString}` : "";

  return apiRequest(`/leads/metadata${query}`);
}

export function listarHistorico(id) {
  return apiRequest(`/leads/${id}/history`);
}

export function salvarObservacao(id, observacao) {
  return apiRequest(`/leads/${id}/observations`, {
    method: "POST",
    body: JSON.stringify({ observacao }),
  });
}
