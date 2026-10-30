# Lockpicking mini-game

A Starfield-style lockpicking mini-game for tabletop RPGs. The GM sets the DC, the player rolls a d20 at the table, and the result becomes a lock to pick — easier on a good roll, harder on a bad one.

**Play it: https://pierretusseau.github.io/lockpick-minigame/**

Works with any d20 system (D&D 5e / 2024, Pathfinder, Chroniques Oubliées…). English and French. Mouse or touch screen; the phone vibrates on Android.

*Version française plus bas.*

## GM mode: keep the difficulty secret

**https://pierretusseau.github.io/lockpick-minigame/mj/**

The GM prepares named locks ("Crypt door", "Baron's chest") with a DC, optionally the player's bonus, an optional **time limit** (shown to the player or kept as a surprise) and the d20 tiers, then shares each one as a **link or a QR code**. A table shows the GM which lock each d20 would give; players never see it.

Players opening the link enter their d20 (and their bonus, unless the GM pre-filled it): they never see the DC, the lock's level, nor whether their roll made the lock easier or harder — just a lock to pick. The attempt is remembered on their device for that link, so reloading gives back the same lock and the same running timer. At the end they get a short report to tell the GM ("Lock picked in 0:42.3", "Time's up").

The GM's locks are saved in their browser only (no server). The link carries the whole lock in a scrambled code: the DC is not readable in the address bar, but this is not security — a determined player could decode it, and the number of rings already hints at how hard a lock is.

## How it works

1. **The GM sets the DC** (5 very easy → 30 nearly impossible, or any value).
2. **The player enters their bonus** for the check (in D&D: DEX modifier + proficiency bonus with thieves' tools) **and the d20 they rolled** at the table. With advantage or disadvantage, enter the die you keep.
3. **The game turns the check into a lock:**

   ```
   base gap  = DC − bonus            (what you need on the d20)
   final gap = base gap − (d20 − 10) (the die shifts it; a 10 keeps it)
   ```

   | Final gap | Lock          |
   |-----------|---------------|
   | 1 or less | Automatic success, no need to play |
   | 2 to 5    | Novice        |
   | 6 to 10   | Advanced      |
   | 11 to 15  | Expert        |
   | 16 to 20  | Master        |
   | 21+       | Grand master  |

   The final gap equals 10 minus the margin of the check, so **a check that succeeds by the book gives at most an Advanced lock**, and a failed one an Expert lock or worse. The mini-game gives a second chance, and the player's skill matters.

4. **Pick the lock:** fill every notch of the active ring with picks, from the outside in. A pick only goes in if all its teeth land on free notches. Some picks are decoys. Undo is unlimited; the timer is there for bragging rights.

The table decides what failing means: giving up, running out of time, making noise…

### House rule: d20 tiers

On by default; untick it for rules as written (in D&D a natural 1 or 20 does nothing special on an ability check). When on, the raw die also colours the attempt:

| d20     | Effect |
|---------|--------|
| 1       | Critical failure: no mini-game, the GM may add a complication |
| 2 to 5  | Poor roll: one more decoy, found positions are not shown in yellow |
| 6 to 17 | Normal |
| 18, 19  | Good roll: picks that fit the current ring are highlighted in green |
| 20      | Critical success: the lock opens |

### Controls

- **Choose a pick:** click it in the list.
- **Rotate:** drag around the lock with the mouse, or swipe left/right with a finger (left = clockwise).
- **Insert:** click or tap the lock without dragging.
- **Yellow:** you found a position where this pick fits the current ring.
- **Undo:** the arrow at the top right of the lock.

### Leaderboard

When a lock opens, the time goes on a leaderboard (a name is asked the first time): the best times of the level, and the best times on this very lock — handy for a race with a shared link. The trophy button shows any level's board. Runs with the green help are not ranked, nor GM-mode locks.

The server checks every run by replaying its moves on the rebuilt lock, and refuses times too short for a human. The time itself is measured by the player's browser, so this keeps out lazy cheating, not a determined one. Only the chosen name, a random id of the browser and the time are stored.

### Same lock for everyone

The URL holds the lock (`?seed=abc123&level=expert`). Open **Settings** (top right), **Copy link** and send it: everyone gets exactly the same lock, handy for a race at the table. Settings also let you play any level directly.

## Development

```bash
npm install
npm run dev        # local server
npm test           # engine tests (Vitest)
npm run build      # static site in dist/
```

Stack: Vite, React, TypeScript, MUI. The game is client-side, no tracking; the only server is the optional leaderboard. Pushing to `main` deploys to GitHub Pages (`.github/workflows/deploy.yml`).

### Leaderboard server (`worker/`)

A Cloudflare Worker with a D1 database (one table), both on the free plan. It reuses the game engine to check runs (`src/engine/verify.ts`).

```bash
cd worker
npm install
npx wrangler login
npx wrangler d1 create lockpick-leaderboard   # copy the database_id into wrangler.jsonc
npm run db:init                               # creates the table
npm run deploy                                # prints the API address (https://….workers.dev)
```

Then set the repository variable `LEADERBOARD_URL` to that address (GitHub → Settings → Secrets and variables → Actions → Variables) and redeploy the site. Without it, the leaderboard is hidden. Locally: `npm run db:init:local && npm run dev` in `worker/`, and `VITE_LEADERBOARD_URL=http://localhost:8787 npm run dev` at the root.

- `src/engine/` — pure game logic: lock generator (seeded, always solvable, decoys checked by a solver), game rules, DC → lock mapping. No React.
- `src/components/` — the board (SVG), the challenge form, synthesised sounds (Web Audio, no audio files) and vibrations.
- `src/i18n.tsx` — English and French texts.

## Credits

- Inspired by the digipick mini-game of *Starfield* (Bethesda). Not affiliated.
- Lockpicks icon by [Delapouite](https://delapouite.com/), from [game-icons.net](https://game-icons.net), [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/).
- Originally built for a *Chroniques Oubliées Fantasy* campaign.

Code under the [MIT licence](LICENSE).

---

## En français

Un mini-jeu de crochetage façon Starfield pour le jeu de rôle sur table. Le MJ fixe la difficulté, le joueur lance son d20 à la table, et le résultat devient une serrure à crocheter : plus facile sur un bon jet, plus dure sur un mauvais.

1. Le MJ annonce la difficulté (DD).
2. Le joueur indique son bonus et le d20 obtenu.
3. Écart final = (DD − bonus) − (d20 − 10), qui donne le niveau de la serrure (tableau ci-dessus). Un test réussi selon les règles donne au plus une serrure Avancée.
4. On remplit les encoches de chaque anneau avec les crochets, de l'extérieur vers le centre. Attention aux leurres.

**Mode MJ** (`/mj/`) : le MJ prépare des serrures nommées (difficulté, bonus du joueur facultatif, temps limite affiché ou caché, paliers du d20) et partage chacune par lien ou QR code. Le joueur ne saisit que son d20 (et son bonus si le MJ ne l'a pas mis) : il ne voit ni la difficulté, ni le niveau, ni l'effet de son jet, seulement la serrure. La tentative est mémorisée sur son appareil (recharger ne relance ni le dé ni le chrono).

**Classement** : à l'ouverture de la serrure, le temps entre dans le classement du niveau et dans celui de la serrure (pseudo demandé la première fois). Le serveur rejoue les coups pour vérifier la partie ; l'aide en vert et le mode MJ ne sont pas classés.

Les **paliers du d20** (1 : échec critique, 2 à 5 : mauvais jet, 18-19 : aide en vert, 20 : réussite) sont une règle maison, activée par défaut et décochable. Le lien de la page contient la serrure : « Copier le lien » dans les Réglages, et tout le monde joue la même. Interface en français ou en anglais, à la souris ou au doigt.
