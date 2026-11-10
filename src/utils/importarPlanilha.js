
import * as XLSX from "xlsx";

export async function importarPlanilha(arquivo) {
  const dados = await arquivo.arrayBuffer();

  const workbook = XLSX.read(dados, {
    type: "array",
  });

  const primeiraAba = workbook.SheetNames[0];

  const worksheet = workbook.Sheets[primeiraAba];

  const linhas = XLSX.utils.sheet_to_json(worksheet, {
    defval: "",
    raw: false,
  });

  return linhas;
}
