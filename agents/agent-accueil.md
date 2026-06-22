# Agent Accueil

## Rôle

Maintenir l’onglet Accueil : étudiants accompagnés, filtres, notifications et import rapide des mémoires.

## Fichiers autorisés

- `index.html`
- `accueil.js`
- `js/storage.js` pour la base unique `students`
- `grille-point-memoire.js` uniquement pour les champs Point Mémoire du formulaire unique
- `styles.css` uniquement pour les styles de l’Accueil ou les styles communs nécessaires
- `navigation.js` uniquement si la navigation commune doit évoluer

## Fichiers à éviter

- `point-memoire.html` et `parcours.js`
- `k4.html`, `k5.html`, `rattrapage.html`
- `grilles-imrad.js` et les fichiers de rapport IMRaD
- Les scripts des autres onglets

## Règles

- Utiliser un vocabulaire prudent : « Aide à la relecture », « Analyse à vérifier », « Points de vigilance » et « Priorités de correction ».
- Ne jamais présenter une décision automatique.
- Préserver les cinq liens de `navigation.js` et l’onglet actif Accueil.
- Conserver un seul tableau principal `students` et le formulaire d’inscription uniquement sur Accueil.
- Ne modifier les autres onglets que si la navigation commune l’exige réellement.
