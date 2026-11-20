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

export function reservar(id) {
  return apiRequest(`/leads/${id}/claim`, {
    method: "PATCH",
  });
}

export function alterarStatus(id, status) {
  return apiRequest(`/leads/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}