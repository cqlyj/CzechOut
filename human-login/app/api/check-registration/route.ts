import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    isRegistered: true,
    timestamp: new Date().toISOString()
  });
}

export async function POST() {
  return NextResponse.json({ 
    success: true,
    timestamp: new Date().toISOString()
  });
}
