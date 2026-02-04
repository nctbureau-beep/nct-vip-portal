import { getVIPProfile } from '@/lib/notion';

export const dynamic = 'force-dynamic';

// Secure debug endpoint: requires header `x-debug-key` matching env `DEBUG_KEY`.
// Intended for temporary debugging only.
export async function GET(request) {
  try {
    const debugKey = process.env.DEBUG_KEY;
    const providedHeader = request.headers.get('x-debug-key');
    const url = new URL(request.url);
    // Allow a one-time convenience `key` query param if header isn't available.
    // This is less secure — remove after debugging.
    const providedQuery = url.searchParams.get('key');
    const provided = providedHeader || providedQuery;
    if (!debugKey || provided !== debugKey) {
      return Response.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const profileId = url.searchParams.get('profile');
    if (!profileId) return Response.json({ success: false, error: 'profile query required' }, { status: 400 });

    const profile = await getVIPProfile(profileId.toUpperCase());
    if (!profile) return Response.json({ success: false, error: 'NOT_FOUND' }, { status: 404 });

    // Mask sensitive fields
    const masked = {
      id: profile.id,
      profileId: profile.profileId,
      name: profile.name,
      phone: profile.phone ? `${profile.phone.slice(0, 3)}...${profile.phone.slice(-2)}` : null,
      email: profile.email ? `***@${profile.email.split('@').pop()}` : null,
      driveFolder: profile.driveFolder ? profile.driveFolder.replace(/(https?:\/\/[^\/]+).*/, '$1') : null,
      createdAt: profile.createdAt,
    };

    return Response.json({ success: true, profile: masked }, { status: 200 });
  } catch (e) {
    console.error('notion-profile debug error:', e);
    return Response.json({ success: false, error: 'debug failed', details: e.message }, { status: 500 });
  }
}
