# APIQ User Guide

Welcome to APIQ! This guide will help you get started with creating powerful workflows that connect your favorite apps and services using natural language and AI-powered automation.

## Getting Started

### 1. Create Your Account
- Visit [apiq.com](https://apiq.com) and click "Sign Up"
- Complete email verification (you'll be automatically signed in after verification)
- Set up your first API connection

### 2. Connect Your Apps
- Go to the "Connections" page in your dashboard
- Choose from our supported integrations (GitHub, Slack, Trello, etc.)
- Follow the OAuth2 flow to securely connect your accounts
- Your credentials are encrypted and stored securely

## Creating Workflows

### Natural Language Workflow Creation (Recommended) 🆕

The easiest way to create workflows is using natural language! Simply describe what you want to happen in plain English, and our AI will create the workflow for you.

#### How It Works:
1. **Go to "Create Workflow"** - Click the "Create Workflow" button in your dashboard
2. **Describe Your Workflow** - Tell us what you want to happen, for example:
   - "When a new GitHub issue is created, send a Slack notification"
   - "When a Trello card is moved to 'Done', create a Google Calendar event"
   - "When a new email arrives in Gmail, create a task in Todoist"
   - "Every Monday at 9 AM, check our Google Analytics and send a summary to Slack"
3. **Review & Confirm** - We'll generate a workflow and show you exactly what will happen
4. **Customize if Needed** - Modify any steps or add conditions before saving
5. **Save & Activate** - Your workflow is ready to run!

#### Example Workflows:
```
"When someone creates a new GitHub issue with the label 'bug', 
send a message to the #bugs Slack channel with the issue details"
```

```
"When a new customer signs up through our website form, 
add them to our Mailchimp list and create a welcome email"
```

```
"Every Monday at 9 AM, check our Google Analytics for the previous week 
and send a summary report to our team Slack channel"
```

#### Advanced Features:
- **Alternative Suggestions** - If we can't create exactly what you want, we'll suggest alternatives
- **Workflow Validation** - We'll check your workflow for potential issues and suggest improvements
- **Context Awareness** - The AI remembers your previous requests and can build on them
- **Confidence Scoring** - We'll tell you how confident we are in the generated workflow

### Manual Workflow Builder

For more complex workflows or fine-grained control, you can use our visual workflow builder:

1. **Add Triggers** - Choose what starts your workflow (webhook, schedule, manual)
2. **Add Actions** - Select what actions to perform (send email, create task, etc.)
3. **Configure Steps** - Set up the data mapping between steps
4. **Add Conditions** - Use if/then logic to create dynamic workflows
5. **Test & Deploy** - Test your workflow and activate it

## Managing Your Workflows

### Dashboard Overview
- **Active Workflows** - See all your running workflows
- **Recent Executions** - Monitor recent workflow runs
- **Performance Metrics** - Track success rates and execution times
- **Quick Actions** - Create new workflows, add connections, or manage secrets

### Workflow Management
- **Pause/Resume** - Temporarily stop workflows without losing data
- **Edit Workflows** - Modify existing workflows at any time
- **Execution History** - View detailed logs of all workflow runs
- **Error Handling** - See failed executions and retry options
- **Real-time Monitoring** - Watch workflows execute in real-time

## Managing Secrets 🆕

The Secrets Vault provides secure storage for your API keys, OAuth2 tokens, and other sensitive data.

### Adding Secrets
1. **Go to Secrets Tab** - Access the secrets management section in your dashboard
2. **Create New Secret** - Click "Create Secret" and choose the type:
   - **API Key** - For API authentication
   - **OAuth2 Token** - For OAuth2 connections
   - **Webhook Secret** - For webhook security
   - **Custom Secret** - For any other sensitive data
3. **Configure Settings** - Set expiration dates and rotation intervals
4. **Save Securely** - Your secret is encrypted and stored safely

### Secret Management Features
- **Automatic Rotation** - Set up automatic secret rotation for enhanced security
- **Version History** - Track all versions of your secrets
- **Expiration Management** - Set expiration dates for temporary secrets
- **Secure Access** - Secrets are never logged or exposed in error messages

## Advanced Features

### Data Transformations
- **Field Mapping** - Map data between different apps
- **Data Filtering** - Filter data based on conditions
- **Data Enrichment** - Add calculated fields or external data

### Conditional Logic
- **If/Then/Else** - Create dynamic workflows based on data
- **Multiple Conditions** - Combine multiple conditions with AND/OR logic
- **Nested Conditions** - Create complex decision trees

### Scheduling & Timing
- **Cron Expressions** - Schedule workflows to run at specific times
- **Relative Timing** - Run workflows relative to events
- **Time Zones** - Configure workflows for different time zones

### Execution Control 🆕
- **Pause/Resume** - Pause running workflows and resume them later
- **Cancel Execution** - Stop workflows that are currently running
- **Real-time Progress** - Monitor workflow execution step by step
- **Execution Logs** - View detailed logs for debugging and monitoring

## Troubleshooting

### Common Issues
1. **Connection Errors** - Re-authenticate your API connections
2. **Data Mapping Issues** - Check field names and data types
3. **Rate Limiting** - Some APIs have rate limits; we handle retries automatically
4. **Secret Expiration** - Check if your API keys or tokens have expired

### Getting Help
- **Documentation** - Check our comprehensive docs
- **Community** - Join our Discord for help from other users
- **Support** - Contact our support team for technical issues

## Best Practices

### Workflow Design
- **Start Simple** - Begin with basic workflows and add complexity gradually
- **Test Thoroughly** - Always test workflows before going live
- **Monitor Performance** - Keep an eye on execution times and success rates
- **Use Natural Language** - Leverage our AI to create workflows quickly

### Security
- **Secure Connections** - Only connect to trusted services
- **Data Privacy** - We encrypt all your data and never store sensitive information
- **Access Control** - Use team permissions to control who can modify workflows
- **Secret Rotation** - Regularly rotate your API keys and tokens

### Performance
- **Efficient Triggers** - Use specific triggers to avoid unnecessary executions
- **Data Filtering** - Filter data early to reduce processing time
- **Error Handling** - Set up proper error handling to avoid workflow failures
- **Resource Management** - Monitor and optimize workflow resource usage 