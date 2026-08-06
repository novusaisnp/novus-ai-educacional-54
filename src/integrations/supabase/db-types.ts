
import type { Database } from './types';

export type StudentInsert = Database['public']['Tables']['students']['Insert'];
export type StudentUpdate = Database['public']['Tables']['students']['Update'];

export type SubjectInsert = Database['public']['Tables']['subjects']['Insert'];
export type SubjectUpdate = Database['public']['Tables']['subjects']['Update'];

export type ClassInsert = Database['public']['Tables']['classes']['Insert'];
export type ClassUpdate = Database['public']['Tables']['classes']['Update'];

export type EnrollmentInsert = Database['public']['Tables']['enrollments']['Insert'];
export type EnrollmentUpdate = Database['public']['Tables']['enrollments']['Update'];

export type ReEnrollmentRow = Database['public']['Tables']['re_enrollments']['Row'];
export type ReEnrollmentInsert = Database['public']['Tables']['re_enrollments']['Insert'];
export type ReEnrollmentUpdate = Database['public']['Tables']['re_enrollments']['Update'];

// Notification system types
export type NotificationQueueInsert = Database['public']['Tables']['notification_queue']['Insert'];
export type NotificationQueueUpdate = Database['public']['Tables']['notification_queue']['Update'];

export type NotificationDeliveriesInsert = Database['public']['Tables']['notification_deliveries']['Insert'];
export type NotificationDeliveriesUpdate = Database['public']['Tables']['notification_deliveries']['Update'];

export type NotificationTemplatesInsert = Database['public']['Tables']['notification_templates']['Insert'];
export type NotificationTemplatesUpdate = Database['public']['Tables']['notification_templates']['Update'];

export type ContactConsentsInsert = Database['public']['Tables']['contact_consents']['Insert'];
export type ContactConsentsUpdate = Database['public']['Tables']['contact_consents']['Update'];

export type PeriodRow = Database['public']['Tables']['periods']['Row'];
export type PeriodInsert = Database['public']['Tables']['periods']['Insert'];
export type PeriodUpdate = Database['public']['Tables']['periods']['Update'];

export type CalendarExceptionRow = Database['public']['Tables']['calendar_exceptions']['Row'];
export type CalendarExceptionInsert = Database['public']['Tables']['calendar_exceptions']['Insert'];
export type CalendarExceptionUpdate = Database['public']['Tables']['calendar_exceptions']['Update'];

export type EnrollmentContractRow = Database['public']['Tables']['enrollment_contracts']['Row'];
export type EnrollmentContractInsert = Database['public']['Tables']['enrollment_contracts']['Insert'];
export type EnrollmentContractUpdate = Database['public']['Tables']['enrollment_contracts']['Update'];

export type ContractTemplateRow = Database['public']['Tables']['contract_templates']['Row'];
export type ContractTemplateInsert = Database['public']['Tables']['contract_templates']['Insert'];
export type ContractTemplateUpdate = Database['public']['Tables']['contract_templates']['Update'];

export type AcademicTermRow = Database['public']['Tables']['academic_terms']['Row'];
export type AcademicTermInsert = Database['public']['Tables']['academic_terms']['Insert'];
export type AcademicTermUpdate = Database['public']['Tables']['academic_terms']['Update'];

export type AcademicSettingsRow = Database['public']['Tables']['academic_settings']['Row'];
export type AcademicSettingsInsert = Database['public']['Tables']['academic_settings']['Insert'];
export type AcademicSettingsUpdate = Database['public']['Tables']['academic_settings']['Update'];

export type TermResultRow = Database['public']['Tables']['term_results']['Row'];
export type TermResultInsert = Database['public']['Tables']['term_results']['Insert'];
export type TermResultUpdate = Database['public']['Tables']['term_results']['Update'];

export type ClassCouncilRow = Database['public']['Tables']['class_councils']['Row'];
export type ClassCouncilInsert = Database['public']['Tables']['class_councils']['Insert'];
export type ClassCouncilUpdate = Database['public']['Tables']['class_councils']['Update'];

export type ClassCouncilOpinionRow = Database['public']['Tables']['class_council_opinions']['Row'];
export type ClassCouncilOpinionInsert = Database['public']['Tables']['class_council_opinions']['Insert'];
export type ClassCouncilOpinionUpdate = Database['public']['Tables']['class_council_opinions']['Update'];
