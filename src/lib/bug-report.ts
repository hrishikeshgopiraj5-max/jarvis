/**
 * JARVIS Bug Bounty Report Generator
 *
 * Converts auto-recon findings into professional, submission-ready
 * reports for HackerOne, Bugcrowd, and other platforms.
 *
 * Report format follows industry standards:
 * - Title with severity
 * - Summary with impact
 * - Detailed steps to reproduce
 * - Evidence (screenshots, commands, responses)
 * - Remediation recommendations
 */

export interface ReconFinding {
  type: string;
  severity: string;
  title: string;
  detail: string;
  evidence?: string;
  command?: string;
}

export interface ReconPhase {
  id: string;
  name: string;
  status: string;
  results: ReconFinding[];
  commands: string[];
  duration?: number;
}

export interface ReconResult {
  target: string;
  startTime: number;
  endTime?: number;
  phases: ReconPhase[];
  summary: {
    totalFindings: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
    subdomains: number;
    openPorts: number;
    technologies: string[];
  };
}

export interface BugReport {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'informational';
  cvssScore: number;
  cvssVector: string;
  vulnerabilityType: string;
  target: string;
  endpoint: string;
  summary: string;
  impact: string;
  stepsToReproduce: string[];
  evidence: EvidenceItem[];
  remediation: string;
  references: string[];
  classification: {
    cwe: string;
    owasp: string;
    cve?: string;
  };
}

export interface EvidenceItem {
  type: 'header' | 'response' | 'command' | 'screenshot' | 'dns' | 'certificate';
  label: string;
  content: string;
}

// ═══════════════════════════════════════════════════════════════
// REPORT GENERATOR
// ═══════════════════════════════════════════════════════════════

/**
 * Generate bug bounty reports from recon findings
 */
export function generateReports(result: ReconResult): BugReport[] {
  const reports: BugReport[] = [];

  // Process each phase's findings
  for (const phase of result.phases) {
    for (const finding of phase.results) {
      // Only generate reports for actionable findings (not info-level subdomains)
      if (finding.severity === 'info' && finding.type === 'subdomain') continue;
      if (finding.severity === 'info' && finding.type === 'port') continue;

      const report = createReport(finding, result);
      if (report) reports.push(report);
    }
  }

  // Sort by severity (critical first)
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, informational: 4 };
  reports.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return reports;
}

/**
 * Create a single bug report from a finding
 */
function createReport(finding: ReconFinding, result: ReconResult): BugReport | null {
  const id = generateReportId(finding);

  switch (finding.type) {
    case 'vulnerability':
      return createVulnerabilityReport(finding, result, id);
    case 'header':
      return createHeaderReport(finding, result, id);
    case 'file':
      return createFileReport(finding, result, id);
    case 'port':
      return createPortReport(finding, result, id);
    case 'dns':
      return createDNSReport(finding, result, id);
    default:
      return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// REPORT TYPES
// ═══════════════════════════════════════════════════════════════

function createVulnerabilityReport(finding: ReconFinding, result: ReconResult, id: string): BugReport {
  const vulnType = classifyVulnerability(finding);

  return {
    id,
    title: finding.title,
    severity: mapSeverity(finding.severity),
    cvssScore: getCVSSScore(finding),
    cvssVector: getCVSSVector(finding),
    vulnerabilityType: vulnType.type,
    target: result.target,
    endpoint: extractEndpoint(finding),
    summary: generateSummary(finding, vulnType),
    impact: generateImpact(finding, vulnType),
    stepsToReproduce: generateSteps(finding, result),
    evidence: generateEvidence(finding, result),
    remediation: vulnType.remediation,
    references: vulnType.references,
    classification: vulnType.classification,
  };
}

function createHeaderReport(finding: ReconFinding, result: ReconResult, id: string): BugReport {
  const headerName = finding.title.replace('Missing: ', '');
  const vulnInfo = getHeaderVulnInfo(headerName);

  return {
    id,
    title: finding.title,
    severity: mapSeverity(finding.severity),
    cvssScore: getCVSSScore(finding),
    cvssVector: getCVSSVector(finding),
    vulnerabilityType: 'Missing Security Header',
    target: result.target,
    endpoint: `https://${result.target}/`,
    summary: `${finding.detail}. The ${headerName} header is not present in HTTP responses from ${result.target}. This header helps protect against various attacks.`,
    impact: vulnInfo.impact,
    stepsToReproduce: [
      `1. Open browser and navigate to https://${result.target}/`,
      `2. Open Developer Tools (F12) → Network tab`,
      `3. Refresh the page and click on the first request`,
      `4. In the Response Headers section, search for "${headerName}"`,
      `5. Observe that the ${headerName} header is missing`,
    ],
    evidence: [
      { type: 'header', label: 'HTTP Response Headers', content: `GET https://${result.target}/ HTTP/1.1\n\nResponse headers do not contain: ${headerName}` },
      { type: 'command', label: 'Verification Command', content: `curl -sI "https://${result.target}" | grep -i "${headerName}" || echo "Header not found"` },
    ],
    remediation: vulnInfo.remediation,
    references: vulnInfo.references,
    classification: vulnInfo.classification,
  };
}

function createFileReport(finding: ReconFinding, result: ReconResult, id: string): BugReport {
  const fileInfo = getFileInfo(finding.title);

  return {
    id,
    title: `Sensitive File Exposed: ${finding.title}`,
    severity: mapSeverity(finding.severity),
    cvssScore: getCVSSScore(finding),
    cvssVector: getCVSSVector(finding),
    vulnerabilityType: 'Information Disclosure',
    target: result.target,
    endpoint: `https://${result.target}${finding.title}`,
    summary: `A sensitive file is publicly accessible at https://${result.target}${finding.title}. ${fileInfo.description}`,
    impact: fileInfo.impact,
    stepsToReproduce: [
      `1. Open browser and navigate to https://${result.target}${finding.title}`,
      `2. Observe that the file is accessible without authentication`,
      `3. The file contains ${fileInfo.sensitivity}`,
    ],
    evidence: [
      { type: 'response', label: 'HTTP Response', content: `GET https://${result.target}${finding.title} HTTP/1.1\n\nHTTP/1.1 ${finding.detail.match(/HTTP (\d+)/)?.[1] || '200'} OK` },
      { type: 'command', label: 'Verification Command', content: finding.command || `curl -s "https://${result.target}${finding.title}"` },
    ],
    remediation: fileInfo.remediation,
    references: [
      'https://owasp.org/www-project-web-security-testing-guide/latest/2-Configuration_Deployment_Management_Failure/01-Test_Deployment_Platform',
      'https://cwe.mitre.org/data/definitions/538.html',
    ],
    classification: {
      cwe: 'CWE-538: Insertion of Sensitive Information into Externally-Accessible File or Directory',
      owasp: 'A05:2021 – Security Misconfiguration',
    },
  };
}

function createPortReport(finding: ReconFinding, result: ReconResult, id: string): BugReport {
  const portInfo = getPortInfo(finding.title);

  return {
    id,
    title: finding.title,
    severity: mapSeverity(finding.severity),
    cvssScore: getCVSSScore(finding),
    cvssVector: getCVSSVector(finding),
    vulnerabilityType: 'Unnecessary Service Exposure',
    target: result.target,
    endpoint: `${result.target}:${portInfo.port}`,
    summary: `${portInfo.service} (port ${portInfo.port}) is publicly accessible on ${result.target}. ${portInfo.description}`,
    impact: portInfo.impact,
    stepsToReproduce: [
      `1. Run a port scan against ${result.target}`,
      `2. Observe that port ${portInfo.port} (${portInfo.service}) is open`,
      `3. Connect to the service: ${portInfo.testCommand}`,
    ],
    evidence: [
      { type: 'command', label: 'Port Scan', content: `nmap -sV -p ${portInfo.port} ${result.target}` },
      { type: 'command', label: 'Service Test', content: portInfo.testCommand },
    ],
    remediation: portInfo.remediation,
    references: portInfo.references,
    classification: portInfo.classification,
  };
}

function createDNSReport(finding: ReconFinding, result: ReconResult, id: string): BugReport {
  return {
    id,
    title: finding.title,
    severity: mapSeverity(finding.severity),
    cvssScore: getCVSSScore(finding),
    cvssVector: getCVSSVector(finding),
    vulnerabilityType: 'Email Security Misconfiguration',
    target: result.target,
    endpoint: result.target,
    summary: finding.detail,
    impact: `${finding.title} on ${result.target} allows attackers to spoof emails from this domain, potentially leading to phishing attacks against customers and partners.`,
    stepsToReproduce: [
      `1. Query DNS TXT records for ${result.target}`,
      `2. Look for ${finding.title.includes('SPF') ? 'v=spf1' : 'v=DMARC1'} record`,
      `3. Observe that the record is missing`,
    ],
    evidence: [
      { type: 'command', label: 'DNS Query', content: `dig TXT ${result.target} | grep -i "${finding.title.includes('SPF') ? 'spf' : 'dmarc'}"` },
      { type: 'dns', label: 'DNS Records', content: finding.evidence || 'No SPF/DMARC record found' },
    ],
    remediation: finding.title.includes('SPF')
      ? `Add an SPF record to your DNS:\n  Type: TXT\n  Host: @\n  Value: v=spf1 include:_spf.google.com ~all\n\nAdjust the include mechanism based on your email provider.`
      : `Add a DMARC record to your DNS:\n  Type: TXT\n  Host: _dmarc\n  Value: v=DMARC1; p=quarantine; rua=mailto:dmarc@${result.target}\n\nStart with p=none for monitoring, then move to quarantine/reject.`,
    references: [
      'https://owasp.org/www-community/controls/Email_Security',
      'https://cwe.mitre.org/data/definitions/290.html',
    ],
    classification: {
      cwe: 'CWE-290: Authentication Bypass by Spoofing',
      owasp: 'A07:2021 – Identification and Authentication Failures',
    },
  };
}

// ═══════════════════════════════════════════════════════════════
// REPORT FORMATTERS
// ═══════════════════════════════════════════════════════════════

/**
 * Format a report as markdown for submission
 */
export function formatReportMarkdown(report: BugReport): string {
  let md = '';

  md += `# ${report.title}\n\n`;
  md += `**Severity:** ${report.severity.toUpperCase()} (CVSS: ${report.cvssScore})\n`;
  md += `**Type:** ${report.vulnerabilityType}\n`;
  md += `**Target:** ${report.target}\n`;
  md += `**Endpoint:** ${report.endpoint}\n`;
  md += `**CWE:** ${report.classification.cwe}\n`;
  md += `**OWASP:** ${report.classification.owasp}\n\n`;

  md += `## Summary\n\n${report.summary}\n\n`;

  md += `## Impact\n\n${report.impact}\n\n`;

  md += `## Steps to Reproduce\n\n`;
  for (const step of report.stepsToReproduce) {
    md += `${step}\n`;
  }
  md += '\n';

  md += `## Evidence\n\n`;
  for (const ev of report.evidence) {
    md += `### ${ev.label}\n\n`;
    md += '```\n';
    md += `${ev.content}\n`;
    md += '```\n\n';
  }

  md += `## Remediation\n\n${report.remediation}\n\n`;

  md += `## References\n\n`;
  for (const ref of report.references) {
    md += `- ${ref}\n`;
  }
  md += '\n';

  return md;
}

/**
 * Format a report as plain text for quick sharing
 */
export function formatReportPlainText(report: BugReport): string {
  let text = '';

  text += '═══════════════════════════════════════════════════════════\n';
  text += `  ${report.title}\n`;
  text += '═══════════════════════════════════════════════════════════\n\n';
  text += `  Severity:    ${report.severity.toUpperCase()} (CVSS: ${report.cvssScore})\n`;
  text += `  Type:        ${report.vulnerabilityType}\n`;
  text += `  Target:      ${report.target}\n`;
  text += `  Endpoint:    ${report.endpoint}\n`;
  text += `  CWE:         ${report.classification.cwe}\n`;
  text += `  OWASP:       ${report.classification.owasp}\n\n`;

  text += '─── SUMMARY ───────────────────────────────────────────\n\n';
  text += `  ${report.summary}\n\n`;

  text += '─── IMPACT ────────────────────────────────────────────\n\n';
  text += `  ${report.impact}\n\n`;

  text += '─── STEPS TO REPRODUCE ────────────────────────────────\n\n';
  for (const step of report.stepsToReproduce) {
    text += `  ${step}\n`;
  }
  text += '\n';

  text += '─── EVIDENCE ──────────────────────────────────────────\n\n';
  for (const ev of report.evidence) {
    text += `  [${ev.label}]\n`;
    for (const line of ev.content.split('\n')) {
      text += `  ${line}\n`;
    }
    text += '\n';
  }

  text += '─── REMEDIATION ───────────────────────────────────────\n\n';
  for (const line of report.remediation.split('\n')) {
    text += `  ${line}\n`;
  }
  text += '\n';

  text += '═══════════════════════════════════════════════════════════\n';

  return text;
}

/**
 * Format all reports as a summary
 */
export function formatReportsSummary(reports: BugReport[]): string {
  let summary = '';

  summary += '╔══════════════════════════════════════════════════════════╗\n';
  summary += '║           BUG BOUNTY REPORT SUMMARY                     ║\n';
  summary += '╠══════════════════════════════════════════════════════════╣\n\n';

  const counts = { critical: 0, high: 0, medium: 0, low: 0, informational: 0 };
  for (const r of reports) counts[r.severity]++;

  summary += `  Total Reports: ${reports.length}\n\n`;
  if (counts.critical > 0) summary += `  🔴 Critical:  ${counts.critical}\n`;
  if (counts.high > 0) summary += `  🟠 High:      ${counts.high}\n`;
  if (counts.medium > 0) summary += `  🟡 Medium:    ${counts.medium}\n`;
  if (counts.low > 0) summary += `  🔵 Low:       ${counts.low}\n`;
  if (counts.informational > 0) summary += `  ⚪ Info:      ${counts.informational}\n`;

  summary += '\n─── FINDINGS ───────────────────────────────────────────\n\n';

  for (let i = 0; i < reports.length; i++) {
    const r = reports[i];
    const sevIcon = r.severity === 'critical' ? '🔴' : r.severity === 'high' ? '🟠' : r.severity === 'medium' ? '🟡' : '🔵';
    summary += `  ${i + 1}. ${sevIcon} [${r.severity.toUpperCase()}] ${r.title}\n`;
    summary += `     Type: ${r.vulnerabilityType}\n`;
    summary += `     CVSS: ${r.cvssScore}\n\n`;
  }

  summary += '═══════════════════════════════════════════════════════════\n';

  return summary;
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function generateReportId(finding: ReconFinding): string {
  const hash = finding.title.split('').reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0);
  return `JARVIS-${Math.abs(hash).toString(36).toUpperCase().substring(0, 6)}`;
}

function mapSeverity(severity: string): BugReport['severity'] {
  switch (severity) {
    case 'critical': return 'critical';
    case 'high': return 'high';
    case 'medium': return 'medium';
    case 'low': return 'low';
    default: return 'informational';
  }
}

function getCVSSScore(finding: ReconFinding): number {
  switch (finding.severity) {
    case 'critical': return 9.0;
    case 'high': return 7.5;
    case 'medium': return 5.0;
    case 'low': return 3.0;
    default: return 0.0;
  }
}

function getCVSSVector(finding: ReconFinding): string {
  switch (finding.severity) {
    case 'critical': return 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H';
    case 'high': return 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:L/A:N';
    case 'medium': return 'CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:L/I:L/A:N';
    case 'low': return 'CVSS:3.1/AV:N/AC:H/PR:N/UI:R/S:U/C:L/I:N/A:N';
    default: return 'CVSS:3.1/AV:N/AC:H/PR:N/UI:R/S:U/C:N/I:N/A:N';
  }
}

function classifyVulnerability(finding: ReconFinding) {
  const title = finding.title.toLowerCase();

  if (title.includes('cors')) return {
    type: 'CORS Misconfiguration',
    remediation: `Configure CORS headers properly:\n  - Whitelist specific trusted origins instead of using *\n  - Never reflect arbitrary Origin headers\n  - Use Access-Control-Allow-Credentials: true only with specific origins\n\nExample:\n  Access-Control-Allow-Origin: https://yourdomain.com\n  Access-Control-Allow-Methods: GET, POST, OPTIONS\n  Access-Control-Allow-Headers: Content-Type, Authorization`,
    references: ['https://owasp.org/www-community/attacks/CORS_OriginHeaderScrutiny', 'https://cwe.mitre.org/data/definitions/942.html'],
    classification: { cwe: 'CWE-942: Cross-domain Misconfiguration', owasp: 'A05:2021 – Security Misconfiguration' },
  };

  if (title.includes('open redirect')) return {
    type: 'Open Redirect',
    remediation: `1. Validate redirect URLs against a whitelist of allowed domains\n2. Never redirect to user-supplied URLs without validation\n3. Use relative URLs for same-domain redirects\n4. Show a warning page before redirecting to external domains`,
    references: ['https://owasp.org/www-community/attacks/Forceful_Browsing', 'https://cwe.mitre.org/data/definitions/601.html'],
    classification: { cwe: 'CWE-601: Open Redirect', owasp: 'A01:2021 – Broken Access Control' },
  };

  if (title.includes('information disclosure') || title.includes('disclosure')) return {
    type: 'Information Disclosure',
    remediation: `Remove or hide version information from HTTP headers:\n  - Remove X-Powered-By header\n  - Remove X-AspNet-Version header\n  - Configure server to not expose version details\n\nIn Express.js: app.disable('x-powered-by')\nIn ASP.NET: Remove httpRuntime enableVersionHeader="false"`,
    references: ['https://cwe.mitre.org/data/definitions/200.html'],
    classification: { cwe: 'CWE-200: Exposure of Sensitive Information', owasp: 'A05:2021 – Security Misconfiguration' },
  };

  if (title.includes('hsts') || title.includes('strict-transport')) return {
    type: 'Missing HSTS',
    remediation: `Add Strict-Transport-Security header:\n  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload\n\nThis forces browsers to use HTTPS for all requests to your domain for 1 year.`,
    references: ['https://owasp.org/www-project-secure-headers/#strict-transport-security-headers', 'https://cwe.mitre.org/data/definitions/319.html'],
    classification: { cwe: 'CWE-319: Cleartext Transmission of Sensitive Information', owasp: 'A02:2021 – Cryptographic Failures' },
  };

  if (title.includes('clickjack') || title.includes('x-frame')) return {
    type: 'Clickjacking',
    remediation: `Add X-Frame-Options header:\n  X-Frame-Options: DENY\n\nOr use CSP:\n  Content-Security-Policy: frame-ancestors 'none'\n\nFor specific allowlisting:\n  X-Frame-Options: SAMEORIGIN`,
    references: ['https://owasp.org/www-community/attacks/Clickjacking', 'https://cwe.mitre.org/data/definitions/1021.html'],
    classification: { cwe: 'CWE-1021: Improper Restriction of Rendered UI Layers', owasp: 'A01:2021 – Broken Access Control' },
  };

  return {
    type: 'Security Misconfiguration',
    remediation: `Review and harden security configuration for this endpoint.`,
    references: ['https://owasp.org/www-project-web-security-testing-guide/latest/'],
    classification: { cwe: 'CWE-16: Configuration', owasp: 'A05:2021 – Security Misconfiguration' },
  };
}

function getHeaderVulnInfo(header: string) {
  const infos: Record<string, any> = {
    'Content-Security-Policy': {
      impact: 'Without CSP, the application is vulnerable to XSS attacks, data injection, and code execution. Attackers can inject malicious scripts that steal user credentials or session tokens.',
      remediation: `Implement Content-Security-Policy header:\n  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self';\n\nStart with report-only mode:\n  Content-Security-Policy-Report-Only: ...; report-uri /csp-report`,
      references: ['https://owasp.org/www-project-web-security-testing-guide/latest/2-Configuration_Deployment_Management_Failure/02-Test_for_HTTP_Strict_Transport_Security'],
      classification: { cwe: 'CWE-693: Protection Mechanism Failure', owasp: 'A03:2021 – Injection' },
    },
    'X-Frame-Options': {
      impact: 'Without X-Frame-Options, the page can be embedded in iframes on malicious sites, enabling clickjacking attacks where users are tricked into clicking hidden elements.',
      remediation: `Add X-Frame-Options header:\n  X-Frame-Options: DENY\n\nOr use CSP frame-ancestors:\n  Content-Security-Policy: frame-ancestors 'none'`,
      references: ['https://owasp.org/www-community/attacks/Clickjacking'],
      classification: { cwe: 'CWE-1021: Improper Restriction of Rendered UI Layers', owasp: 'A01:2021 – Broken Access Control' },
    },
    'X-Content-Type-Options': {
      impact: 'Without nosniff, browsers may MIME-sniff responses, potentially treating HTML responses as scripts or other executable content.',
      remediation: `Add X-Content-Type-Options header:\n  X-Content-Type-Options: nosniff`,
      references: ['https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Content-Type-Options'],
      classification: { cwe: 'CWE-693: Protection Mechanism Failure', owasp: 'A05:2021 – Security Misconfiguration' },
    },
    'Strict-Transport-Security': {
      impact: 'Without HSTS, users who type the URL without HTTPS may have their traffic intercepted via man-in-the-middle attacks before being redirected.',
      remediation: `Add Strict-Transport-Security header:\n  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`,
      references: ['https://owasp.org/www-project-secure-headers/#strict-transport-security-headers'],
      classification: { cwe: 'CWE-319: Cleartext Transmission of Sensitive Information', owasp: 'A02:2021 – Cryptographic Failures' },
    },
    'X-XSS-Protection': {
      impact: 'Modern browsers have deprecated this header, but older browsers without CSP may be vulnerable to reflected XSS.',
      remediation: `Add X-XSS-Protection header (for legacy browsers):\n  X-XSS-Protection: 1; mode=block\n\nNote: Focus on implementing CSP instead.`,
      references: ['https://owasp.org/www-community/attacks/xss/'],
      classification: { cwe: 'CWE-79: Cross-site Scripting', owasp: 'A03:2021 – Injection' },
    },
    'Referrer-Policy': {
      impact: 'Without referrer policy, full URLs (including query parameters) may be leaked to third-party sites.',
      remediation: `Add Referrer-Policy header:\n  Referrer-Policy: strict-origin-when-cross-origin`,
      references: ['https://owasp.org/www-project-secure-headers/#referrer-policy'],
      classification: { cwe: 'CWE-200: Exposure of Sensitive Information', owasp: 'A01:2021 – Broken Access Control' },
    },
    'Permissions-Policy': {
      impact: 'Without permissions policy, the browser may allow access to sensitive APIs like camera, microphone, and geolocation.',
      remediation: `Add Permissions-Policy header:\n  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`,
      references: ['https://owasp.org/www-project-secure-headers/#permissions-policy-headers'],
      classification: { cwe: 'CWE-693: Protection Mechanism Failure', owasp: 'A05:2021 – Security Misconfiguration' },
    },
  };

  return infos[header] || {
    impact: `Missing security header ${header} may expose the application to attacks.`,
    remediation: `Add the ${header} header to HTTP responses.`,
    references: ['https://owasp.org/www-project-secure-headers/'],
    classification: { cwe: 'CWE-693: Protection Mechanism Failure', owasp: 'A05:2021 – Security Misconfiguration' },
  };
}

function getFileInfo(file: string) {
  const files: Record<string, any> = {
    '/.env': { description: 'Environment variables file containing potentially sensitive configuration values.', sensitivity: 'API keys, database credentials, secrets', remediation: 'Move .env files outside the web root. Add to .gitignore. Use environment variable injection instead of file-based config.', impact: 'Full application compromise. API keys, database credentials, and secrets can be extracted, leading to data breach and unauthorized access.' },
    '/.env.local': { description: 'Local environment configuration file.', sensitivity: 'Local development credentials and API keys', remediation: 'Move .env.local files outside the web root.', impact: 'Exposure of development credentials that may also work in production.' },
    '/.git/config': { description: 'Git repository configuration file.', sensitivity: 'Repository URLs, developer names, email addresses', remediation: 'Block access to .git directory in web server configuration.', impact: 'Attackers can reconstruct the entire source code repository using git objects.' },
    '/.git/HEAD': { description: 'Git HEAD reference file.', sensitivity: 'Current branch and commit information', remediation: 'Block access to .git directory in web server configuration.', impact: 'Confirms git repository exposure, enabling source code reconstruction.' },
    '/robots.txt': { description: 'Robots exclusion file listing restricted paths.', sensitivity: 'Hidden directories and paths that may contain sensitive content', remediation: 'Remove sensitive paths from robots.txt or secure those paths with authentication.', impact: 'Reveals hidden paths that attackers can target for further exploitation.' },
    '/config.php': { description: 'PHP configuration file.', sensitivity: 'Database credentials, API keys, application secrets', remediation: 'Move configuration files outside the web root. Use environment variables.', impact: 'Full database compromise, API key theft, application takeover.' },
    '/config.yml': { description: 'YAML configuration file.', sensitivity: 'Application configuration, credentials, service endpoints', remediation: 'Move configuration files outside the web root.', impact: 'Exposure of application architecture and credentials.' },
    '/admin': { description: 'Administrative panel accessible without authentication.', sensitivity: 'Administrative interface, potential for unauthorized access', remediation: 'Add authentication, restrict by IP, use VPN for admin access.', impact: 'Full application compromise if admin panel lacks authentication.' },
    '/actuator': { description: 'Spring Boot Actuator endpoint.', sensitivity: 'Application internals, environment variables, health data', remediation: 'Restrict actuator endpoints to internal network. Add authentication.', impact: 'Environment variable theft, application manipulation, potential RCE.' },
    '/phpinfo.php': { description: 'PHP information page.', sensitivity: 'PHP version, loaded modules, server configuration', remediation: 'Remove phpinfo.php from production servers.', impact: 'Information disclosure aids attackers in finding version-specific vulnerabilities.' },
    '/debug': { description: 'Debug endpoint exposed in production.', sensitivity: 'Application internals, stack traces, configuration', remediation: 'Disable debug mode in production. Restrict debug endpoints.', impact: 'Information disclosure and potential for exploitation of debug features.' },
  };

  return files[file] || {
    description: 'Sensitive file publicly accessible.',
    sensitivity: 'potentially sensitive configuration data',
    remediation: 'Remove the file from production or restrict access.',
    impact: 'Information disclosure that aids further attacks.',
  };
}

function getPortInfo(portTitle: string) {
  const ports: Record<string, any> = {
    'Port 21': { port: 21, service: 'FTP', description: 'FTP transmits credentials in plaintext, making them vulnerable to interception.', impact: 'FTP transmits credentials in plaintext. An attacker on the network can intercept usernames and passwords via packet sniffing.', testCommand: 'telnet target.com 21', remediation: 'Replace FTP with SFTP or FTPS. Disable anonymous FTP access. Use key-based authentication.', references: ['https://cwe.mitre.org/data/definitions/319.html'], classification: { cwe: 'CWE-319: Cleartext Transmission', owasp: 'A02:2021 – Cryptographic Failures' } },
    'Port 22': { port: 22, service: 'SSH', description: 'SSH is standard for remote access. Verify it is properly configured.', impact: 'If SSH is misconfigured (weak ciphers, password auth), it may be brute-forced.', testCommand: 'ssh -o ConnectTimeout=5 target.com', remediation: 'Use key-based authentication. Disable password auth. Change default port. Implement fail2ban.', references: ['https://cwe.mitre.org/data/definitions/521.html'], classification: { cwe: 'CWE-521: Weak Password Requirements', owasp: 'A07:2021 – Identification and Authentication Failures' } },
    'Port 23': { port: 23, service: 'Telnet', description: 'Telnet transmits all data including credentials in plaintext.', impact: 'Telnet is completely unencrypted. All commands and credentials can be intercepted.', testCommand: 'telnet target.com 23', remediation: 'Disable Telnet entirely. Replace with SSH for remote access.', references: ['https://cwe.mitre.org/data/definitions/319.html'], classification: { cwe: 'CWE-319: Cleartext Transmission', owasp: 'A02:2021 – Cryptographic Failures' } },
    'Port 25': { port: 25, service: 'SMTP', description: 'SMTP is used for email. Verify it requires authentication.', impact: 'Unauthenticated SMTP can be used for email spoofing and spam relay.', testCommand: 'telnet target.com 25', remediation: 'Require authentication for SMTP. Implement SPF, DKIM, DMARC. Restrict relay.', references: ['https://cwe.mitre.org/data/definitions/294.html'], classification: { cwe: 'CWE-294: Authentication Bypass', owasp: 'A07:2021 – Identification and Authentication Failures' } },
    'Port 445': { port: 445, service: 'SMB', description: 'SMB is used for file sharing. Historically vulnerable to EternalBlue.', impact: 'SMB exposure can lead to remote code execution (EternalBlue) or unauthorized file access.', testCommand: 'smbclient -L //target.com/', remediation: 'Restrict SMB to internal network only. Patch for EternalBlue (MS17-010). Disable SMBv1.', references: ['https://cwe.mitre.org/data/definitions/319.html'], classification: { cwe: 'CWE-319: Cleartext Transmission', owasp: 'A05:2021 – Security Misconfiguration' } },
    'Port 3306': { port: 3306, service: 'MySQL', description: 'MySQL database port should not be publicly accessible.', impact: 'Exposed database port allows brute-force attacks and potential data theft.', testCommand: 'mysql -h target.com -u root -p', remediation: 'Bind MySQL to localhost/127.0.0.1. Use firewall rules to block external access. Use strong passwords.', references: ['https://cwe.mitre.org/data/definitions/284.html'], classification: { cwe: 'CWE-284: Improper Access Control', owasp: 'A01:2021 – Broken Access Control' } },
    'Port 5432': { port: 5432, service: 'PostgreSQL', description: 'PostgreSQL database port should not be publicly accessible.', impact: 'Exposed database port allows brute-force attacks and potential data theft.', testCommand: 'psql -h target.com -U postgres', remediation: 'Bind PostgreSQL to localhost. Use firewall rules. Implement connection limiting.', references: ['https://cwe.mitre.org/data/definitions/284.html'], classification: { cwe: 'CWE-284: Improper Access Control', owasp: 'A01:2021 – Broken Access Control' } },
    'Port 6379': { port: 6379, service: 'Redis', description: 'Redis should not be publicly accessible. Often has no authentication by default.', impact: 'Unauthenticated Redis can be used for data theft, command execution, and cryptomining.', testCommand: 'redis-cli -h target.com INFO', remediation: 'Bind Redis to 127.0.0.1. Require password authentication. Use firewall rules.', references: ['https://cwe.mitre.org/data/definitions/284.html'], classification: { cwe: 'CWE-284: Improper Access Control', owasp: 'A01:2021 – Broken Access Control' } },
    'Port 8080': { port: 8080, service: 'HTTP-Alt', description: 'Alternative HTTP port, often used for development servers or admin panels.', impact: 'May expose development servers, admin panels, or debugging tools.', testCommand: 'curl -s http://target.com:8080/', remediation: 'Restrict access to internal network. Use authentication for any exposed services.', references: ['https://cwe.mitre.org/data/definitions/284.html'], classification: { cwe: 'CWE-284: Improper Access Control', owasp: 'A05:2021 – Security Misconfiguration' } },
    'Port 8443': { port: 8443, service: 'HTTPS-Alt', description: 'Alternative HTTPS port.', impact: 'May expose additional services not intended for public access.', testCommand: 'curl -sk https://target.com:8443/', remediation: 'Verify all services on this port are intended for public access.', references: ['https://cwe.mitre.org/data/definitions/284.html'], classification: { cwe: 'CWE-284: Improper Access Control', owasp: 'A05:2021 – Security Misconfiguration' } },
    'Port 27017': { port: 27017, service: 'MongoDB', description: 'MongoDB should not be publicly accessible. Often has no authentication by default.', impact: 'Exposed MongoDB can be used for data theft and ransomware attacks.', testCommand: 'mongosh --host target.com --port 27017', remediation: 'Bind MongoDB to 127.0.0.1. Enable authentication. Use firewall rules.', references: ['https://cwe.mitre.org/data/definitions/284.html'], classification: { cwe: 'CWE-284: Improper Access Control', owasp: 'A01:2021 – Broken Access Control' } },
  };

  const portNum = portTitle.match(/Port (\d+)/)?.[1] || '';
  return ports[`Port ${portNum}`] || { port: parseInt(portNum) || 0, service: 'Unknown', description: 'Service detected on this port.', impact: 'Unknown service may expose sensitive data.', testCommand: `nmap -sV -p ${portNum} target.com`, remediation: 'Verify if this service is needed. Restrict access with firewall.', references: [], classification: { cwe: 'CWE-284: Improper Access Control', owasp: 'A05:2021 – Security Misconfiguration' } };
}

function extractEndpoint(finding: ReconFinding): string {
  const evidence = finding.evidence || finding.detail;
  const urlMatch = evidence.match(/https?:\/\/[^\s]+/);
  return urlMatch?.[0] || finding.title;
}

function generateSummary(finding: ReconFinding, vulnType: any): string {
  return `${finding.detail}. This is classified as ${vulnType.type} and can be exploited by attackers to compromise the security of ${finding.title}.`;
}

function generateImpact(finding: ReconFinding, vulnType: any): string {
  return `This vulnerability allows attackers to ${finding.severity === 'critical' ? 'fully compromise the target system' : finding.severity === 'high' ? 'gain unauthorized access to sensitive data' : 'gather information that aids further attacks'}. The impact is ${finding.severity} severity according to CVSS scoring.`;
}

function generateSteps(finding: ReconFinding, result: ReconResult): string[] {
  const steps: string[] = [];
  steps.push(`1. Open browser and navigate to ${result.target}`);
  steps.push(`2. ${finding.detail}`);
  if (finding.command) {
    steps.push(`3. Verify with command: ${finding.command}`);
  }
  steps.push(`4. Document the finding with screenshots`);
  return steps;
}

function generateEvidence(finding: ReconFinding, result: ReconResult): EvidenceItem[] {
  const evidence: EvidenceItem[] = [];

  if (finding.evidence) {
    evidence.push({ type: 'response', label: 'HTTP Response', content: finding.evidence });
  }
  if (finding.command) {
    evidence.push({ type: 'command', label: 'Verification Command', content: finding.command });
  }

  return evidence;
}
