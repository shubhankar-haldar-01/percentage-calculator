/**
 * Calculator controller.
 *
 * Wires every `[data-calculator]` block on the page to the shared engine. All
 * maths, wording and validation come from `src/lib/percentage.ts`; this file
 * only moves values between the DOM and that engine.
 */

import { calculate, setEngineStrings, type CalcResult, type OperationId } from '../lib/percentage.ts';
import { track } from '../lib/analytics.ts';
import type { EngineStrings } from '../i18n/engine/en.ts';

/**
 * Engine strings are loaded per locale so a page only ships its own language.
 * Vite code-splits each of these into its own chunk.
 */
const ENGINE: Record<string, () => Promise<EngineStrings>> = {
  en: () => import('../i18n/engine/en.ts').then((m) => m.engineEn),
  es: () => import('../i18n/engine/es.ts').then((m) => m.engineEs),
  ja: () => import('../i18n/engine/ja.ts').then((m) => m.engineJa),
  fr: () => import('../i18n/engine/fr.ts').then((m) => m.engineFr),
  de: () => import('../i18n/engine/de.ts').then((m) => m.engineDe),
  pt: () => import('../i18n/engine/pt.ts').then((m) => m.enginePt),
  ko: () => import('../i18n/engine/ko.ts').then((m) => m.engineKo),
  it: () => import('../i18n/engine/it.ts').then((m) => m.engineIt),
};

/** Strings the rendered result needs, handed over from the server as JSON. */
type ClientStrings = {
  answer: string; calculation: string; rounded: string;
  copyAnswer: string; copyWorking: string; share: string;
  copied: string; pressCopy: string; linkCopied: string; copyUrl: string;
};

const FALLBACK_STRINGS: ClientStrings = {
  answer: 'Answer', calculation: 'Calculation',
  rounded: 'Rounded for display — the exact value has more decimal places.',
  copyAnswer: 'Copy answer', copyWorking: 'Copy working', share: 'Share',
  copied: 'Copied', pressCopy: 'Press Ctrl+C',
  linkCopied: 'Link copied', copyUrl: 'Copy the URL',
};

const HISTORY_KEY = 'pc:history:v1';
const HISTORY_LIMIT = 12;
const CURRENCY_KEY = 'pc:currency:v1';

type HistoryEntry = { text: string; href: string; at: number };

/* -------------------------------------------------------------------------- */
/* Storage — every helper tolerates blocked or unavailable storage.            */
/* -------------------------------------------------------------------------- */

function readHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is HistoryEntry =>
        !!entry && typeof entry.text === 'string' && typeof entry.href === 'string',
    );
  } catch {
    return [];
  }
}

function writeHistory(entries: HistoryEntry[]): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, HISTORY_LIMIT)));
  } catch {
    /* Private mode or storage disabled — history is a convenience, not a feature we block on. */
  }
}

/* -------------------------------------------------------------------------- */
/* Clipboard / share                                                          */
/* -------------------------------------------------------------------------- */

/** Resolve to `fallback` if `promise` has not settled within `ms`. */
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => window.setTimeout(() => resolve(fallback), ms)),
  ]);
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      // Some browsers leave this promise pending while a permission decision is
      // outstanding; without the timeout the button would sit there doing
      // nothing, which reads as broken.
      const copied = await withTimeout(
        navigator.clipboard.writeText(text).then(() => true),
        1200,
        false,
      );
      if (copied) return true;
    }
  } catch {
    /* Fall through to the legacy path below. */
  }

  // Legacy fallback for non-secure contexts and older iOS Safari.
  try {
    const scratch = document.createElement('textarea');
    scratch.value = text;
    scratch.setAttribute('readonly', '');
    scratch.style.position = 'fixed';
    scratch.style.opacity = '0';
    document.body.appendChild(scratch);
    scratch.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(scratch);
    return copied;
  } catch {
    return false;
  }
}

/** Momentarily swap a button's label to confirm an action without a toast. */
function flash(button: HTMLElement, message: string): void {
  const label = button.querySelector<HTMLElement>('[data-label]') ?? button;
  const original = label.textContent ?? '';
  label.textContent = message;
  button.setAttribute('data-flashing', 'true');
  window.setTimeout(() => {
    label.textContent = original;
    button.removeAttribute('data-flashing');
  }, 1600);
}

/* -------------------------------------------------------------------------- */
/* Rendering                                                                  */
/* -------------------------------------------------------------------------- */

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function renderResult(
  result: CalcResult,
  shareUrl: string,
  calculatorName: string,
  T: ClientStrings,
): HTMLElement {
  const root = el('div', 'flex flex-col gap-8');

  /* Headline answer ------------------------------------------------------- */
  // A pastel panel carries the direction. Colour in this system is a surface,
  // never a text tone — and the word "increase"/"decrease" still appears in the
  // sentence beneath, so meaning never rests on colour alone.
  // Pastel surfaces stay light in both themes, so they pin their text colour;
  // the neutral surface follows the theme instead.
  const surface =
    result.direction === 'increase'
      ? 'bg-mint text-block-ink'
      : result.direction === 'decrease'
        ? 'bg-pink text-block-ink'
        : 'bg-surface-soft';

  const answer = el('div', `flex flex-col gap-3 rounded-md ${surface} px-6 py-7`);
  answer.append(el('p', 'caption self-start', T.answer));

  const big = el('p', 'numeric text-[2.75rem] leading-[1.05] break-words sm:text-[3.5rem]');
  big.setAttribute('data-answer', '');
  big.textContent = `${result.rounded ? '\u2248' : ''}${result.display}`;
  answer.append(big);

  answer.append(el('p', 'text-body-lg', result.headline));

  if (result.rounded) {
    answer.append(
      el('p', 'text-body-sm', T.rounded),
    );
  }
  root.append(answer);

  /* Secondary figures — the asset-row pattern: label left, value right. ---- */
  if (result.extras?.length) {
    const list = el('dl', 'flex flex-col');
    for (const extra of result.extras) {
      const row = el(
        'div',
        'flex items-center justify-between gap-4 border-t border-hairline py-4 first:border-t-0 first:pt-0',
      );
      row.append(el('dt', 'text-body', extra.label));
      // DESIGN.md puts every *numeric* value in mono; worded values such as
      // "Increase" stay in the sans face.
      const isNumeric = /\d/.test(extra.value);
      row.append(
        el(
          'dd',
          [
            isNumeric ? 'numeric text-body-lg' : 'text-body-lg',
            extra.emphasis ? 'font-strong' : 'font-medium',
          ].join(' '),
          extra.value,
        ),
      );
      list.append(row);
    }
    root.append(list);
  }

  /* Note ------------------------------------------------------------------ */
  if (result.note) {
    const note = el('p', 'rounded-md bg-cream px-5 py-4 text-body text-block-ink');
    note.textContent = result.note;
    root.append(note);
  }

  /* Working --------------------------------------------------------------- */
  const working = el('div', 'flex flex-col gap-4');
  working.append(el('p', 'caption self-start', T.calculation));

  const formula = el('div', 'rounded-md border border-hairline px-5 py-4');
  formula.append(el('p', 'numeric text-body-sm', result.formula));
  formula.append(el('p', 'numeric mt-1.5 text-body break-words text-ink', result.substituted));
  working.append(formula);

  const steps = el('ol', 'flex flex-col gap-4');
  result.steps.forEach((step, index) => {
    const item = el('li', 'flex gap-3.5');
    const eyebrow = el(
      'span',
      'numeric mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-surface-soft caption',
      String(index + 1),
    );
    const body = el('div', 'flex flex-col gap-1');
    body.append(el('p', 'text-body', step.label));
    body.append(el('p', 'numeric text-body break-words text-ink', step.expression));
    item.append(eyebrow, body);
    steps.append(item);
  });
  working.append(steps);
  root.append(working);

  /* Actions --------------------------------------------------------------- */
  const actions = el('div', 'flex flex-wrap gap-3 border-t border-hairline pt-6');

  const plainWorking = [
    result.headline,
    '',
    `Formula: ${result.formula}`,
    result.substituted,
    '',
    ...result.steps.map((step, index) => `${index + 1}. ${step.label}\n   ${step.expression}`),
  ].join('\n');

  const actionButton = (text: string) => {
    const button = el('button', 'btn-secondary');
    button.type = 'button';
    const label = el('span', undefined, text);
    label.setAttribute('data-label', '');
    button.append(label);
    return button;
  };

  const copyAnswer = actionButton(T.copyAnswer);
  copyAnswer.addEventListener('click', async () => {
    const done = await copyText(result.display);
    flash(copyAnswer, done ? T.copied : T.pressCopy);
    if (done) track('result_copied', { calculator: calculatorName, scope: 'answer' });
  });

  const copyWorking = actionButton(T.copyWorking);
  copyWorking.addEventListener('click', async () => {
    const done = await copyText(plainWorking);
    flash(copyWorking, done ? T.copied : T.pressCopy);
    if (done) track('result_copied', { calculator: calculatorName, scope: 'working' });
  });

  const share = actionButton(T.share);
  share.addEventListener('click', async () => {
    const payload = { title: calculatorName, text: result.headline, url: shareUrl };
    // `canShare` is the reliable feature test: `share` can exist while still
    // refusing a given payload.
    const canShare = typeof navigator.share === 'function' && (navigator.canShare?.(payload) ?? true);

    if (canShare) {
      try {
        await navigator.share(payload);
        track('result_shared', { calculator: calculatorName, method: 'web-share' });
        return;
      } catch (error) {
        // A user-cancelled share is not a failure worth reacting to; anything
        // else falls through to copying the link.
        if ((error as Error)?.name === 'AbortError') return;
      }
    }

    const done = await copyText(shareUrl);
    flash(share, done ? T.linkCopied : T.copyUrl);
    if (done) track('result_shared', { calculator: calculatorName, method: 'copy-link' });
  });

  actions.append(copyAnswer, copyWorking, share);
  root.append(actions);

  return root;
}

/* -------------------------------------------------------------------------- */
/* Controller                                                                 */
/* -------------------------------------------------------------------------- */

/** Query-string aliases so shareable URLs can use natural words. */
const FIELD_ALIASES: Record<string, string> = {
  number: 'value',
  of: 'value',
  total: 'whole',
  from: 'original',
  to: 'final',
  price: 'price',
  off: 'percent',
};

function setupCalculator(root: HTMLElement): void {
  const calculatorName = root.dataset.calcName ?? 'Calculator';
  // The route slug, which is the same in every language — unlike the display
  // name above, which is translated — so analytics can group by it.
  const calculatorSlug = root.dataset.calcSlug?.replace(/^\//, '') || 'unknown';
  let T: ClientStrings = FALLBACK_STRINGS;
  try {
    T = { ...FALLBACK_STRINGS, ...(JSON.parse(root.dataset.strings ?? '{}') as ClientStrings) };
  } catch {
    /* Malformed payload — English labels are a usable fallback. */
  }
  const forms = Array.from(root.querySelectorAll<HTMLFormElement>('[data-mode-form]'));
  const region = root.querySelector<HTMLElement>('[data-result]');
  const resultEmpty = root.querySelector<HTMLElement>('[data-result-empty]');
  if (!forms.length || !region) return;

  // Re-bound as non-nullable: the helpers below are hoisted function
  // declarations, so TypeScript cannot rely on the guard above narrowing a
  // binding they close over.
  const resultRegion: HTMLElement = region;

  const tabs = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-tab]'));
  const panels = Array.from(root.querySelectorAll<HTMLElement>('[data-panel]'));

  /* Mode switching ------------------------------------------------------- */
  function selectMode(modeId: string, focusTab = false): void {
    for (const tab of tabs) {
      const active = tab.dataset.tab === modeId;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      if (active && focusTab) tab.focus();
    }
    for (const panel of panels) {
      panel.hidden = panel.dataset.panel !== modeId;
    }
    clearResult();
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => {
      selectMode(tab.dataset.tab!);
      track('calculator_mode_changed', { calculator: calculatorName, mode: tab.dataset.tab });
    });
    tab.addEventListener('keydown', (event) => {
      const keys: Record<string, number> = {
        ArrowRight: index + 1,
        ArrowLeft: index - 1,
        Home: 0,
        End: tabs.length - 1,
      };
      const next = keys[event.key];
      if (next === undefined) return;
      event.preventDefault();
      const target = tabs[(next + tabs.length) % tabs.length]!;
      selectMode(target.dataset.tab!, true);
    });
  });

  /* Result region -------------------------------------------------------- */
  function clearResult(): void {
    resultRegion.replaceChildren();
    resultRegion.hidden = true;
    if (resultEmpty) resultEmpty.hidden = false;
  }

  function showError(form: HTMLFormElement, message: string, field?: string): void {
    const errorBox = form.querySelector<HTMLElement>('[data-error]');
    if (errorBox) {
      errorBox.textContent = message;
      errorBox.hidden = false;
    }
    for (const input of form.querySelectorAll<HTMLInputElement>('[data-field]')) {
      const invalid = input.name === field;
      input.setAttribute('aria-invalid', String(invalid));
      if (invalid) input.focus();
    }
    clearResult();
  }

  function clearError(form: HTMLFormElement): void {
    const errorBox = form.querySelector<HTMLElement>('[data-error]');
    if (errorBox) {
      errorBox.hidden = true;
      errorBox.textContent = '';
    }
    for (const input of form.querySelectorAll<HTMLInputElement>('[data-field]')) {
      input.removeAttribute('aria-invalid');
    }
  }

  /* Shareable URL for the current inputs ---------------------------------- */
  function buildShareUrl(form: HTMLFormElement, values: Record<string, string>): string {
    const url = new URL(window.location.pathname, window.location.origin);
    if (tabs.length > 1) url.searchParams.set('mode', form.dataset.modeId!);
    for (const [key, value] of Object.entries(values)) {
      if (value !== '') url.searchParams.set(key, value);
    }
    return url.href;
  }

  function run(form: HTMLFormElement, options: { silent?: boolean } = {}): void {
    const operation = form.dataset.operation as OperationId;
    const values: Record<string, string> = {};
    for (const input of form.querySelectorAll<HTMLInputElement>('[data-field]')) {
      values[input.name] = input.value;
    }

    const currency = root.querySelector<HTMLSelectElement>('[data-currency]');
    const inputs = currency ? { ...values, currency: currency.value } : values;

    const outcome = calculate(operation, inputs);

    if (!outcome.ok) {
      showError(form, outcome.message, outcome.field);
      return;
    }

    clearError(form);
    const shareUrl = buildShareUrl(form, values);
    resultRegion.replaceChildren(renderResult(outcome.result, shareUrl, calculatorName, T));
    resultRegion.hidden = false;
    if (resultEmpty) resultEmpty.hidden = true;

    recordHistory({ text: outcome.result.headline, href: shareUrl, at: Date.now() });

    // The one success event, and the one to mark as a key event in GA4. Silent
    // runs — a shared link prefilling the form on load, or a currency switch
    // redrawing a result — are not new calculations, so they are not counted.
    if (!options.silent) {
      track('calculator_used', {
        calculator_name: calculatorSlug,
        calculation_type: form.dataset.modeId!.replace(/-/g, '_'),
      });
    }
  }

  for (const form of forms) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      run(form);
    });

    form.addEventListener('reset', () => {
      clearError(form);
      clearResult();
      window.setTimeout(() => {
        form.querySelector<HTMLInputElement>('[data-field]')?.focus();
      }, 0);
      track('calculator_reset', { calculator: calculatorName, mode: form.dataset.modeId });
    });

    // Enter submits natively from an <input>; clearing the error as the user
    // types keeps the message from lingering after it has been addressed.
    for (const input of form.querySelectorAll<HTMLInputElement>('[data-field]')) {
      input.addEventListener('input', () => {
        if (input.getAttribute('aria-invalid') === 'true') clearError(form);
      });
    }

    // A textarea swallows Enter to insert a newline, so give it the usual
    // Ctrl/Cmd+Enter shortcut to calculate.
    for (const area of form.querySelectorAll<HTMLTextAreaElement>('textarea[data-field]')) {
      area.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          run(form);
        }
      });
    }

    const example = form.querySelector<HTMLButtonElement>('[data-example]');
    example?.addEventListener('click', () => {
      const preset = JSON.parse(example.dataset.example ?? '{}') as Record<string, string>;
      for (const input of form.querySelectorAll<HTMLInputElement>('[data-field]')) {
        input.value = preset[input.name] ?? '';
      }
      clearError(form);
      run(form);
    });
  }

  /* Currency preference --------------------------------------------------- */
  const currencySelect = root.querySelector<HTMLSelectElement>('[data-currency]');
  if (currencySelect) {
    try {
      const saved = localStorage.getItem(CURRENCY_KEY);
      if (saved !== null) currencySelect.value = saved;
    } catch {
      /* Ignore — the default symbol is fine. */
    }
    currencySelect.addEventListener('change', () => {
      try {
        localStorage.setItem(CURRENCY_KEY, currencySelect.value);
      } catch {
        /* Ignore. */
      }
      const activeForm =
        forms.find((form) => !form.closest<HTMLElement>('[data-panel]')?.hidden) ?? forms[0]!;
      if (!resultRegion.hidden) run(activeForm, { silent: true });
    });
  }

  /* History --------------------------------------------------------------- */
  const historyRoot = root.querySelector<HTMLElement>('[data-history]');
  const historyList = root.querySelector<HTMLElement>('[data-history-list]');
  const historyClear = root.querySelector<HTMLButtonElement>('[data-history-clear]');

  function paintHistory(): void {
    if (!historyRoot || !historyList) return;
    const entries = readHistory();
    historyRoot.hidden = entries.length === 0;
    historyList.replaceChildren();
    for (const entry of entries) {
      const item = el('li');
      const link = el(
        'a',
        'block border-t border-hairline-soft py-3.5 text-body underline-offset-4 transition-all first:border-t-0 hover:underline',
      );
      link.href = entry.href;
      link.textContent = entry.text;
      item.append(link);
      historyList.append(item);
    }
  }

  function recordHistory(entry: HistoryEntry): void {
    if (!historyRoot) return;
    const existing = readHistory().filter((item) => item.text !== entry.text);
    writeHistory([entry, ...existing]);
    paintHistory();
  }

  historyClear?.addEventListener('click', () => {
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch {
      /* Ignore. */
    }
    paintHistory();
    track('history_cleared', { calculator: calculatorName });
  });

  paintHistory();

  /* Prefill from the query string ----------------------------------------- */
  const params = new URLSearchParams(window.location.search);
  if (params.size > 0) {
    const requestedMode = params.get('mode');
    const targetForm =
      forms.find((form) => form.dataset.modeId === requestedMode) ??
      forms.find((form) =>
        Array.from(form.querySelectorAll<HTMLInputElement>('[data-field]')).some((input) =>
          params.has(input.name),
        ),
      );

    if (targetForm) {
      if (tabs.length > 1) selectMode(targetForm.dataset.modeId!);
      let filled = 0;
      for (const input of targetForm.querySelectorAll<HTMLInputElement>('[data-field]')) {
        const direct = params.get(input.name);
        const alias = Object.entries(FIELD_ALIASES).find(
          ([from, to]) => to === input.name && params.has(from),
        );
        const value = direct ?? (alias ? params.get(alias[0]) : null);
        if (value !== null) {
          input.value = value;
          filled += 1;
        }
      }
      if (filled > 0) run(targetForm, { silent: true });
    }
  }
}

export async function initCalculators(): Promise<void> {
  const roots = Array.from(document.querySelectorAll<HTMLElement>('[data-calculator]'));
  if (roots.length === 0) return;

  // Every calculator on a page shares the document's locale.
  const locale = roots[0]!.dataset.locale ?? 'en';
  const load = ENGINE[locale] ?? ENGINE.en!;
  try {
    setEngineStrings(await load());
  } catch {
    /* Fall back to the English strings the engine already holds. */
  }

  for (const root of roots) setupCalculator(root);
}
