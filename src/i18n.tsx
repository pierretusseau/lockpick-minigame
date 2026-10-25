/**
 * English / French texts. The language follows the browser on first visit, then the player's
 * choice (saved in localStorage).
 */
import { createContext, useContext, useState, type ReactNode } from 'react';
import type { LockLevel, RollOutcome } from './engine';
import { STORAGE_KEYS } from './storage';

export type Lang = 'en' | 'fr';
export type Kind = 'lock' | 'trap';

const en = {
  appTitle: 'Lockpicking mini-game',
  intro:
    'Fill every notch of the active ring with picks, from the outside in. A pick only goes in if all its teeth land on free notches. Beware of decoys.',
  languageLabel: 'Language',
  sourceCode: 'Source code on GitHub',

  challengeTitle: 'The challenge',
  kindLabel: { lock: 'Lock', trap: 'Trap' } satisfies Record<Kind, string>,
  dcLabel: 'DC set by the GM',
  dcOptions: ['Very easy', 'Easy', 'Medium', 'Hard', 'Very hard', 'Nearly impossible'],
  dcCustom: 'Other value…',
  dcShort: 'DC',
  bonusLabel: 'Your bonus',
  bonusHelp: 'e.g. DEX + proficiency',
  rollLabel: 'Your d20',
  rollHelp: 'Advantage? Enter the kept die',
  rollError: '1 to 20',
  tiersLabel: 'd20 tiers (house rule)',
  tiersHelp: '1: no game · 2-5: one more decoy, no yellow · 18-19: green help · 20: automatic success',
  rollExplain:
    'The d20 rolled at the table shifts the lock: below 10 it gets harder, above 10 easier. A check that succeeds by the book gives at most an Advanced lock.',
  breakdownBase: (dc: number, bonus: string, gap: number) => `DC ${dc} − bonus ${bonus} = base gap ${gap}`,
  breakdownRoll: (roll: number, shift: number, gap: number) =>
    shift === 0
      ? `d20: ${roll} (the average, 10): the gap stays → final gap ${gap}`
      : shift > 0
        ? `d20: ${roll} (${shift} below 10): +${shift} → final gap ${gap}`
        : `d20: ${roll} (${-shift} above 10): ${shift} → final gap ${gap}`,
  waitingDc: 'Choose the DC announced by the GM.',
  waitingRoll: 'Enter your d20 to reveal the lock.',
  result: {
    lock: {
      fumble: 'Critical failure: the lock does not budge.',
      critical: 'Critical success: the lock opens.',
      automatic: 'Automatic success: the lock does not resist you.',
      level: (l: string) => `${l} lock.`,
      poor: (l: string) => `Poor roll: ${l} lock.`,
      good: (l: string) => `Good roll: ${l} lock.`,
    },
    trap: {
      fumble: 'Critical failure: the trap cannot be disarmed.',
      critical: 'Critical success: the trap is disarmed.',
      automatic: 'Automatic success: the trap does not resist you.',
      level: (l: string) => `${l} trap.`,
      poor: (l: string) => `Poor roll: ${l} trap.`,
      good: (l: string) => `Good roll: ${l} trap.`,
    },
  } satisfies Record<Kind, Record<string, unknown>>,
  resultText: {
    fumble: 'No mini-game. The GM may add a complication.',
    alreadyOpen: 'No need to play. You can still play a Novice one for fun.',
    poor: 'Harder mechanism, one more false lead, and found positions are not shown in yellow.',
    good: 'Easier mechanism, and the picks that fit the current ring are highlighted in green.',
    normal: 'The positions you find are shown in yellow.',
  } satisfies Record<Exclude<RollOutcome, 'critical'> | 'alreadyOpen', string>,
  startButton: { lock: 'Pick the lock', trap: 'Disarm' } satisfies Record<Kind, string>,
  playForFun: 'Play a Novice one',

  settingsTitle: 'Settings',
  levelLabel: 'Level',
  gapRange: (min: number, max: number | null) => (max === null ? `gap ${min}+` : `gap ${min} to ${max}`),
  seedLabel: 'Seed',
  load: 'Load',
  newLock: 'New lock',
  restart: 'Restart',
  copyLink: 'Copy link',
  linkCopied: 'Link copied: send it to get the same lock.',
  highlightFits: 'Highlight fitting picks',
  sounds: 'Sounds',
  vibrations: 'Vibrations (Android)',

  boardTitle: { lock: (l: string) => `${l} lock`, trap: (l: string) => `${l} trap` } satisfies Record<Kind, unknown>,
  flagAid: ' — green help (good roll)',
  flagNoHints: ' — no yellow (poor roll)',
  flagHardened: ' — one more decoy (poor roll)',
  start: 'Start',
  undo: 'Undo',
  undoTooltip: 'Undo the last pick',
  timer: 'Timer',
  pick: (n: number, used: boolean) => `Pick ${n}${used ? ' (placed)' : ''}`,
  boardAria: { lock: 'Lock', trap: 'Trap mechanism' } satisfies Record<Kind, string>,
  ringAria: (ring: number, total: number) => `ring ${ring} of ${total}`,
  solved: { lock: 'Lock picked!', trap: 'Trap disarmed!' } satisfies Record<Kind, string>,

  howTitle: 'How to play',
  how: [
    'Pick: click a pick in the list.',
    'Rotate: drag around the lock with the mouse, or swipe left/right with a finger.',
    'Insert: click the lock without dragging.',
    'Yellow: you found a position where this pick fits the current ring.',
    'Undo: the arrow at the top right of the lock, as often as you like.',
  ],
  credits: 'Inspired by the Starfield digipick. Lockpicks icon by Delapouite (game-icons.net, CC BY 3.0). MIT licence.',

  levels: {
    novice: 'Novice',
    advanced: 'Advanced',
    expert: 'Expert',
    master: 'Master',
    grandMaster: 'Grand master',
  } satisfies Record<LockLevel, string>,
};

export type Messages = typeof en;

const fr: Messages = {
  appTitle: 'Mini-jeu de crochetage',
  intro:
    'Remplis toutes les encoches de l’anneau actif avec les crochets, de l’extérieur vers le centre. Un crochet n’entre que si toutes ses dents tombent sur des encoches libres. Attention aux leurres.',
  languageLabel: 'Langue',
  sourceCode: 'Code source sur GitHub',

  challengeTitle: 'Le défi',
  kindLabel: { lock: 'Serrure', trap: 'Piège' },
  dcLabel: 'Difficulté (DD) fixée par le MJ',
  dcOptions: ['Très facile', 'Facile', 'Moyenne', 'Difficile', 'Très difficile', 'Quasi impossible'],
  dcCustom: 'Autre valeur…',
  dcShort: 'DD',
  bonusLabel: 'Ton bonus',
  bonusHelp: 'ex. DEX + maîtrise',
  rollLabel: 'Ton d20',
  rollHelp: 'Avantage ? Le dé gardé',
  rollError: 'Entre 1 et 20',
  tiersLabel: 'Paliers du d20 (règle maison)',
  tiersHelp: '1 : pas de mini-jeu · 2 à 5 : un leurre de plus, pas de jaune · 18 et 19 : aide en vert · 20 : réussite automatique',
  rollExplain:
    'Le d20 lancé à la table décale la serrure : sous 10 elle se durcit, au-dessus elle s’adoucit. Un test réussi au sens des règles donne au plus une serrure Avancée.',
  breakdownBase: (dc, bonus, gap) => `DD ${dc} − bonus ${bonus} = écart de base ${gap}`,
  breakdownRoll: (roll, shift, gap) =>
    shift === 0
      ? `d20 : ${roll} (la moyenne, 10) : l’écart ne bouge pas → écart final ${gap}`
      : shift > 0
        ? `d20 : ${roll} (${shift} sous 10) : +${shift} → écart final ${gap}`
        : `d20 : ${roll} (${-shift} au-dessus de 10) : ${shift} → écart final ${gap}`,
  waitingDc: 'Choisis la difficulté annoncée par le MJ.',
  waitingRoll: 'Indique ton d20 pour découvrir la serrure.',
  result: {
    lock: {
      fumble: 'Échec critique : la serrure ne cède pas.',
      critical: 'Réussite critique : la serrure s’ouvre.',
      automatic: 'Réussite d’office : la serrure ne te résiste pas.',
      level: (l) => `Serrure de niveau ${l}.`,
      poor: (l) => `Mauvais jet : serrure de niveau ${l}.`,
      good: (l) => `Bon jet : serrure de niveau ${l}.`,
    },
    trap: {
      fumble: 'Échec critique : le piège ne se laisse pas désamorcer.',
      critical: 'Réussite critique : le piège est désamorcé.',
      automatic: 'Réussite d’office : le piège ne te résiste pas.',
      level: (l) => `Piège de niveau ${l}.`,
      poor: (l) => `Mauvais jet : piège de niveau ${l}.`,
      good: (l) => `Bon jet : piège de niveau ${l}.`,
    },
  },
  resultText: {
    fumble: 'Pas de mini-jeu. Le MJ peut ajouter une complication.',
    alreadyOpen: 'Pas besoin de jouer. Tu peux quand même faire une partie Novice pour le plaisir.',
    poor: 'Le mécanisme est plus dur, cache une fausse piste de plus, et les positions trouvées ne s’affichent pas en jaune.',
    good: 'Le mécanisme est plus facile, et les crochets qui entrent dans l’anneau en cours sont surlignés en vert.',
    normal: 'Les positions que tu trouves s’affichent en jaune.',
  },
  startButton: { lock: 'Crocheter', trap: 'Désamorcer' },
  playForFun: 'Jouer en Novice',

  settingsTitle: 'Réglages',
  levelLabel: 'Niveau',
  gapRange: (min, max) => (max === null ? `écart ${min} et plus` : `écart ${min} à ${max}`),
  seedLabel: 'Graine',
  load: 'Charger',
  newLock: 'Nouvelle serrure',
  restart: 'Recommencer',
  copyLink: 'Copier le lien',
  linkCopied: 'Lien copié : envoie-le pour jouer la même serrure.',
  highlightFits: 'Surligner les crochets compatibles',
  sounds: 'Sons',
  vibrations: 'Vibrations (Android)',

  boardTitle: { lock: (l) => `Serrure de niveau ${l}`, trap: (l) => `Piège de niveau ${l}` },
  flagAid: ' — aide en vert (bon jet)',
  flagNoHints: ' — pas de jaune (mauvais jet)',
  flagHardened: ' — un leurre de plus (mauvais jet)',
  start: 'Commencer',
  undo: 'Annuler',
  undoTooltip: 'Annuler le dernier crochet',
  timer: 'Chrono',
  pick: (n, used) => `Crochet ${n}${used ? ' (posé)' : ''}`,
  boardAria: { lock: 'Serrure', trap: 'Mécanisme du piège' },
  ringAria: (ring, total) => `anneau ${ring} sur ${total}`,
  solved: { lock: 'Serrure crochetée !', trap: 'Piège désamorcé !' },

  howTitle: 'Comment jouer',
  how: [
    'Choisir : clic sur un crochet de la liste.',
    'Tourner : glisser autour de la serrure à la souris, ou glisser le doigt vers la gauche ou la droite.',
    'Insérer : clic sur la serrure, sans glisser.',
    'Jaune : tu as trouvé une position où ce crochet entre dans l’anneau en cours.',
    'Annuler : la flèche en haut à droite de la serrure, autant de fois que tu veux.',
  ],
  credits: 'Inspiré du digipick de Starfield. Icône des crochets par Delapouite (game-icons.net, CC BY 3.0). Licence MIT.',

  levels: {
    novice: 'Novice',
    advanced: 'Avancé',
    expert: 'Expert',
    master: 'Maître',
    grandMaster: 'Grand maître',
  },
};

const MESSAGES: Record<Lang, Messages> = { en, fr };

function initialLang(): Lang {
  const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.lang) : null;
  if (saved === 'en' || saved === 'fr') return saved;
  return typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('fr') ? 'fr' : 'en';
}

interface I18n {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Messages;
}

const I18nContext = createContext<I18n | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  const setLang = (next: Lang) => {
    setLangState(next);
    localStorage.setItem(STORAGE_KEYS.lang, next);
    document.documentElement.lang = next;
  };
  return <I18nContext.Provider value={{ lang, setLang, t: MESSAGES[lang] }}>{children}</I18nContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useI18n(): I18n {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider');
  return ctx;
}
