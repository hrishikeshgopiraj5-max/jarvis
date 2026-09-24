/**
 * Unit tests for the permission system.
 * bun test src/lib/__tests__/permissions.test.ts
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import {
  resolvePermission, setPermissionConfirmationHandler, rememberDenial,
  wasDeniedBefore, clearDeniedHistory, PermissionRequest,
} from '../permissions';

const baseRequest: PermissionRequest = {
  tool: 'web_search',
  action: 'open browser tab',
  summary: 'Opens a new browser tab with search results',
  risk: 'medium',
};

describe('permissions', () => {
  beforeEach(() => {
    clearDeniedHistory();
    setPermissionConfirmationHandler(null as unknown as Parameters<typeof setPermissionConfirmationHandler>[0]);
  });

  test('low risk auto-approves without any handler', async () => {
    const decision = await resolvePermission({ ...baseRequest, risk: 'low' });
    expect(decision).toBe('granted');
  });

  test('medium risk denies when no handler is registered (fail-closed)', async () => {
    const decision = await resolvePermission(baseRequest);
    expect(decision).toBe('denied');
  });

  test('medium risk asks the handler and reports its decision', async () => {
    setPermissionConfirmationHandler(async () => 'granted');
    expect(await resolvePermission(baseRequest)).toBe('granted');

    setPermissionConfirmationHandler(async () => 'denied');
    expect(await resolvePermission(baseRequest)).toBe('denied');
  });

  test('high risk requires the handler too', async () => {
    let asked = false;
    setPermissionConfirmationHandler(async (req) => {
      asked = true;
      expect(req.risk).toBe('high');
      return 'granted';
    });
    expect(await resolvePermission({ ...baseRequest, risk: 'high' })).toBe('granted');
    expect(asked).toBe(true);
  });

  test('denial memory records and clears', () => {
    expect(wasDeniedBefore('web_search', 'open browser tab')).toBe(false);
    rememberDenial('web_search', 'open browser tab');
    expect(wasDeniedBefore('web_search', 'open browser tab')).toBe(true);
    clearDeniedHistory();
    expect(wasDeniedBefore('web_search', 'open browser tab')).toBe(false);
  });
});
