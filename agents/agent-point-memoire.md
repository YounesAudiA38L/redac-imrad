# Agent Point Mémoire

## Rôle

Maintenir la liste des étudiants du parcours Point Mémoire et l’accès à leurs fiches créées sur Accueil.

## Fichiers autorisés

- `point-memoire.html`
- `parcours.js` uniquement pour l’affichage commun des étudiants
- `js/storage.js` uniquement si la base commune doit évoluer
- `js/questionnaire-sync.js` pour la synchronisation Apps Script, les synthèses locales et la création de fiches étudiant
- `grille-point-memoire.js` pour les six axes de synthèse
- `styles.css` pour les composants propres à cet onglet ou les styles communs nécessaires
- `navigation.js` uniquement si la navigation commune doit évoluer

## Fichiers à éviter

- `index.html` et `accueil.js`
- `k4.html`, `k5.html`, `rattrapage.html`
- `grilles-imrad.js`, `app.js` et les pages de rapport IMRaD sauf demande explicite

## Règles

- Employer « Rapport de relecture », « Points de vigilance » et « Priorités de correction ».
- Les recommandations restent des aides à vérifier par Audrey.
- Préserver les cinq onglets et l’onglet actif Point Mémoire.
- Ne pas recréer de formulaire d’inscription sur cet onglet.
- Ne modifier les autres espaces que pour une nécessité de navigation commune.
