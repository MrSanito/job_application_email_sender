import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { parseExcelBuffer } from '@/lib/excel-parser';

export async function GET() {
  try {
    const primaryPath = path.join(process.cwd(), 'public', 'data.xlsx');
    const fallbackPath = path.join(process.cwd(), '..', 'JobApplier', 'data.xlsx');

    let targetPath = primaryPath;
    if (!fs.existsSync(primaryPath) && fs.existsSync(fallbackPath)) {
      targetPath = fallbackPath;
    }

    if (!fs.existsSync(targetPath)) {
      return NextResponse.json(
        { success: false, error: 'data.xlsx sample file not found.' },
        { status: 404 }
      );
    }

    const fileBuffer = fs.readFileSync(targetPath);
    const parsed = parseExcelBuffer(fileBuffer);

    return NextResponse.json({
      success: true,
      filename: 'data.xlsx',
      leads: parsed.leads,
      stats: parsed.stats,
      headers: parsed.headers,
    });
  } catch (error: unknown) {
    console.error('Error loading sample data.xlsx:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to parse sample data',
      },
      { status: 500 }
    );
  }
}
