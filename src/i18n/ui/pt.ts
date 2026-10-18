import type { UIStrings } from './en.ts';

/*
 * European Portuguese, matching the locale's `pt_PT` declaration and the page
 * content: "percentagem", "registo", "partilhar", "desporto", formal address
 * with the possessive article ("os seus números").
 */
export const pt: UIStrings = {
  nav: {
    guides: 'Guias', openCalculator: 'Abrir calculadora',
    calculateShort: 'Calcular', language: 'Idioma',
    skipToContent: 'Saltar para o conteúdo principal',
    toDark: 'Mudar para o tema escuro', toLight: 'Mudar para o tema claro',
    switchTheme: 'Mudar tema', breadcrumb: 'Navegação estrutural',
  },
  hero: {
    eyebrow: 'Grátis · Sem registo', start: 'Começar a calcular',
    learn: 'Aprender o método',
  },
  calc: {
    chooseCalculation: 'Escolha um cálculo', calculate: 'Calcular', reset: 'Repor',
    tryExample: 'Experimentar um exemplo',
    empty: 'Introduza os seus números e carregue em Calcular: todo o desenvolvimento aparece aqui.',
    answer: 'Resultado', calculation: 'Cálculo',
    rounded: 'Arredondado para apresentação: o valor exato tem mais casas decimais.',
    recent: 'Cálculos recentes', clear: 'Limpar',
    storedLocally: 'Guardado apenas neste navegador. Nada é enviado a um servidor.',
    copyAnswer: 'Copiar resultado', copyWorking: 'Copiar desenvolvimento', share: 'Partilhar',
    copied: 'Copiado', pressCopy: 'Prima Ctrl+C', linkCopied: 'Link copiado',
    copyUrl: 'Copie o URL', optional: 'Opcional', currency: 'Moeda', currencyNone: 'Nenhuma',
    currencyDollar: 'Dólar', currencyRupee: 'Rupia', currencyEuro: 'Euro',
    currencyPound: 'Libra', currencyYen: 'Iene',
    formulaLabel: 'Fórmula',
  },
  sections: {
    related: 'Calculadoras relacionadas', faq: 'Perguntas frequentes',
    allCalculators: 'Todas as calculadoras de percentagem',
    allCalculatorsLead: 'Cada uma tem a sua própria página, com a fórmula, um exemplo resolvido e as situações em que é útil.',
    formula: 'A fórmula', example: 'Exemplo resolvido', uses: 'Usos comuns',
    home: 'Início', answerLabel: 'Resultado',
  },
  menu: {
    more: 'Mais calculadoras',
    percentageOf: 'Percentagem de um número',
    whatPercent: 'Que percentagem é X de Y',
    percentOfWhat: 'X é Y % de que número',
    increase: 'Aumento', decrease: 'Diminuição', change: 'Variação',
    difference: 'Diferença', discount: 'Desconto', tax: 'Imposto',
    grade: 'Notas', average: 'Média', win: 'Vitórias',
    weightLoss: 'Perda de peso', bodyFat: 'Gordura corporal',
    howTo: 'Como calcular percentagens', formulas: 'Fórmulas de percentagem',
  },
  footer: {
    percentage: 'Percentagem', change: 'Variação', money: 'Dinheiro',
    schoolSport: 'Escola e desporto', health: 'Saúde', site: 'Site',
    copyright: 'Todos os cálculos são feitos no seu navegador',
    formulasLink: 'Veja as fórmulas por detrás de cada resultado',
    about: 'Sobre', contact: 'Contacto', privacy: 'Política de privacidade',
    terms: 'Termos', disclaimer: 'Aviso legal',
  },
  cta: {
    heading: 'Todas as perguntas sobre percentagens, respondidas com o desenvolvimento.',
    lead: 'Catorze calculadoras, sem conta e sem enviar nada para um servidor.',
    open: 'Abrir a calculadora', browse: 'Ver as fórmulas',
  },
};
