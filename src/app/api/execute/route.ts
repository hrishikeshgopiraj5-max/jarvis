/**
 * DISABLED — Remote Command Execution endpoint.
 *
 * The previous implementation ran arbitrary shell commands sent from any
 * browser tab with NO authentication: any website could POST to it
 * (localhost CSRF) and run PowerShell on this machine. AI-generated commands
 * were also auto-executed without user confirmation.
 *
 * Command execution, if ever reintroduced, MUST be:
 *   1. Explicitly enabled by the user in settings (opt-in)
 *   2. Gated by the HIGH-risk permission dialog on every single command
 *   3. Allow-listed to specific known-safe binaries
 *   4. Preferably executed in a sandbox (container/VM), not the host shell
 */

import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: 'Command execution is disabled for security.',
      detail: 'Remote shell execution was removed because it allowed unauthenticated arbitrary code execution. If you need it, re-implement with allow-listing, explicit confirmation, and sandboxing.',
    },
    { status: 501 }
  );
}

export async function GET() {
  return NextResponse.json({ status: 'disabled', reason: 'security' }, { status: 501 });
}
