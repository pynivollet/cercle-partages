import { test, expect } from '@playwright/test';

test.describe('Navigation et Authentification', () => {
  test('devrait rediriger vers la page de connexion si non authentifié', async ({ page }) => {
    await page.goto('/');
    // L'URL devrait contenir /connexion car l'utilisateur n'est pas connecté
    await expect(page).toHaveURL(/.*connexion/);
    // On vérifie le titre de la page de connexion
    await expect(page.getByRole('heading', { level: 2 })).toContainText(/Connexion/i);
  });

  test('devrait afficher la page de connexion avec les éléments essentiels', async ({ page }) => {
    await page.goto('/connexion');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Cercle Partages');
    await expect(page.getByLabel(/Email/i)).toBeVisible();
    await expect(page.getByLabel(/Mot de passe/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Se connecter/i })).toBeVisible();
  });

  test('devrait afficher la page d\'inscription (via lien d\'invitation)', async ({ page }) => {
    // La page d'inscription redirige vers /connexion si pas de token, 
    // mais elle affiche brièvement le titre ou un message d'erreur
    await page.goto('/inscription');
    // Si redirigé immédiatement vers connexion
    const url = page.url();
    if (url.includes('connexion')) {
      await expect(page.getByRole('heading', { level: 2 })).toContainText(/Connexion/i);
    } else {
      await expect(page.getByRole('heading', { level: 2 })).toContainText(/Créer votre compte|Inscription/i);
    }
  });
});

test.describe('Pages Publiques et Erreurs', () => {
  test('devrait afficher la page 404 pour une route inexistante', async ({ page }) => {
    await page.goto('/une-route-qui-n-existe-pas');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('404');
    // Le texte dans NotFound.tsx est en anglais d'après le code lu précédemment
    await expect(page.getByRole('link')).toContainText(/Return to Home/i);
  });
});
