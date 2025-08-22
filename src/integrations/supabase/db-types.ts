
import type { Database } from './types';

export type StudentInsert = Database['public']['Tables']['students']['Insert'];
export type StudentUpdate = Database['public']['Tables']['students']['Update'];

export type SubjectInsert = Database['public']['Tables']['subjects']['Insert'];
export type SubjectUpdate = Database['public']['Tables']['subjects']['Update'];

export type ClassInsert = Database['public']['Tables']['classes']['Insert'];
export type ClassUpdate = Database['public']['Tables']['classes']['Update'];

export type EnrollmentInsert = Database['public']['Tables']['enrollments']['Insert'];
export type EnrollmentUpdate = Database['public']['Tables']['enrollments']['Update'];

// Notification system types
export type NotificationQueueInsert = Database['public']['Tables']['notification_queue']['Insert'];
export type NotificationQueueUpdate = Database['public']['Tables']['notification_queue']['Update'];

export type NotificationDeliveriesInsert = Database['public']['Tables']['notification_deliveries']['Insert'];
export type NotificationDeliveriesUpdate = Database['public']['Tables']['notification_deliveries']['Update'];

export type NotificationTemplatesInsert = Database['public']['Tables']['notification_templates']['Insert'];
export type NotificationTemplatesUpdate = Database['public']['Tables']['notification_templates']['Update'];

export type ContactConsentsInsert = Database['public']['Tables']['contact_consents']['Insert'];
export type ContactConsentsUpdate = Database['public']['Tables']['contact_consents']['Update'];
