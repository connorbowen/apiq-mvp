#!/usr/bin/env node

/**
 * Comprehensive script to seed the API catalog with real providers and APIs
 * This replaces the old seed-catalog.js and seed-providers.js scripts
 * Run with: node scripts/seed-comprehensive-catalog.js
 */

const { PrismaClient } = require('../src/generated/prisma');

const prisma = new PrismaClient();

// -------------------------------
// 1) Providers (unchanged)
// -------------------------------
const apiProviders = [
  {
    id: "google-workspace",
    name: "Google Workspace",
    description: "A collection of cloud productivity and collaboration tools by Google (Gmail, Drive, Docs, etc.).",
    logoUrl: "https://logo.clearbit.com/google.com",
    websiteUrl: "https://workspace.google.com/",
    category: "Business",
    isVerified: true,
    isActive: true,
    sortOrder: 1
  },
  {
    id: "microsoft-365",
    name: "Microsoft 365",
    description: "Microsoft's cloud productivity suite (Office apps, OneDrive, Teams, etc.) accessible via Microsoft Graph API.",
    logoUrl: "https://logo.clearbit.com/microsoft.com",
    websiteUrl: "https://www.microsoft.com/microsoft-365",
    category: "Business",
    isVerified: true,
    isActive: true,
    sortOrder: 2
  },
  {
    id: "aws",
    name: "Amazon Web Services",
    description: "Amazon's comprehensive cloud computing platform offering a wide range of services (compute, storage, databases, etc.).",
    logoUrl: "https://logo.clearbit.com/amazon.com",
    websiteUrl: "https://aws.amazon.com/",
    category: "Development",
    isVerified: true,
    isActive: true,
    sortOrder: 3
  },
  {
    id: "stripe",
    name: "Stripe",
    description: "Online payment processing platform for internet businesses, offering payments, billing, and financial services.",
    logoUrl: "https://logo.clearbit.com/stripe.com",
    websiteUrl: "https://stripe.com/",
    category: "Business",
    isVerified: true,
    isActive: true,
    sortOrder: 4
  },
  {
    id: "salesforce",
    name: "Salesforce",
    description: "Customer Relationship Management (CRM) platform providing sales, service, and marketing cloud solutions.",
    logoUrl: "https://logo.clearbit.com/salesforce.com",
    websiteUrl: "https://www.salesforce.com/",
    category: "Business",
    isVerified: true,
    isActive: true,
    sortOrder: 5
  }
];

// ---------------------------------------------------
// 2) APIs (updated to your ApiCatalog requirements)
// ---------------------------------------------------
const apis = [
  // -------- Google Workspace (provider APIs) --------
  {
    name: "Gmail API",
    description: "Access and manage a user's Gmail mailboxes, including reading emails and sending messages.",
    baseUrl: "https://gmail.googleapis.com",
    documentationUrl: "https://developers.google.com/gmail/api",
    category: "Communication",
    tags: ["email", "google", "gmail", "workspace"],
    authTypes: ["OAUTH2"],
    providerId: "google-workspace",
    status: "ACTIVE",
    isVerified: true,
    popularity: 0,
    endpointCount: 0,
    specVersion: "3.0",
    rawSpec: null,
    specHash: null,
    lastUpdated: null
  },
  {
    name: "Google Sheets API",
    description: "Read, write, and format data in Google Sheets spreadsheets programmatically.",
    baseUrl: "https://sheets.googleapis.com",
    documentationUrl: "https://developers.google.com/sheets/api",
    category: "Business",
    tags: ["spreadsheets", "google", "sheets", "workspace"],
    authTypes: ["API_KEY", "OAUTH2"],
    providerId: "google-workspace",
    status: "ACTIVE",
    isVerified: true,
    popularity: 0,
    endpointCount: 0,
    specVersion: "3.0",
    rawSpec: null,
    specHash: null,
    lastUpdated: null
  },
  {
    name: "Google Calendar API",
    description: "Integrate with Google Calendar to manage calendars and events (create, update, view events).",
    baseUrl: "https://www.googleapis.com/calendar/v3",
    documentationUrl: "https://developers.google.com/calendar/api",
    category: "Business",
    tags: ["calendar", "events", "google", "workspace"],
    authTypes: ["OAUTH2"],
    providerId: "google-workspace",
    status: "ACTIVE",
    isVerified: true,
    popularity: 0,
    endpointCount: 0,
    specVersion: "3.0",
    rawSpec: null,
    specHash: null,
    lastUpdated: null
  },
  {
    name: "Google Drive API",
    description: "Manage files and folders in Google Drive, including uploading, downloading, and sharing files.",
    baseUrl: "https://drive.googleapis.com",
    documentationUrl: "https://developers.google.com/drive/api",
    category: "Business",
    tags: ["cloud storage", "files", "google", "drive", "workspace"],
    authTypes: ["OAUTH2"],
    providerId: "google-workspace",
    status: "ACTIVE",
    isVerified: true,
    popularity: 0,
    endpointCount: 0,
    specVersion: "3.0",
    rawSpec: null,
    specHash: null,
    lastUpdated: null
  },
  {
    name: "Google Docs API",
    description: "Read and write Google Docs documents, allowing automation of document creation and editing.",
    baseUrl: "https://docs.googleapis.com",
    documentationUrl: "https://developers.google.com/docs/api",
    category: "Business",
    tags: ["documents", "google", "docs", "workspace"],
    authTypes: ["OAUTH2"],
    providerId: "google-workspace",
    status: "ACTIVE",
    isVerified: true,
    popularity: 0,
    endpointCount: 0,
    specVersion: "3.0",
    rawSpec: null,
    specHash: null,
    lastUpdated: null
  },

  // -------- Microsoft 365 (provider API) --------
  {
    name: "Microsoft Graph API",
    description: "Unified REST API for Microsoft 365 that provides access to users, mail, files, calendars, Teams, and more.",
    baseUrl: "https://graph.microsoft.com/v1.0",
    documentationUrl: "https://learn.microsoft.com/en-us/graph/overview",
    category: "Business",
    tags: ["microsoft", "graph", "office365", "microsoft365"],
    authTypes: ["OAUTH2"],
    providerId: "microsoft-365",
    status: "ACTIVE",
    isVerified: true,
    popularity: 0,
    endpointCount: 0,
    specVersion: "3.0",
    rawSpec: null,
    specHash: null,
    lastUpdated: null
  },

  // -------- AWS (provider APIs) --------
  {
    name: "Amazon S3 API",
    description: "Store and retrieve objects in Amazon S3 via REST.",
    baseUrl: "https://s3.amazonaws.com",
    documentationUrl: "https://docs.aws.amazon.com/AmazonS3/latest/API/Welcome.html",
    category: "Development",
    tags: ["cloud storage", "aws", "s3", "amazon"],
    authTypes: ["API_KEY"],
    providerId: "aws",
    status: "ACTIVE",
    isVerified: true,
    popularity: 0,
    endpointCount: 0,
    specVersion: null,
    rawSpec: null,
    specHash: null,
    lastUpdated: null
  },
  {
    name: "AWS Lambda API",
    description: "Manage AWS Lambda functions (deploy, invoke, update, delete) programmatically.",
    baseUrl: "https://lambda.amazonaws.com",
    documentationUrl: "https://docs.aws.amazon.com/lambda/latest/api/welcome.html",
    category: "Development",
    tags: ["serverless", "aws", "lambda"],
    authTypes: ["API_KEY"],
    providerId: "aws",
    status: "ACTIVE",
    isVerified: true,
    popularity: 0,
    endpointCount: 0,
    specVersion: null,
    rawSpec: null,
    specHash: null,
    lastUpdated: null
  },
  {
    name: "AWS EC2 API",
    description: "Provision and control Amazon EC2 instances and related compute resources.",
    baseUrl: "https://ec2.amazonaws.com",
    documentationUrl: "https://docs.aws.amazon.com/AWSEC2/latest/APIReference/Welcome.html",
    category: "Development",
    tags: ["cloud compute", "aws", "ec2", "infrastructure"],
    authTypes: ["API_KEY"],
    providerId: "aws",
    status: "ACTIVE",
    isVerified: true,
    popularity: 0,
    endpointCount: 0,
    specVersion: null,
    rawSpec: null,
    specHash: null,
    lastUpdated: null
  },
  {
    name: "AWS CloudFormation API",
    description: "Automate provisioning of AWS resources using CloudFormation stacks.",
    baseUrl: "https://cloudformation.us-east-1.amazonaws.com",
    documentationUrl: "https://docs.aws.amazon.com/AWSCloudFormation/latest/APIReference/Welcome.html",
    category: "Development",
    tags: ["infrastructure as code", "aws", "cloudformation"],
    authTypes: ["API_KEY"],
    providerId: "aws",
    status: "ACTIVE",
    isVerified: true,
    popularity: 0,
    endpointCount: 0,
    specVersion: null,
    rawSpec: null,
    specHash: null,
    lastUpdated: null
  },

  // -------- Stripe (provider APIs) --------
  {
    name: "Stripe API",
    description: "Accept and manage online payments, charges, refunds, and payment methods.",
    baseUrl: "https://api.stripe.com/v1",
    documentationUrl: "https://stripe.com/docs/api",
    category: "Business",
    tags: ["payments", "stripe", "transactions"],
    authTypes: ["API_KEY"],
    providerId: "stripe",
    status: "ACTIVE",
    isVerified: true,
    popularity: 0,
    endpointCount: 0,
    specVersion: "3.0",
    rawSpec: null,
    specHash: null,
    lastUpdated: null
  },
  {
    name: "Stripe Connect API",
    description: "Manage connected accounts, transfers, and payouts for marketplaces.",
    baseUrl: "https://api.stripe.com/v1",
    documentationUrl: "https://stripe.com/docs/connect",
    category: "Business",
    tags: ["marketplace", "stripe", "connect", "payments"],
    authTypes: ["API_KEY"],
    providerId: "stripe",
    status: "ACTIVE",
    isVerified: true,
    popularity: 0,
    endpointCount: 0,
    specVersion: "3.0",
    rawSpec: null,
    specHash: null,
    lastUpdated: null
  },
  {
    name: "Stripe Billing API",
    description: "Manage subscriptions, invoices, and recurring billing.",
    baseUrl: "https://api.stripe.com/v1",
    documentationUrl: "https://stripe.com/docs/billing",
    category: "Business",
    tags: ["subscriptions", "stripe", "billing", "payments"],
    authTypes: ["API_KEY"],
    providerId: "stripe",
    status: "ACTIVE",
    isVerified: true,
    popularity: 0,
    endpointCount: 0,
    specVersion: "3.0",
    rawSpec: null,
    specHash: null,
    lastUpdated: null
  },

  // -------- Salesforce (provider APIs) --------
  {
    name: "Salesforce REST API",
    description: "Access Salesforce CRM data (accounts, contacts, leads, etc.) via REST.",
    baseUrl: "https://login.salesforce.com/services/data/v60.0",
    documentationUrl: "https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/",
    category: "Business",
    tags: ["crm", "salesforce", "data"],
    authTypes: ["OAUTH2"],
    providerId: "salesforce",
    status: "ACTIVE",
    isVerified: true,
    popularity: 0,
    endpointCount: 0,
    specVersion: null,
    rawSpec: null,
    specHash: null,
    lastUpdated: null
  },
  {
    name: "Salesforce Marketing Cloud API",
    description: "Manage Marketing Cloud (ExactTarget) emails, campaigns, and contacts.",
    baseUrl: "https://YOUR_SUBDOMAIN.rest.marketingcloudapis.com",
    documentationUrl: "https://developer.salesforce.com/docs/atlas.en-us.mc-apis.meta/mc-apis/index-api.htm",
    category: "Business",
    tags: ["marketing", "salesforce", "email", "automation"],
    authTypes: ["OAUTH2"],
    providerId: "salesforce",
    status: "ACTIVE",
    isVerified: true,
    popularity: 0,
    endpointCount: 0,
    specVersion: null,
    rawSpec: null,
    specHash: null,
    lastUpdated: null
  },

  // -------- Standalone APIs --------
  {
    name: "Slack API",
    description: "Post messages, read channels, and automate workflows in Slack.",
    baseUrl: "https://slack.com/api",
    documentationUrl: "https://api.slack.com/",
    category: "Communication",
    tags: ["chat", "messaging", "slack", "collaboration"],
    authTypes: ["OAUTH2"],
    providerId: null,
    status: "ACTIVE",
    isVerified: true,
    popularity: 0,
    endpointCount: 0,
    specVersion: "3.0",
    rawSpec: null,
    specHash: null,
    lastUpdated: null
  },
  {
    name: "Twilio API",
    description: "Send and receive SMS, voice calls, and WhatsApp messages via Twilio.",
    baseUrl: "https://api.twilio.com/2010-04-01",
    documentationUrl: "https://www.twilio.com/docs/usage/api",
    category: "Communication",
    tags: ["sms", "voice", "twilio", "communication"],
    authTypes: ["BASIC_AUTH"],
    providerId: null,
    status: "ACTIVE",
    isVerified: true,
    popularity: 0,
    endpointCount: 0,
    specVersion: null,
    rawSpec: null,
    specHash: null,
    lastUpdated: null
  },
  {
    name: "GitHub API",
    description: "Manage repositories, issues, pull requests, and workflows.",
    baseUrl: "https://api.github.com",
    documentationUrl: "https://docs.github.com/en/rest",
    category: "Development",
    tags: ["version control", "git", "github", "developer"],
    authTypes: ["OAUTH2", "BEARER_TOKEN"],
    providerId: null,
    status: "ACTIVE",
    isVerified: true,
    popularity: 0,
    endpointCount: 0,
    specVersion: "3.0",
    rawSpec: null,
    specHash: null,
    lastUpdated: null
  },
  {
    name: "Shopify API",
    description: "Access products, orders, customers, and fulfillments for Shopify stores.",
    baseUrl: "https://{shop}.myshopify.com/admin/api/2024-10",
    documentationUrl: "https://shopify.dev/docs/api/admin-rest",
    category: "Business",
    tags: ["ecommerce", "shopify", "store", "commerce"],
    authTypes: ["API_KEY", "OAUTH2"],
    providerId: null,
    status: "ACTIVE",
    isVerified: true,
    popularity: 0,
    endpointCount: 0,
    specVersion: "3.0",
    rawSpec: null,
    specHash: null,
    lastUpdated: null
  },
  {
    name: "PayPal API",
    description: "Process payments and manage orders and subscriptions via PayPal.",
    baseUrl: "https://api-m.paypal.com",
    documentationUrl: "https://developer.paypal.com/docs/api/overview",
    category: "Business",
    tags: ["payments", "paypal", "transactions"],
    authTypes: ["OAUTH2"],
    providerId: null,
    status: "ACTIVE",
    isVerified: true,
    popularity: 0,
    endpointCount: 0,
    specVersion: null,
    rawSpec: null,
    specHash: null,
    lastUpdated: null
  },
  {
    name: "Twitter API",
    description: "Retrieve, search, and post Tweets and manage Twitter data.",
    baseUrl: "https://api.twitter.com/2",
    documentationUrl: "https://developer.twitter.com/en/docs/twitter-api",
    category: "Communication",
    tags: ["social media", "twitter", "tweets"],
    authTypes: ["OAUTH2"],
    providerId: null,
    status: "ACTIVE",
    isVerified: true,
    popularity: 0,
    endpointCount: 0,
    specVersion: null,
    rawSpec: null,
    specHash: null,
    lastUpdated: null
  },
  {
    name: "Facebook Graph API",
    description: "Access Facebook/Instagram graph data such as pages, posts, and ads.",
    baseUrl: "https://graph.facebook.com/v23.0",
    documentationUrl: "https://developers.facebook.com/docs/graph-api",
    category: "Business",
    tags: ["social media", "facebook", "graph", "data"],
    authTypes: ["OAUTH2"],
    providerId: null,
    status: "ACTIVE",
    isVerified: true,
    popularity: 0,
    endpointCount: 0,
    specVersion: null,
    rawSpec: null,
    specHash: null,
    lastUpdated: null
  },
  {
    name: "LinkedIn API",
    description: "Retrieve profile, company, and post data and perform sharing on LinkedIn.",
    baseUrl: "https://api.linkedin.com/v2",
    documentationUrl: "https://learn.microsoft.com/en-us/linkedin/",
    category: "Business",
    tags: ["professional network", "linkedin", "profiles"],
    authTypes: ["OAUTH2"],
    providerId: null,
    status: "ACTIVE",
    isVerified: true,
    popularity: 0,
    endpointCount: 0,
    specVersion: null,
    rawSpec: null,
    specHash: null,
    lastUpdated: null
  },
  {
    name: "OpenWeatherMap API",
    description: "Current weather, forecasts, and historical weather data.",
    baseUrl: "https://api.openweathermap.org/data/2.5",
    documentationUrl: "https://openweathermap.org/api",
    category: "Data & Analytics",
    tags: ["weather", "openweathermap", "forecast", "data"],
    authTypes: ["API_KEY"],
    providerId: null,
    status: "ACTIVE",
    isVerified: true,
    popularity: 0,
    endpointCount: 0,
    specVersion: "3.0",
    rawSpec: null,
    specHash: null,
    lastUpdated: null
  },
  {
    name: "Google Maps API",
    description: "Geocoding, directions, places, and maps services via HTTP.",
    baseUrl: "https://maps.googleapis.com/maps/api",
    documentationUrl: "https://developers.google.com/maps/documentation",
    category: "Data & Analytics",
    tags: ["maps", "geolocation", "google", "location"],
    authTypes: ["API_KEY"],
    providerId: null,
    status: "ACTIVE",
    isVerified: true,
    popularity: 0,
    endpointCount: 0,
    specVersion: "3.0",
    rawSpec: null,
    specHash: null,
    lastUpdated: null
  },
  {
    name: "YouTube Data API",
    description: "Access YouTube videos, channels, and playlists programmatically.",
    baseUrl: "https://www.googleapis.com/youtube/v3",
    documentationUrl: "https://developers.google.com/youtube/v3",
    category: "Data & Analytics",
    tags: ["video", "youtube", "media", "data"],
    authTypes: ["API_KEY", "OAUTH2"],
    providerId: null,
    status: "ACTIVE",
    isVerified: true,
    popularity: 0,
    endpointCount: 0,
    specVersion: "3.0",
    rawSpec: null,
    specHash: null,
    lastUpdated: null
  },
  {
    name: "OpenAI API",
    description: "Access OpenAI's models for chat, text generation, and embeddings.",
    baseUrl: "https://api.openai.com/v1",
    documentationUrl: "https://platform.openai.com/docs/api-reference",
    category: "AI & Machine Learning",
    tags: ["AI", "machine learning", "openai", "gpt"],
    authTypes: ["API_KEY"],
    providerId: null,
    status: "ACTIVE",
    isVerified: true,
    popularity: 0,
    endpointCount: 0,
    specVersion: "3.0",
    rawSpec: null,
    specHash: null,
    lastUpdated: null
  },
  {
    name: "SendGrid API",
    description: "Send transactional and marketing emails and manage templates.",
    baseUrl: "https://api.sendgrid.com/v3",
    documentationUrl: "https://docs.sendgrid.com/api-reference",
    category: "Communication",
    tags: ["email", "sendgrid", "delivery", "marketing"],
    authTypes: ["API_KEY"],
    providerId: null,
    status: "ACTIVE",
    isVerified: true,
    popularity: 0,
    endpointCount: 0,
    specVersion: "3.0",
    rawSpec: null,
    specHash: null,
    lastUpdated: null
  },
  {
    name: "HubSpot API",
    description: "Access HubSpot CRM and marketing data (contacts, deals, emails).",
    baseUrl: "https://api.hubapi.com",
    documentationUrl: "https://developers.hubspot.com/docs/api/overview",
    category: "Business",
    tags: ["crm", "hubspot", "marketing", "sales"],
    authTypes: ["API_KEY", "OAUTH2"],
    providerId: null,
    status: "ACTIVE",
    isVerified: true,
    popularity: 0,
    endpointCount: 0,
    specVersion: "3.0",
    rawSpec: null,
    specHash: null,
    lastUpdated: null
  },
  {
    name: "QuickBooks Online API",
    description: "Accounting data for invoices, payments, customers, and expenses.",
    baseUrl: "https://quickbooks.api.intuit.com/v3/company",
    documentationUrl: "https://developer.intuit.com/app/developer/qbo/docs/api/accounting",
    category: "Business",
    tags: ["accounting", "quickbooks", "finance", "invoicing"],
    authTypes: ["OAUTH2"],
    providerId: null,
    status: "ACTIVE",
    isVerified: true,
    popularity: 0,
    endpointCount: 0,
    specVersion: null,
    rawSpec: null,
    specHash: null,
    lastUpdated: null
  },
  {
    name: "Notion API",
    description: "Query and update Notion pages, databases, and blocks.",
    baseUrl: "https://api.notion.com",
    documentationUrl: "https://developers.notion.com/reference/intro",
    category: "Business",
    tags: ["notion", "docs", "databases", "notes"],
    authTypes: ["BEARER_TOKEN", "OAUTH2"],
    providerId: null,
    status: "ACTIVE",
    isVerified: true,
    popularity: 0,
    endpointCount: 0,
    specVersion: "3.0",
    rawSpec: null,
    specHash: null,
    lastUpdated: null
  },
  {
    name: "Airtable API",
    description: "Database-like spreadsheets API for bases and tables.",
    baseUrl: "https://api.airtable.com/v0",
    documentationUrl: "https://airtable.com/developers/web/api/introduction",
    category: "Business",
    tags: ["spreadsheets", "database", "low-code"],
    authTypes: ["BEARER_TOKEN"],
    providerId: null,
    status: "ACTIVE",
    isVerified: true,
    popularity: 0,
    endpointCount: 0,
    specVersion: "3.0",
    rawSpec: null,
    specHash: null,
    lastUpdated: null
  },
  {
    name: "Zoom API",
    description: "Meetings, webinars, users, and reports.",
    baseUrl: "https://api.zoom.us/v2",
    documentationUrl: "https://developers.zoom.us/docs/api/",
    category: "Communication",
    tags: ["video", "meetings", "webinars"],
    authTypes: ["OAUTH2", "BEARER_TOKEN"],
    providerId: null,
    status: "ACTIVE",
    isVerified: true,
    popularity: 0,
    endpointCount: 0,
    specVersion: null,
    rawSpec: null,
    specHash: null,
    lastUpdated: null
  },
  {
    name: "Intercom API",
    description: "Customer communications for conversations, contacts, and tickets.",
    baseUrl: "https://api.intercom.io",
    documentationUrl: "https://developers.intercom.com/docs/references/rest-api/",
    category: "Business",
    tags: ["support", "messaging", "crm"],
    authTypes: ["BEARER_TOKEN", "OAUTH2"],
    providerId: null,
    status: "ACTIVE",
    isVerified: true,
    popularity: 0,
    endpointCount: 0,
    specVersion: null,
    rawSpec: null,
    specHash: null,
    lastUpdated: null
  },
  {
    name: "Mixpanel API",
    description: "Product analytics events, profiles, and reporting.",
    baseUrl: "https://api.mixpanel.com",
    documentationUrl: "https://developer.mixpanel.com/reference/overview",
    category: "Data & Analytics",
    tags: ["analytics", "events", "product"],
    authTypes: ["API_KEY", "BEARER_TOKEN"],
    providerId: null,
    status: "ACTIVE",
    isVerified: true,
    popularity: 0,
    endpointCount: 0,
    specVersion: "3.0",
    rawSpec: null,
    specHash: null,
    lastUpdated: null
  }
];

async function clearExistingData() {
  console.log('🧹 Clearing existing catalog data...');
  
  // Delete in correct order to respect foreign key constraints
  await prisma.catalogEndpoint.deleteMany({});
  console.log('  ✅ Cleared catalog endpoints');
  
  await prisma.apiCatalog.deleteMany({});
  console.log('  ✅ Cleared API catalog entries');
  
  await prisma.apiProvider.deleteMany({});
  console.log('  ✅ Cleared API providers');
  
  console.log('✅ Existing data cleared');
}

async function seedProviders() {
  console.log('🏢 Seeding API providers...');
  
  for (const providerData of apiProviders) {
    await prisma.apiProvider.create({
      data: providerData
    });
    console.log(`  ✅ Created provider: ${providerData.name}`);
  }
  
  console.log(`✅ Created ${apiProviders.length} providers`);
}

async function seedApis() {
  console.log('🔌 Seeding API catalog entries...');
  
  // Get provider IDs for linking
  const providers = await prisma.apiProvider.findMany();
  const providerMap = new Map(providers.map(p => [p.id, p.id]));
  
  for (const apiData of apis) {
    const apiRecord = {
      ...apiData,
      providerId: apiData.providerId ? providerMap.get(apiData.providerId) : null
    };
    
    await prisma.apiCatalog.create({
      data: apiRecord
    });
    console.log(`  ✅ Created API: ${apiData.name}`);
  }
  
  console.log(`✅ Created ${apis.length} API catalog entries`);
}

async function seedComprehensiveCatalog() {
  try {
    console.log('🌱 Starting comprehensive catalog seeding...');
    console.log('📊 This will replace all existing catalog data with real API data');
    
    // Clear existing data
    await clearExistingData();
    
    // Seed providers first
    await seedProviders();
    
    // Then seed APIs
    await seedApis();
    
    console.log('🎉 Comprehensive catalog seeding completed successfully!');
    
    // Print summary
    const providerCount = await prisma.apiProvider.count();
    const apiCount = await prisma.apiCatalog.count();
    const providerApiCount = await prisma.apiCatalog.count({
      where: { providerId: { not: null } }
    });
    const standaloneApiCount = await prisma.apiCatalog.count({
      where: { providerId: null }
    });
    
    console.log(`\n📊 Summary:`);
    console.log(`   - Providers: ${providerCount}`);
    console.log(`   - Total APIs: ${apiCount}`);
    console.log(`   - Provider APIs: ${providerApiCount}`);
    console.log(`   - Standalone APIs: ${standaloneApiCount}`);
    
    // Show provider breakdown
    console.log(`\n🏢 Provider Breakdown:`);
    for (const provider of apiProviders) {
      const apiCount = await prisma.apiCatalog.count({
        where: { providerId: provider.id }
      });
      console.log(`   - ${provider.name}: ${apiCount} APIs`);
    }

  } catch (error) {
    console.error('❌ Error seeding comprehensive catalog:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding
if (require.main === module) {
  seedComprehensiveCatalog()
    .then(() => {
      console.log('✅ Comprehensive catalog seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Comprehensive catalog seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedComprehensiveCatalog };
