export interface Paginated<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export function unwrapList<T>(data: T[] | Paginated<T> | undefined): T[] {
  if (!data) return []
  if (Array.isArray(data)) return data
  return data.results || []
}

export interface InstructorPublic {
  id: number
  slug: string
  display_name: string
  headline: string
  bio: string
  country: string
  languages: string[]
  expertise: string[]
  qualifications: string
  experience: string
  linkedin_url: string
  website: string
  youtube_channel: string
  photo_url: string | null
  is_official: boolean
  rating_avg: string
  rating_count: number
  students_count: number
  courses_count: number
  status?: string
}

export interface Category {
  id: number
  slug: string
  name: string
  localized_name: string
  parent: number | null
  children: Category[]
}

export interface CourseInstructor {
  id: number
  slug: string
  display_name: string
  headline: string
  rating_avg: string
  is_official: boolean
}

export interface Course {
  id: number
  title: string
  slug: string
  description: string
  short_description: string
  price: string
  currency: string
  image: string | null
  is_active: boolean
  is_free: boolean
  kind: 'course' | 'tutorial'
  status: string
  language: string
  level: string
  category: number | null
  category_name: string | null
  instructor: CourseInstructor | null
  trailer_url: string
  learning_objectives: string[]
  requirements: string[]
  target_audience: string
  is_featured: boolean
  is_popular: boolean
  is_new: boolean
  is_recommended: boolean
  offers_certificate: boolean
  rating_avg: string
  rating_count: number
  lessons_count: number
  free_lessons_count: number
  duration_minutes: number
  enrollment_status: { status: string; enrolled_at: string; activated_at: string | null } | null
  rejection_reason: string
  created_at: string
}

export interface Lesson {
  id: number
  course: { id: number; title: string; slug: string; price: string }
  module: number | null
  title: string
  slug: string
  description: string
  video_url: string
  lesson_type: string
  duration: number
  content: string
  is_free: boolean
  order: number
  locked: boolean
  progress: { completed: boolean; completed_at: string | null } | null
}

export interface CourseModule {
  id: number
  course: number
  title: string
  description: string
  order: number
  lessons: Lesson[]
}

export interface CourseReview {
  id: number
  course: number
  rating: number
  body: string
  instructor_reply: string
  student_name: string
  created_at: string
}

export interface CertificateRecord {
  id: number
  code: string
  public_id?: string
  student_name: string
  course_title: string
  instructor_name: string
  issued_at: string
  verify_url: string
  status?: string
  display_status?: string
}

export interface InstructorDashboard {
  instructor: InstructorPublic
  students: number
  active_students: number
  courses: number
  tutorials: number
  mentorships: number
  drafts: number
  pending_review: number
  published: number
  rejected: number
  rating: string
  rating_count: number
  reviews: number
  earnings: {
    total_sales: string
    platform_fee: string
    instructor_net: string
    refunds: string
    paid: string
    pending: string
    available: string
    currency: string
  }
  is_mentor: boolean
  is_tutor: boolean
}

export interface EducatorApplication {
  id: number
  full_name: string
  biography: string
  country: string
  languages: string[]
  areas_of_expertise: string[]
  qualifications: string
  experience: string
  teaching_experience: string
  areas_to_teach: string[]
  linkedin_url: string
  website: string
  youtube_channel: string
  roles_requested: string[]
  status: string
  admin_notes: string
  created_at: string
}

export interface MentorPublic {
  id: number
  slug: string
  display_name: string
  headline: string
  bio: string
  timezone: string
  languages: string[]
  subjects: string[]
  meeting_method: string
  rating_avg: string
  rating_count: number
}

export interface TutorPublic {
  id: number
  display_name: string
  headline: string
  bio: string
  timezone: string
  languages: string[]
  subjects: string[]
  hourly_rate: string
  currency: string
  session_duration_minutes: number
  meeting_method: string
  rating_avg: string
  rating_count: number
}

export interface EducationOverview {
  students: number
  instructors: number
  mentors: number
  tutors: number
  courses: number
  published_courses: number
  tutorials: number
  enrollments: number
  reviews: number
  revenue: string
  pending_approvals: number
  pending_applications: number
  pending_courses: number
  pending_payouts: number
}

export interface MarketplaceHome {
  popular: Course[]
  featured: Course[]
  new: Course[]
  recommended: Course[]
  free: Course[]
  instructors: InstructorPublic[]
  mentors: MentorPublic[]
}

export interface MentorshipSession {
  id: number
  mentor: number
  starts_at: string
  ends_at: string
  duration_minutes: number
  status: string
  meeting_provider: string
  meeting_url: string
  mentor_name: string
}
