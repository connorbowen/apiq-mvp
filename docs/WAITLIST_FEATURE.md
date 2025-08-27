# Waitlist Feature Documentation

## Overview

The waitlist feature allows visitors to your landing page to sign up for early access to APIQ. This helps gauge interest and build an email list before launch.

## Features

### 1. Waitlist Signup Form
- **Location**: Landing page (`/`) - scroll down to "Get Early Access" section
- **Fields**: 
  - Name (required)
  - Email (required)
  - Company (optional)
  - Role (optional)
  - Interests (multi-select checkboxes)
- **Validation**: Email format validation and duplicate email prevention
- **Success State**: Confirmation message with option to add another email

### 2. Database Schema
```sql
model Waitlist {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  company   String?
  role      String?
  source    String?  // How they found us
  interests Json?    // Array of interests
  status    String   @default("pending") // pending, approved, contacted
  notes     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### 3. API Endpoints

#### POST `/api/waitlist`
- **Purpose**: Add new waitlist entry
- **Authentication**: None (public endpoint)
- **Validation**: Email required, email format, duplicate prevention
- **Response**: Success/error message with entry details

#### GET `/api/admin/waitlist`
- **Purpose**: Super Admin access to view waitlist entries
- **Authentication**: Super Admin users only
- **Features**: Pagination, filtering by status, search by email/name/company
- **Response**: Paginated list of entries with metadata

#### PUT `/api/admin/waitlist`
- **Purpose**: Update waitlist entry status and notes
- **Authentication**: Super Admin users only
- **Fields**: status, notes
- **Response**: Updated entry data

### 4. Admin Dashboard
- **Location**: `/admin/waitlist`
- **Access**: Admin users only
- **Features**:
  - View all waitlist entries
  - Filter by status (pending, approved, contacted)
  - Search by email, name, or company
  - Edit entry status and add notes
  - Export to CSV
  - Pagination for large lists

## Usage

### For Visitors
1. Visit the landing page
2. Scroll down to "Get Early Access" section
3. Fill out the form with your information
4. Submit and receive confirmation

### For Super Admins
1. Navigate to `/admin/waitlist`
2. View and manage waitlist entries
3. Update statuses and add notes
4. Export data for analysis

## Configuration

### Environment Variables
No additional environment variables required beyond existing setup.

### Database Migration
The waitlist table is automatically created when you run:
```bash
npx prisma migrate dev --name add_waitlist
```

## Interest Categories
The waitlist form includes these interest options:
- API Integration
- Workflow Automation
- Data Synchronization
- Customer Support
- Sales & Marketing
- Product Development
- Operations
- Other

## Status Management
- **pending**: Default status for new signups
- **approved**: Entry has been reviewed and approved
- **contacted**: Team has reached out to this person

## Analytics & Insights
- Track signup sources (landing page, social media, referrals)
- Monitor interest categories to understand market needs
- Export data for CRM integration or email marketing

## Security Considerations
- Public signup endpoint with rate limiting (implement if needed)
- Admin endpoints require authentication and SUPER_ADMIN role only
- Email validation prevents spam submissions
- Duplicate email prevention

## Future Enhancements
- Email notifications for new signups
- Integration with email marketing platforms
- Advanced analytics dashboard
- Automated follow-up sequences
- A/B testing for form variations

## Testing
- Test form submission with valid/invalid data
- Verify admin access controls
- Test CSV export functionality
- Verify duplicate email handling

## Deployment
1. Run database migration
2. Deploy updated code
3. Test waitlist signup flow
4. Verify admin access
5. Monitor for any issues

The waitlist feature is now ready to help you gauge interest and build your user base before launch!
