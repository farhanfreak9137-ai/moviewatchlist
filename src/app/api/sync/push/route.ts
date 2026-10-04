import { NextRequest, NextResponse } from 'next/server';
import { serverSyncStore } from '@/lib/sync/serverStore';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { deviceId, changes } = body;

    if (!deviceId || !Array.isArray(changes)) {
      return NextResponse.json(
        { error: 'Invalid payload: deviceId and changes array required' },
        { status: 400 }
      );
    }

    const result = serverSyncStore.pushChanges(
      changes.map((c) => ({
        id: c.id,
        entityType: c.entity_type,
        entityId: c.entity_id,
        action: c.action,
        payload: c.payload,
        deviceId,
        timestamp: c.timestamp,
      }))
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Sync push error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to push changes' },
      { status: 500 }
    );
  }
}
