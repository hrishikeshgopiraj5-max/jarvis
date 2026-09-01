#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# JARVIS Recon Automation Suite v1.0
# Bug Bounty Reconnaissance Framework
# 
# Usage: ./jarvis-recon.sh <target-domain> [--full|--quick|--stealth]
#
# ONLY use on authorized targets (bug bounty programs)
# ═══════════════════════════════════════════════════════════════

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Config
TARGET="${1:-}"
MODE="${2:---full}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUTPUT_DIR="recon_${TARGET}_${TIMESTAMP}"
THREADS=50

if [ -z "$TARGET" ]; then
    echo -e "${RED}[ERROR] Usage: $0 <target-domain> [--full|--quick|--stealth]${NC}"
    exit 1
fi

mkdir -p "$OUTPUT_DIR"

echo -e "${CYAN}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║           JARVIS Recon Automation Suite v1.0              ║"
echo "║        Bug Bounty Reconnaissance Framework               ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo -e "${YELLOW}Target: ${TARGET}${NC}"
echo -e "${YELLOW}Mode: ${MODE}${NC}"
echo -e "${YELLOW}Output: ${OUTPUT_DIR}/${NC}"
echo ""

# ═══════════════════════════════════════════════════════════════
# PHASE 1: SUBDOMAIN ENUMERATION
# ═══════════════════════════════════════════════════════════════
echo -e "${CYAN}[PHASE 1] Subdomain Enumeration${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 1.1 crt.sh certificate transparency logs
echo -e "${GREEN}[+] Querying crt.sh for certificates...${NC}"
curl -s "https://crt.sh/?q=%25.${TARGET}&output=json" | \
    grep -oP '"name_value":\s*"\K[^"]+' | \
    sed 's/\\n/\n/g' | sort -u > "$OUTPUT_DIR/subdomains_crtsh.txt" 2>/dev/null || true

# 1.2 DNS brute force
echo -e "${GREEN}[+] DNS brute force...${NC}"
for sub in www mail ftp vpn api dev staging test admin portal app cloud cdn; do
    if host "${sub}.${TARGET}" > /dev/null 2>&1; then
        echo "${sub}.${TARGET}" >> "$OUTPUT_DIR/subdomains_dns.txt"
    fi
done

# 1.3 Subfinder (if installed)
if command -v subfinder &> /dev/null; then
    echo -e "${GREEN}[+] Running subfinder...${NC}"
    subfinder -d "$TARGET" -silent -all -o "$OUTPUT_DIR/subdomains_subfinder.txt" 2>/dev/null || true
fi

# 1.4 Amass (if installed)
if command -v amass &> /dev/null; then
    echo -e "${GREEN}[+] Running amass passive...${NC}"
    amass enum -passive -d "$TARGET" -o "$OUTPUT_DIR/subdomains_amass.txt" 2>/dev/null || true
fi

# Combine all subdomains
cat "$OUTPUT_DIR"/subdomains_*.txt 2>/dev/null | sort -u > "$OUTPUT_DIR/subdomains_all.txt"
SUBDOMAIN_COUNT=$(wc -l < "$OUTPUT_DIR/subdomains_all.txt" 2>/dev/null || echo "0")
echo -e "${YELLOW}[*] Total unique subdomains found: ${SUBDOMAIN_COUNT}${NC}"

# ═══════════════════════════════════════════════════════════════
# PHASE 2: TECHNOLOGY FINGERPRINTING
# ═══════════════════════════════════════════════════════════════
echo ""
echo -e "${CYAN}[PHASE 2] Technology Fingerprinting${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 2.1 Check HTTP headers
echo -e "${GREEN}[+] Analyzing HTTP headers...${NC}"
for sub in "$TARGET" "www.${TARGET}" "api.${TARGET}"; do
    echo "--- ${sub} ---" >> "$OUTPUT_DIR/headers.txt"
    curl -sI "https://${sub}" --max-time 10 2>/dev/null >> "$OUTPUT_DIR/headers.txt" || true
    echo "" >> "$OUTPUT_DIR/headers.txt"
done

# 2.2 Technology detection with whatweb (if installed)
if command -v whatweb &> /dev/null; then
    echo -e "${GREEN}[+] Running whatweb...${NC}"
    whatweb "$TARGET" --color=never -o "$OUTPUT_DIR/whatweb.txt" 2>/dev/null || true
fi

# 2.3 Check common paths and technologies
echo -e "${GREEN}[+] Checking technology endpoints...${NC}"
declare -A TECH_PATHS=(
    ["/robots.txt"]="Robots file"
    ["/sitemap.xml"]="Sitemap"
    ["/.env"]="Environment file"
    ["/wp-admin"]="WordPress admin"
    ["/admin"]="Admin panel"
    ["/api/v1"]="API endpoint"
    ["/graphql"]="GraphQL endpoint"
    ["/.git/HEAD"]="Git repository"
    ["/server-info"]="Server info"
    ["/server-status"]="Server status"
    ["/.well-known/security.txt"]="Security.txt"
)

for path in "${!TECH_PATHS[@]}"; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://${TARGET}${path}" --max-time 5 2>/dev/null || echo "000")
    if [ "$STATUS" != "404" ] && [ "$STATUS" != "000" ]; then
        echo -e "${GREEN}[+] ${TECH_PATHS[$path]}: ${path} (HTTP ${STATUS})${NC}" | tee -a "$OUTPUT_DIR/tech_endpoints.txt"
    fi
done

# ═══════════════════════════════════════════════════════════════
# PHASE 3: PORT SCANNING
# ═══════════════════════════════════════════════════════════════
echo ""
echo -e "${CYAN}[PHASE 3] Port Scanning${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Resolve target IP
TARGET_IP=$(dig +short "$TARGET" | head -1)

if [ ! -z "$TARGET_IP" ]; then
    echo -e "${GREEN}[+] Target IP: ${TARGET_IP}${NC}"
    
    # Quick scan with nmap (if installed)
    if command -v nmap &> /dev/null; then
        echo -e "${GREEN}[+] Running nmap scan...${NC}"
        if [ "$MODE" == "--full" ]; then
            nmap -sV -sC -T4 -p- "$TARGET_IP" -oN "$OUTPUT_DIR/nmap_full.txt" 2>/dev/null || true
        else
            nmap -sV -sC -T4 --top-ports 1000 "$TARGET_IP" -oN "$OUTPUT_DIR/nmap_quick.txt" 2>/dev/null || true
        fi
    fi
    
    # Masscan (if installed and full mode)
    if [ "$MODE" == "--full" ] && command -v masscan &> /dev/null; then
        echo -e "${GREEN}[+] Running masscan...${NC}"
        masscan "$TARGET_IP" -p0-65535 --rate=1000 -oL "$OUTPUT_DIR/masscan.txt" 2>/dev/null || true
    fi
else
    echo -e "${RED}[-] Could not resolve target IP${NC}"
fi

# ═══════════════════════════════════════════════════════════════
# PHASE 4: DIRECTORY AND FILE DISCOVERY
# ═══════════════════════════════════════════════════════════════
echo ""
echo -e "${CYAN}[PHASE 4] Directory Discovery${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 4.1 Common sensitive files
echo -e "${GREEN}[+] Checking sensitive files...${NC}"
declare -a SENSITIVE_FILES=(
    "/.env" "/.env.local" "/.env.production"
    "/.git/HEAD" "/.git/config"
    "/backup.zip" "/backup.tar.gz"
    "/config.php" "/config.json" "/config.yml"
    "/database.sql" "/db.sql"
    "/phpinfo.php" "/info.php"
    "/.htaccess" "/.htpasswd"
    "/wp-config.php"
    "/composer.json" "/package.json"
    "/.DS_Store" "/Thumbs.db"
)

for file in "${SENSITIVE_FILES[@]}"; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://${TARGET}${file}" --max-time 5 2>/dev/null || echo "000")
    if [ "$STATUS" == "200" ] || [ "$STATUS" == "403" ]; then
        echo -e "${RED}[!] FOUND: ${file} (HTTP ${STATUS})${NC}" | tee -a "$OUTPUT_DIR/sensitive_files.txt"
    fi
done

# 4.2 Dirsearch (if installed)
if command -v dirsearch &> /dev/null; then
    echo -e "${GREEN}[+] Running dirsearch...${NC}"
    dirsearch -u "https://${TARGET}" -o "$OUTPUT_DIR/dirsearch.txt" -q 2>/dev/null || true
fi

# ═══════════════════════════════════════════════════════════════
# PHASE 5: VULNERABILITY SCANNING
# ═══════════════════════════════════════════════════════════════
echo ""
echo -e "${CYAN}[PHASE 5] Vulnerability Checks${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 5.1 Check for CORS misconfiguration
echo -e "${GREEN}[+] Testing CORS...${NC}"
CORS_RESPONSE=$(curl -sI -H "Origin: https://evil.com" "https://${TARGET}" --max-time 10 2>/dev/null || echo "")
if echo "$CORS_RESPONSE" | grep -qi "access-control-allow-origin: https://evil.com"; then
    echo -e "${RED}[!] CORS MISCONFIGURATION: Reflects arbitrary origin${NC}" | tee -a "$OUTPUT_DIR/vulns.txt"
fi

# 5.2 Check for security headers
echo -e "${GREEN}[+] Checking security headers...${NC}"
HEADERS=$(curl -sI "https://${TARGET}" --max-time 10 2>/dev/null || echo "")

declare -A SECURITY_HEADERS=(
    ["X-Frame-Options"]="Clickjacking protection"
    ["X-Content-Type-Options"]="MIME sniffing protection"
    ["X-XSS-Protection"]="XSS filter"
    ["Strict-Transport-Security"]="HSTS"
    ["Content-Security-Policy"]="CSP"
    ["Referrer-Policy"]="Referrer leak protection"
)

for header in "${!SECURITY_HEADERS[@]}"; do
    if ! echo "$HEADERS" | grep -qi "$header"; then
        echo -e "${YELLOW}[!] Missing: ${header} (${SECURITY_HEADERS[$header]})${NC}" | tee -a "$OUTPUT_DIR/missing_headers.txt"
    fi
done

# 5.3 Check for information disclosure
echo -e "${GREEN}[+] Checking information disclosure...${NC}"
SERVER_HEADER=$(echo "$HEADERS" | grep -i "^server:" | head -1)
if [ ! -z "$SERVER_HEADER" ]; then
    echo -e "${YELLOW}[!] Server header exposed: ${SERVER_HEADER}${NC}" | tee -a "$OUTPUT_DIR/info_disclosure.txt"
fi

X_POWERED=$(echo "$HEADERS" | grep -i "^x-powered-by:" | head -1)
if [ ! -z "$X_POWERED" ]; then
    echo -e "${YELLOW}[!] X-Powered-By exposed: ${X_POWERED}${NC}" | tee -a "$OUTPUT_DIR/info_disclosure.txt"
fi

# ═══════════════════════════════════════════════════════════════
# PHASE 6: DNS ANALYSIS
# ═══════════════════════════════════════════════════════════════
echo ""
echo -e "${CYAN}[PHASE 6] DNS Analysis${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 6.1 Zone transfer attempt
echo -e "${GREEN}[+] Testing DNS zone transfer...${NC}"
NS_SERVERS=$(dig +short NS "$TARGET" 2>/dev/null || echo "")
for ns in $NS_SERVERS; do
    ZONE_RESULT=$(dig AXFR "$TARGET" "@${ns}" --max-time=5 2>/dev/null || echo "REFUSED")
    if echo "$ZONE_RESULT" | grep -q "SOA"; then
        echo -e "${RED}[!] ZONE TRANSFER POSSIBLE on ${ns}${NC}" | tee -a "$OUTPUT_DIR/dns_vulns.txt"
    fi
done

# 6.2 Check for DNSSEC
echo -e "${GREEN}[+] Checking DNSSEC...${NC}"
DNSSEC=$(dig +dnssec +short "$TARGET" 2>/dev/null || echo "")
if [ -z "$DNSSEC" ]; then
    echo -e "${YELLOW}[!] DNSSEC not enabled${NC}" | tee -a "$OUTPUT_DIR/dns_info.txt"
fi

# ═══════════════════════════════════════════════════════════════
# PHASE 7: EMAIL AND PHISHING RECON
# ═══════════════════════════════════════════════════════════════
echo ""
echo -e "${CYAN}[PHASE 7] Email & Social Engineering Recon${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 7.1 Check email security (SPF, DKIM, DMARC)
echo -e "${GREEN}[+] Checking email security...${NC}"
SPF=$(dig +short TXT "$TARGET" 2>/dev/null | grep -i "spf" || echo "NO SPF")
DKIM=$(dig +short TXT "default._domainkey.${TARGET}" 2>/dev/null || echo "NO DKIM")
DMARC=$(dig +short TXT "_dmarc.${TARGET}" 2>/dev/null || echo "NO DMARC")

echo "SPF: ${SPF}" | tee -a "$OUTPUT_DIR/email_security.txt"
echo "DKIM: ${DKIM}" | tee -a "$OUTPUT_DIR/email_security.txt"
echo "DMARC: ${DMARC}" | tee -a "$OUTPUT_DIR/email_security.txt"

if echo "$SPF" | grep -q "NO SPF" || echo "$DMARC" | grep -q "NO DMARC"; then
    echo -e "${RED}[!] Email spoofing possible - weak email security${NC}" | tee -a "$OUTPUT_DIR/vulns.txt"
fi

# ═══════════════════════════════════════════════════════════════
# GENERATE REPORT
# ═══════════════════════════════════════════════════════════════
echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗"
echo "║                    RECON COMPLETE                         ║"
echo "╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Count findings
VULN_COUNT=$(wc -l < "$OUTPUT_DIR/vulns.txt" 2>/dev/null || echo "0")
MISSING_HEADERS=$(wc -l < "$OUTPUT_DIR/missing_headers.txt" 2>/dev/null || echo "0")
SENSITIVE_COUNT=$(wc -l < "$OUTPUT_DIR/sensitive_files.txt" 2>/dev/null || echo "0")

echo -e "${YELLOW}📊 SUMMARY:${NC}"
echo -e "  • Subdomains found: ${SUBDOMAIN_COUNT}"
echo -e "  • Potential vulnerabilities: ${VULN_COUNT}"
echo -e "  • Missing security headers: ${MISSING_HEADERS}"
echo -e "  • Sensitive files exposed: ${SENSITIVE_COUNT}"
echo ""
echo -e "${GREEN}📁 Output saved to: ${OUTPUT_DIR}/${NC}"
echo ""
echo -e "${YELLOW}📋 FILES:${NC}"
ls -la "$OUTPUT_DIR/" | grep -v "^total" | awk '{print "  " $NF}'

echo ""
echo -e "${CYAN}🔗 NEXT STEPS:${NC}"
echo "  1. Review sensitive_files.txt for exposed files"
echo "  2. Check vulns.txt for actionable findings"
echo "  3. Use subdomains_all.txt for further testing"
echo "  4. Test identified endpoints with Burp Suite"
echo "  5. Report findings to bug bounty program"
echo ""
echo -e "${GREEN}Generated by JARVIS Recon Suite v1.0${NC}"
