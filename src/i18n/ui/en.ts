/**
 * English UI strings — the source of truth for the `UIStrings` shape.
 * Every other locale must satisfy this type, so a missing key is a build error.
 */
export const en = {
  nav: {
    guides: 'Guides',
    openCalculator: 'Open calculator',
    calculateShort: 'Calculate',
    language: 'Language',
    skipToContent: 'Skip to main content',
    toDark: 'Switch to dark theme',
    toLight: 'Switch to light theme',
    switchTheme: 'Switch theme',
  },
  hero: {
    eyebrow: 'Free · No sign-up',
    start: 'Start calculating',
    learn: 'Learn the method',
  },
  calc: {
    chooseCalculation: 'Choose a calculation',
    calculate: 'Calculate',
    reset: 'Reset',
    tryExample: 'Try an example',
    empty: 'Enter your numbers and press Calculate — the full working appears here.',
    answer: 'Answer',
    calculation: 'Calculation',
    rounded: 'Rounded for display — the exact value has more decimal places.',
    recent: 'Recent calculations',
    clear: 'Clear',
    storedLocally: 'Stored only in this browser. Nothing is sent to a server.',
    copyAnswer: 'Copy answer',
    copyWorking: 'Copy working',
    share: 'Share',
    copied: 'Copied',
    pressCopy: 'Press Ctrl+C',
    linkCopied: 'Link copied',
    copyUrl: 'Copy the URL',
    optional: 'Optional',
    currency: 'Currency',
    currencyNone: 'None',
  },
  sections: {
    related: 'Related calculators',
    faq: 'Frequently asked questions',
    allCalculators: 'All percentage calculators',
    allCalculatorsLead: 'Each one is a dedicated page with its formula, a worked example and the situations it suits.',
    formula: 'The formula',
    example: 'Worked example',
    uses: 'Common uses',
    home: 'Home',
    answerLabel: 'Answer',
  },
  /* Labels for the one navbar menu. Short by design: each sits under a group
     heading, so repeating the category in every item would only add noise. */
  menu: {
    more: 'More calculators',
    percentageOf: 'Percentage of a number',
    whatPercent: 'What percent is X of Y',
    percentOfWhat: 'X is Y% of what number',
    increase: 'Increase',
    decrease: 'Decrease',
    change: 'Change',
    difference: 'Difference',
    discount: 'Discount',
    tax: 'Tax',
    grade: 'Grade',
    average: 'Average',
    win: 'Win rate',
    weightLoss: 'Weight loss',
    bodyFat: 'Body fat',
    howTo: 'How to calculate percentage',
    formulas: 'Percentage formulas',
  },
  footer: {
    percentage: 'Percentage',
    change: 'Change',
    money: 'Money',
    schoolSport: 'School & sport',
    health: 'Health',
    site: 'Site',
    copyright: 'Every calculation runs in your browser',
    formulasLink: 'See the formulas behind every result',
  },
  cta: {
    heading: 'Every percentage question, answered with its working.',
    lead: 'Fourteen calculators, no account, and nothing sent to a server.',
    open: 'Open the calculator',
    browse: 'Browse the formulas',
  },
} as const;

export type UIStrings = {
  -readonly [K in keyof typeof en]: { -readonly [P in keyof (typeof en)[K]]: string };
};
