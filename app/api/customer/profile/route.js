import { getVIPProfileById } from '@/lib/notion';
import { authenticate } from '@/lib/auth';

export async function GET(request) {
  try {
    const user = await authenticate(request);
    if (!user) {
      return Response.json({ success: false, error: 'غير مصرح' }, { status: 401 });
    }

    const profile = await getVIPProfileById(user.notionId);
    return Response.json({ success: true, profile });
  } catch (error) {
    console.error('Profile error:', error);
    return Response.json({ success: false, error: 'خطأ' }, { status: 500 });
  }
}
