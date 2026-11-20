import { apiRequest } from "./api.js";

export function login(email, password, remember = false) {
  return apiRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
      remember,
    }),
  });
}

export function me() {
  return apiRequest("/auth/me");
}

export function logout() {
  return apiRequest("/auth/logout", {
    method: "POST",
  });
}