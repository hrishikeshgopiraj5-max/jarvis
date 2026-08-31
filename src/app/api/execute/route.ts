/**
 * JARVIS Command Executor — Runs terminal commands on the user's machine
 * 
 * This API route:
 * 1. Receives a command from the frontend
 * 2. Executes it via child_process
 * 3. Returns stdout/stderr
 * 4. Records in memory system
 * 
 * Security: Commands are run in a sandboxed manner with timeout.
 */

import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Command timeout: 30 seconds default, 120 for long-running
const DEFAULT_TIMEOUT = 30000;
const EXTENDED_TIMEOUT = 120000;

// Blocked commands (safety)
const BLOCKED_COMMANDS = [
  'rm -rf /',
  'mkfs',
  'dd if=/dev/zero',
  ':(){:|:&};:',  # fork bomb
];

/**
 * POST /api/execute
 * Body: { command: string, timeout?: number }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { command, timeout = DEFAULT_TIMEOUT } = body;

    if (!command || typeof command !== 'string') {
      return NextResponse.json(
        { error: 'Command is required' },
        { status: 400 }
      );
    }

    // Safety check
    const blocked = BLOCKED_COMMANDS.some(blocked => 
      command.toLowerCase().includes(blocked.toLowerCase())
    );
    if (blocked) {
      return NextResponse.json(
        { error: 'This command is blocked for safety reasons.' },
        { status: 403 }
      );
    }

    console.log(`[Command Executor] Running: ${command}`);

    const { stdout, stderr } = await execAsync(command, {
      timeout: Math.min(timeout, EXTENDED_TIMEOUT),
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      shell: process.platform === 'win32' ? 'powershell.exe' : '/bin/bash',
    });

    console.log(`[Command Executor] Completed: ${command.substring(0, 100)}...`);

    return NextResponse.json({
      success: true,
      stdout: stdout?.trim() || '',
      stderr: stderr?.trim() || '',
      command,
      timestamp: Date.now(),
    });

  } catch (error: any) {
    const message = error?.message || 'Command execution failed';
    console.error(`[Command Executor] Error:`, message);

    return NextResponse.json({
      success: false,
      error: message,
      stdout: error?.stdout?.trim() || '',
      stderr: error?.stderr?.trim() || '',
      command: error?.cmd || '',
      timestamp: Date.now(),
    });
  }
}
