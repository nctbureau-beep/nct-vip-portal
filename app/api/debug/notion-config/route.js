export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const vars = {
      NOTION_TOKEN: !!process.env.NOTION_TOKEN,
      NOTION_VIP_PROFILES_DB: !!process.env.NOTION_VIP_PROFILES_DB,
      NOTION_CUSTOMERS_DB: !!process.env.NOTION_CUSTOMERS_DB,
      JWT_SECRET: !!process.env.JWT_SECRET || !!process.env.JWT_SECRET,
    };

    const masked = {};
    for (const k of Object.keys(vars)) {
      const v = process.env[k];
      masked[k] = v ? `${v.toString().slice(0, 4)}...${v.toString().slice(-4)}` : null;
    }

    return Response.json({ success: true, present: vars, masked }, { status: 200 });
  } catch (e) {
    console.error('Debug route error:', e);
    return Response.json({ success: false, error: 'Debug route failed' }, { status: 500 });
  }
}
