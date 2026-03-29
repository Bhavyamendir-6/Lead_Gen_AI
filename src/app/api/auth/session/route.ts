// Professional Lead Gen Platform - Enterprise Module
// Session Encryption & Validation API

import { NextResponse } from 'next/server';
import { encryptCookie } from '@/lib/encryption';

export async function POST(req: Request) {
  try {
    const { li_at, JSESSIONID } = await req.json();

    if (!li_at || !JSESSIONID) {
      return NextResponse.json({ error: 'Missing session identifiers' }, { status: 400 });
    }

    // Encrypt the raw cookies before they are saved to the client state
    const secureLiAt = encryptCookie(li_at);
    const secureJSessionId = encryptCookie(JSESSIONID);

    return NextResponse.json({
      li_at: secureLiAt,
      JSESSIONID: secureJSessionId,
      status: 'Active',
      lastValidated: new Date()
    });
  } catch (error) {
    console.error('Session Encryption Error:', error);
    return NextResponse.json({ error: 'Failed to secure session' }, { status: 500 });
  }
}