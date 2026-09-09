import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { parseExcelBuffer } from '@/lib/excel-parser';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedFile = searchParams.get('file');

    const candidatePaths = [
      requestedFile && path.join(process.cwd(), 'RealData', requestedFile),
      requestedFile && path.join(process.cwd(), 'public', requestedFile),
      path.join(process.cwd(), 'RealData', 'Vadodara_Company_Contacts.xlsx'),
      path.join(process.cwd(), 'public', 'Vadodara_Company_Contacts.xlsx'),
      path.join(process.cwd(), 'RealData', 'data.xlsx'),
      path.join(process.cwd(), 'public', 'data.xlsx'),
      path.join(process.cwd(), '..', 'JobApplier', 'data.xlsx'),
    ].filter((p): p is string => Boolean(p && typeof p === 'string'));

    let targetPath = '';
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        targetPath = p;
        break;
      }
    }

    if (!targetPath) {
      return NextResponse.json(
        { success: false, error: 'No Excel contact dataset found.' },
        { status: 404 }
      );
    }

    const fileBuffer = fs.readFileSync(targetPath);
    const parsed = parseExcelBuffer(fileBuffer);
    const filename = path.basename(targetPath);

    return NextResponse.json({
      success: true,
      filename,
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
