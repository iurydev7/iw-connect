import { apiRequest } from "./api.js";

export function listar() {
  return apiRequest("/users");
}

export function criar(dados) {
  return apiRequest("/users", {
    method: "POST",
    body: JSON.stringify(dados),
  });
}

export function editar(id, dados) {
  return apiRequest(`/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(dados),
  });
}