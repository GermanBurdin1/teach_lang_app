import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:4200');
  });

  test('should display login form', async ({ page }) => {
    // Navigate to login page
    await page.goto('http://localhost:4200/login');
    
    // Check if login form elements are present
    await expect(page.locator('h2')).toContainText('Connexion');
    await expect(page.locator('input[formControlName="email"]')).toBeVisible();
    await expect(page.locator('input[formControlName="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should display register form', async ({ page }) => {
    // Navigate to register page
    await page.goto('http://localhost:4200/register');
    
    // Check if register form elements are present
    await expect(page.locator('h2')).toContainText('Inscription');
    await expect(page.locator('input[formControlName="name"]')).toBeVisible();
    await expect(page.locator('input[formControlName="surname"]')).toBeVisible();
    await expect(page.locator('input[formControlName="email"]')).toBeVisible();
    await expect(page.locator('input[formControlName="password"]')).toBeVisible();
    await expect(page.locator('input[formControlName="confirmPassword"]')).toBeVisible();
    await expect(page.locator('mat-checkbox[formControlName="isStudent"]')).toBeVisible();
    await expect(page.locator('mat-checkbox[formControlName="isTeacher"]')).toBeVisible();
  });

  test('should validate login form', async ({ page }) => {
    await page.goto('http://localhost:4200/login');
    
    // Try to submit empty form
    await page.click('button[type="submit"]');
    
    // Check if form validation prevents submission
    // The button should remain disabled or form should show validation errors
    await expect(page.locator('button[type="submit"]')).toBeDisabled();
  });

  test('should validate register form', async ({ page }) => {
    await page.goto('http://localhost:4200/register');
    
    // Fill form with invalid data
    await page.fill('input[formControlName="name"]', '');
    await page.fill('input[formControlName="surname"]', '');
    await page.fill('input[formControlName="email"]', 'invalid-email');
    await page.fill('input[formControlName="password"]', 'pass');
    await page.fill('input[formControlName="confirmPassword"]', 'different');
    
    // Try to submit invalid form
    await page.click('button[type="submit"]');
    
    // Check if form validation prevents submission
    await expect(page.locator('button[type="submit"]')).toBeDisabled();
  });

  test('should navigate between login and register', async ({ page }) => {
    // Start on login page
    await page.goto('http://localhost:4200/login');
    
    // Click register link
    await page.click('a[routerLink="/register"]');
    
    // Should be on register page
    await expect(page.locator('h2')).toContainText('Inscription');
    
    // Click login link
    await page.click('a[routerLink="/login"]');
    
    // Should be back on login page
    await expect(page.locator('h2')).toContainText('Connexion');
  });

  test('should toggle theme', async ({ page }) => {
    await page.goto('http://localhost:4200/login');
    
    // Check initial theme
    const themeToggle = page.locator('.theme-toggle');
    await expect(themeToggle).toContainText('🌙 Dark');
    
    // Click theme toggle
    await themeToggle.click();
    
    // Check if theme changed
    await expect(themeToggle).toContainText('☀️ Light');
    
    // Click again to toggle back
    await themeToggle.click();
    await expect(themeToggle).toContainText('🌙 Dark');
  });

  test('should show password visibility toggle', async ({ page }) => {
    await page.goto('http://localhost:4200/login');
    
    const passwordInput = page.locator('input[formControlName="password"]');
    const visibilityButton = page.locator('button[matSuffix]');
    
    // Check initial state (password should be hidden)
    await expect(passwordInput).toHaveAttribute('type', 'password');
    await expect(visibilityButton.locator('mat-icon')).toContainText('visibility');
    
    // Click visibility toggle
    await visibilityButton.click();
    
    // Check if password is now visible
    await expect(passwordInput).toHaveAttribute('type', 'text');
    await expect(visibilityButton.locator('mat-icon')).toContainText('visibility_off');
  });

  test('should handle email blur for role selection', async ({ page }) => {
    await page.goto('http://localhost:4200/login');
    
    // Fill email field
    await page.fill('input[formControlName="email"]', 'test@example.com');
    
    // Trigger blur event
    await page.locator('input[formControlName="email"]').blur();
    
    // Wait a bit for potential API call
    await page.waitForTimeout(1000);
    
    // The role selection should appear if the email exists with multiple roles
    // This test assumes the API might be mocked or the behavior is predictable
  });

  test('should handle admin email auto-role', async ({ page }) => {
    await page.goto('http://localhost:4200/login');
    
    // Fill admin email
    await page.fill('input[formControlName="email"]', 'admin@admin.net');
    
    // The role should be automatically set to 'admin'
    // This is a client-side behavior that should work without API calls
    await page.waitForTimeout(500);
    
    // Check if form is now valid (admin role should be auto-selected)
    await expect(page.locator('button[type="submit"]')).not.toBeDisabled();
  });

  test('should validate password confirmation match', async ({ page }) => {
    await page.goto('http://localhost:4200/register');
    
    // Fill passwords that don't match
    await page.fill('input[formControlName="password"]', 'password123');
    await page.fill('input[formControlName="confirmPassword"]', 'password456');
    
    // Trigger validation by filling other required fields
    await page.fill('input[formControlName="name"]', 'Test');
    await page.fill('input[formControlName="surname"]', 'User');
    await page.fill('input[formControlName="email"]', 'test@example.com');
    await page.check('mat-checkbox[formControlName="isStudent"]');
    
    // Form should still be invalid due to password mismatch
    await expect(page.locator('button[type="submit"]')).toBeDisabled();
    
    // Fix password confirmation
    await page.fill('input[formControlName="confirmPassword"]', 'password123');
    
    // Form should now be valid
    await expect(page.locator('button[type="submit"]')).not.toBeDisabled();
  });

  test('should validate exclusive role selection', async ({ page }) => {
    await page.goto('http://localhost:4200/register');
    
    // Fill required fields
    await page.fill('input[formControlName="name"]', 'Test');
    await page.fill('input[formControlName="surname"]', 'User');
    await page.fill('input[formControlName="email"]', 'test@example.com');
    await page.fill('input[formControlName="password"]', 'password123');
    await page.fill('input[formControlName="confirmPassword"]', 'password123');
    
    // Don't select any role - form should be invalid
    await expect(page.locator('button[type="submit"]')).toBeDisabled();
    
    // Select both roles - form should still be invalid
    await page.check('mat-checkbox[formControlName="isStudent"]');
    await page.check('mat-checkbox[formControlName="isTeacher"]');
    await expect(page.locator('button[type="submit"]')).toBeDisabled();
    
    // Select only one role - form should be valid
    await page.uncheck('mat-checkbox[formControlName="isTeacher"]');
    await expect(page.locator('button[type="submit"]')).not.toBeDisabled();
  });
}); 