// Osnovna podesavanja demo aplikacije. Mijenjajte samo ovdje.

/** Ime sagovornika koje se prikazuje (izmisljeni kontakt za demo). */
export const CONTACT_NAME = 'Kontakt A';

/**
 * Ako naocale (ili simulator) prikazuju kvadratice umjesto slova
 * č ć š ž đ, postavite na true. Tada se na naocalama koriste c c s z dj.
 */
export const ASCII_FALLBACK = false;

/** Koliko se zadnjih poruka vidi na naocalama odjednom. */
export const VISIBLE_MESSAGES = 3;

/** Koliko milisekundi simulirani sagovornik "pise" odgovor. */
export const REPLY_DELAY_MS = 1800;

/** Simulirani odgovori sagovornika (izmisljeni primjeri). */
export const REPLIES = [
  'Primio sam, hvala.',
  'Može sutra u 10:00?',
  'Dokument je na mjestu koje smo dogovorili.',
  'Javi kad stigneš.',
  'Važi, čujemo se kasnije.',
  'Provjeri prilog prije sastanka.',
];

/** Prva poruka koja stigne kad se aplikacija otvori. */
export const FIRST_MESSAGE = 'Sastanak je pomjeren na četvrtak u 14:00.';
