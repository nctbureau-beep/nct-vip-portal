import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_TOKEN });

export const dynamic = 'force-dynamic';

function mask(v) {
  if (v == null) return null;
  const s = String(v);
  if (s.length <= 6) return '***';
  return `${s.slice(0,3)}...${s.slice(-3)}`;
}

export async function GET(request) {
  try {
    const debugKey = process.env.DEBUG_KEY;
    const providedHeader = request.headers.get('x-debug-key');
    const url = new URL(request.url);
    const providedQuery = url.searchParams.get('key');
    const provided = providedHeader || providedQuery;
    if (!debugKey || provided !== debugKey) {
      return Response.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const dbId = process.env.NOTION_VIP_PROFILES_DB;
    if (!dbId) return Response.json({ success: false, error: 'No DB configured' }, { status: 500 });

    const db = await notion.databases.retrieve({ database_id: dbId });
    const schema = db.properties || {};

    const res = await notion.databases.query({ database_id: dbId, page_size: 20 });
    const rows = res.results.map(page => {
      const props = {};
      for (const key of Object.keys(page.properties || {})) {
        const p = page.properties[key];
        const type = p.type;
        let val = null;
        try {
          if (type === 'title') val = p.title?.[0]?.plain_text || '';
          else if (type === 'rich_text') val = p.rich_text?.[0]?.plain_text || '';
          else if (type === 'number') val = p.number ?? '';
          else if (type === 'select') val = p.select?.name || '';
          else if (type === 'formula') val = p.formula?.string ?? p.formula?.number ?? '';
          else if (type === 'email') val = p.email || '';
          else if (type === 'phone_number') val = p.phone_number || '';
          else if (type === 'url') val = p.url || '';
          else val = JSON.stringify(p).slice(0, 40);
        } catch (e) {
          val = '';
        }
        props[key] = { type, value: mask(val) };
      }
      return { id: page.id, created: page.created_time, props };
    });

    // Also return schema keys and types
    const schemaInfo = {};
    for (const k of Object.keys(schema)) schemaInfo[k] = schema[k].type;

    return Response.json({ success: true, schema: schemaInfo, rows }, { status: 200 });
  } catch (e) {
    console.error('notion-list debug error:', e);
    return Response.json({ success: false, error: 'debug failed', details: e.message }, { status: 500 });
  }
}
