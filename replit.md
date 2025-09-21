# Financial Control Center

## Overview

This is a full-stack invoice management system designed for Open Doors, an engineering services company. The application serves as an intelligent financial control center that automates invoice processing using AI, manages IVA (VAT) calculations, and provides comprehensive financial reporting and analytics.

The system consists of a React frontend with shadcn/ui components, an Express.js backend with PostgreSQL database using Drizzle ORM, and integrates with Azure OpenAI services for document processing and chat capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes (September 20, 2025)

1. **Real-time WebSocket Synchronization**: Implemented comprehensive WebSocket infrastructure for real-time multi-user synchronization. Includes automatic reconnection with exponential backoff, user authentication, and instant updates across all connected devices when invoices are created, updated, or deleted.

2. **WhatsApp/Email Export Integration**: Added direct sharing capabilities to invoice table with WhatsApp and Email buttons. Users can instantly share invoice details through WhatsApp with pre-formatted messages or via email with complete invoice information including subtotals, IVA, and totals.

3. **Company Logo Management (Admin Only)**: Implemented company logo upload functionality exclusive to admin users in profile settings. Supports PNG, JPG, and SVG formats up to 5MB with preview and removal capabilities. Logo will appear in reports and official documents.

## Recent Changes (September 19, 2025)

1. **Enhanced Reporting with IVA Period Analysis (Task 5)**: Implemented comprehensive reporting improvements including secure CSV exports with AFIP compliance (CUIT field), context-aware export functionality for monthly/annual/fiscal periods, proper May-April fiscal period filtering, user-configurable currency formatting, and enhanced security with authenticated export endpoints.

1. **Complete Argentine Invoice Type Classification (A/B/C)**: Fully implemented database schema with `invoice_class` field, enhanced Azure AI processor to detect and classify invoice types from document content, updated all backend routes to handle invoice class throughout creation and editing workflows, and fixed TypeScript interface definitions for proper type safety.

2. **Automatic Client/Provider Creation**: Invoices now automatically create associated client/provider records when processed with AI extraction, eliminating manual entry and maintaining referential integrity.

3. **View Invoice Functionality**: Added "View Invoice" button to the invoice table allowing users to view uploaded PDF/image files directly in the browser through a new `/api/invoices/:id/file` endpoint.

4. **IVA Decimal Display**: Implemented consistent 2-decimal display for IVA amounts across the application using new `formatCurrencyWithDecimals` utility function.

5. **Enhanced KPI Card Design**: Added subtle gradient backgrounds to KPI cards with hover effects, improving visual hierarchy and user engagement (income-green, expense-red, chart-3, and primary color gradients).

6. **Advanced Invoice Table Sorting**: Implemented chronological sorting with column-based ordering (date, amount, client) and automatic row numbering for better data organization.

7. **Google Drive Document Viewer**: Integrated Google Drive Viewer API for seamless in-browser viewing of invoice PDFs without requiring file downloads.

8. **Enhanced Invoice Summary Modal**: Redesigned summary modal with dynamic color-coded backgrounds (green for income, red for expense) providing immediate visual feedback on transaction type.

9. **Editable Client/Provider Selection**: Added inline editing capability in invoice summary modal, allowing users to select existing clients from dropdown or enter new ones manually.

10. **Subtle In-App Notifications**: Replaced intrusive browser alert() dialogs with subtle toast notifications that appear within the interface, improving user experience by keeping all notifications contextual and non-disruptive.

11. **Critical Date Processing Fix**: Resolved issue where invoices were assigned current date when extraction failed. System now correctly parses Argentine/Spanish date formats (DD/MM/YYYY), handles null dates properly, and validates date ranges to prevent future dates.

12. **Enhanced Decimal Precision**: Fixed currency parsing to always interpret last 2 digits as decimals, correctly handling formats like 6.00, 1.567,00, and $12,845.59 to prevent errors like $600 instead of $6.00.

13. **Improved Invoice Type Detection**: System now auto-detects if Open Doors is issuer (INCOME) or receiver (EXPENSE) by analyzing vendor/customer fields, supporting all company name variations.

14. **Payment Status Management System**: Added comprehensive payment status tracking (pending/paid/overdue/cancelled) with inline editing capability in invoices table, payment date picker for paid invoices, and color-coded status badges for visual feedback.

15. **IVA Components Gradual Management**: Implemented flexible IVA breakdown system allowing multiple tax components per invoice, auto-calculation between percentage and amount, validation against total IVA amount, and support for gradual IVA declarations.

16. **Excel Import/Export Functionality**: Complete Excel integration with bulk import capability, fiscal period export (May-April), progress tracking during import with detailed error reporting, and full compatibility with Argentine tax requirements including all special fields.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript and Vite for development
- **UI Components**: shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS with custom financial color scheme (income-green, expense-red)
- **Charts**: Recharts for data visualization (area charts, KPI cards)
- **State Management**: TanStack Query for server state, React hooks for local state
- **Routing**: Wouter for client-side routing
- **File Upload**: react-dropzone for drag-and-drop functionality

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM for type-safe queries
- **File Processing**: Multer for file uploads with 10MB limit
- **AI Integration**: Azure OpenAI for invoice data extraction with type classification
- **Database Schema**: Normalized schema with users, clients_providers, invoices (with invoice_class enum), and deleted_invoices_log tables
- **API Design**: RESTful endpoints with comprehensive CRUD operations

### Database Design
The system uses a normalized PostgreSQL schema:
- **users**: User management with authentication
- **clients_providers**: Unified client/provider table with type classification
- **invoices**: Core invoice data with relationships to users and clients/providers, including invoice_class field for A/B/C tax classification
- **deleted_invoices_log**: Audit trail for deleted invoices with restoration capability

### Key Features and Modules
1. **Dashboard**: Real-time KPIs, financial charts, and recent activity
2. **Invoice Upload**: AI-powered document processing with invoice type detection and progress tracking
3. **Invoice Management**: Full CRUD with filtering, pagination, search, and type classification display
4. **Argentine Tax Compliance**: Automatic detection and classification of invoices as type A (IVA compensable), B (consumer final), or C (monotributista)
5. **Client/Provider Management**: Contact database with operation history
6. **Reports**: Financial reporting with CSV export capabilities including invoice type breakdowns
7. **Audit Trail**: Deleted invoice recovery system
8. **AI Chat Assistant**: Conversational interface for financial queries

### Data Flow and Processing
1. **Upload**: Files processed through multer middleware to temporary storage
2. **AI Processing**: Azure OpenAI extracts structured data and classifies invoice type (A/B/C)
3. **Database Storage**: Extracted data stored with invoice class, audit trails and relationships
4. **Real-time Updates**: TanStack Query invalidates cache for immediate UI updates

## External Dependencies

### Database
- **PostgreSQL**: Primary database with Neon serverless hosting
- **Connection Pool**: @neondatabase/serverless for connection management
- **ORM**: Drizzle with type-safe schema generation including invoice type enums

### AI Services
- **Azure OpenAI**: Invoice text extraction and type classification
- **Document Intelligence**: Handles PDF, JPEG, PNG invoice formats with type detection
- **Vision Processing**: Extracts structured financial data and identifies invoice class from images

### UI Libraries
- **Radix UI**: Accessible component primitives (dialogs, selects, tooltips)
- **Lucide React**: Consistent icon library
- **Recharts**: Financial data visualization components

### Development Tools
- **Vite**: Fast development server with Hot Module Replacement
- **TypeScript**: Type safety across frontend and backend
- **Tailwind CSS**: Utility-first styling with custom financial theme
- **ESBuild**: Production bundling for server-side code

### File Processing
- **Multer**: Multipart form data handling for file uploads
- **File System**: Local storage with configurable upload directory
- **Validation**: MIME type filtering for security (PDF, JPEG, PNG only)

### Authentication & Session Management
- **Session Storage**: PostgreSQL-based session store with connect-pg-simple
- **User Management**: Role-based access with audit tracking

### Invoice Type Classification
- **Type A**: Responsable Inscripto - IVA compensable for registered businesses
- **Type B**: Consumidor Final - For end consumers without VAT deduction
- **Type C**: Monotributista - Simplified tax regime for small businesses
- **Automatic Detection**: AI analyzes invoice markers, tax status fields, and document patterns
- **Database Integration**: invoice_class field with proper enum constraints and default values