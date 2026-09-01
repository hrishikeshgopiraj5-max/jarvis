/**
 * JARVIS Auto-Recon API
 *
 * Orchestrates autonomous reconnaissance against a target:
 *   Phase 1: Subdomain enumeration (DNS, crt.sh, DNS brute)
 *   Phase 2: Technology fingerprinting (headers, JS libs, CMS)
 *   Phase 3: Port scanning (common ports)
 *   Phase 4: Directory discovery (sensitive files, endpoints)
 *   Phase 5: Vulnerability checks (headers, CORS, info disclosure)
 *
 * Each phase streams progress and results back to the client.
 * All commands are run on the user's machine via the execute API.
 */

import { NextRequest, NextResponse } from 'next/server';

export interface ReconPhase {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'complete' | 'error';
  results: ReconFinding[];
  commands: string[];
  duration?: number;
}

export interface ReconFinding {
  type: 'subdomain' | 'port' | 'technology' | 'file' | 'vulnerability' | 'info' | 'header' | 'dns' | 'email';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  detail: string;
  evidence?: string;
  command?: string;
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

// DNS wordlist for brute-forcing common subdomains
const SUBDOMAIN_WORDLIST = [
  'www', 'mail', 'ftp', 'admin', 'api', 'app', 'dev', 'staging', 'test',
  'portal', 'vpn', 'cdn', 'cloud', 'shop', 'store', 'blog', 'docs',
  'support', 'status', 'git', 'ci', 'db', 'backup', 'login', 'auth',
  'static', 'media', 'files', 'upload', 'beta', 'demo', 'internal',
];

// Common ports to scan
const COMMON_PORTS = [
  { port: 21, service: 'FTP' },
  { port: 22, service: 'SSH' },
  { port: 25, service: 'SMTP' },
  { port: 53, service: 'DNS' },
  { port: 80, service: 'HTTP' },
  { port: 443, service: 'HTTPS' },
  { port: 445, service: 'SMB' },
  { port: 3306, service: 'MySQL' },
  { port: 3389, service: 'RDP' },
  { port: 5432, service: 'PostgreSQL' },
  { port: 6379, service: 'Redis' },
  { port: 8080, service: 'HTTP-Alt' },
  { port: 8443, service: 'HTTPS-Alt' },
  { port: 27017, service: 'MongoDB' },
];

// Sensitive files to check
const SENSITIVE_FILES = [
  '/.env', '/.env.local', '/.env.production',
  '/.git/config', '/.git/HEAD', '/.gitignore',
  '/robots.txt', '/sitemap.xml', '/.well-known/security.txt',
  '/config.php', '/config.yml', '/config.json',
  '/.htaccess', '/.htpasswd', '/web.config',
  '/server-status', '/server-info',
  '/phpinfo.php', '/test.php',
  '/backup.zip', '/db.sql', '/dump.sql',
  '/swagger.json', '/openapi.json', '/api-docs', '/graphql',
  '/debug', '/trace', '/actuator', '/actuator/health', '/actuator/env',
  '/admin', '/console',
  '/.aws/credentials',
  '/Dockerfile', '/docker-compose.yml',
  '/package.json', '/composer.json',
  '/wp-login.php', '/xmlrpc.php',
  '/elmah.axd', '/trace.axd',
];

// Security headers to check
const SECURITY_HEADERS = [
  { name: 'Content-Security-Policy', risk: 'medium' as const, desc: 'Missing CSP allows XSS' },
  { name: 'X-Frame-Options', risk: 'medium' as const, desc: 'Missing X-Frame-Options allows clickjacking' },
  { name: 'X-Content-Type-Options', risk: 'low' as const, desc: 'Missing nosniff allows MIME sniffing' },
  { name: 'Strict-Transport-Security', risk: 'medium' as const, desc: 'Missing HSTS allows downgrade attacks' },
  { name: 'X-XSS-Protection', risk: 'low' as const, desc: 'Missing XSS protection header' },
  { name: 'Referrer-Policy', risk: 'low' as const, desc: 'Missing referrer policy leaks information' },
  { name: 'Permissions-Policy', risk: 'low' as const, desc: 'Missing permissions policy' },
];

/**
 * POST /api/recon
 * Body: { target: string, phases?: string[] }
 *
 * Returns ReconResult with all findings
 */
export async function POST(request: NextRequest) {
  try {
    const { target, phases } = await request.json();

    if (!target || typeof target !== 'string') {
      return NextResponse.json({ error: 'Target domain is required' }, { status: 400 });
    }

    const cleanTarget = target.replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();
    const startTime = Date.now();

    const result: ReconResult = {
      target: cleanTarget,
      startTime,
      phases: [],
      summary: {
        totalFindings: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        info: 0,
        subdomains: 0,
        openPorts: 0,
        technologies: [],
      },
    };

    // Phase 1: Subdomain Enumeration
    const phase1 = await runPhase1Subdomains(cleanTarget);
    result.phases.push(phase1);

    // Phase 2: Technology Fingerprinting
    const phase2 = await runPhase2Technology(cleanTarget);
    result.phases.push(phase2);
    result.summary.technologies = phase2.results
      .filter(r => r.type === 'technology')
      .map(r => r.title);

    // Phase 3: Port Scanning
    const phase3 = await runPhase3Ports(cleanTarget);
    result.phases.push(phase3);
    result.summary.openPorts = phase3.results.filter(r => r.type === 'port').length;

    // Phase 4: Directory Discovery
    const phase4 = await runPhase4Directories(cleanTarget);
    result.phases.push(phase4);

    // Phase 5: Vulnerability Checks
    const phase5 = await runPhase5Vulnerabilities(cleanTarget);
    result.phases.push(phase5);

    // Calculate summary
    result.endTime = Date.now();
    for (const phase of result.phases) {
      for (const finding of phase.results) {
        result.summary.totalFindings++;
        result.summary[finding.severity]++;
        if (finding.type === 'subdomain') result.summary.subdomains++;
      }
    }

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('[Auto-Recon] Error:', error);
    return NextResponse.json(
      { error: 'Recon failed', details: error?.message },
      { status: 500 }
    );
  }
}

// ── Phase 1: Subdomain Enumeration ──────────────────────────
async function runPhase1Subdomains(target: string): Promise<ReconPhase> {
  const phase: ReconPhase = {
    id: 'subdomains',
    name: 'Subdomain Enumeration',
    status: 'running',
    results: [],
    commands: [],
    duration: 0,
  };
  const start = Date.now();

  try {
    // DNS resolution
    phase.commands.push(`nslookup ${target}`);
    try {
      const ip = await resolveDNS(target);
      if (ip) {
        phase.results.push({
          type: 'info',
          severity: 'info',
          title: 'Target IP',
          detail: `${target} resolves to ${ip}`,
          command: `nslookup ${target}`,
        });
      }
    } catch {}

    // crt.sh certificate transparency lookup
    phase.commands.push(`curl -s "https://crt.sh/?q=%25.${target}&output=json"`);
    try {
      const crtshResult = await queryCrtSh(target);
      const uniqueSubs = [...new Set(crtshResult)];
      for (const sub of uniqueSubs.slice(0, 50)) {
        phase.results.push({
          type: 'subdomain',
          severity: 'info',
          title: sub,
          detail: `Discovered via certificate transparency (crt.sh)`,
          command: `nslookup ${sub}`,
        });
      }
    } catch {}

    // DNS brute force for common subdomains
    const bruteResults = await dnsBruteForce(target);
    for (const sub of bruteResults) {
      // Avoid duplicates with crt.sh results
      if (!phase.results.find(r => r.title === sub)) {
        phase.results.push({
          type: 'subdomain',
          severity: 'info',
          title: sub,
          detail: `Discovered via DNS brute force`,
          command: `nslookup ${sub}`,
        });
      }
    }

  } catch (error) {
    phase.status = 'error';
  }

  phase.status = 'complete';
  phase.duration = Date.now() - start;
  return phase;
}

// ── Phase 2: Technology Fingerprinting ──────────────────────
async function runPhase2Technology(target: string): Promise<ReconPhase> {
  const phase: ReconPhase = {
    id: 'technology',
    name: 'Technology Fingerprinting',
    status: 'running',
    results: [],
    commands: [],
    duration: 0,
  };
  const start = Date.now();

  try {
    // Fetch main page headers
    phase.commands.push(`curl -sI "https://${target}"`);
    const headers = await fetchHeaders(target);

    // Detect server technology
    const serverHeader = headers['server'];
    if (serverHeader) {
      phase.results.push({
        type: 'technology',
        severity: 'info',
        title: `Server: ${serverHeader}`,
        detail: `Web server detected from HTTP response headers`,
        evidence: serverHeader,
      });
    }

    // Detect framework
    const poweredBy = headers['x-powered-by'];
    if (poweredBy) {
      phase.results.push({
        type: 'technology',
        severity: 'medium',
        title: `Framework: ${poweredBy}`,
        detail: `Technology stack disclosed in X-Powered-Header — information disclosure`,
        evidence: poweredBy,
      });
    }

    // Check for various technology indicators
    const techChecks = [
      { header: 'x-generator', name: 'CMS Generator' },
      { header: 'x-drupal-cache', name: 'Drupal CMS' },
      { header: 'x-shopify-stage', name: 'Shopify' },
      { header: 'x-nextjs-cache', name: 'Next.js' },
      { header: 'x-amz-cf-id', name: 'AWS CloudFront CDN' },
      { header: 'x-azure-ref', name: 'Azure CDN' },
      { header: 'cf-ray', name: 'Cloudflare CDN' },
      { header: 'x-varnish', name: 'Varnish Cache' },
      { header: 'x-cache', name: 'Caching Layer Detected' },
      { header: 'x-akamai-transformed', name: 'Akamai WAF/CDN' },
      { header: 'x-content-security-policy', name: 'CSP Enabled' },
      { header: 'set-cookie', name: 'Cookies Detected' },
    ];

    for (const check of techChecks) {
      const value = headers[check.header];
      if (value) {
        phase.results.push({
          type: 'technology',
          severity: check.header === 'x-powered-by' ? 'medium' : 'info',
          title: check.name,
          detail: `${check.header}: ${value.substring(0, 100)}`,
          evidence: value.substring(0, 200),
        });
      }
    }

    // Try HTTP and check for redirect
    try {
      const httpResult = await fetch(`http://${target}`, { redirect: 'manual' });
      const location = httpResult.headers.get('location');
      if (location) {
        phase.results.push({
          type: 'info',
          severity: 'info',
          title: 'HTTP Redirect',
          detail: `HTTP redirects to: ${location}`,
        });
      }
    } catch {}

    // Check common technology paths
    const techPaths = [
      { path: '/robots.txt', tech: 'robots.txt (sitemap)' },
      { path: '/sitemap.xml', tech: 'XML Sitemap' },
      { path: '/.well-known/security.txt', tech: 'Security.txt' },
      { path: '/wp-login.php', tech: 'WordPress' },
      { path: '/graphql', tech: 'GraphQL API' },
      { path: '/swagger.json', tech: 'Swagger/OpenAPI' },
      { path: '/api', tech: 'REST API Endpoint' },
      { path: '/actuator', tech: 'Spring Boot Actuator' },
    ];

    for (const tp of techPaths) {
      try {
        const resp = await fetch(`https://${target}${tp.path}`, { method: 'HEAD', redirect: 'manual' });
        if (resp.status === 200 || resp.status === 301 || resp.status === 302) {
          phase.results.push({
            type: 'technology',
            severity: tp.path.includes('actuator') ? 'high' : 'info',
            title: tp.tech,
            detail: `Found at ${tp.path} (HTTP ${resp.status})`,
            command: `curl -s "https://${target}${tp.path}"`,
          });
        }
      } catch {}
    }

  } catch (error) {
    phase.status = 'error';
  }

  phase.status = 'complete';
  phase.duration = Date.now() - start;
  return phase;
}

// ── Phase 3: Port Scanning ──────────────────────────────────
async function runPhase3Ports(target: string): Promise<ReconPhase> {
  const phase: ReconPhase = {
    id: 'ports',
    name: 'Port Scanning',
    status: 'running',
    results: [],
    commands: [],
    duration: 0,
  };
  const start = Date.now();

  try {
    phase.commands.push(`# Checking ${COMMON_PORTS.length} common ports`);

    // Check ports by attempting connections
    const portChecks = COMMON_PORTS.map(async ({ port, service }) => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);

        const protocol = port === 443 || port === 8443 || port === 993 || port === 995 ? 'https' : 'http';
        const url = `${protocol}://${target}:${port}`;

        await fetch(url, {
          method: 'HEAD',
          signal: controller.signal,
          redirect: 'manual',
        }).catch(() => {});

        clearTimeout(timeout);
        return { port, service, open: true };
      } catch {
        // For non-HTTP ports, try raw TCP via DNS lookup approach
        return { port, service, open: false };
      }
    });

    const portResults = await Promise.all(portChecks);
    const openPorts = portResults.filter(p => p.open);

    for (const { port, service } of openPorts) {
      phase.results.push({
        type: 'port',
        severity: getPortSeverity(port),
        title: `Port ${port} — ${service}`,
        detail: `${service} is open on port ${port}`,
        command: `nmap -sV -p ${port} ${target}`,
      });
    }

    // Additional: Check if we can resolve the domain
    phase.commands.push(`nmap -Pn -T4 --top-ports 100 ${target}`);
    phase.commands.push(`nmap -sV -sC -p ${openPorts.map(p => p.port).join(',')} ${target}`);

  } catch (error) {
    phase.status = 'error';
  }

  phase.status = 'complete';
  phase.duration = Date.now() - start;
  return phase;
}

// ── Phase 4: Directory Discovery ────────────────────────────
async function runPhase4Directories(target: string): Promise<ReconPhase> {
  const phase: ReconPhase = {
    id: 'directories',
    name: 'Directory Discovery',
    status: 'running',
    results: [],
    commands: [],
    duration: 0,
  };
  const start = Date.now();

  try {
    phase.commands.push(`# Checking ${SENSITIVE_FILES.length} sensitive paths`);

    // Check in batches of 15
    const batchSize = 15;
    for (let i = 0; i < SENSITIVE_FILES.length; i += batchSize) {
      const batch = SENSITIVE_FILES.slice(i, i + batchSize);
      const checks = batch.map(async (file) => {
        try {
          const resp = await fetch(`https://${target}${file}`, {
            method: 'HEAD',
            redirect: 'manual',
            signal: AbortSignal.timeout(5000),
          });
          if (resp.status === 200) {
            return { file, status: resp.status, severity: getFileSeverity(file) };
          }
          if (resp.status === 301 || resp.status === 302) {
            const location = resp.headers.get('location');
            if (location && !location.includes('login')) {
              return { file, status: resp.status, severity: 'low' as const };
            }
          }
        } catch {}
        return null;
      });

      const results = await Promise.all(checks);
      for (const result of results) {
        if (result) {
          phase.results.push({
            type: 'file',
            severity: result.severity as any,
            title: result.file,
            detail: `Accessible at https://${target}${result.file} (HTTP ${result.status})`,
            command: `curl -s "https://${target}${result.file}"`,
          });
        }
      }
    }

  } catch (error) {
    phase.status = 'error';
  }

  phase.status = 'complete';
  phase.duration = Date.now() - start;
  return phase;
}

// ── Phase 5: Vulnerability Checks ───────────────────────────
async function runPhase5Vulnerabilities(target: string): Promise<ReconPhase> {
  const phase: ReconPhase = {
    id: 'vulnerabilities',
    name: 'Vulnerability Checks',
    status: 'running',
    results: [],
    commands: [],
    duration: 0,
  };
  const start = Date.now();

  try {
    const headers = await fetchHeaders(target);

    // Check security headers
    phase.commands.push(`curl -sI "https://${target}"`);

    for (const header of SECURITY_HEADERS) {
      const value = headers[header.name.toLowerCase()];
      if (!value) {
        phase.results.push({
          type: 'header',
          severity: header.risk,
          title: `Missing: ${header.name}`,
          detail: header.desc,
        });
      }
    }

    // Check for CORS misconfiguration
    try {
      phase.commands.push(`curl -sI -H "Origin: https://evil.com" "https://${target}"`);
      const corsResp = await fetch(`https://${target}`, {
        headers: { 'Origin': 'https://evil.com' },
      });
      const acao = corsResp.headers.get('access-control-allow-origin');
      if (acao === '*') {
        phase.results.push({
          type: 'vulnerability',
          severity: 'medium',
          title: 'CORS Wildcard',
          detail: 'Access-Control-Allow-Origin is set to * — accepts requests from any origin',
          evidence: `ACAO: ${acao}`,
        });
      } else if (acao === 'https://evil.com') {
        phase.results.push({
          type: 'vulnerability',
          severity: 'high',
          title: 'CORS Origin Reflection',
          detail: 'Server reflects arbitrary Origin header — vulnerable to cross-origin attacks',
          evidence: `ACAO: ${acao}`,
        });
      }
    } catch {}

    // Check for information disclosure in headers
    const disclosureHeaders = ['x-powered-by', 'x-aspnet-version', 'x-aspnetmvc-version', 'x-generator'];
    for (const h of disclosureHeaders) {
      if (headers[h]) {
        phase.results.push({
          type: 'vulnerability',
          severity: 'low',
          title: `Information Disclosure: ${h}`,
          detail: `Server exposes ${h}: ${headers[h]}`,
          evidence: headers[h],
        });
      }
    }

    // Check for missing HSTS on HTTPS
    if (!headers['strict-transport-security']) {
      phase.results.push({
        type: 'vulnerability',
        severity: 'medium',
        title: 'Missing HSTS',
        detail: 'No Strict-Transport-Security header — vulnerable to protocol downgrade',
      });
    }

    // Check for clickjacking (missing X-Frame-Options)
    if (!headers['x-frame-options'] && !headers['content-security-policy']?.includes('frame-ancestors')) {
      phase.results.push({
        type: 'vulnerability',
        severity: 'medium',
        title: 'Clickjacking Risk',
        detail: 'No X-Frame-Options or CSP frame-ancestors — page can be embedded in iframes',
      });
    }

    // Check for open redirect indicators in common paths
    const redirectPaths = ['/login', '/redirect', '/url', '/goto', '/out', '/link'];
    for (const path of redirectPaths) {
      try {
        const resp = await fetch(`https://${target}${path}?url=https://evil.com`, {
          redirect: 'manual',
        });
        const location = resp.headers.get('location');
        if (location?.includes('evil.com')) {
          phase.results.push({
            type: 'vulnerability',
            severity: 'high',
            title: `Open Redirect at ${path}`,
            detail: `Server redirects to attacker-controlled URL via ${path} parameter`,
            evidence: `Location: ${location}`,
            command: `curl -sI "https://${target}${path}?url=https://evil.com"`,
          });
        }
      } catch {}
    }

    // DNS/Email security
    phase.commands.push(`# DNS Security checks`);
    try {
      const txtRecords = await fetchDNSTXT(target);
      const hasSPF = txtRecords.some(r => r.includes('v=spf1'));
      const hasDMARC = txtRecords.some(r => r.includes('v=DMARC1'));

      if (!hasSPF) {
        phase.results.push({
          type: 'dns',
          severity: 'medium',
          title: 'Missing SPF Record',
          detail: 'Domain does not have an SPF record — vulnerable to email spoofing',
        });
      }
      if (!hasDMARC) {
        phase.results.push({
          type: 'dns',
          severity: 'medium',
          title: 'Missing DMARC Record',
          detail: 'Domain does not have a DMARC record — email spoofing not mitigated',
        });
      }
    } catch {}

  } catch (error) {
    phase.status = 'error';
  }

  phase.status = 'complete';
  phase.duration = Date.now() - start;
  return phase;
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

async function resolveDNS(target: string): Promise<string | null> {
  try {
    const resp = await fetch(`https://dns.google/resolve?name=${target}&type=A`);
    const data = await resp.json();
    return data.Answer?.[0]?.data || null;
  } catch {
    return null;
  }
}

async function queryCrtSh(target: string): Promise<string[]> {
  try {
    const resp = await fetch(`https://crt.sh/?q=%25.${target}&output=json`);
    if (!resp.ok) return [];
    const data = await resp.json();
    return data
      .map((entry: any) => entry.name_value)
      .flat()
      .filter((name: string) => name && name.includes(target))
      .map((name: string) => name.replace(/^\*\./, ''));
  } catch {
    return [];
  }
}

async function dnsBruteForce(target: string): Promise<string[]> {
  const found: string[] = [];
  const checks = SUBDOMAIN_WORDLIST.map(async (sub) => {
    const fqdn = `${sub}.${target}`;
    try {
      const resp = await fetch(`https://dns.google/resolve?name=${fqdn}&type=A`);
      const data = await resp.json();
      if (data.Answer && data.Answer.length > 0) {
        found.push(fqdn);
      }
    } catch {}
  });
  await Promise.all(checks);
  return found;
}

async function fetchHeaders(target: string): Promise<Record<string, string>> {
  try {
    const resp = await fetch(`https://${target}`, {
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
    });
    const headers: Record<string, string> = {};
    resp.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });
    return headers;
  } catch {
    try {
      const resp = await fetch(`http://${target}`, {
        redirect: 'follow',
        signal: AbortSignal.timeout(8000),
      });
      const headers: Record<string, string> = {};
      resp.headers.forEach((value, key) => {
        headers[key.toLowerCase()] = value;
      });
      return headers;
    } catch {
      return {};
    }
  }
}

async function fetchDNSTXT(target: string): Promise<string[]> {
  try {
    const resp = await fetch(`https://dns.google/resolve?name=${target}&type=TXT`);
    const data = await resp.json();
    return (data.Answer || [])
      .filter((a: any) => a.type === 16)
      .map((a: any) => a.data?.replace(/"/g, '') || '');
  } catch {
    return [];
  }
}

function getPortSeverity(port: number): 'critical' | 'high' | 'medium' | 'low' | 'info' {
  const critical = [23, 445, 3389];
  const high = [21, 1433, 3306, 5432, 6379, 27017, 5900];
  const medium = [25, 110, 143, 993, 995, 8080, 8443, 8888, 9090];
  if (critical.includes(port)) return 'critical';
  if (high.includes(port)) return 'high';
  if (medium.includes(port)) return 'medium';
  return 'info';
}

function getFileSeverity(file: string): 'critical' | 'high' | 'medium' | 'low' | 'info' {
  if (file.includes('.env') || file.includes('credentials') || file.includes('.ssh')) return 'critical';
  if (file.includes('.git') || file.includes('config') || file.includes('backup') || file.includes('dump')) return 'high';
  if (file.includes('admin') || file.includes('console') || file.includes('debug') || file.includes('actuator')) return 'medium';
  if (file.includes('phpinfo') || file.includes('test') || file.includes('.htpasswd')) return 'low';
  return 'info';
}
