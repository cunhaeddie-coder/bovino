export const RACAS_GRUPOS = [
  {
    aptidao: "Corte",
    racas: [
      "Aberdeen Angus",
      "Blonde d'Aquitaine",
      "Braford",
      "Brahman",
      "Brangus",
      "Canchim",
      "Charolês",
      "Chianina",
      "Devon",
      "Hereford",
      "Ibagé",
      "Limousin",
      "Marchigiana",
      "Nelore",
      "Red Angus",
      "Sindi",
      "Tabapuã",
    ],
  },
  {
    aptidao: "Dupla Aptidão",
    racas: [
      "Caracú",
      "Guzerá",
      "Indubrasil",
      "Normando",
      "Pantaneiro",
      "Pardo Suíço",
      "Pé-duro",
      "Red Poll",
      "Shorthorn",
      "Simental",
    ],
  },
  {
    aptidao: "Leite",
    racas: [
      "Gir",
      "Girolando",
      "Guernsey",
      "Guzolando",
      "Holandesa",
      "Jersey",
    ],
  },
  {
    aptidao: "Outros",
    racas: ["Cruzado", "Outro"],
  },
] as const;

/** Lista plana de todas as raças (útil para validação e busca) */
export const TODAS_RACAS = RACAS_GRUPOS.flatMap((g) => g.racas);
