// @ts-nocheck
import { test, expect } from '../helpers/coverageFixture';
import { RegistrationPage } from '../pages/RegistrationPage';
import { DashboardPage } from '../pages/DashboardPage';
import { prisma } from '../../../lib/database/client';
import { generateTestId } from '../../helpers/testUtils';

const PASSWORD = 'Register123!';

test.describe('@critical Registration Journey', () => {
  test('user can sign up and is prompted to verify email', async ({ page }) => {
    const regPage = new RegistrationPage(page);
    await regPage.goto();

    const email = `signup-${generateTestId('user')}@example.com`;
    const name = 'Signup User';

    await regPage.register({ email, password: PASSWORD, name });
    await regPage.expectVerificationEmailPage();

    // Simulate verification by marking user verified in DB (since email not actually sent)
    const user = await prisma.user.update({ where: { email }, data: { isEmailVerified: true, isActive: true } });

    // Attempt login via AuthFlow
    const { AuthFlow } = await import('../helpers/AuthFlow');
    const authFlow = new AuthFlow(page);
    await authFlow.login({ email, password: PASSWORD });
    const dashboard = new DashboardPage(page);
    await dashboard.expectLoaded();

    // Clean up user
    await prisma.user.delete({ where: { id: user.id } });
  });
});