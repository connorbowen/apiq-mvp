# Workflow Creation Methods

APIQ provides two distinct methods for creating workflows, each optimized for different use cases and user preferences.

## Overview

| Method | Route | Access | Best For |
|--------|-------|--------|----------|
| **Natural Language** | `/workflows/create` | Chat tab, direct navigation | Quick workflows, non-technical users |
| **Visual Builder** | `/workflows/new` | "Create Workflow" buttons | Complex workflows, technical users |

## Natural Language Workflow Creation

**Route**: `/workflows/create`  
**Access**: Chat tab in dashboard or direct navigation

### Features
- AI-powered workflow generation from plain English descriptions
- Multi-step workflow planning and generation
- Context-aware conversation with follow-up questions
- Automatic data mapping between steps
- Workflow validation and optimization suggestions

### Example Usage
```
User: "When a new GitHub issue is created, send a Slack notification and create a Trello card"
AI: Generates a 3-step workflow with proper data flow and error handling
```

### When to Use
- Quick workflow creation
- Non-technical users
- Exploratory workflow design
- Simple automation tasks

## Visual Workflow Builder

**Route**: `/workflows/new`  
**Access**: "Create Workflow" buttons throughout the application

### Features
- Form-based workflow creation
- Step-by-step configuration
- API connection selection
- Parameter configuration
- Real-time validation
- Drag-and-drop interface (future enhancement)

### When to Use
- Complex workflows with specific requirements
- Technical users who prefer form-based interfaces
- Workflows requiring precise parameter configuration
- Integration with existing development workflows

## Navigation Patterns

### From Dashboard
- **Chat Tab**: Natural language workflow creation
- **Workflows Tab**: "Create Workflow" → Visual Builder
- **Overview Tab**: "Create Workflow" → Visual Builder

### From Workflows Page
- **Header Button**: "Create Workflow" → Visual Builder
- **Empty State**: "Create Your First Workflow" → Visual Builder

### Direct Access
- **Natural Language**: Navigate to `/workflows/create`
- **Visual Builder**: Navigate to `/workflows/new`

## Implementation Details

### Routes
- `/workflows/create` - Renders `ChatInterface` component
- `/workflows/new` - Renders `WorkflowBuilder` component

### Components
- `ChatInterface` - Natural language workflow creation
- `WorkflowBuilder` - Visual form-based workflow creation

### Test Coverage
- **Unit Tests**: Updated to reflect new navigation patterns
- **E2E Tests**: Separate test suites for each creation method
- **Integration Tests**: Cover both creation flows

## Migration Notes

### Changes Made
1. **Button Navigation**: All "Create Workflow" buttons now go to visual builder
2. **Route Creation**: Added `/workflows/new` route for visual builder
3. **Test Updates**: Updated unit and e2e tests to reflect new behavior
4. **Documentation**: Updated user guides and architecture docs

### Backward Compatibility
- Natural language interface remains at `/workflows/create`
- All existing direct navigation continues to work
- No breaking changes to API endpoints

## Future Enhancements

### Planned Features
- **Workflow Templates**: Pre-built templates for common use cases
- **Hybrid Interface**: Combine natural language with visual editing
- **Workflow Import/Export**: Share workflows between users
- **Version Control**: Workflow versioning and rollback

### UI Improvements
- **Method Selection**: Choose creation method on workflow creation page
- **Workflow Conversion**: Convert between natural language and visual formats
- **Enhanced Visual Builder**: Drag-and-drop interface with flow diagrams
