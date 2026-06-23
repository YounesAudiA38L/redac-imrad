# Redac-IMRaD

Outil interne destiné à Audrey pour l'aider à préparer et structurer ses relectures de mémoires IMRaD en kinésithérapie, dans le cadre de son projet « Sois fière de ton mémoire ».

Le logiciel ne produit pas de decision automatique. Il sert a structurer une analyse humaine, avec des formulations prudentes comme :

- Score de conformité
- Analyse à vérifier
- Point de vigilance
- Critere partiellement respecte

Structure actuelle : Accueil, Prospects, Point Mémoire, K4, K5 et Rattrapage.

L'inscription des étudiants est centralisée sur Accueil. Les données sont enregistrées dans une base locale unique :

- `students`
- `prospects`
- `settings`
- `notifications`
- `reports`

Les onglets Point Mémoire, K4, K5 et Rattrapage affichent uniquement les étudiants correspondant à leur parcours.

L’onglet Point Mémoire peut interroger une URL de déploiement Google Apps Script pour récupérer les questionnaires pré-visio. Cette vérification fonctionne uniquement lorsque l’onglet est ouvert et ne s’exécute pas en arrière-plan après fermeture du logiciel.

L’onglet K4 permet de sélectionner cinq livrables et de demander à une URL Apps Script de préparer les documents et un brouillon mail. Le front-end n’envoie aucun message directement ; le brouillon et les documents restent à vérifier par Audrey.
