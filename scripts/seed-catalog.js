#!/usr/bin/env node

/**
 * Script to seed the API catalog with popular APIs
 * Run with: node scripts/seed-catalog.js
 */

const { PrismaClient } = require('../src/generated/prisma');

const prisma = new PrismaClient();

const popularApis = [
  {
    name: 'Slack',
    description: 'Slack API for messaging and team collaboration',
    baseUrl: 'https://slack.com/api',
    documentationUrl: 'https://api.slack.com/web',
    category: 'Communication',
    tags: ['messaging', 'team', 'collaboration', 'notifications'],
    authTypes: ['OAUTH2', 'BEARER_TOKEN'],
    logoUrl: 'https://a.slack-edge.com/80588/marketing/img/icons/icon_slack_hash_colored.png',
    endpoints: [
      {
        path: '/conversations.list',
        method: 'GET',
        summary: 'List conversations',
        description: 'Retrieve a list of conversations in the workspace',
        tags: ['conversations'],
        parameters: [
          { name: 'limit', in: 'query', required: false, type: 'integer' },
          { name: 'cursor', in: 'query', required: false, type: 'string' }
        ],
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    ok: { type: 'boolean' },
                    channels: { type: 'array', items: { type: 'object' } }
                  }
                }
              }
            }
          }
        }
      },
      {
        path: '/chat.postMessage',
        method: 'POST',
        summary: 'Send a message',
        description: 'Send a message to a channel or direct message',
        tags: ['chat'],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  channel: { type: 'string' },
                  text: { type: 'string' }
                },
                required: ['channel', 'text']
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Message sent successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    ok: { type: 'boolean' },
                    channel: { type: 'string' },
                    ts: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      }
    ]
  },
  {
    name: 'GitHub',
    description: 'GitHub API for repository management and automation',
    baseUrl: 'https://api.github.com',
    documentationUrl: 'https://docs.github.com/en/rest',
    category: 'Development',
    tags: ['git', 'repository', 'version-control', 'ci-cd'],
    authTypes: ['OAUTH2', 'BEARER_TOKEN'],
    logoUrl: 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png',
    endpoints: [
      {
        path: '/repos/{owner}/{repo}',
        method: 'GET',
        summary: 'Get repository',
        description: 'Get a repository by owner and name',
        tags: ['repositories'],
        parameters: [
          { name: 'owner', in: 'path', required: true, type: 'string' },
          { name: 'repo', in: 'path', required: true, type: 'string' }
        ],
        responses: {
          '200': {
            description: 'Repository information',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'integer' },
                    name: { type: 'string' },
                    full_name: { type: 'string' },
                    description: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      },
      {
        path: '/repos/{owner}/{repo}/issues',
        method: 'GET',
        summary: 'List repository issues',
        description: 'List issues for a repository',
        tags: ['issues'],
        parameters: [
          { name: 'owner', in: 'path', required: true, type: 'string' },
          { name: 'repo', in: 'path', required: true, type: 'string' },
          { name: 'state', in: 'query', required: false, type: 'string', enum: ['open', 'closed', 'all'] }
        ],
        responses: {
          '200': {
            description: 'List of issues',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'integer' },
                      number: { type: 'integer' },
                      title: { type: 'string' },
                      state: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    ]
  },
  {
    name: 'Stripe',
    description: 'Stripe API for payment processing and financial services',
    baseUrl: 'https://api.stripe.com/v1',
    documentationUrl: 'https://stripe.com/docs/api',
    category: 'Business',
    tags: ['payments', 'billing', 'subscriptions', 'financial'],
    authTypes: ['API_KEY'],
    logoUrl: 'https://stripe.com/img/v3/home/social.png',
    endpoints: [
      {
        path: '/customers',
        method: 'GET',
        summary: 'List customers',
        description: 'List all customers',
        tags: ['customers'],
        parameters: [
          { name: 'limit', in: 'query', required: false, type: 'integer' },
          { name: 'starting_after', in: 'query', required: false, type: 'string' }
        ],
        responses: {
          '200': {
            description: 'List of customers',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    object: { type: 'string' },
                    data: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          email: { type: 'string' },
                          name: { type: 'string' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      {
        path: '/charges',
        method: 'POST',
        summary: 'Create a charge',
        description: 'Create a new charge',
        tags: ['charges'],
        requestBody: {
          content: {
            'application/x-www-form-urlencoded': {
              schema: {
                type: 'object',
                properties: {
                  amount: { type: 'integer' },
                  currency: { type: 'string' },
                  source: { type: 'string' }
                },
                required: ['amount', 'currency', 'source']
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Charge created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    amount: { type: 'integer' },
                    currency: { type: 'string' },
                    status: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      }
    ]
  },
  {
    name: 'Twilio',
    description: 'Twilio API for SMS, voice, and video communications',
    baseUrl: 'https://api.twilio.com',
    documentationUrl: 'https://www.twilio.com/docs',
    category: 'Communication',
    tags: ['sms', 'voice', 'video', 'notifications'],
    authTypes: ['API_KEY'],
    logoUrl: 'https://www.twilio.com/marketing/bundles/company/img/logos/red/twilio-logo-red.png',
    endpoints: [
      {
        path: '/2010-04-01/Accounts/{AccountSid}/Messages.json',
        method: 'POST',
        summary: 'Send SMS message',
        description: 'Send an SMS message',
        tags: ['messages'],
        parameters: [
          { name: 'AccountSid', in: 'path', required: true, type: 'string' }
        ],
        requestBody: {
          content: {
            'application/x-www-form-urlencoded': {
              schema: {
                type: 'object',
                properties: {
                  To: { type: 'string' },
                  From: { type: 'string' },
                  Body: { type: 'string' }
                },
                required: ['To', 'From', 'Body']
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'Message sent successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    sid: { type: 'string' },
                    to: { type: 'string' },
                    from: { type: 'string' },
                    body: { type: 'string' },
                    status: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      }
    ]
  },
  {
    name: 'SendGrid',
    description: 'SendGrid API for email delivery and marketing',
    baseUrl: 'https://api.sendgrid.com/v3',
    documentationUrl: 'https://docs.sendgrid.com/api-reference',
    category: 'Communication',
    tags: ['email', 'marketing', 'notifications', 'delivery'],
    authTypes: ['API_KEY'],
    logoUrl: 'https://sendgrid.com/wp-content/uploads/2016/05/SendGrid-Logo.png',
    endpoints: [
      {
        path: '/mail/send',
        method: 'POST',
        summary: 'Send email',
        description: 'Send an email via SendGrid',
        tags: ['mail'],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  personalizations: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        to: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              email: { type: 'string' }
                            }
                          }
                        }
                      }
                    }
                  },
                  from: {
                    type: 'object',
                    properties: {
                      email: { type: 'string' }
                    }
                  },
                  subject: { type: 'string' },
                  content: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        type: { type: 'string' },
                        value: { type: 'string' }
                      }
                    }
                  }
                },
                required: ['personalizations', 'from', 'subject', 'content']
              }
            }
          }
        },
        responses: {
          '202': {
            description: 'Email accepted for delivery',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      }
    ]
  }
];

const categories = [
  {
    name: 'Communication',
    description: 'APIs for messaging, email, and team collaboration',
    icon: 'message-circle',
    color: '#3B82F6',
    sortOrder: 1
  },
  {
    name: 'Development',
    description: 'APIs for code management, CI/CD, and development tools',
    icon: 'code',
    color: '#10B981',
    sortOrder: 2
  },
  {
    name: 'Business',
    description: 'APIs for payments, CRM, and business operations',
    icon: 'briefcase',
    color: '#F59E0B',
    sortOrder: 3
  },
  {
    name: 'Data & Analytics',
    description: 'APIs for data processing, analytics, and reporting',
    icon: 'bar-chart',
    color: '#8B5CF6',
    sortOrder: 4
  },
  {
    name: 'AI & Machine Learning',
    description: 'APIs for artificial intelligence and machine learning services',
    icon: 'brain',
    color: '#EC4899',
    sortOrder: 5
  }
];

async function seedCatalog() {
  try {
    console.log('🌱 Starting catalog seeding...');

    // First, create categories
    console.log('📁 Creating categories...');
    for (const categoryData of categories) {
      const existing = await prisma.catalogCategory.findUnique({
        where: { name: categoryData.name }
      });

      if (!existing) {
        await prisma.catalogCategory.create({
          data: categoryData
        });
        console.log(`✅ Created category: ${categoryData.name}`);
      } else {
        console.log(`⏭️  Category already exists: ${categoryData.name}`);
      }
    }

    // Then, create APIs with their endpoints
    console.log('🔌 Creating APIs...');
    for (const apiData of popularApis) {
      const { endpoints, ...apiInfo } = apiData;
      
      let catalogEntry = await prisma.apiCatalog.findUnique({
        where: { name: apiData.name }
      });

      if (!catalogEntry) {
        catalogEntry = await prisma.apiCatalog.create({
          data: {
            ...apiInfo,
            endpointCount: endpoints.length
          }
        });
        console.log(`✅ Created API: ${apiData.name}`);
      } else {
        console.log(`⏭️  API already exists: ${apiData.name}`);
      }

      // Check if endpoints already exist for this API
      const existingEndpoints = await prisma.catalogEndpoint.count({
        where: { catalogId: catalogEntry.id }
      });

      if (existingEndpoints === 0 && endpoints.length > 0) {
        // Create endpoints
        for (const endpointData of endpoints) {
          await prisma.catalogEndpoint.create({
            data: {
              catalogId: catalogEntry.id,
              path: endpointData.path,
              method: endpointData.method,
              summary: endpointData.summary,
              description: endpointData.description,
              parameters: endpointData.parameters || {},
              requestBody: endpointData.requestBody || null,
              responses: endpointData.responses || {},
              successSchema: endpointData.successSchema || null,
              tags: endpointData.tags || [],
              isDeprecated: endpointData.isDeprecated || false
            }
          });
        }

        // Update endpoint count
        await prisma.apiCatalog.update({
          where: { id: catalogEntry.id },
          data: { endpointCount: endpoints.length }
        });

        console.log(`✅ Added ${endpoints.length} endpoints to ${apiData.name}`);
      } else {
        console.log(`⏭️  Endpoints already exist for ${apiData.name}`);
      }
    }

    console.log('🎉 Catalog seeding completed successfully!');
    
    // Print summary
    const apiCount = await prisma.apiCatalog.count();
    const categoryCount = await prisma.catalogCategory.count();
    const endpointCount = await prisma.catalogEndpoint.count();
    
    console.log(`\n📊 Summary:`);
    console.log(`   - Categories: ${categoryCount}`);
    console.log(`   - APIs: ${apiCount}`);
    console.log(`   - Endpoints: ${endpointCount}`);

  } catch (error) {
    console.error('❌ Error seeding catalog:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding
if (require.main === module) {
  seedCatalog()
    .then(() => {
      console.log('✅ Seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedCatalog };