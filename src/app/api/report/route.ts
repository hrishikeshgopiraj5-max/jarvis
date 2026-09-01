/**
 * JARVIS Bug Bounty Report API
 *
 * POST /api/report
 * Body: { target: string }
 *
 * Runs auto-recon and generates submission-ready bug bounty reports
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateReports, formatReportMarkdown, formatReportPlainText, formatReportsSummary } from '@/lib/bug-report';
import type { ReconResult } from '@/lib/bug-report';

export async function POST(request: NextRequest) {
  try {
    const { target, reconResult } = await request.json();

    if (!target && !reconResult) {
      return NextResponse.json(
        { error: 'Target or reconResult is required' },
        { status: 400 }
      );
    }

    let result: ReconResult;

    if (reconResult) {
      // Use provided recon result
      result = reconResult;
    } else {
      // Run recon first
      const reconRes = await fetch(`${request.nextUrl.origin}/api/recon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target }),
      });

      if (!reconRes.ok) {
        throw new Error('Recon failed');
      }

      result = await reconRes.json();
    }

    // Generate reports from findings
    const reports = generateReports(result);

    // Format reports
    const formattedReports = reports.map(report => ({
      ...report,
      markdown: formatReportMarkdown(report),
      plainText: formatReportPlainText(report),
    }));

    const summary = formatReportsSummary(reports);

    return NextResponse.json({
      target: result.target,
      totalReports: reports.length,
      summary,
      reports: formattedReports,
      reconSummary: result.summary,
    });

  } catch (error: any) {
    console.error('[Report Generator] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate report', details: error?.message },
      { status: 500 }
    );
  }
}
