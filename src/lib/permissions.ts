/**
 * JARVIS Permission System
 *
 * Tools are classified by risk. LOW runs automatically; MEDIUM/HIGH require
 * explicit user confirmation via the UI. Denials are remembered per-session.
 *
 * Intentionally framework-free so it can be unit-tested and later moved
 * server-side for real enforcement.
 */

export type RiskLevel = 'low' | 'medium' | 'high';

export interface PermissionRequest {
  tool: string;
  action: string;
  summary: string;      // human-readable description of what will happen
  detail?: string;      // extra context (command text, target, etc.)
  risk: RiskLevel;
}

export type PermissionDecision = 'granted' | 'denied';

type ConfirmationHandler = (request: PermissionRequest) => Promise<PermissionDecision>;

let confirmationHandler: ConfirmationHandler | null = null;
const deniedThisSession = new Set<string>();

/** The UI registers a handler that shows the confirmation dialog. */
export function setPermissionConfirmationHandler(handler: ConfirmationHandler) {
  confirmationHandler = handler;
}

export function rememberDenial(tool: string, action: string) {
  deniedThisSession.add(`${tool}:${action}`);
}

export function wasDeniedBefore(tool: string, action: string): boolean {
  return deniedThisSession.has(`${tool}:${action}`);
}

export function clearDeniedHistory() {
  deniedThisSession.clear();
}

/**
 * Resolve a tool permission. LOW risk auto-approves. MEDIUM/HIGH routes
 * through the registered confirmation handler.
 */
export async function resolvePermission(request: PermissionRequest): Promise<PermissionDecision> {
  if (request.risk === 'low') return 'granted';
  if (!confirmationHandler) {
    console.warn(`[JARVIS permissions] no confirmation handler for ${request.tool}, denying`);
    return 'denied';
  }
  return confirmationHandler(request);
}
