# Lockpicking mini-game

A Starfield-style lockpicking mini-game for tabletop RPGs. The GM sets the DC, the player rolls a d20 at the table, and the result becomes a lock to pick — easier on a good roll, harder on a bad one.

**Play it: https://pierretusseau.github.io/lockpick-minigame/**

Works with any d20 system (D&D 5e / 2024, Pathfinder, Chroniques Oubliées…). English and French. Mouse or touch screen; the phone vibrates on Android.

*Version française plus bas.*

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

### Optional house rule: d20 tiers

Off by default (in D&D a natural 1 or 20 does nothing special on an ability check). When on, the raw die also colours the attempt:

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

### Same lock for everyone

The URL holds the lock (`?seed=abc123&level=expert`). **Copy link** and send it: everyone gets exactly the same lock, handy for a race at the table.

## Development

```bash
npm install
npm run dev        # local server
npm test           # engine tests (Vitest)
npm run build      # static site in dist/
```

Stack: Vite, React, TypeScript, MUI. 100 % client-side, no server, no tracking. Pushing to `main` deploys to GitHub Pages (`.github/workflows/deploy.yml`).

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

Les **paliers du d20** (1 : échec critique, 2 à 5 : mauvais jet, 18-19 : aide en vert, 20 : réussite) sont une règle maison facultative, désactivée par défaut. Le lien de la page contient la serrure : envoyez-le pour que tout le monde joue la même. Interface en français ou en anglais, à la souris ou au doigt.
