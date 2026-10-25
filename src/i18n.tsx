/**
 * English / French texts. The language follows the browser on first visit, then the player's
 * choice (saved in localStorage).
 */
import { createContext, useContext, useState, type ReactNode } from 'react';
import type { LockLevel, RollOutcome } from './engine';
import { STORAGE_KEYS } from './storage';

export type Lang = 'en' | 'fr';

const en = {
  appTitle: 'Lockpicking mini-game',
  languageLabel: 'Language',
  sourceCode: 'Source code on GitHub',
  close: 'Close',

  challengeTitle: 'The challenge',
  dcLabel: 'DC set by the GM',
  dcOptions: ['Very easy', 'Easy', 'Medium', 'Hard', 'Very hard', 'Nearly impossible'],
  dcCustom: 'Other value…',
  dcShort: 'DC',
  bonusLabel: 'Your bonus',
  rollLabel: 'Your d20',
  rollError: '1 to 20',
  tiersLabel: 'd20 tiers (house rule)',
  tiersHelp: [
    '1: critical failure, no mini-game.',
    '2 to 5: poor roll, one more decoy and no yellow hints.',
    '18 and 19: good roll, fitting picks highlighted in green.',
    '20: critical success, the lock opens.',
  ],
  waitingDc: 'Choose the DC announced by the GM.',
  waitingRoll: 'Enter your d20 to reveal the lock.',
  result: {
    fumble: 'Critical failure: the lock does not budge.',
    critical: 'Critical success: the lock opens.',
    automatic: 'Automatic success: the lock does not resist you.',
    level: (l: string) => `${l} lock.`,
    poor: (l: string) => `Poor roll: ${l} lock.`,
    good: (l: string) => `Good roll: ${l} lock.`,
  },
  resultText: {
    fumble: 'No mini-game. The GM may add a complication.',
    alreadyOpen: 'No need to play. You can still play a Novice one for fun.',
    poor: 'Harder lock, one more false lead, and found positions are not shown in yellow.',
    good: 'Easier lock, and the picks that fit the current ring are highlighted in green.',
    normal: 'The positions you find are shown in yellow.',
  } satisfies Record<Exclude<RollOutcome, 'critical'> | 'alreadyOpen', string>,
  startButton: 'Pick the lock',
  playForFun: 'Play a Novice one',

  settings: 'Settings',
  settingsIntro: 'Play a lock directly, without going through the challenge.',
  levelLabel: 'Level',
  gapRange: (min: number, max: number | null) => (max === null ? `gap ${min}+` : `gap ${min} to ${max}`),
  seedLabel: 'Seed',
  load: 'Load',
  newLock: 'New lock',
  restart: 'Restart',
  copyLink: 'Copy link',
  linkCopied: 'Link copied: send it to get the same lock.',
  highlightFits: 'Highlight fitting picks',

  boardTitle: (l: string) => `${l} lock`,
  flagAid: ' — green help',
  flagNoHints: ' — no yellow',
  flagHardened: ' — one more decoy',
  newChallenge: 'New challenge',
  soundOn: 'Turn sounds on',
  soundOff: 'Turn sounds off',
  vibrationOn: 'Turn vibrations on',
  vibrationOff: 'Turn vibrations off',
  start: 'Start',
  undo: 'Undo',
  undoTooltip: 'Undo the last pick',
  timer: 'Timer',
  pick: (n: number, used: boolean) => `Pick ${n}${used ? ' (placed)' : ''}`,
  boardAria: 'Lock',
  ringAria: (ring: number, total: number) => `ring ${ring} of ${total}`,
  solved: 'Lock picked!',

  help: 'How to play',
  howTitle: 'How to play',
  how: [
    'Fill every notch of the active ring with picks, from the outside in. A pick only goes in if all its teeth land on free notches. Beware of decoys.',
    'Choose: click a pick in the list.',
    'Rotate: drag around the lock with the mouse, or swipe left/right with a finger.',
    'Insert: click the lock without dragging.',
    'Yellow: you found a position where this pick fits the current ring.',
    'Undo: the arrow at the top right of the lock, as often as you like.',
  ],
  rulesTitle: 'From the die to the lock',
  rules: [
    'The GM sets the DC. Enter your bonus for the check (in D&D: DEX + proficiency with thieves’ tools) and the d20 rolled at the table. With advantage or disadvantage, enter the die you keep.',
    'Gap = DC − bonus − (d20 − 10): a 10 keeps the lock, a lower roll makes it harder, a higher roll easier. Gap 2-5 Novice, 6-10 Advanced, 11-15 Expert, 16-20 Master, 21+ Grand master; 1 or less: automatic success.',
    'A check that succeeds by the book gives at most an Advanced lock.',
  ],
  credits: 'Inspired by the Starfield digipick. Lockpicks icon by Delapouite (game-icons.net, CC BY 3.0). MIT licence.',

  timeUp: 'Time’s up!',
  gmMode: 'GM mode',
  freePlay: 'Free play',

  playerLock: 'Lock',
  playerIntro: 'Your GM prepared this lock. Enter your bonus and the d20 you rolled.',
  timeLimitNote: (time: string) => `Time limit: ${time} once you press Start.`,
  invalidLink: 'This link is damaged. Ask your GM for a new one.',
  reportSolved: (time: string) => `Lock picked in ${time}. Tell your GM.`,
  reportTimeUp: 'Time’s up: the lock resists. Tell your GM.',
  reportFumble: 'Critical failure. Tell your GM.',
  reportOpen: 'Automatic success. Tell your GM.',
  alreadyTried: 'Attempt already made on this device.',

  gmTitle: 'GM mode',
  gmIntro: 'Prepare your locks. Players only get a link: they never see the difficulty.',
  gmNewTitle: 'New lock',
  nameLabel: 'Name (seen by players)',
  namePlaceholder: 'Crypt door',
  timeLimitLabel: 'Time limit',
  timeOptions: ['None', '30 s', '1 min', '2 min', '3 min', '5 min'],
  createLink: 'Create the link',
  myLocks: 'My locks',
  noLocks: 'No lock yet. They are saved in this browser only.',
  savedHere: 'Saved in this browser only.',
  playerBonusLabel: 'Player’s bonus',
  playerBonusHelp: 'Optional: pre-filled for the player, who can still change it.',
  showTimerLabel: 'Show the time left to the player',
  showTimerHelp: 'Off: the timer counts up and the time limit comes as a surprise.',
  previewTitle: 'What the player’s d20 will give',
  previewExplain: (bonus: string) => `With a bonus of ${bonus}, the lock the player gets for each d20 rolled at the table.`,
  assumedBonus: 'Assumed bonus',
  assumedHelp: 'preview only, not saved',
  colD20: 'd20',
  colLock: 'Lock',
  bandFumble: 'Critical failure: no mini-game',
  bandOpen: 'Automatic success',
  bandPoor: ' + one decoy, no yellow',
  bandGood: ' + green help',
  previewToggle: 'Preview',
  bonusShort: (bonus: string) => `bonus ${bonus}`,
  bonusByPlayer: 'bonus entered by the player',
  hiddenTimer: 'hidden',
  noLimit: 'no time limit',
  tiersShort: 'd20 tiers',
  showQr: 'QR code',
  openAsPlayer: 'Open as a player',
  deleteLock: 'Delete',
  confirmDelete: (name: string) => `Delete “${name}”? Links already sent keep working.`,
  qrHelp: 'Players scan it with their phone camera.',
  untitled: 'Untitled lock',

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
  languageLabel: 'Langue',
  sourceCode: 'Code source sur GitHub',
  close: 'Fermer',

  challengeTitle: 'Le défi',
  dcLabel: 'Difficulté fixée par le MJ',
  dcOptions: ['Très facile', 'Facile', 'Moyenne', 'Difficile', 'Très difficile', 'Quasi impossible'],
  dcCustom: 'Autre valeur…',
  dcShort: 'Difficulté',
  bonusLabel: 'Ton bonus',
  rollLabel: 'Ton d20',
  rollError: 'Entre 1 et 20',
  tiersLabel: 'Paliers du d20 (règle maison)',
  tiersHelp: [
    '1 : échec critique, pas de mini-jeu.',
    '2 à 5 : mauvais jet, un leurre de plus et pas de jaune.',
    '18 et 19 : bon jet, crochets compatibles surlignés en vert.',
    '20 : réussite critique, la serrure s’ouvre.',
  ],
  waitingDc: 'Choisis la difficulté annoncée par le MJ.',
  waitingRoll: 'Indique ton d20 pour découvrir la serrure.',
  result: {
    fumble: 'Échec critique : la serrure ne cède pas.',
    critical: 'Réussite critique : la serrure s’ouvre.',
    automatic: 'Réussite d’office : la serrure ne te résiste pas.',
    level: (l) => `Serrure de niveau ${l}.`,
    poor: (l) => `Mauvais jet : serrure de niveau ${l}.`,
    good: (l) => `Bon jet : serrure de niveau ${l}.`,
  },
  resultText: {
    fumble: 'Pas de mini-jeu. Le MJ peut ajouter une complication.',
    alreadyOpen: 'Pas besoin de jouer. Tu peux quand même faire une partie Novice pour le plaisir.',
    poor: 'La serrure est plus dure, cache une fausse piste de plus, et les positions trouvées ne s’affichent pas en jaune.',
    good: 'La serrure est plus facile, et les crochets qui entrent dans l’anneau en cours sont surlignés en vert.',
    normal: 'Les positions que tu trouves s’affichent en jaune.',
  },
  startButton: 'Crocheter',
  playForFun: 'Jouer en Novice',

  settings: 'Réglages',
  settingsIntro: 'Jouer directement une serrure, sans passer par le défi.',
  levelLabel: 'Niveau',
  gapRange: (min, max) => (max === null ? `écart ${min} et plus` : `écart ${min} à ${max}`),
  seedLabel: 'Graine',
  load: 'Charger',
  newLock: 'Nouvelle serrure',
  restart: 'Recommencer',
  copyLink: 'Copier le lien',
  linkCopied: 'Lien copié : envoie-le pour jouer la même serrure.',
  highlightFits: 'Surligner les crochets compatibles',

  boardTitle: (l) => `Serrure de niveau ${l}`,
  flagAid: ' — aide en vert',
  flagNoHints: ' — pas de jaune',
  flagHardened: ' — un leurre de plus',
  newChallenge: 'Nouveau défi',
  soundOn: 'Activer les sons',
  soundOff: 'Couper les sons',
  vibrationOn: 'Activer les vibrations',
  vibrationOff: 'Couper les vibrations',
  start: 'Commencer',
  undo: 'Annuler',
  undoTooltip: 'Annuler le dernier crochet',
  timer: 'Chrono',
  pick: (n, used) => `Crochet ${n}${used ? ' (posé)' : ''}`,
  boardAria: 'Serrure',
  ringAria: (ring, total) => `anneau ${ring} sur ${total}`,
  solved: 'Serrure crochetée !',

  help: 'Comment jouer',
  howTitle: 'Comment jouer',
  how: [
    'Remplis toutes les encoches de l’anneau actif avec les crochets, de l’extérieur vers le centre. Un crochet n’entre que si toutes ses dents tombent sur des encoches libres. Attention aux leurres.',
    'Choisir : clic sur un crochet de la liste.',
    'Tourner : glisser autour de la serrure à la souris, ou glisser le doigt vers la gauche ou la droite.',
    'Insérer : clic sur la serrure, sans glisser.',
    'Jaune : tu as trouvé une position où ce crochet entre dans l’anneau en cours.',
    'Annuler : la flèche en haut à droite de la serrure, autant de fois que tu veux.',
  ],
  rulesTitle: 'Du dé à la serrure',
  rules: [
    'Le MJ fixe la difficulté. Indique ton bonus pour le test (en D&D : DEX + maîtrise des outils de voleur) et le d20 lancé à la table. Avec avantage ou désavantage, indique le dé gardé.',
    'Écart = difficulté − bonus − (d20 − 10) : un 10 garde la serrure, en dessous elle se durcit, au-dessus elle s’adoucit. Écart 2-5 Novice, 6-10 Avancé, 11-15 Expert, 16-20 Maître, 21 et plus Grand maître ; 1 ou moins : réussite d’office.',
    'Un test réussi selon les règles donne au plus une serrure Avancée.',
  ],
  credits: 'Inspiré du digipick de Starfield. Icône des crochets par Delapouite (game-icons.net, CC BY 3.0). Licence MIT.',

  timeUp: 'Temps écoulé !',
  gmMode: 'Mode MJ',
  freePlay: 'Partie libre',

  playerLock: 'Serrure',
  playerIntro: 'Ton MJ a préparé cette serrure. Indique ton bonus et le d20 que tu as lancé.',
  timeLimitNote: (time) => `Temps limité : ${time} à partir de « Commencer ».`,
  invalidLink: 'Ce lien est abîmé. Demande-en un nouveau à ton MJ.',
  reportSolved: (time) => `Serrure crochetée en ${time}. Annonce-le au MJ.`,
  reportTimeUp: 'Temps écoulé : la serrure résiste. Annonce-le au MJ.',
  reportFumble: 'Échec critique. Annonce-le au MJ.',
  reportOpen: 'Réussite d’office. Annonce-le au MJ.',
  alreadyTried: 'Tentative déjà faite sur cet appareil.',

  gmTitle: 'Mode MJ',
  gmIntro: 'Prépare tes serrures. Les joueurs ne reçoivent qu’un lien : ils ne voient jamais la difficulté.',
  gmNewTitle: 'Nouvelle serrure',
  nameLabel: 'Nom (vu par les joueurs)',
  namePlaceholder: 'Porte de la crypte',
  timeLimitLabel: 'Temps limite',
  timeOptions: ['Aucun', '30 s', '1 min', '2 min', '3 min', '5 min'],
  createLink: 'Créer le lien',
  myLocks: 'Mes serrures',
  noLocks: 'Aucune serrure pour l’instant. Elles sont gardées dans ce navigateur seulement.',
  savedHere: 'Gardées dans ce navigateur seulement.',
  playerBonusLabel: 'Bonus du joueur',
  playerBonusHelp: 'Facultatif : pré-rempli pour le joueur, qui peut encore le corriger.',
  showTimerLabel: 'Afficher le temps restant au joueur',
  showTimerHelp: 'Désactivé : le chrono compte vers le haut et le temps limite tombe sans prévenir.',
  previewTitle: 'Ce que donnera le d20 du joueur',
  previewExplain: (bonus) => `Avec un bonus de ${bonus}, voici la serrure que le joueur obtiendra selon le d20 lancé à la table.`,
  assumedBonus: 'Bonus supposé',
  assumedHelp: 'pour l’aperçu seulement, non enregistré',
  colD20: 'd20',
  colLock: 'Serrure obtenue',
  bandFumble: 'Échec critique : pas de mini-jeu',
  bandOpen: 'Réussite automatique',
  bandPoor: ' + un leurre, sans jaune',
  bandGood: ' + aide en vert',
  previewToggle: 'Aperçu',
  bonusShort: (bonus) => `bonus ${bonus}`,
  bonusByPlayer: 'bonus saisi par le joueur',
  hiddenTimer: 'caché',
  noLimit: 'sans limite de temps',
  tiersShort: 'paliers du d20',
  showQr: 'QR code',
  openAsPlayer: 'Ouvrir comme un joueur',
  deleteLock: 'Supprimer',
  confirmDelete: (name) => `Supprimer « ${name} » ? Les liens déjà envoyés continuent de marcher.`,
  qrHelp: 'Les joueurs le scannent avec l’appareil photo de leur téléphone.',
  untitled: 'Serrure sans nom',

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
