export function normalizarTexto(valor) {
  return String(valor ?? "")
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ");
}

export function normalizarNome(valor) {
  const preposicoes = ["da", "de", "do", "das", "dos", "e"];

  return normalizarTexto(valor)
    .toLocaleLowerCase("pt-BR")
    .split(" ")
    .map((palavra, index) => {
      if (index !== 0 && preposicoes.includes(palavra)) {
        return palavra;
      }

      return palavra.replace(
        /(^|[-’'])\p{L}/gu,
        (letra) => letra.toLocaleUpperCase("pt-BR")
      );
    })
    .join(" ");
}

export function normalizarLocalidade(valor) {
  return normalizarTexto(valor)
    .toLocaleUpperCase("pt-BR");
}