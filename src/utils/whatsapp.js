
export function normalizarTelefone(telefone) {
  const numero = String(telefone ?? "").replace(/\D/g, "");

  if (numero.length === 11) {
    return `55${numero}`;
  }

  if (numero.length === 13 && numero.startsWith("55")) {
    return numero;
  }

  return "";
}

export function validarTelefone(telefone) {
  const numero = normalizarTelefone(telefone);

  return /^55[1-9][0-9]9[0-9]{8}$/.test(numero);
}

export function gerarLinkWhatsApp(telefone) {
  const numero = normalizarTelefone(telefone);

  if (!validarTelefone(telefone)) {
    return "";
  }

  return `https://wa.me/${numero}`;
}
