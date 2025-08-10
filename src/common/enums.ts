/**
 * Language Enumeration
 * Supported UI languages for the Samanin platform
 */
export enum Language {
  PERSIAN = 'persian',
  ARABIC = 'arabic',
}

/**
 * Locale Enumeration
 * Supported regional locales for the Samanin platform
 */
export enum Locale {
  IRAN = 'iran',
  UAE = 'uae',
}

/**
 * User Status Enumeration
 */
export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING_VERIFICATION = 'pending_verification',
  SUSPENDED = 'suspended',
}

/**
 * Tenant Status Enumeration
 */
export enum TenantStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

/**
 * Role Names Enumeration
 */
export enum RoleName {
  TENANT_OWNER = 'tenant_owner',
  ADMIN = 'admin',
  MANAGER = 'manager',
  EMPLOYEE = 'employee',
  STAFF = 'staff',
}

/**
 * Email Verification Status Enumeration
 */
export enum EmailVerificationStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  EXPIRED = 'expired',
  FAILED = 'failed',
}

/**
 * User Session Status Enumeration
 */
export enum UserSessionStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  INVALIDATED = 'invalidated',
  LOGGED_OUT = 'logged_out',
}

/**
 * Login Attempt Status Enumeration
 */
export enum LoginAttemptStatus {
  SUCCESS = 'success',
  FAILED_INVALID_CREDENTIALS = 'failed_invalid_credentials',
  FAILED_ACCOUNT_LOCKED = 'failed_account_locked',
  FAILED_RATE_LIMITED = 'failed_rate_limited',
  FAILED_USER_NOT_FOUND = 'failed_user_not_found',
}

/**
 * Password Reset Token Status Enumeration
 */
export enum PasswordResetTokenStatus {
  PENDING = 'pending',
  USED = 'used',
  EXPIRED = 'expired',
  INVALIDATED = 'invalidated',
}

/**
 * Audit Action Enumeration
 */
export enum AuditAction {
  USER_CREATED = 'user_created',
  ROLE_ASSIGNED = 'role_assigned',
  USER_UPDATED = 'user_updated',
  USER_STATUS_CHANGED = 'user_status_changed',
  USER_ROLE_CHANGED = 'user_role_changed',
  USER_DELETED = 'user_deleted',
  USER_LOCKED = 'user_locked',
  USER_UNLOCKED = 'user_unlocked',
  ROLE_REMOVED = 'role_removed',
  PASSWORD_RESET_INITIATED = 'password_reset_initiated',
  PASSWORD_RESET_COMPLETED = 'password_reset_completed',
  TEMPORARY_PASSWORD_GENERATED = 'temporary_password_generated',
  PROFILE_UPDATED = 'profile_updated',
  PASSWORD_CHANGED = 'password_changed',
  SESSION_TERMINATED = 'session_terminated',
  PROFILE_VIEWED = 'profile_viewed',
  ACTIVITY_VIEWED = 'activity_viewed',
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILED = 'login_failed',
  LOGOUT = 'logout',
  AUDIT_LOGS_VIEWED = 'audit_logs_viewed',
  AUDIT_EXPORT_INITIATED = 'audit_export_initiated',
  PERMISSION_GRANTED = 'permission_granted',
  PERMISSION_DENIED = 'permission_denied',
  PERMISSION_CHECK_FAILED = 'permission_check_failed',
  PRIVILEGE_ESCALATION_ATTEMPT = 'privilege_escalation_attempt',
  CATEGORY_CREATED = 'category_created',
  CATEGORY_UPDATED = 'category_updated',
  CATEGORY_DELETED = 'category_deleted',
  INVENTORY_ITEM_CREATED = 'inventory_item_created',
  INVENTORY_ITEM_UPDATED = 'inventory_item_updated',
  INVENTORY_ITEM_DELETED = 'inventory_item_deleted',
  INVENTORY_ITEM_QUANTITY_UPDATED = 'inventory_item_quantity_updated',
  INVENTORY_ITEM_SERIAL_NUMBER_CHANGED = 'inventory_item_serial_number_changed',
  INVENTORY_ITEM_MAINTENANCE_UPDATED = 'inventory_item_maintenance_updated',
  INVENTORY_STATUS_CHANGED = 'inventory_status_changed',
  INVENTORY_ITEM_VIEWED = 'inventory_item_viewed',
  INVENTORY_LIST_VIEWED = 'inventory_list_viewed',
  INVENTORY_EXPORTED = 'inventory_exported',
  INVENTORY_ITEMS_BULK_UPDATED = 'inventory_items_bulk_updated',
  INVENTORY_BULK_OPERATION_INITIATED = 'inventory_bulk_operation_initiated',
}

/**
 * Permission Action Enumeration
 */
export enum PermissionAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  MANAGE = 'manage',
  EXPORT = 'export',
  IMPORT = 'import',
}

/**
 * Permission Check Result Enumeration
 */
export enum CheckResult {
  GRANTED = 'granted',
  DENIED = 'denied',
}

/**
 * Audit Status Enumeration
 */
export enum AuditStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
}

/**
 * Export Status Enumeration
 */
export enum ExportStatus {
  INITIATED = 'initiated',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * Export Format Enumeration
 */
export enum ExportFormat {
  CSV = 'csv',
  JSON = 'json',
  PDF = 'pdf',
  EXCEL = 'excel',
}

/**
 * Export Type Enumeration
 */
export enum ExportType {
  SINGLE_ITEM = 'single_item',
  MULTIPLE_ITEMS = 'multiple_items',
  FULL_INVENTORY = 'full_inventory',
}

/**
 * Item Type Enumeration
 */
export enum ItemType {
  SERIALIZED = 'serialized',
  NON_SERIALIZED = 'non_serialized',
}

/**
 * Availability Status Enumeration
 */
export enum AvailabilityStatus {
  AVAILABLE = 'available',
  RENTED = 'rented',
  MAINTENANCE = 'maintenance',
  DAMAGED = 'damaged',
  LOST = 'lost',
}

/**
 * Inventory Item Status Enumeration
 */
export enum InventoryItemStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived',
}

/**
 * Status Change Type Enumeration
 */
export enum StatusChangeType {
  MANUAL = 'manual',
  AUTOMATIC = 'automatic',
}
