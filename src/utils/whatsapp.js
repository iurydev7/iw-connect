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

export function gerarLinkWhatsApp(telefone, nome) {
  const numero = normalizarTelefone(telefone);

  if (!validarTelefone(telefone)) {
    return "";
  }

  const hora = new Date().getHours();

  let saudacao;

  if (hora >= 5 && hora < 12) {
    saudacao = "bom dia";
  } else if (hora >= 12 && hora < 18) {
    saudacao = "boa tarde";
  } else {
    saudacao = "boa noite";
  }

  const nomeLead = String(nome || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .join(" ");

  const mensagem = nomeLead
    ? `Olá, ${saudacao}! Falo com ${nomeLead}?`
    : `Olá, ${saudacao}! Tudo bem?`;

  const mensagemFormatada = encodeURIComponent(mensagem);

  return `https://wa.me/${numero}?text=${mensagemFormatada}`;
}
