# Cercle Partages

Ce projet est une plateforme pour l'organisation et le partage de rencontres et d'événements.

**URL**: https://cerclepartages.org

## Technologies utilisées

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Supabase

## Installation et Développement

1. Clonez le dépôt.
2. Installez les dépendances : `npm i`
3. Lancez le serveur de développement : `npm run dev`

## Tests

Le projet inclut des tests unitaires et des tests d'intégration pour assurer la stabilité.

### CI/CD

Le projet utilise GitHub Actions pour exécuter automatiquement les tests unitaires et les tests E2E à chaque push ou pull request sur les branches `main` ou `master`.

### Tests Unitaires & Composants (Vitest)
- `npm run test` : Lance les tests en mode interactif.
- `npm run test:run` : Exécute les tests une seule fois.
- `npm run test:coverage` : Génère un rapport de couverture.

### Tests d'Intégration / E2E (Playwright)
- `npx playwright install` : Installe les navigateurs nécessaires (à faire une fois).
- `npm run test:e2e` : Lance les tests d'intégration.
- `npx playwright show-report` : Affiche le rapport détaillé après un test.

### Build
- `npm run build` : Exécute les tests unitaires avant de compiler le projet.
