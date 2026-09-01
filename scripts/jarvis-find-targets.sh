#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# JARVIS Target Finder v1.0
# Automatically discover bug bounty targets
#
# Usage: ./jarvis-find-targets.sh [--skill=beginner|intermediate|advanced]
# ═══════════════════════════════════════════════════════════════

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Parse arguments
SKILL="beginner"
for arg in "$@"; do
    case $arg in
        --skill=*) SKILL="${arg#*=}" ;;
    esac
done

echo -e "${CYAN}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║           JARVIS Target Finder v1.0                       ║"
echo "║        Bug Bounty Target Discovery                        ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo -e "${YELLOW}Skill Level: ${SKILL}${NC}"
echo ""

# ═══════════════════════════════════════════════════════════════
# FETCH PROGRAMS FROM PLATFORMS
# ═══════════════════════════════════════════════════════════════
echo -e "${CYAN}[PHASE 1] Fetching Bug Bounty Programs${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# HackerOne public programs
echo -e "${GREEN}[+] Fetching HackerOne programs...${NC}"
curl -s "https://raw.githubusercontent.com/arkadiyt/bounty-targets-data/main/data/hackerone_data.json" 2>/dev/null | \
    jq -r '.[] | select(.meta.bounty_range != null) | "\(.name)|\(.meta.bounty_range)|\(.url)"' 2>/dev/null | \
    head -50 > /tmp/hackerone_programs.txt || echo "Note: HackerOne data requires jq"

# Bugcrowd public programs
echo -e "${GREEN}[+] Fetching Bugcrowd programs...${NC}"
curl -s "https://raw.githubusercontent.com/arkadiyt/bounty-targets-data/main/data/bugcrowd_data.json" 2>/dev/null | \
    jq -r '.[] | select(.meta.bounty_range != null) | "\(.name)|\(.meta.bounty_range)|\(.url)"' 2>/dev/null | \
    head -50 > /tmp/bugcrowd_programs.txt || echo "Note: Bugcrowd data requires jq"

# Intigriti programs
echo -e "${GREEN}[+] Fetching Intigriti programs...${NC}"
curl -s "https://raw.githubusercontent.com/arkadiyt/bounty-targets-data/main/data/intigriti_data.json" 2>/dev/null | \
    jq -r '.[] | select(.meta.bounty_range != null) | "\(.name)|\(.meta.bounty_range)|\(.url)"' 2>/dev/null | \
    head -50 > /tmp/intigriti_programs.txt || echo "Note: Intigriti data requires jq"

# ═══════════════════════════════════════════════════════════════
# RECOMMENDED TARGETS BY SKILL LEVEL
# ═══════════════════════════════════════════════════════════════
echo ""
echo -e "${CYAN}[PHASE 2] Recommended Targets${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

case $SKILL in
    beginner)
        echo -e "${GREEN}[+] Beginner-Friendly Targets:${NC}"
        echo ""
        echo "1. Starbucks"
        echo "   - Platform: Bugcrowd"
        echo "   - Bounty: Up to $4,000"
        echo "   - Difficulty: Easy"
        echo "   - Scope: *.starbucks.com"
        echo "   - Good for: Learning recon, IDOR, information disclosure"
        echo ""
        echo "2. HackerOne"
        echo "   - Platform: HackerOne"
        echo "   - Bounty: Up to $10,000"
        echo "   - Difficulty: Easy-Medium"
        echo "   - Scope: *.hackerone.com"
        echo "   - Good for: Learning the platform, finding low-hanging fruit"
        echo ""
        echo "3. PortSwigger"
        echo "   - Platform: HackerOne"
        echo "   - Bounty: Up to $5,000"
        echo "   - Difficulty: Easy"
        echo "   - Scope: *.portswigger.net"
        echo "   - Good for: Web security practice, XSS, SQLi"
        echo ""
        echo "4. GitLab"
        echo "   - Platform: HackerOne"
        echo "   - Bounty: Up to $20,000"
        echo "   - Difficulty: Medium"
        echo "   - Scope: *.gitlab.com"
        echo "   - Good for: API testing, authentication"
        echo ""
        echo "5. ExpressVPN"
        echo "   - Platform: Bugcrowd"
        echo "   - Bounty: Up to $10,000"
        echo "   - Difficulty: Medium"
        echo "   - Scope: *.expressvpn.com"
        echo "   - Good for: VPN security, browser extensions"
        echo ""
        ;;
    intermediate)
        echo -e "${GREEN}[+] Intermediate Targets:${NC}"
        echo ""
        echo "1. Shopify"
        echo "   - Platform: HackerOne"
        echo "   - Bounty: Up to $20,000"
        echo "   - Difficulty: Medium"
        echo "   - Scope: *.myshopify.com"
        echo "   - Good for: E-commerce, API, OAuth"
        echo ""
        echo "2. Slack"
        echo "   - Platform: HackerOne"
        echo "   - Bounty: Up to $15,000"
        echo "   - Difficulty: Medium"
        echo "   - Scope: *.slack.com"
        echo "   - Good for: Real-time apps, WebSocket, API"
        echo ""
        echo "3. Dropbox"
        echo "   - Platform: HackerOne"
        echo "   - Bounty: Up to $10,000"
        echo "   - Difficulty: Medium"
        echo "   - Scope: *.dropbox.com"
        echo "   - Good for: File handling, cloud storage"
        echo ""
        echo "4. Twitch"
        echo "   - Platform: HackerOne"
        echo "   - Bounty: Up to $15,000"
        echo "   - Difficulty: Medium"
        echo "   - Scope: *.twitch.tv"
        echo "   - Good for: Streaming, real-time, API"
        echo ""
        ;;
    advanced)
        echo -e "${GREEN}[+] Advanced Targets:${NC}"
        echo ""
        echo "1. Apple"
        echo "   - Platform: HackerOne"
        echo "   - Bounty: Up to $100,000+"
        echo "   - Difficulty: Expert"
        echo "   - Scope: *.apple.com"
        echo "   - Good for: iOS, macOS, iCloud"
        echo ""
        echo "2. Microsoft"
        echo "   - Platform: HackerOne"
        echo "   - Bounty: Up to $250,000"
        echo "   - Difficulty: Expert"
        echo "   - Scope: *.microsoft.com, *.azure.com"
        echo "   - Good for: Enterprise, cloud, Windows"
        echo ""
        echo "3. Cloudflare"
        echo "   - Platform: Bugcrowd"
        echo "   - Bounty: Up to $50,000"
        echo "   - Difficulty: Expert"
        echo "   - Scope: *.cloudflare.com"
        echo "   - Good for: CDN, DNS, networking"
        echo ""
        echo "4. Uber"
        echo "   - Platform: HackerOne"
        echo "   - Bounty: Up to $20,000"
        echo "   - Difficulty: Hard"
        echo "   - Scope: *.uber.com"
        echo "   - Good for: Mobile, API, payment"
        echo ""
        ;;
esac

# ═══════════════════════════════════════════════════════════════
# QUICK START COMMANDS
# ═══════════════════════════════════════════════════════════════
echo ""
echo -e "${CYAN}[PHASE 3] Quick Start Commands${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${GREEN}[+] Run these commands to start:${NC}"
echo ""
echo "# Install required tools"
echo "go install github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest"
echo "go install github.com/projectdiscovery/httpx/cmd/httpx@latest"
echo "go install github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest"
echo ""
echo "# Quick recon on a target"
echo "subfinder -d TARGET.com -silent | httpx -silent -tech-detect"
echo ""
echo "# Find endpoints"
echo "waybackurls TARGET.com | sort -u > endpoints.txt"
echo ""
echo "# Scan for vulns"
echo "nuclei -l endpoints.txt -t cves/"
echo ""
echo "# Use JARVIS for full recon"
echo "./scripts/jarvis-recon.sh TARGET.com --quick"
echo ""

# ═══════════════════════════════════════════════════════════════
# TIPS FOR SUCCESS
# ═══════════════════════════════════════════════════════════════
echo ""
echo -e "${CYAN}[PHASE 4] Tips for Success${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${YELLOW}[!] Important tips:${NC}"
echo ""
echo "1. READ THE PROGRAM POLICIES FIRST"
echo "   - Scope: What domains are in/out"
echo "   - Rules: What's allowed"
echo "   - Bounty: What pays what"
echo ""
echo "2. START WITH RECON"
echo "   - Subdomain enumeration"
echo "   - Technology fingerprinting"
echo "   - Endpoint discovery"
echo ""
echo "3. FOCUS ON HIGH-IMPACT VULNS"
echo "   - RCE (Remote Code Execution)"
echo "   - SQL Injection"
echo "   - Authentication Bypass"
echo "   - IDOR (Insecure Direct Object Reference)"
echo ""
echo "4. DOCUMENT EVERYTHING"
echo "   - Screenshots"
echo "   - Steps to reproduce"
echo "   - Impact analysis"
echo ""
echo "5. LEARN FROM PAST REPORTS"
echo "   - HackerOne Hacktivity"
echo "   - Bugcrowd disclose.io"
echo "   - Write-ups on Medium"
echo ""
echo -e "${GREEN}Generated by JARVIS Target Finder v1.0${NC}"
