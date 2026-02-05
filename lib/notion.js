// NCT VIP Portal - Notion API Integration
import { Client } from '@notionhq/client';

const NOTION_TOKEN = process.env.NOTION_TOKEN || process.env.NOTION_API_KEY;
const NOTION_VIP_PROFILES_DB = process.env.NOTION_VIP_PROFILES_DB || process.env.NOTION_VIP_DATABASE_ID;
const NOTION_CUSTOMERS_DB = process.env.NOTION_CUSTOMERS_DB || process.env.NOTION_CUSTOMER_DATABASE_ID;

const notion = new Client({ auth: NOTION_TOKEN });

const DATABASES = {
  VIP_PROFILES: NOTION_VIP_PROFILES_DB,
  CUSTOMERS: NOTION_CUSTOMERS_DB,
};

function ensureNotionConfig() {
  const missing = [];
  if (!NOTION_TOKEN) missing.push('NOTION_TOKEN / NOTION_API_KEY');
  if (!NOTION_VIP_PROFILES_DB) missing.push('NOTION_VIP_PROFILES_DB / NOTION_VIP_DATABASE_ID');
  if (!NOTION_CUSTOMERS_DB) missing.push('NOTION_CUSTOMERS_DB / NOTION_CUSTOMER_DATABASE_ID');
  if (missing.length) {
    const err = new Error(`Missing Notion config: ${missing.join(', ')}`);
    err.code = 'NOTION_CONFIG_MISSING';
    throw err;
  }
}

// Property extractors
const extract = {
  title: (p) => p?.title?.[0]?.plain_text || '',
  rich_text: (p) => p?.rich_text?.[0]?.plain_text || '',
  number: (p) => p?.number ?? 0,
  select: (p) => p?.select?.name || '',
  url: (p) => p?.url || '',
  email: (p) => p?.email || '',
  phone: (p) => p?.phone_number || '',
  relation: (p) => p?.relation?.map(r => r.id) || [],
  formula: (p) => p?.formula?.string ?? p?.formula?.number ?? null,
  // unique_id returns {prefix: "NCTV", number: 10} -> "NCTV-10"
  unique_id: (p) => {
    if (!p?.unique_id) return '';
    const { prefix, number } = p.unique_id;
    return prefix ? `${prefix}-${number}` : String(number);
  },
};

// VIP Profile property names (EXACT match from Notion!)
const VIP = {
  NAME: 'Name',
  PROFILE_ID: 'Profile ID',  // type: unique_id with prefix "NCTV"
  PASSWORD: 'Password ',     // NOTE: trailing space!
  PHONE: 'Phone',
  EMAIL: 'Email',
  DRIVE_FOLDER: 'Drive Folder',
};

// Customer property names (EXACT - with emojis and spaces!)
const CUST = {
  DOC_NAME: 'Document Name',
  CUSTOMER_ID: 'Customer ID',
  LANGUAGE: 'Language 🚩',
  PAGES: 'Total Pages',
  WORDS: 'Total Words',
  STATUS: 'Status',
  PAYMENT: 'Payment Status 💰',
  TOTAL: 'Total',
  FOLDER: 'Customer Folder ',
  PDF_FOLDER: 'Ticket PDF Folder',
  VIP_PROFILE: 'Customer Profile ',
};

// Get VIP profile by Profile ID (e.g., "NCTV-10")
// Profile ID is a unique_id type with prefix "NCTV", so we need to extract the number
export async function getVIPProfile(profileId) {
  ensureNotionConfig();

  // Parse the profile ID - extract number from "NCTV-10" -> 10
  const match = profileId.match(/^NCTV-?(\d+)$/i);
  const profileNumber = match ? parseInt(match[1], 10) : null;

  try {
    // For unique_id type, we need to filter by the number
    const res = await notion.databases.query({
      database_id: DATABASES.VIP_PROFILES,
      filter: {
        property: VIP.PROFILE_ID,
        unique_id: { equals: profileNumber }
      },
      page_size: 1,
    });

    if (res.results?.length) {
      const p = res.results[0].properties;
      return {
        id: res.results[0].id,
        profileId: extract.unique_id(p[VIP.PROFILE_ID]),
        name: extract.title(p[VIP.NAME]),
        password: extract.rich_text(p[VIP.PASSWORD]),
        phone: extract.phone(p[VIP.PHONE]),
        email: extract.email(p[VIP.EMAIL]),
        driveFolder: extract.url(p[VIP.DRIVE_FOLDER]),
        createdAt: res.results[0].created_time,
      };
    }
    return null;
  } catch (e) {
    console.error('getVIPProfile error:', e);
    throw e;
  }
}

// Get VIP profile by Notion page ID
export async function getVIPProfileById(pageId) {
  ensureNotionConfig();
  try {
    const page = await notion.pages.retrieve({ page_id: pageId });
    const p = page.properties;
    return {
      id: page.id,
      profileId: extract.unique_id(p[VIP.PROFILE_ID]),
      name: extract.title(p[VIP.NAME]),
      phone: extract.phone(p[VIP.PHONE]),
      email: extract.email(p[VIP.EMAIL]),
      driveFolder: extract.url(p[VIP.DRIVE_FOLDER]),
      createdAt: page.created_time,
    };
  } catch (e) {
    console.error('getVIPProfileById error:', e);
    throw e;
  }
}

// Verify login
export async function verifyLogin(profileId, password) {
  const profile = await getVIPProfile(profileId);
  if (!profile) return { success: false, error: 'NOT_FOUND' };
  if (profile.password.toUpperCase() !== password.toUpperCase()) {
    return { success: false, error: 'WRONG_PASSWORD' };
  }
  const { password: _, ...safe } = profile;
  return { success: true, profile: safe };
}

// Get all projects for a VIP profile
export async function getProjects(vipPageId, options = {}) {
  ensureNotionConfig();
  const { status, sortBy = 'date_desc' } = options;
  
  try {
    let filter = { property: CUST.VIP_PROFILE, relation: { contains: vipPageId } };
    
    if (status === 'active') {
      filter = { and: [filter, { property: CUST.STATUS, select: { does_not_equal: 'Done' } }] };
    } else if (status === 'completed') {
      filter = { and: [filter, { property: CUST.STATUS, select: { equals: 'Done' } }] };
    }

    const sorts = [];
    if (sortBy === 'date_desc') sorts.push({ timestamp: 'created_time', direction: 'descending' });
    else if (sortBy === 'date_asc') sorts.push({ timestamp: 'created_time', direction: 'ascending' });
    else if (sortBy === 'amount_desc') sorts.push({ property: CUST.TOTAL, direction: 'descending' });
    else if (sortBy === 'amount_asc') sorts.push({ property: CUST.TOTAL, direction: 'ascending' });

    const res = await notion.databases.query({
      database_id: DATABASES.CUSTOMERS,
      filter,
      sorts,
      page_size: 100,
    });

    return res.results.map(page => {
      const p = page.properties;
      return {
        id: page.id,
        customerId: extract.formula(p[CUST.CUSTOMER_ID]) || extract.rich_text(p[CUST.CUSTOMER_ID]),
        documentName: extract.title(p[CUST.DOC_NAME]),
        language: extract.select(p[CUST.LANGUAGE]),
        pages: extract.number(p[CUST.PAGES]),
        words: extract.number(p[CUST.WORDS]),
        status: extract.select(p[CUST.STATUS]),
        paymentStatus: extract.select(p[CUST.PAYMENT]),
        total: extract.number(p[CUST.TOTAL]),
        folder: extract.url(p[CUST.FOLDER]),
        pdfFolder: extract.url(p[CUST.PDF_FOLDER]),
        createdAt: page.created_time,
      };
    });
  } catch (e) {
    console.error('getProjects error:', e);
    throw e;
  }
}

// Get statistics
export async function getStats(vipPageId) {
  ensureNotionConfig();
  const projects = await getProjects(vipPageId);
  return projects.reduce((s, p) => ({
    totalPages: s.totalPages + (p.pages || 0),
    totalWords: s.totalWords + (p.words || 0),
    totalSpent: s.totalSpent + (p.total || 0),
    activeProjects: s.activeProjects + (p.status !== 'Done' ? 1 : 0),
    completedProjects: s.completedProjects + (p.status === 'Done' ? 1 : 0),
  }), { totalPages: 0, totalWords: 0, totalSpent: 0, activeProjects: 0, completedProjects: 0 });
}
