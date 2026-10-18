import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { CALCULATORS, getCalculator, type CalculatorField } from './calculators.ts';
import { calcKeyForSlug } from '../i18n/config.ts';
import { contentFor, translatedLocales } from '../i18n/content/index.ts';
import { pt as uiPt } from '../i18n/ui/pt.ts';
import { enginePt } from '../i18n/engine/pt.ts';

const LOCALES = translatedLocales().filter((locale) => locale !== 'en');
const fields = (): { calculator: string; mode: string; field: CalculatorField }[] =>
  CALCULATORS.flatMap((calculator) =>
    calculator.modes.flatMap((mode) =>
      mode.fields.map((field) => ({ calculator: calculator.slug, mode: mode.id, field })),
    ),
  );
const labelKey = (field: CalculatorField) => field.labelKey ?? field.name;

describe('calculator labels in every locale', () => {
  test('every label, tab, name and blurb the registry uses is translated', () => {
    assert.ok(LOCALES.length >= 7, 'expected the seven translated locales');
    for (const locale of LOCALES) {
      const labels = contentFor(locale).labels;
      for (const { calculator, mode, field } of fields()) {
        assert.ok(labels.fields[labelKey(field)], `${locale}: no label "${labelKey(field)}" (${calculator} › ${mode})`);
      }
      for (const calculator of CALCULATORS) {
        const key = calcKeyForSlug(calculator.slug)!;
        assert.ok(labels.names[key], `${locale}: no name for ${key}`);
        assert.ok(labels.blurbs[key], `${locale}: no blurb for ${key}`);
        for (const mode of calculator.modes) assert.ok(labels.tabs[mode.id], `${locale}: no tab for ${mode.id}`);
      }
    }
  });

  test('a shared label key keeps one meaning across calculators', () => {
    // Labels are translated by key, so every field sharing a key renders the
    // same translated word. These pairs name the same quantity; a field that
    // means something else needs its own `labelKey`.
    const sameMeaning: Record<string, string[]> = {
      part: ['Number', 'Number (the part)'],
      whole: ['Total', 'Total (the whole)'],
      percent: ['Percentage', 'Discount'],
    };
    const english = new Map<string, Set<string>>();
    for (const { field } of fields()) {
      english.set(labelKey(field), (english.get(labelKey(field)) ?? new Set()).add(field.label));
    }
    for (const [key, labels] of english) {
      if (labels.size === 1) continue;
      for (const label of labels) {
        assert.ok(sameMeaning[key]?.includes(label), `key "${key}" is used for different things: ${[...labels].join(' / ')}`);
      }
    }
  });

  test('tax fields are labelled as tax amounts, not exam marks', () => {
    const tax = getCalculator('/tax-percentage-calculator');
    const grade = getCalculator('/grade-percentage-calculator');
    const gradeTotal = grade.modes[0]!.fields.find((field) => field.name === 'total')!;
    const taxTotals = tax.modes.flatMap((mode) => mode.fields.filter((field) => field.name === 'total'));
    assert.equal(taxTotals.length, 2, 'the remove-tax and find-rate modes both take a total');
    for (const field of taxTotals) assert.notEqual(labelKey(field), labelKey(gradeTotal));
    for (const locale of LOCALES) {
      const labels = contentFor(locale).labels;
      for (const field of taxTotals) {
        assert.notEqual(
          labels.fields[labelKey(field)],
          labels.fields[labelKey(gradeTotal)],
          `${locale}: the tax total reuses the grade calculator's wording`,
        );
      }
    }
  });
});

describe('related calculators', () => {
  test('every calculator lists real, distinct siblings and never itself', () => {
    for (const calculator of CALCULATORS) {
      assert.ok(calculator.related.length > 0, `${calculator.slug} has no related calculators`);
      assert.equal(new Set(calculator.related).size, calculator.related.length, `${calculator.slug} repeats a sibling`);
      assert.ok(!calculator.related.includes(calculator.slug), `${calculator.slug} lists itself`);
      for (const slug of calculator.related) assert.ok(calcKeyForSlug(slug), `${calculator.slug} lists unknown ${slug}`);
    }
  });
});

describe('Portuguese', () => {
  test('uses European Portuguese throughout, as the pt_PT locale declares', () => {
    // Brazilian-only spellings and vocabulary. URLs are skipped: the routes keep
    // their original slugs so that no URL changes.
    const brazilianOnly =
      /(?<![\p{L}])(porcentagens?|cadastr\p{L}*|digit[ea]\p{L}*|toque|tela|usuári[oa]s?|arquivos?|contato|vocês?|esportes?|quatorze|compartilh\p{L}*|alíquotas?|quadril|pular|ache|achar)(?![\p{L}])/giu;
    for (const [file, strings] of [
      ['ui/pt.ts', uiPt],
      ['engine/pt.ts', enginePt],
      ['content/pt.ts', contentFor('pt')],
    ] as const) {
      const text = JSON.stringify(strings).replace(/"\/[^"]*"/g, '""');
      assert.deepEqual([...new Set(text.match(brazilianOnly) ?? [])], [], `${file} mixes in Brazilian Portuguese`);
    }
  });
});
