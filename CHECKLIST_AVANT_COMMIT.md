# Checklist avant commit

Avant chaque commit, verifier les points suivants.

## Etat du projet

- [ ] Lancer `git status`.
- [ ] Verifier que seuls les fichiers attendus sont modifies.
- [ ] Verifier que les chemins de scripts sont bons.

## Verification du logiciel

- [ ] Verifier que le logiciel s'ouvre.
- [ ] Tester Accueil.
- [ ] Tester Prospects.
- [ ] Tester Point Memoire.
- [ ] Tester K4.
- [ ] Tester K5.
- [ ] Tester Rattrapage.
- [ ] Verifier la console navigateur.
- [ ] Verifier l'absence d'erreurs 404.

## Securite et configuration

- [ ] Verifier l'absence de secret `AKfycb` dans les fichiers suivis.
- [ ] Verifier que `config.private.js` est ignore par Git.
- [ ] Ne jamais commiter de token, URL privee Apps Script ou configuration personnelle.

## Commit

- [ ] Faire un commit clair.
- [ ] Pousser sur GitHub seulement si tout est stable.
