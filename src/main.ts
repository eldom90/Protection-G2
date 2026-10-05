import './style.css';
import { CONTACT_NAME, FIRST_MESSAGE, REPLIES, REPLY_DELAY_MS, VISIBLE_MESSAGES } from './config';
import { noise, open, seal, shuffle } from './crypto';
import { Glasses, type GlassesView } from './glasses';

// Raspored tipki (QWERTZ). Slova č ć š ž đ se dobijaju dugim pritiskom
// na c, s, z, d, kao na tastaturi mobitela.
const ROWS = ['qwertzuiop', 'asdfghjkl', 'yxcvbnm'];
const LETTERS = ROWS.join('').split('');
// Sloj sa brojevima i znakovima (tipka "123"). Isti oblik kao slova: 10, 9 i 7 tipki.
const SYM_ROWS = ['1234567890', '-/:;()&@"', "!?'%+*="];
const SYMBOLS = SYM_ROWS.join('').split('');
const VARIANTS: Record<string, string[]> = { c: ['č', 'ć'], s: ['š'], z: ['ž'], d: ['đ'] };
// Dugi pritisak na BILO KOJE slovo otvara isti prozor sa 3 polja, na istom mjestu.
// Da se otvara samo na c, s, z, d, posmatrac bi mogao pogoditi koje su to tipke.
const POP_SLOTS = 3;
const LONG_PRESS_MS = 400;
const MAX_DRAFT = 240;

type Msg = { from: 'me' | 'them'; sealed: string };

// Poruke se cuvaju SAMO sifrovane. Desifruju se u trenutku slanja na naocale.
const state = {
  protect: true,
  hidden: false,
  draft: '',
  msgs: [] as Msg[],
  layer: 'abc' as 'abc' | '123',
  shift: 'once' as 'off' | 'once' | 'lock',
  layout: shuffle(LETTERS),
  symLayout: shuffle(SYMBOLS),
  pop: null as null | { options: string[]; sel: number },
  hit: -1,
  scroll: 0,
  typing: false,
  replyIdx: 0,
};

const glasses = new Glasses();
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const rows = () => (state.layer === 'abc' ? ROWS : SYM_ROWS);
const chars = () => (state.layer === 'abc' ? state.layout : state.symLayout);
const caseOf = (ch: string) => (state.layer === 'abc' && state.shift !== 'off' ? ch.toUpperCase() : ch);

/* ---------- Ekran naocala ---------- */

function cut(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 3) + '...' : s;
}

function buildView(): GlassesView {
  const status = state.typing ? 'piše...' : state.protect ? 'zaštićeno' : 'zaštita isključena';
  const header = `${CONTACT_NAME}   [${status}]`;
  if (state.hidden) {
    return { header, log: 'Prikaz skriven. Dvostruki dodir za prikaz.', draft: '', keymap: '' };
  }
  const end = state.msgs.length - state.scroll;
  const shown = state.msgs.slice(Math.max(0, end - VISIBLE_MESSAGES), end);
  const log = shown
    .map((m) => {
      const text = open(m.sealed) ?? '[poruka se ne može dešifrovati]';
      return `${m.from === 'me' ? 'Ti' : CONTACT_NAME}: ${cut(text, 80)}`;
    })
    .join('\n');
  const draft = `> ${state.draft.slice(-60)}_`;
  let keymap = '';
  if (state.pop) {
    // Polja prozora za dugi pritisak, istim redom kao na telefonu (lijevo na desno).
    const { options, sel } = state.pop;
    const cells = options.map((o, i) => (i === sel ? `[${o || '-'}]` : ` ${o || '-'} `)).join('   ');
    keymap = `Izaberi polje:\n\n${cells}`;
  } else if (state.protect) {
    const cs = chars();
    let idx = 0;
    keymap = rows()
      .map((row) =>
        row
          .split('')
          .map(() => {
            const ch = caseOf(cs[idx]);
            return idx++ === state.hit ? `[${ch}]` : ch;
          })
          .join(' '),
      )
      .join('\n');
  }
  return { header, log: log || 'Nema poruka.', draft, keymap };
}

function renderGlasses() {
  glasses.render(buildView());
}

/* ---------- Ekran telefona ---------- */

function renderMessages() {
  const box = $('msgs');
  box.innerHTML = '';
  for (const m of state.msgs) {
    const d = document.createElement('div');
    d.className = `b ${m.from}${state.protect ? ' cipher' : ''}`;
    // U zastitnom nacinu telefon prikazuje samo sifrat; tekst se desifruje samo ako je zastita iskljucena.
    d.textContent = state.protect ? m.sealed : open(m.sealed) ?? '';
    box.appendChild(d);
  }
  box.scrollTop = box.scrollHeight;
}

function renderDraft() {
  const dr = $('draft');
  if (!state.draft) {
    dr.className = 'draft';
    dr.innerHTML = '<span class="ph">Poruka</span>';
    return;
  }
  dr.className = `draft${state.protect ? ' cipher' : ''}`;
  dr.textContent = state.protect ? noise(state.draft.length) : state.draft;
}

/** Tipka za posebne funkcije (razmak, brisanje, Shift...). Reaguje odmah na dodir. */
function key(label: string, cls: string, aria: string, onClick: () => void) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = `k ${cls}`.trim();
  b.textContent = label;
  b.setAttribute('aria-label', aria);
  b.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    onClick();
  });
  return b;
}

/** Prazno mjesto u redu tastature (za poravnanje). */
function spacer(cls: string) {
  const s = document.createElement('div');
  s.className = `k spacer ${cls}`;
  return s;
}

// Tipka koja je trenutno pritisnuta. Slovo se upisuje kad se prst podigne,
// a ako se drzi duze od LONG_PRESS_MS, otvara se prozor sa kvacicama.
let press: { ch: string; pos: number; timer: number } | null = null;

/** Tipka sa slovom ili znakom. U zastitnom nacinu nema oznake. */
function charKey(ch: string, pos: number) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = `k${state.protect ? ' blank' : ''}`;
  b.textContent = state.protect ? '' : caseOf(ch);
  b.setAttribute('aria-label', state.protect ? 'Tipka' : caseOf(ch));
  b.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    closePop();
    if (press) clearTimeout(press.timer);
    clearTimeout(hitTimer);
    const timer = state.layer === 'abc' ? window.setTimeout(() => openPop(ch), LONG_PRESS_MS) : 0;
    press = { ch, pos, timer };
    // Naocale odmah pokazuju koje je slovo ispod prsta, prije nego sto se pusti.
    state.hit = pos;
    renderGlasses();
  });
  return b;
}

function renderKeyboard() {
  const kb = $('kb');
  kb.innerHTML = '';
  const cs = chars();
  let idx = 0;
  rows().forEach((row, ri) => {
    const r = document.createElement('div');
    r.className = 'row';
    if (ri === 1) r.appendChild(spacer('half'));
    if (ri === 2) {
      r.appendChild(
        state.layer === 'abc'
          ? key(state.shift === 'lock' ? '⇪' : '⇧', `mid shift${state.shift !== 'off' ? ' on' : ''}`, 'Velika slova', toggleShift)
          : spacer('mid'),
      );
    }
    for (let i = 0; i < row.length; i++) {
      const pos = idx++;
      r.appendChild(charKey(cs[pos], pos));
    }
    if (ri === 1) r.appendChild(spacer('half'));
    if (ri === 2) r.appendChild(key('⌫', 'mid', 'Obriši', backspace));
    kb.appendChild(r);
  });
  const r4 = document.createElement('div');
  r4.className = 'row';
  const abc = state.layer === 'abc';
  r4.appendChild(key(abc ? '123' : 'ABC', 'mid', abc ? 'Brojevi i znakovi' : 'Slova', switchLayer));
  r4.appendChild(key(',', '', 'Zarez', () => type(',', -1)));
  r4.appendChild(key('razmak', 'wide', 'Razmak', () => type(' ', -1)));
  r4.appendChild(key('.', '', 'Tačka', () => type('.', -1)));
  r4.appendChild(key('Pošalji', 'mid send', 'Pošalji', send));
  kb.appendChild(r4);
}

/** Prozor za dugi pritisak. Uvijek ima POP_SLOTS polja i stoji iznad sredine tastature. */
function renderPop() {
  const box = $('pop');
  if (!state.pop) {
    box.hidden = true;
    box.innerHTML = '';
    return;
  }
  if (!box.childElementCount) {
    state.pop.options.forEach((o, i) => {
      const d = document.createElement('div');
      d.className = `k${state.protect ? ' blank' : ''}`;
      d.dataset.pop = String(i);
      d.textContent = state.protect ? '' : o;
      box.appendChild(d);
    });
  }
  box.hidden = false;
  box.querySelectorAll<HTMLElement>('[data-pop]').forEach((d, i) => d.classList.toggle('sel', i === state.pop!.sel));
}

function renderToggle() {
  const t = $('toggle');
  t.setAttribute('aria-pressed', String(state.protect));
  $('toggleTxt').textContent = state.protect ? 'Zaštita uključena' : 'Zaštita isključena';
  $('status').textContent = state.typing ? `${CONTACT_NAME} piše...` : 'Šifrovani razgovor';
}

function renderAll() {
  renderToggle();
  renderMessages();
  renderDraft();
  renderKeyboard();
  renderPop();
  renderGlasses();
}

/* ---------- Akcije ---------- */

/**
 * Automatska velika slova: na pocetku poruke i poslije . ? !
 * Jednokratni Shift se gasi nakon prvog slova. Zakljucani Shift (⇪) ostaje.
 */
function updateShift(typed: string) {
  if (state.shift === 'lock') return;
  const auto = state.draft === '' || /[.!?]\s+$/.test(state.draft);
  if (auto) state.shift = 'once';
  else if (typed === '' || typed.toLowerCase() !== typed.toUpperCase()) state.shift = 'off';
}

/** Poziva se nakon svake promjene teksta. */
function edited(typed: string) {
  const before = state.shift;
  updateShift(typed);
  renderDraft();
  if (state.shift !== before) renderKeyboard();
  renderGlasses();
}

let hitTimer = 0;
function type(ch: string, pos: number) {
  if (state.draft.length >= MAX_DRAFT) return;
  if (!state.draft && ch === ' ') return;
  state.draft += ch;
  state.hit = pos;
  state.scroll = 0;
  edited(ch);
  clearTimeout(hitTimer);
  hitTimer = window.setTimeout(() => {
    state.hit = -1;
    renderGlasses();
  }, 500);
}

function backspace() {
  state.draft = state.draft.slice(0, -1);
  state.hit = -1;
  edited('');
}

/** Jedan dodir: jedno veliko slovo. Drugi: zakljucana velika slova. Treci: iskljuceno. */
function toggleShift() {
  state.shift = state.shift === 'off' ? 'once' : state.shift === 'once' ? 'lock' : 'off';
  state.hit = -1;
  renderKeyboard();
  renderGlasses();
}

function switchLayer() {
  state.layer = state.layer === 'abc' ? '123' : 'abc';
  state.hit = -1;
  closePop();
  renderKeyboard();
  renderGlasses();
}

function openPop(ch: string) {
  const options = [ch, ...(VARIANTS[ch] ?? [])].map(caseOf);
  while (options.length < POP_SLOTS) options.push('');
  state.pop = { options, sel: -1 };
  state.hit = -1;
  renderPop();
  renderGlasses();
}

function closePop() {
  if (!state.pop) return;
  state.pop = null;
  renderPop();
  renderGlasses();
}

function choosePop(i: number) {
  const o = state.pop?.options[i] ?? '';
  state.pop = null;
  renderPop();
  if (o) type(o, -1);
  else renderGlasses();
}

/** Koje polje prozora je ispod prsta (-1 ako nijedno). */
function popSlotAt(x: number, y: number): number {
  const el = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-pop]');
  return el ? Number(el.dataset.pop) : -1;
}

function send() {
  const text = state.draft.trim();
  if (!text) return;
  state.msgs.push({ from: 'me', sealed: seal(text) });
  state.draft = '';
  state.hit = -1;
  state.scroll = 0;
  state.layer = 'abc';
  state.pop = null;
  updateShift('');
  if (state.protect) {
    // novi raspored nakon svake poruke
    state.layout = shuffle(LETTERS);
    state.symLayout = shuffle(SYMBOLS);
  }
  state.typing = true;
  renderAll();
  setTimeout(receive, REPLY_DELAY_MS);
}

/** Simulira dolaznu poruku: stize vec sifrovana, kao sa servera. */
function receive(text?: string) {
  const t = text ?? REPLIES[state.replyIdx++ % REPLIES.length];
  state.msgs.push({ from: 'them', sealed: seal(t) });
  state.typing = false;
  state.scroll = 0;
  renderToggle();
  renderMessages();
  renderGlasses();
}

/* ---------- Dodiri ---------- */

// Dodir u prozoru bira polje; dodir bilo gdje drugo zatvara prozor.
document.addEventListener('pointerdown', (e) => {
  if (!state.pop) return;
  const i = popSlotAt(e.clientX, e.clientY);
  if (i < 0) {
    closePop();
    return;
  }
  e.preventDefault();
  state.pop.sel = i;
  renderPop();
  renderGlasses();
});

// Dok se prst prevlaci preko prozora, naocale pokazuju izabrano polje.
document.addEventListener('pointermove', (e) => {
  if (!state.pop) return;
  const i = popSlotAt(e.clientX, e.clientY);
  if (i === state.pop.sel) return;
  state.pop.sel = i;
  renderPop();
  renderGlasses();
});

document.addEventListener('pointerup', (e) => {
  const p = press;
  press = null;
  if (p) clearTimeout(p.timer);
  if (state.pop) {
    const i = popSlotAt(e.clientX, e.clientY);
    if (i >= 0) choosePop(i);
    // Prst pusten na samoj tipki: prozor ostaje otvoren pa se polje moze dodirnuti.
    else if (!p) closePop();
    return;
  }
  if (p) type(caseOf(p.ch), p.pos);
});

document.addEventListener('pointercancel', () => {
  if (press) clearTimeout(press.timer);
  press = null;
  closePop();
});

// Bez menija "kopiraj / oznaci" pri dugom pritisku na mobitelu.
$('kbwrap').addEventListener('contextmenu', (e) => e.preventDefault());

$('toggle').addEventListener('click', () => {
  state.protect = !state.protect;
  state.layout = state.protect ? shuffle(LETTERS) : LETTERS.slice();
  state.symLayout = state.protect ? shuffle(SYMBOLS) : SYMBOLS.slice();
  state.hit = -1;
  state.pop = null;
  renderAll();
});

glasses.onInput((input) => {
  if (input === 'doubleClick') state.hidden = !state.hidden;
  if (input === 'scrollUp') state.scroll = Math.min(state.scroll + 1, Math.max(0, state.msgs.length - VISIBLE_MESSAGES));
  if (input === 'scrollDown') state.scroll = Math.max(0, state.scroll - 1);
  renderGlasses();
});

// Tastatura racunara radi samo kad je zastita iskljucena (za testiranje na racunaru).
// Ovdje rade i velika slova, kvacice i znakovi direktno sa tastature racunara.
document.addEventListener('keydown', (e) => {
  if (state.protect || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === 'Enter') send();
  else if (e.key === 'Backspace') backspace();
  else if (e.key.length === 1) type(e.key, chars().indexOf(e.key.toLowerCase()));
});

(async () => {
  renderToggle();
  renderMessages();
  renderDraft();
  renderKeyboard();
  await glasses.init(buildView());
  document.body.dataset.mode = glasses.mode;
  receive(FIRST_MESSAGE);
})();
