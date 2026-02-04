import { getProjects } from '@/lib/notion';
import { authenticate } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const user = await authenticate(request);
    if (!user) {
      return Response.json({ success: false, error: 'غير مصرح' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const sortBy = searchParams.get('sort') || 'date_desc';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';

    let projects = await getProjects(user.notionId, { 
      status: status === 'all' ? null : status, 
      sortBy 
    });

    // Search filter
    if (search) {
      const q = search.toLowerCase();
      projects = projects.filter(p => 
        p.documentName?.toLowerCase().includes(q) || 
        p.customerId?.toLowerCase().includes(q)
      );
    }

    // Pagination
    const total = projects.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const paginated = projects.slice(start, start + limit);

    return Response.json({
      success: true,
      projects: paginated,
      pagination: { page, limit, total, totalPages, hasMore: page < totalPages },
    });
  } catch (error) {
    console.error('Projects error:', error);
    return Response.json({ success: false, error: 'خطأ' }, { status: 500 });
  }
}
