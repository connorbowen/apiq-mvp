# APIQ - Multi-API Orchestrator Webapp

A semi-agentic, low-code web application that enables users to orchestrate complex workflows across multiple APIs using natural language and AI-powered automation.

## 🚀 Overview

APIQ transforms how developers and non-technical users interact with multiple APIs. Instead of writing custom scripts or juggling multiple tools, users can describe their goals in natural language, and the AI orchestrator will automatically plan and execute multi-step workflows across connected APIs.

### Key Features

- **🤖 AI-Powered Orchestration**: Natural language to API workflow translation using OpenAI GPT-4
- **🔗 Multi-API Integration**: Connect and manage multiple external APIs with OpenAPI/Swagger specs
- **🛡️ Secure Credential Management**: Encrypted storage of API keys and tokens
- **👥 Role-Based Access Control**: Granular permissions for different user roles
- **📊 Comprehensive Audit Logging**: Complete trail of all actions for compliance
- **🎯 Guided User Experience**: Onboarding, templates, and contextual help
- **⚡ Real-time Execution**: Live workflow progress and error handling

## 🏗️ Architecture

### Tech Stack

- **Frontend**: Next.js (React + TypeScript) with Tailwind CSS
- **Backend**: Next.js API routes (serverless functions)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js (Auth.js) with email/password and SSO support
- **AI Integration**: OpenAI GPT-4 with function calling
- **API Spec Parsing**: @apidevtools/swagger-parser
- **HTTP Client**: Axios for external API calls

### System Components

1. **Authentication Layer**: NextAuth.js handles user sessions and SSO
2. **API Connection Manager**: Secure storage and management of API credentials
3. **OpenAPI Parser**: Dynamic fetching and parsing of API specifications
4. **AI Orchestrator**: OpenAI integration for natural language interpretation
5. **Workflow Engine**: Multi-step execution with data flow between APIs
6. **Audit System**: Comprehensive logging of all user actions and API calls

## 📁 Project Structure

```
/apiq-mvp
├── /pages                    # Next.js pages and API routes
│   ├── /api                 # Serverless API endpoints
│   │   ├── auth/[...nextauth].js    # NextAuth configuration
│   │   ├── apiSpec.js               # OpenAPI spec ingestion
│   │   ├── chat.js                  # AI chat/workflow API
│   │   └── workflows.js             # Workflow management
│   ├── index.js             # Landing page
│   ├── dashboard.js         # Main application dashboard
│   ├── add-api.js           # API connection form
│   ├── explore-api.js       # API explorer
│   ├── chat-ui.js           # Chat interface
│   └── logs.js              # Audit log viewer
├── /components              # Reusable React components
│   ├── auth/                # Authentication components
│   ├── api/                 # API management components
│   ├── chat/                # Chat and workflow components
│   └── ui/                  # Common UI components
├── /lib                     # Utility functions and services
│   ├── auth.js              # Authentication utilities
│   ├── openai.js            # OpenAI client and functions
│   ├── apiParser.js         # OpenAPI spec parsing
│   ├── apiCaller.js         # External API calling
│   └── logger.js            # Audit logging utilities
├── /prisma                  # Database schema and migrations
│   └── schema.prisma        # Prisma schema definition
├── /styles                  # Global styles and Tailwind config
└── /public                  # Static assets
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- OpenAI API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd apiq-mvp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env.local
   ```
   
   Edit `.env.local` with your configuration:
   ```env
   DATABASE_URL="postgresql://user:pass@host:port/dbname"
   NEXTAUTH_SECRET="your-secret-key"
   NEXTAUTH_URL="http://localhost:3000"
   OPENAI_API_KEY="sk-your-openai-key"
   ```

4. **Set up the database**
   ```bash
   npx prisma migrate dev --name init
   npx prisma generate
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📖 User Guide

### Getting Started

1. **Create an Account**: Sign up with email/password or use SSO
2. **Add Your First API**: Connect an API by providing its OpenAPI spec URL
3. **Explore Endpoints**: Browse available API operations and their parameters
4. **Start a Conversation**: Use natural language to describe what you want to accomplish
5. **Review and Confirm**: The AI will propose a workflow - review and confirm before execution
6. **Monitor Progress**: Watch real-time execution and view results

### Example Workflows

- **"Get the latest customer data from CRM API and then post a welcome message via the Messaging API"**
- **"Fetch the top 10 customers from Sales API, then get their recent interactions from Marketing API"**
- **"When a new customer is created in CRM, automatically create a project in PM tool and notify via Slack"**

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run test` - Run tests
- `npx prisma studio` - Open Prisma Studio for database management

### Development Workflow

1. **Feature Development**: Create feature branches from `main`
2. **Testing**: Write unit and integration tests for new features
3. **Code Review**: Submit pull requests for review
4. **Deployment**: Merge to `main` triggers deployment

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 🔒 Security

### Authentication & Authorization

- **Multi-factor authentication** support via NextAuth.js
- **Role-based access control** (Admin, User roles)
- **Session management** with secure JWT tokens
- **SSO integration** for enterprise deployments

### Data Protection

- **Encrypted credential storage** using AES-256
- **Secure API key management** with rotation support
- **Audit logging** of all user actions and API calls
- **Input validation** and sanitization

### Compliance

- **GDPR compliance** with data export/deletion capabilities
- **SOC 2 readiness** with comprehensive audit trails
- **Enterprise security** features for B2B deployments

## 📊 Monitoring & Logging

### Audit Logs

Every action in the system is logged for compliance and debugging:

- User authentication events
- API connection management
- Workflow executions and results
- Error conditions and resolutions

### Performance Monitoring

- API response times and success rates
- AI model usage and costs
- Database query performance
- User activity metrics

## 🚀 Deployment

### Production Deployment

1. **Environment Setup**
   ```bash
   npm run build
   npm start
   ```

2. **Database Migration**
   ```bash
   npx prisma migrate deploy
   ```

3. **Environment Variables**
   Ensure all production environment variables are set:
   - `DATABASE_URL`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL`
   - `OPENAI_API_KEY`

### Deployment Platforms

- **Vercel**: Recommended for Next.js applications
- **AWS**: Lambda + RDS for serverless deployment
- **Docker**: Containerized deployment for on-premise

## 🤝 Support

### Documentation

- [API Reference](./docs/api-reference.md)
- [User Guide](./docs/user-guide.md)
- [Developer Guide](./docs/developer-guide.md)
- [Security Guide](./docs/security-guide.md)

### Community

- [GitHub Issues](https://github.com/your-org/apiq-mvp/issues)
- [Discussions](https://github.com/your-org/apiq-mvp/discussions)
- [Contributing Guide](./CONTRIBUTING.md)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Authentication powered by [NextAuth.js](https://next-auth.js.org/)
- AI capabilities via [OpenAI](https://openai.com/)
- Database management with [Prisma](https://www.prisma.io/) 