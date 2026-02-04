# NCT VIP Portal - Deployment Guide

## 🚀 Quick Start (Local Development)

### Step 1: Install Dependencies
```bash
cd nct-portal
npm install
```

### Step 2: Create Environment File
Create `.env.local` file (copy from `.env.local` already in project):
```env
NOTION_TOKEN=your_notion_token_here
NOTION_VIP_PROFILES_DB=2bff0e92-5001-806e-88b3-f84cc4719712
NOTION_CUSTOMERS_DB=16cf0e925001809080f0ed55ac407c96
NOTION_ACCOUNTING_DB=198f0e92-5001-80a1-b04f-f625e8505d0f
JWT_SECRET=your-super-secret-key-change-in-production
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Step 3: Run Development Server
```bash
npm run dev
```

### Step 4: Open Browser
- Go to: http://localhost:3000
- You'll be redirected to `/login`
- Test with QR: http://localhost:3000/login?profile=NCTV-10

---

## 🌐 Deploy to Vercel (Recommended - FREE)

### Option A: One-Click Deploy

1. Push code to GitHub:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/nct-vip-portal.git
git push -u origin main
```

2. Go to [vercel.com](https://vercel.com) and sign in with GitHub

3. Click "New Project" → Import your repository

4. Add Environment Variables in Vercel:
   - NOTION_TOKEN
   - NOTION_VIP_PROFILES_DB
   - NOTION_CUSTOMERS_DB
   - NOTION_ACCOUNTING_DB
   - JWT_SECRET (use a strong random string!)
   - NEXT_PUBLIC_APP_URL (your Vercel URL)

5. Click "Deploy"

### Option B: Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy (follow prompts)
vercel

# For production
vercel --prod
```

---

## 🔧 Deploy to Other Platforms

### Railway
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```
Add environment variables in Railway dashboard.

### Render
1. Create a new Web Service
2. Connect GitHub repo
3. Build Command: `npm run build`
4. Start Command: `npm start`
5. Add environment variables

### Netlify
```bash
# Build
npm run build

# Netlify needs next.js adapter
npm install @netlify/plugin-nextjs
```

---

## 📁 Project Structure

```
nct-portal/
├── app/
│   ├── api/
│   │   ├── auth/verify/route.js    # Login API
│   │   ├── customer/
│   │   │   ├── profile/route.js    # Profile API
│   │   │   └── stats/route.js      # Stats API
│   │   └── projects/route.js       # Projects API
│   ├── dashboard/page.jsx          # Dashboard page
│   ├── login/page.jsx              # Login page
│   ├── settings/page.jsx           # Settings page
│   ├── page.jsx                    # Home (redirects)
│   ├── layout.jsx                  # Root layout
│   └── globals.css                 # Global styles
├── components/
│   ├── dashboard.jsx               # Dashboard component
│   └── login-page.jsx              # Login component
├── lib/
│   ├── notion.js                   # Notion API client
│   └── auth.js                     # JWT utilities
├── .env.local                      # Environment variables
├── package.json
├── tailwind.config.js
└── next.config.js
```

---

## 🔑 After Deployment

### 1. Update QR Codes
Your new portal URL will be something like:
- Vercel: `https://nct-vip-portal.vercel.app`
- Custom: `https://portal.nct-iq.com`

Update QR codes to point to:
```
https://YOUR-DOMAIN/login?profile=NCTV-XX
```

### 2. Test Login Flow
1. Open: `https://YOUR-DOMAIN/login?profile=NCTV-10`
2. Enter password from Notion
3. Should redirect to dashboard

### 3. Custom Domain (Optional)
In Vercel:
1. Go to Project Settings → Domains
2. Add `portal.nct-iq.com`
3. Update DNS records at your registrar

---

## 🐛 Troubleshooting

### "API Error" on Login
- Check NOTION_TOKEN is valid
- Verify database IDs are correct
- Check Notion integration has access to databases

### "Unauthorized" Errors
- JWT_SECRET must be same across all API routes
- Token might be expired (24h default)
- Clear localStorage and re-login

### Styles Not Loading
- Run `npm run build` to check for errors
- Verify Tailwind config is correct

### Notion Connection Issues
- Test with: `npm run test:notion` (if configured)
- Check network connectivity
- Verify Notion API token permissions

---

## 📞 Support

- WhatsApp: +964 773 550 0707
- Website: https://nct-iq.com
