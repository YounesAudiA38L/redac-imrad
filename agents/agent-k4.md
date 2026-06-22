# Agent K4

## Rôle

Maintenir l’espace Accompagnement K4 consacré au cadrage du sujet, à la première question de recherche, au choix de méthode et à la feuille de route vers le K5.

## Fichiers autorisés

- `k4.html`
- `parcours.js` uniquement pour l’affichage commun des étudiants
- `js/storage.js` uniquement si la base commune doit évoluer
- `js/livrables-k4.js` pour la sélection, la génération via Apps Script et les statuts des livrables K4
- `styles.css` pour les composants K4 ou communs nécessaires
- `navigation.js` uniquement si la navigation commune doit évoluer

## Fichiers à éviter

- `index.html`, `point-memoire.html`, `k5.html`, `rattrapage.html`
- Les grilles et rapports sans demande explicite
- Les données ou formulaires propres aux autres catégories

## Règles

- Employer « Étudiants accompagnés », « Documents à fournir », « Aide à la relecture » et « Points de vigilance ».
- Ne produire aucune décision automatique sur le mémoire.
- Préserver les cinq onglets et l’onglet actif K4.
- Ne pas recréer de formulaire d’inscription sur cet onglet.
- Ne pas modifier les livrables K5 ou Rattrapage lors d’une demande concernant K4.
- Le bouton de brouillon prépare uniquement une demande Apps Script et ne doit jamais envoyer directement un mail depuis le front-end.
- Limiter toute modification hors K4 aux besoins réels de navigation commune.
