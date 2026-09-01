import { NextResponse } from 'next/server';
import { discoverPrograms, rankTargets, getRecommendedTargets } from '@/lib/target-discovery';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const skillLevel = url.searchParams.get('skill') as 'beginner' | 'intermediate' | 'advanced' || 'beginner';
    const platform = url.searchParams.get('platform') || 'all';
    const tags = url.searchParams.get('tags')?.split(',') || [];

    // Discover all programs
    let programs = await discoverPrograms();

    // Filter by platform
    if (platform !== 'all') {
      programs = programs.filter(p => 
        p.platform.toLowerCase() === platform.toLowerCase()
      );
    }

    // Filter by tags
    if (tags.length > 0) {
      programs = programs.filter(p => 
        tags.some(tag => p.tags.includes(tag.toLowerCase()))
      );
    }

    // Get recommendations for skill level
    const recommended = getRecommendedTargets(programs, skillLevel);

    // Rank by value
    const ranked = rankTargets(recommended);

    return NextResponse.json({
      total: ranked.length,
      skillLevel,
      platform,
      programs: ranked.map(p => ({
        name: p.name,
        platform: p.platform,
        url: p.url,
        maxBounty: p.maxBounty,
        difficulty: p.difficulty,
        scope: p.scope,
        tags: p.tags,
        offersVDP: p.offersVDP,
        targets: p.targets,
      })),
      tips: {
        beginner: [
          'Start with VDP (Vulnerability Disclosure Programs) - no bounties but good practice',
          'Focus on information disclosure and low-hanging fruit',
          'Read past reports to understand what works',
          'Use JARVIS recon script for automated scanning',
        ],
        intermediate: [
          'Target medium-difficulty programs with good scope',
          'Focus on authentication and authorization flaws',
          'Test for IDOR, SSRF, and business logic bugs',
          'Write detailed reports with impact analysis',
        ],
        advanced: [
          'Target high-value programs with complex attack surfaces',
          'Focus on RCE, SQL injection, and auth bypass',
          'Chain multiple low-severity bugs for higher impact',
          'Develop custom tools and automation',
        ],
      }[skillLevel],
    });

  } catch (error) {
    console.error('[Target Discovery] Error:', error);
    return NextResponse.json(
      { error: 'Failed to discover targets' },
      { status: 500 }
    );
  }
}
