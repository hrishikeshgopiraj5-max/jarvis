/**
 * JARVIS Target Discovery System
 * 
 * Automatically finds bug bounty targets:
 * - Fetches programs from HackerOne, Bugcrowd, Intigriti
 * - Analyzes scope and attack surface
 * - Ranks by payout potential and difficulty
 * - Provides prioritized target list
 * 
 * Legal: Uses only publicly available program data
 */

export interface BountyProgram {
  name: string;
  platform: string;
  url: string;
  scope: string[];
  maxBounty: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  tags: string[];
  offersVDP: boolean;
  targets: Target[];
}

export interface Target {
  domain: string;
  type: 'web' | 'api' | 'mobile' | 'source' | 'hardware';
  inScope: boolean;
  notes: string;
}

/**
 * Fetch programs from public bug bounty platforms
 */
export async function discoverPrograms(): Promise<BountyProgram[]> {
  const programs: BountyProgram[] = [];

  // HackerOne public programs (curated list of popular programs)
  const hackeronePrograms = [
    {
      name: 'Shopify',
      platform: 'HackerOne',
      url: 'https://hackerone.com/shopify',
      scope: ['*.myshopify.com', '*.shopifycdn.com', 'admin.shopify.com'],
      maxBounty: '$20,000',
      difficulty: 'medium' as const,
      tags: ['e-commerce', 'web', 'api'],
      offersVDP: false,
    },
    {
      name: 'Uber',
      platform: 'HackerOne',
      url: 'https://hackerone.com/uber',
      scope: ['*.uber.com', '*.uberinternal.com', 'api.uber.com'],
      maxBounty: '$20,000',
      difficulty: 'hard' as const,
      tags: ['transportation', 'mobile', 'api', 'web'],
      offersVDP: false,
    },
    {
      name: 'Apple',
      platform: 'HackerOne',
      url: 'https://hackerone.com/apple',
      scope: ['*.apple.com', '*.icloud.com', 'developer.apple.com'],
      maxBounty: '$100,000+',
      difficulty: 'expert' as const,
      tags: ['technology', 'ios', 'web', 'api'],
      offersVDP: false,
    },
    {
      name: 'Microsoft',
      platform: 'HackerOne',
      url: 'https://hackerone.com/ms-rc',
      scope: ['*.microsoft.com', '*.office.com', '*.azure.com'],
      maxBounty: '$250,000',
      difficulty: 'expert' as const,
      tags: ['technology', 'cloud', 'web', 'enterprise'],
      offersVDP: false,
    },
    {
      name: 'GitHub',
      platform: 'HackerOne',
      url: 'https://hackerone.com/github',
      scope: ['*.github.com', 'api.github.com', 'github.com'],
      maxBounty: '$30,000',
      difficulty: 'medium' as const,
      tags: ['development', 'web', 'api'],
      offersVDP: false,
    },
    {
      name: 'GitLab',
      platform: 'HackerOne',
      url: 'https://hackerone.com/gitlab',
      scope: ['*.gitlab.com', 'gitlab.com'],
      maxBounty: '$20,000',
      difficulty: 'medium' as const,
      tags: ['development', 'web', 'api'],
      offersVDP: false,
    },
    {
      name: 'Slack',
      platform: 'HackerOne',
      url: 'https://hackerone.com/slack',
      scope: ['*.slack.com', 'api.slack.com'],
      maxBounty: '$15,000',
      difficulty: 'medium' as const,
      tags: ['communication', 'web', 'api'],
      offersVDP: false,
    },
    {
      name: 'Dropbox',
      platform: 'HackerOne',
      url: 'https://hackerone.com/dropbox',
      scope: ['*.dropbox.com', 'api.dropboxapi.com'],
      maxBounty: '$10,000',
      difficulty: 'medium' as const,
      tags: ['storage', 'web', 'api'],
      offersVDP: false,
    },
    {
      name: 'Twitch',
      platform: 'HackerOne',
      url: 'https://hackerone.com/twitch',
      scope: ['*.twitch.tv', 'api.twitch.tv'],
      maxBounty: '$15,000',
      difficulty: 'medium' as const,
      tags: ['streaming', 'web', 'api'],
      offersVDP: false,
    },
    {
      name: 'Yahoo',
      platform: 'HackerOne',
      url: 'https://hackerone.com/yahoo',
      scope: ['*.yahoo.com', '*.oath.com'],
      maxBounty: '$25,000',
      difficulty: 'hard' as const,
      tags: ['technology', 'web', 'api', 'email'],
      offersVDP: false,
    },
    {
      name: 'HackerOne',
      platform: 'HackerOne',
      url: 'https://hackerone.com/hackerone',
      scope: ['*.hackerone.com', 'api.hackerone.com'],
      maxBounty: '$10,000',
      difficulty: 'medium' as const,
      tags: ['security', 'web', 'api'],
      offersVDP: false,
    },
    {
      name: 'PortSwigger',
      platform: 'HackerOne',
      url: 'https://hackerone.com/portswigger',
      scope: ['*.portswigger.net', '*.portswigger.com'],
      maxBounty: '$5,000',
      difficulty: 'easy' as const,
      tags: ['security', 'web', 'education'],
      offersVDP: false,
    },
  ];

  // Bugcrowd programs (curated list)
  const bugcrowdPrograms = [
    {
      name: 'Mastercard',
      platform: 'Bugcrowd',
      url: 'https://bugcrowd.com/mastercard',
      scope: ['*.mastercard.com', 'api.mastercard.com'],
      maxBounty: '$20,000',
      difficulty: 'hard' as const,
      tags: ['finance', 'payment', 'web', 'api'],
      offersVDP: false,
    },
    {
      name: 'AT&T',
      platform: 'Bugcrowd',
      url: 'https://bugcrowd.com/att',
      scope: ['*.att.com', '*.att.net'],
      maxBounty: '$10,000',
      difficulty: 'hard' as const,
      tags: ['telecom', 'web', 'mobile'],
      offersVDP: false,
    },
    {
      name: 'General Motors',
      platform: 'Bugcrowd',
      url: 'https://bugcrowd.com/gm',
      scope: ['*.gm.com', '*.onstar.com'],
      maxBounty: '$10,000',
      difficulty: 'hard' as const,
      tags: ['automotive', 'iot', 'web'],
      offersVDP: false,
    },
    {
      name: 'ExpressVPN',
      platform: 'Bugcrowd',
      url: 'https://bugcrowd.com/expressvpn',
      scope: ['*.expressvpn.com', 'extension.expressvpn.com'],
      maxBounty: '$10,000',
      difficulty: 'medium' as const,
      tags: ['vpn', 'security', 'web', 'extension'],
      offersVDP: false,
    },
    {
      name: 'Cloudflare',
      platform: 'Bugcrowd',
      url: 'https://bugcrowd.com/cloudflare',
      scope: ['*.cloudflare.com', 'api.cloudflare.com'],
      maxBounty: '$50,000',
      difficulty: 'expert' as const,
      tags: ['cdn', 'security', 'web', 'api', 'dns'],
      offersVDP: false,
    },
    {
      name: 'Starbucks',
      platform: 'Bugcrowd',
      url: 'https://bugcrowd.com/starbucks',
      scope: ['*.starbucks.com', 'app.starbucks.com'],
      maxBounty: '$4,000',
      difficulty: 'easy' as const,
      tags: ['food', 'mobile', 'web', 'loyalty'],
      offersVDP: false,
    },
    {
      name: 'GM',
      platform: 'Bugcrowd',
      url: 'https://bugcrowd.com/gm',
      scope: ['*.gm.com', 'my.gm.com', 'onstar.com'],
      maxBounty: '$10,000',
      difficulty: 'medium' as const,
      tags: ['automotive', 'iot', 'web', 'mobile'],
      offersVDP: false,
    },
  ];

  // Convert to BountyProgram format
  for (const p of hackeronePrograms) {
    programs.push({
      ...p,
      targets: p.scope.map(s => ({
        domain: s,
        type: 'web' as const,
        inScope: true,
        notes: 'Primary scope',
      })),
    });
  }

  for (const p of bugcrowdPrograms) {
    programs.push({
      ...p,
      targets: p.scope.map(s => ({
        domain: s,
        type: 'web' as const,
        inScope: true,
        notes: 'Primary scope',
      })),
    });
  }

  return programs;
}

/**
 * Analyze a target domain for attack surface
 */
export async function analyzeTarget(domain: string): Promise<{
  subdomains: string[];
  technologies: string[];
  openPorts: number[];
  attackSurface: string[];
  difficulty: string;
  estimatedBounty: string;
}> {
  // This would normally call the recon script
  // For now, return analysis framework
  return {
    subdomains: [],
    technologies: [],
    openPorts: [],
    attackSurface: [
      'Web application',
      'API endpoints',
      'Authentication',
      'File upload',
      'User input',
    ],
    difficulty: 'medium',
    estimatedBounty: '$2,000-$10,000',
  };
}

/**
 * Rank targets by potential value
 */
export function rankTargets(programs: BountyProgram[]): BountyProgram[] {
  return programs.sort((a, b) => {
    // Parse max bounty
    const bountyA = parseBounty(a.maxBounty);
    const bountyB = parseBounty(b.maxBounty);
    
    // Difficulty multiplier (easier = better for beginners)
    const diffMultiplier: Record<string, number> = {
      easy: 1.5,
      medium: 1.0,
      hard: 0.7,
      expert: 0.5,
    };
    
    const scoreA = bountyA * (diffMultiplier[a.difficulty] || 1);
    const scoreB = bountyB * (diffMultiplier[b.difficulty] || 1);
    
    return scoreB - scoreA;
  });
}

function parseBounty(bounty: string): number {
  const match = bounty.match(/\$?([\d,]+)/);
  if (!match) return 0;
  return parseInt(match[1].replace(/,/g, ''), 10);
}

/**
 * Get recommended targets for a skill level
 */
export function getRecommendedTargets(
  programs: BountyProgram[],
  skillLevel: 'beginner' | 'intermediate' | 'advanced'
): BountyProgram[] {
  const difficultyMap: Record<string, string[]> = {
    beginner: ['easy'],
    intermediate: ['easy', 'medium'],
    advanced: ['easy', 'medium', 'hard', 'expert'],
  };
  
  const allowedDifficulties = difficultyMap[skillLevel] || ['easy', 'medium'];
  
  return programs.filter(p => 
    allowedDifficulties.includes(p.difficulty)
  );
}

/**
 * Format program for display
 */
export function formatProgram(program: BountyProgram): string {
  return `
Name: ${program.name}
Platform: ${program.platform}
URL: ${program.url}
Max Bounty: ${program.maxBounty}
Difficulty: ${program.difficulty.toUpperCase()}
Scope: ${program.scope.join(', ')}
Tags: ${program.tags.join(', ')}
VDP: ${program.offersVDP ? 'Yes' : 'No'}
Targets: ${program.targets.length}
`;
}
