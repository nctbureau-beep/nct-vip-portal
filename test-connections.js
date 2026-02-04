/**
 * NCT Backend - Connection Test Script
 * Run with: node test-connections.js
 */

require('dotenv').config();

async function testNotion() {
  console.log('\n📝 Testing Notion API...');
  try {
    const { Client } = require('@notionhq/client');
    const notion = new Client({ auth: process.env.NOTION_API_KEY });
    
    const response = await notion.databases.retrieve({
      database_id: process.env.NOTION_CUSTOMER_DATABASE_ID
    });
    
    console.log('✅ Notion connected!');
    console.log(`   Database: ${response.title[0]?.plain_text || 'Customer Database'}`);
    return true;
  } catch (error) {
    console.log('❌ Notion failed:', error.message);
    return false;
  }
}

async function testGoogleDrive() {
  console.log('\n📁 Testing Google Drive API...');
  try {
    const { google } = require('googleapis');
    
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
    
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive']
    });
    
    const drive = google.drive({ version: 'v3', auth });
    
    const response = await drive.files.list({
      pageSize: 5,
      q: `'${process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID}' in parents`,
      fields: 'files(id, name)'
    });
    
    console.log('✅ Google Drive connected!');
    console.log(`   Files in folder: ${response.data.files?.length || 0}`);
    return true;
  } catch (error) {
    console.log('❌ Google Drive failed:', error.message);
    return false;
  }
}

async function testGemini() {
  console.log('\n🤖 Testing Gemini AI...');
  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const result = await model.generateContent('Say "Hello NCT!" in Arabic');
    const response = result.response.text();
    
    console.log('✅ Gemini AI connected!');
    console.log(`   Response: ${response.substring(0, 50)}...`);
    return true;
  } catch (error) {
    console.log('❌ Gemini failed:', error.message);
    return false;
  }
}

async function testFirebase() {
  console.log('\n🔥 Testing Firebase Admin...');
  try {
    const admin = require('firebase-admin');
    
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL
        })
      });
    }
    
    // Just verify the app initialized correctly
    const app = admin.app();
    console.log('✅ Firebase Admin connected!');
    console.log(`   Project: ${app.options.projectId}`);
    return true;
  } catch (error) {
    console.log('❌ Firebase failed:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║   NCT Backend - Connection Tests       ║');
  console.log('╚════════════════════════════════════════╝');
  
  const results = {
    notion: await testNotion(),
    drive: await testGoogleDrive(),
    gemini: await testGemini(),
    firebase: await testFirebase()
  };
  
  console.log('\n════════════════════════════════════════');
  console.log('Summary:');
  console.log(`  Notion:   ${results.notion ? '✅ OK' : '❌ FAIL'}`);
  console.log(`  Drive:    ${results.drive ? '✅ OK' : '❌ FAIL'}`);
  console.log(`  Gemini:   ${results.gemini ? '✅ OK' : '❌ FAIL'}`);
  console.log(`  Firebase: ${results.firebase ? '✅ OK' : '❌ FAIL'}`);
  console.log('════════════════════════════════════════\n');
  
  const allPassed = Object.values(results).every(r => r);
  if (allPassed) {
    console.log('🎉 All connections successful! Ready to deploy.');
  } else {
    console.log('⚠️  Some connections failed. Check the errors above.');
  }
  
  process.exit(allPassed ? 0 : 1);
}

runTests();
