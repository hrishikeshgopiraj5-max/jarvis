@echo off
REM ═══════════════════════════════════════════════════════════════
REM JARVIS Recon Automation Suite v1.0 (Windows Version)
REM Bug Bounty Reconnaissance Framework
REM
REM Usage: jarvis-recon.bat <target-domain> [--full|--quick]
REM ═══════════════════════════════════════════════════════════════

setlocal enabledelayedexpansion

set "TARGET=%~1"
set "MODE=%~2"
if "%MODE%"=="" set "MODE=--quick"
set "TIMESTAMP=%date:~-4%%date:~4,2%%date:~7,2%_%time:~0,2%%time:~3,2%"
set "TIMESTAMP=%TIMESTAMP: =0%"
set "OUTPUT_DIR=recon_%TARGET%_%TIMESTAMP%"

if "%TARGET%"=="" (
    echo [ERROR] Usage: jarvis-recon.bat ^<target-domain^> [--full|--quick]
    exit /b 1
)

mkdir "%OUTPUT_DIR%" 2>nul

echo ╔════════════════════════════════════════════════════════════╗
echo ║           JARVIS Recon Automation Suite v1.0              ║
echo ║        Bug Bounty Reconnaissance Framework               ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
echo Target: %TARGET%
echo Mode: %MODE%
echo Output: %OUTPUT_DIR%
echo.

REM ═══════════════════════════════════════════════════════════════
REM PHASE 1: SUBDOMAIN ENUMERATION
REM ═══════════════════════════════════════════════════════════════
echo [PHASE 1] Subdomain Enumeration
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REM 1.1 crt.sh certificate transparency logs
echo [+] Querying crt.sh for certificates...
curl -s "https://crt.sh/?q=%%.%TARGET%&output=json" | findstr /i "name_value" > "%OUTPUT_DIR%\subdomains_crtsh.txt" 2>nul

REM 1.2 DNS brute force
echo [+] DNS brute force...
for %%s in (www mail ftp vpn api dev staging test admin portal app cloud cdn) do (
    nslookup %%s.%TARGET% >nul 2>&1
    if !errorlevel! equ 0 (
        echo %%s.%TARGET% >> "%OUTPUT_DIR%\subdomains_dns.txt"
    )
)

REM 1.3 Check if subfinder is installed
where subfinder >nul 2>&1
if !errorlevel! equ 0 (
    echo [+] Running subfinder...
    subfinder -d %TARGET% -silent -all -o "%OUTPUT_DIR%\subdomains_subfinder.txt" 2>nul
)

REM Combine all subdomains
if exist "%OUTPUT_DIR%\subdomains_*.txt" (
    type "%OUTPUT_DIR%\subdomains_*.txt" | sort /unique > "%OUTPUT_DIR%\subdomains_all.txt"
) else (
    echo No subdomains found > "%OUTPUT_DIR%\subdomains_all.txt"
)

REM ═══════════════════════════════════════════════════════════════
REM PHASE 2: TECHNOLOGY FINGERPRINTING
REM ═══════════════════════════════════════════════════════════════
echo.
echo [PHASE 2] Technology Fingerprinting
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REM 2.1 Check HTTP headers
echo [+] Analyzing HTTP headers...
curl -sI "https://%TARGET%" --max-time 10 > "%OUTPUT_DIR%\headers.txt" 2>nul
curl -sI "https://www.%TARGET%" --max-time 10 >> "%OUTPUT_DIR%\headers.txt" 2>nul
curl -sI "https://api.%TARGET%" --max-time 10 >> "%OUTPUT_DIR%\headers.txt" 2>nul

REM 2.2 Check common paths
echo [+] Checking technology endpoints...
echo --- Technology Endpoints --- > "%OUTPUT_DIR%\tech_endpoints.txt"

for %%p in (/robots.txt /sitemap.xml /.env /wp-admin /admin /api/v1 /graphql /.git/HEAD /server-info /server-status /.well-known/security.txt) do (
    curl -s -o nul -w "HTTP %%p: %%{http_code}\n" "https://%TARGET%%%p" --max-time 5 >nul 2>&1
    if !errorlevel! equ 0 (
        echo %%p >> "%OUTPUT_DIR%\tech_endpoints.txt"
    )
)

REM ═══════════════════════════════════════════════════════════════
REM PHASE 3: PORT SCANNING
REM ═══════════════════════════════════════════════════════════════
echo.
echo [PHASE 3] Port Scanning
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REM Resolve target IP
for /f "tokens=*" %%i in ('nslookup %TARGET% ^| findstr /i "Address"') do set "TARGET_IP=%%i"
echo [+] Target IP: %TARGET_IP%

REM Quick scan with nmap (if installed)
where nmap >nul 2>&1
if !errorlevel! equ 0 (
    echo [+] Running nmap scan...
    if "%MODE%"=="--full" (
        nmap -sV -sC -T4 -p- %TARGET% -oN "%OUTPUT_DIR%\nmap_full.txt" 2>nul
    ) else (
        nmap -sV -sC -T4 --top-ports 1000 %TARGET% -oN "%OUTPUT_DIR%\nmap_quick.txt" 2>nul
    )
) else (
    echo [!] nmap not found. Install from: https://nmap.org/download.html
)

REM ═══════════════════════════════════════════════════════════════
REM PHASE 4: DIRECTORY AND FILE DISCOVERY
REM ═══════════════════════════════════════════════════════════════
echo.
echo [PHASE 4] Directory Discovery
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REM 4.1 Check sensitive files
echo [+] Checking sensitive files...
echo --- Sensitive Files Found --- > "%OUTPUT_DIR%\sensitive_files.txt"

for %%f in (/.env /.env.local /.env.production /.git/HEAD /.git/config /backup.zip /backup.tar.gz /config.php /config.json /config.yml /database.sql /db.sql /phpinfo.php /info.php /.htaccess /.htpasswd /wp-config.php /composer.json /package.json /.DS_Store /Thumbs.db) do (
    curl -s -o nul -w "%%f: %%{http_code}\n" "https://%TARGET%%%f" --max-time 5 >nul 2>&1
    if !errorlevel! equ 0 (
        echo %%f >> "%OUTPUT_DIR%\sensitive_files.txt"
    )
)

REM ═══════════════════════════════════════════════════════════════
REM PHASE 5: VULNERABILITY SCANNING
REM ═══════════════════════════════════════════════════════════════
echo.
echo [PHASE 5] Vulnerability Checks
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REM 5.1 Check for CORS misconfiguration
echo [+] Testing CORS...
curl -sI -H "Origin: https://evil.com" "https://%TARGET%" --max-time 10 2>nul | findstr /i "access-control-allow-origin" > "%OUTPUT_DIR%\cors_test.txt"

REM 5.2 Check for security headers
echo [+] Checking security headers...
curl -sI "https://%TARGET%" --max-time 10 2>nul | findstr /i "x-frame-options x-content-type-options x-xss-protection strict-transport-security content-security-policy" > "%OUTPUT_DIR%\security_headers.txt"

REM ═══════════════════════════════════════════════════════════════
REM GENERATE REPORT
REM ═══════════════════════════════════════════════════════════════
echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║                    RECON COMPLETE                         ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
echo 📊 SUMMARY:
echo   • Subdomains found: Check %OUTPUT_DIR%\subdomains_all.txt
echo   • Sensitive files: Check %OUTPUT_DIR%\sensitive_files.txt
echo   • Security headers: Check %OUTPUT_DIR%\security_headers.txt
echo.
echo 📁 Output saved to: %OUTPUT_DIR%\
echo.
echo 📋 FILES:
dir /b "%OUTPUT_DIR%\" 2>nul
echo.
echo 🔗 NEXT STEPS:
echo   1. Review sensitive_files.txt for exposed files
echo   2. Check security_headers.txt for missing headers
echo   3. Use subdomains_all.txt for further testing
echo   4. Test identified endpoints with Burp Suite
echo   5. Report findings to bug bounty program
echo.
echo Generated by JARVIS Recon Suite v1.0
