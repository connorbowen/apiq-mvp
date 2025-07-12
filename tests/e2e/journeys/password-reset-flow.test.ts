// @ts-nocheck
import { test, expect } from '../helpers/coverageFixture';
import { createTestUser, cleanupTestUser, generateTestId } from '../../helpers/testUtils';
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage';
import { ResetPasswordPage } from '../pages/ResetPasswordPage';
import { prisma } from '../../../lib/database/client';
import { DashboardPage } from '../pages/DashboardPage';

const NEW_PASSWORD = 'NewPassword123!';

test.describe('@critical Password Reset Journey', () => {
  let email: string;
  let user;

  test.beforeAll(async () => {
    email = `reset-${generateTestId('user')}@example.com`;
    user = await createTestUser(email, 'OldPassword123!', 'USER', 'Reset User');
  });

  test.afterAll(async () => {
    await cleanupTestUser(user);
  });

  test('user can request reset and set new password', async ({ page }) => {
    const forgot = new ForgotPasswordPage(page);
    await forgot.goto();
    await forgot.requestReset(email);
    await forgot.expectSuccessPage();

    // grab token from db
    const tokenRecord = await prisma.passwordResetToken.findFirst({ where: { email } });
    expect(tokenRecord).toBeTruthy();

    const reset = new ResetPasswordPage(page);
    await reset.goto(tokenRecord.token);
    await reset.resetPassword(NEW_PASSWORD);
    await reset.expectSuccess();

    // login with new password
    const { AuthFlow } = await import('../helpers/AuthFlow');
    const authFlow = new AuthFlow(page);
    await authFlow.login({ email, password: NEW_PASSWORD });
    const dashboard = new DashboardPage(page);
    await dashboard.expectLoaded();
  });
});