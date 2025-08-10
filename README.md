# Samanin Backend

> **AI ASSISTANT NOTE:** Keep this structure and sections. Do NOT add new sections when updating. Only update existing sections with new implementations.

## Overview
Backend implementation for Samanin Rental Management Platform.

## Technology Stack

- **Framework:** NestJS
- **Language:** TypeScript (strict mode)
- **Database:** PostgreSQL
- **ORM:** TypeORM
- **Authentication:** JWT with Passport.js
- **Validation:** class-validator, class-transformer
- **Documentation:** Swagger/OpenAPI
- **Testing:** Jest
- **Email:** Nodemailer

## Project Structure

```
src/
├── auth/                          # Authentication module
│   ├── dto/                       # Data Transfer Objects
│   │   ├── register-user-request.dto.ts
│   │   ├── register-user-response.dto.ts
│   │   ├── email-verification-response.dto.ts
│   │   ├── resend-verification-request.dto.ts
│   │   ├── resend-verification-response.dto.ts
│   │   ├── dashboard-data.dto.ts
│   │   ├── dashboard-response.dto.ts
│   │   ├── locale-formatting-response.dto.ts
│   │   └── error-response.dto.ts
│   ├── services/                  # Business logic services
│   │   ├── auth.service.ts        # Main authentication logic
│   │   ├── email.service.ts       # Email handling
│   │   ├── dashboard.service.ts   # Dashboard data service
│   │   └── locale-formatting.service.ts # Locale formatting service
│   ├── guards/                    # Authentication guards
│   │   └── session-auth.guard.ts  # Session authentication guard
│   ├── decorators/                # Custom decorators
│   │   └── authenticated-user.decorator.ts
│   ├── interfaces/                # Type definitions
│   │   └── request.interface.ts   # Extended Request interface
│   ├── auth.controller.ts         # HTTP endpoints
│   └── auth.module.ts            # Module configuration
├── users/                         # User management module (?)
│   ├── dto/                       # Data Transfer Objects
│   │   ├── create-user-request.dto.ts
│   │   ├── create-user-response.dto.ts
│   │   ├── update-user-request.dto.ts        # ? update request
│   │   ├── update-user-response.dto.ts       # ? update response
│   │   ├── reset-password-request.dto.ts     # ? reset request
│   │   ├── reset-password-response.dto.ts    # ? reset response
│   │   ├── list-users-query.dto.ts      # ? query parameters
│   │   ├── list-users-response.dto.ts   # ? response format
│   │   ├── user-profile-response.dto.ts      # ? profile response
│   │   ├── update-profile-request.dto.ts     # ? profile update request
│   │   ├── change-password-request.dto.ts    # ? password change request
│   │   ├── user-sessions-response.dto.ts     # ? sessions response
│   │   ├── user-activity-response.dto.ts     # ? activity response
│   │   ├── status-change-request.dto.ts      # ? status change request
│   │   ├── status-change-response.dto.ts     # ? status change response
│   │   ├── bulk-status-change-request.dto.ts # ? bulk status change request
│   │   └── bulk-status-change-response.dto.ts # ? bulk status change response
│   ├── services/                  # Business logic services
│   │   ├── users.service.ts       # User creation and management
│   │   └── profile.service.ts     # ? self-service profile management
│   ├── users.controller.ts        # HTTP endpoints for user management
│   └── users.module.ts           # User management module configuration
├── audit/                         # Audit trail management module (?)
│   ├── dto/                       # Data Transfer Objects
│   │   ├── audit-logs-query.dto.ts      # ? query parameters
│   │   ├── audit-logs-response.dto.ts   # ? response format
│   │   ├── audit-export-request.dto.ts  # ? export request
│   │   └── audit-export-response.dto.ts # ? export response
│   ├── audit.service.ts           # Audit trail business logic
│   ├── audit.controller.ts        # Audit endpoints
│   └── audit.module.ts           # Audit module configuration
├── permissions/                   # Permission management module (?)
│   ├── dto/                       # Data Transfer Objects
│   │   ├── permissions-list-response.dto.ts  # ? permissions list response
│   │   ├── role-permissions-response.dto.ts  # ? role permissions response
│   │   ├── update-role-permissions-request.dto.ts # ? update request
│   │   ├── update-role-permissions-response.dto.ts # ? update response
│   │   ├── check-permission-query.dto.ts     # ? permission check query
│   │   ├── check-permission-response.dto.ts  # ? permission check response
│   │   └── permission-audit-response.dto.ts  # ? audit response
│   ├── services/                  # Business logic services
│   │   └── permissions.service.ts # Permission checking and management logic
│   ├── permissions.controller.ts  # Permission management endpoints
│   ├── roles.controller.ts        # Role permission endpoints
│   └── permissions.module.ts     # Permissions module configuration
├── categories/                    # Category management module (?)
│   ├── dto/                       # Data Transfer Objects
│   │   ├── create-category-request.dto.ts   # ? create request
│   │   ├── create-category-response.dto.ts  # ? create response
│   │   ├── list-categories-query.dto.ts     # ? list query parameters
│   │   ├── list-categories-response.dto.ts  # ? list response format
│   │   ├── update-category-request.dto.ts   # ? update request
│   │   ├── update-category-response.dto.ts  # ? update response
│   │   ├── delete-category-response.dto.ts  # ? delete response
│   │   └── category-items-count-response.dto.ts # ? items count response
│   ├── services/                  # Business logic services
│   │   └── categories.service.ts  # Category management logic
│   ├── categories.controller.ts   # Category management endpoints
│   └── categories.module.ts      # Categories module configuration
├── inventory/                     # Inventory management module (?-?)
│   ├── dto/                       # Data Transfer Objects
│   │   ├── create-inventory-item-request.dto.ts   # ? create request
│   │   ├── create-inventory-item-response.dto.ts  # ? create response
│   │   ├── update-inventory-item-request.dto.ts   # ? update request
│   │   ├── update-inventory-item-response.dto.ts  # ? update response
│   │   ├── change-inventory-item-status-request.dto.ts  # ? status change request
│   │   ├── change-inventory-item-status-response.dto.ts # ? status change response
│   │   ├── update-serialized-item-request.dto.ts  # ? update serialized item request
│   │   ├── update-serialized-item-response.dto.ts # ? update serialized item response
│   │   ├── update-quantity-request.dto.ts         # ? update quantity request
│   │   ├── update-quantity-response.dto.ts        # ? update quantity response
│   │   ├── bulk-edit-request.dto.ts               # ? bulk edit request
│   │   ├── bulk-edit-response.dto.ts              # ? bulk edit response
│   │   ├── bulk-operation-status-response.dto.ts  # ? bulk operation status response
│   │   ├── get-status-options-response.dto.ts     # ? status options response
│   │   ├── get-status-history-query.dto.ts        # ? status history query
│   │   ├── get-status-history-response.dto.ts     # ? status history response
│   │   ├── list-inventory-items-query.dto.ts      # ? list query parameters
│   │   ├── list-inventory-items-response.dto.ts   # ? list response format
│   │   ├── get-inventory-item-response.dto.ts     # ? get item response
│   │   ├── validate-serial-number-request.dto.ts  # ? serial validation request
│   │   ├── validate-serial-number-response.dto.ts # ? serial validation response
│   │   ├── generate-serial-number-response.dto.ts # ? serial generation response
│   │   └── inventory-item.dto.ts                  # ? inventory item data
│   ├── services/                  # Business logic services
│   │   └── inventory.service.ts   # Inventory management logic
│   ├── inventory.controller.ts    # Inventory management endpoints
│   └── inventory.module.ts       # Inventory module configuration
├── locale/                        # Locale formatting module
│   ├── locale.controller.ts       # Locale formatting endpoints
│   └── locale.module.ts          # Locale module configuration
├── entities/                      # Database entities
│   ├── tenant.entity.ts          # Tenant organizations
│   ├── user.entity.ts            # User accounts
│   ├── role.entity.ts            # System roles
│   ├── user-role.entity.ts       # User-role assignments
│   ├── email-verification.entity.ts
│   ├── user-session.entity.ts    # User sessions
│   ├── login-attempt.entity.ts   # Login attempts
│   ├── password-reset-token.entity.ts
│   ├── audit-log.entity.ts       # Audit trail for user actions (?)
│   ├── audit-export.entity.ts    # Audit export tracking (?)
│   ├── category.entity.ts        # Custom categories (?)
│   ├── inventory-item.entity.ts  # Inventory items (?-?)
│   ├── inventory-item-status-change.entity.ts # Inventory status changes (?)
│   ├── inventory-bulk-operation.entity.ts # Inventory bulk operations (?)
│   ├── inventory-export.entity.ts # Inventory exports (?)
│   └── serial-number-sequence.entity.ts # Serial number generation (?)
├── i18n/                         # Internationalization
│   ├── en.json                   # English translations
│   ├── fa.json                   # Persian translations
│   ├── ar.json                   # Arabic translations
│   ├── i18n.service.ts           # Localization service
│   └── i18n.module.ts            # I18n module
├── common/                        # Shared utilities
│   ├── enums.ts                  # System enumerations
│   ├── message-keys.ts           # Internationalization keys
│   └── validators/               # Custom validators
├── config/                        # Configuration files
│   └── database.config.ts
├── migrations/                    # Database migrations
└── main.ts                       # Application entry point
```

## Database Schema

16 main entities with security features:

### Core Entities (?)
1. **tenants** - Tenant organizations with language/locale settings
2. **users** - User accounts with email verification status and phone numbers
3. **roles** - System roles (tenant_owner, admin, manager, employee, staff)
4. **user_roles** - User-role assignments with tenant context
5. **email_verifications** - Email verification tokens and tracking

### Authentication Entities (? & ?)
6. **user_sessions** - Active sessions with configurable expiry (8 hours standard, 30 days with remember me) and tenant context
7. **login_attempts** - Security audit trail for all login attempts with enhanced role context
8. **password_reset_tokens** - Password reset tokens with 2-hour expiry

### User Management Entities (? & ?)
9. **audit_logs** - Comprehensive audit trail for user management actions
10. **audit_exports** - Audit export tracking for compliance reporting

### Permission Management Entities (?)
11. **permissions** - System permissions with resource-action combinations
12. **role_permissions** - Role-permission assignments with grant/deny status
13. **permission_checks** - Permission check audit trail with detailed context

### Category Management Entities (?)
14. **categories** - Custom categories with tenant-scoped unique names, audit trail, full CRUD operations including deletion with inventory association validation, and pagination support

### Inventory Management Entities (?-?)
15. **inventory_items** - Inventory items with serialized/non-serialized support, tenant-scoped unique names and serial numbers, category associations, quantity tracking, availability status management, comprehensive audit trail, and full editing capabilities including optimistic locking and rental history tracking with enhanced fields for serialized item management (serial number source, previous serial number, condition notes, maintenance dates, allocated quantity)
16. **inventory_item_status_changes** - Detailed status change history with audit trail, supporting manual and automatic status transitions, reason tracking, resolution date management, and comprehensive user action logging
17. **inventory_bulk_operations** - Bulk operation tracking for inventory management with operation type support (update_category, update_status, update_availability, update_maintenance, update_quantity), status tracking (initiated, processing, completed, failed, partially_completed), comprehensive audit trail, and detailed failure reporting
18. **serial_number_sequences** - Auto-generated serial number sequences with tenant-specific configuration, customizable prefixes and padding, and active sequence management
19. **inventory_exports** - Export tracking for inventory data with format support (CSV, Excel, PDF), export type management (Full, Selected, Filtered), status tracking, file management, and audit trail for compliance


## API Documentation

- **Development:** http://localhost:3000/api/docs
- **Specification:** docs/swagger.json
- English-only documentation with complete message key examples
- All HTTP status codes with detailed examples
- Request/response schemas with validation rules
