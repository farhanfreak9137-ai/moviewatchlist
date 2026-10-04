import { NextRequest, NextResponse } from 'next/server';
import { serverSyncStore } from '@/lib/sync/serverStore';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const since = searchParams.get('since');
    const deviceId = searchParams.get('deviceId');

    const result = serverSyncStore.pullChanges(since, deviceId);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Sync pull error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to pull changes' },
      { status: 500 }
    );
  }
}
