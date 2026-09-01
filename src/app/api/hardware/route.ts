/**
 * JARVIS Hardware Design API
 *
 * POST /api/hardware
 * Body: { description: string }
 *
 * Returns: ProjectAnalysis with wiring diagram, BOM, architecture,
 * assembly steps, and recommendations
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  analyzeProject,
  generateWiringDiagram,
  generateBOM,
  generateWiringSVG,
  COMPONENT_DB,
  PROJECT_TEMPLATES,
} from '@/lib/hardware-design';

export async function POST(request: NextRequest) {
  try {
    const { description } = await request.json();

    if (!description || typeof description !== 'string') {
      return NextResponse.json(
        { error: 'Project description is required' },
        { status: 400 }
      );
    }

    // Analyze the project
    const analysis = analyzeProject(description);

    // Generate outputs
    const wiringDiagramText = generateWiringDiagram(analysis.wiring);
    const wiringDiagramSVG = generateWiringSVG(analysis.wiring);
    const bom = generateBOM(analysis.wiring);

    return NextResponse.json({
      analysis,
      wiringDiagramText,
      wiringDiagramSVG,
      bom,
      availableComponents: COMPONENT_DB.map(c => ({
        id: c.id,
        name: c.name,
        category: c.category,
        voltage: c.voltage,
        price: c.price,
      })),
      templates: PROJECT_TEMPLATES.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        category: t.category,
        complexity: t.complexity,
        tags: t.tags,
      })),
    });

  } catch (error: any) {
    console.error('[Hardware Design] Error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze project', details: error?.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'online',
    capabilities: [
      'Wiring diagram generation',
      'Bill of Materials (BOM)',
      'Architecture recommendations',
      'Component compatibility checking',
      'Assembly step generation',
      'Power requirement calculation',
      'Risk assessment',
      'Alternative suggestions',
    ],
    componentCount: COMPONENT_DB.length,
    templateCount: PROJECT_TEMPLATES.length,
    supportedPlatforms: ['Arduino', 'ESP32', 'Raspberry Pi Pico'],
  });
}
