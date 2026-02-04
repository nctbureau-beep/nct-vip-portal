import { verifyLogin } from '@/lib/notion';
import { createToken } from '@/lib/auth';

export async function POST(request) {
  try {
    const { profileId, password } = await request.json();

    if (!profileId || !password) {
      return Response.json({ success: false, error: 'يرجى إدخال جميع البيانات' }, { status: 400 });
    }

    const result = await verifyLogin(profileId.toUpperCase(), password);

    if (!result.success) {
      const errors = {
        NOT_FOUND: 'الحساب غير موجود',
        WRONG_PASSWORD: 'كلمة المرور غير صحيحة',
      };
      return Response.json({ success: false, error: errors[result.error] || 'خطأ' }, { status: 401 });
    }

    const token = await createToken({
      profileId: result.profile.profileId,
      notionId: result.profile.id,
      name: result.profile.name,
    });

    return Response.json({ success: true, token, profile: result.profile });
  } catch (error) {
    console.error('Login error:', error);
    return Response.json({ success: false, error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}
