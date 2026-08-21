'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'
import EducationShell from '@/components/education/EducationShell'
import { coursesApi, instructorsApi } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/types/api'
import { unwrapList, type Category, type Course, type CourseModule } from '@/lib/types/education'
import { useTranslations } from '@/contexts/LocaleContext'
import ZendaButton from '@/components/zenda/ZendaButton'
import ZendaAlert from '@/components/zenda/ZendaAlert'
import ZendaLoader from '@/components/zenda/ZendaLoader'

const STEPS = ['education.stepInfo', 'education.stepCurriculum', 'education.stepPricing', 'education.stepReview'] as const

export default function CourseBuilderPage() {
  return (
    <AuthGuard>
      <Builder />
    </AuthGuard>
  )
}

function Builder() {
  const t = useTranslations()
  const params = useParams()
  const router = useRouter()
  const rawId = params?.id
  const isNew = rawId === 'new' || !rawId
  const courseId = !isNew ? Number(rawId) : null
  const [step, setStep] = useState(0)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [shortDescription, setShortDescription] = useState('')
  const [price, setPrice] = useState('0')
  const [currency, setCurrency] = useState('USD')
  const [isFree, setIsFree] = useState(false)
  const [language, setLanguage] = useState('pt')
  const [level, setLevel] = useState('beginner')
  const [kind, setKind] = useState('course')
  const [category, setCategory] = useState<number | ''>('')
  const [categories, setCategories] = useState<Category[]>([])
  const [modules, setModules] = useState<CourseModule[]>([])
  const [moduleTitle, setModuleTitle] = useState('')
  const [lessonTitle, setLessonTitle] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [selectedModule, setSelectedModule] = useState<number | null>(null)
  const [id, setId] = useState<number | null>(courseId)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(!isNew)

  useEffect(() => {
    coursesApi.categories().then((res) => setCategories(unwrapList<Category>(res.data)))
    if (courseId) {
      instructorsApi.courses.get(courseId).then((res) => {
        const course = res.data as Course & { modules?: CourseModule[] }
        setTitle(course.title)
        setDescription(course.description)
        setShortDescription(course.short_description)
        setPrice(String(course.price))
        setCurrency(course.currency)
        setIsFree(course.is_free)
        setLanguage(course.language)
        setLevel(course.level)
        setKind(course.kind)
        setCategory(course.category || '')
        setModules(course.modules || [])
        setId(course.id)
      }).finally(() => setLoading(false))
    }
  }, [courseId])

  const saveDraft = async () => {
    setError('')
    try {
      const payload = {
        title,
        description,
        short_description: shortDescription,
        price: isFree ? '0' : price,
        currency,
        is_free: isFree,
        language,
        level,
        kind,
        category: category || null,
      }
      if (id) {
        await instructorsApi.courses.update(id, payload)
      } else {
        const res = await instructorsApi.courses.create(payload)
        const created = res.data as Course
        setId(created.id)
        router.replace(`/instructor/courses/${created.id}`)
      }
      setMessage(t('education.savedOk'))
    } catch (err) {
      setError(getApiErrorMessage(err, t('education.genericError')))
    }
  }

  const addModule = async () => {
    if (!id || !moduleTitle) return
    const res = await instructorsApi.modules.create({ course: id, title: moduleTitle, order: modules.length })
    setModules((prev) => [...prev, res.data as CourseModule])
    setModuleTitle('')
    setMessage(t('education.savedOk'))
  }

  const addLesson = async () => {
    if (!id || !selectedModule || !lessonTitle) return
    await instructorsApi.lessons.create({
      course: id,
      module: selectedModule,
      title: lessonTitle,
      slug: lessonTitle.toLowerCase().replace(/\s+/g, '-'),
      video_url: videoUrl,
      is_free: false,
      order: 0,
    })
    const res = await instructorsApi.courses.get(id)
    setModules((res.data as { modules?: CourseModule[] }).modules || [])
    setLessonTitle('')
    setVideoUrl('')
    setMessage(t('education.savedOk'))
  }

  const submit = async () => {
    if (!id) return
    try {
      await instructorsApi.courses.submit(id)
      setMessage(t('education.submittedOk'))
    } catch (err) {
      setError(getApiErrorMessage(err, t('education.genericError')))
    }
  }

  if (loading) {
    return (
      <EducationShell>
        <ZendaLoader message={t('education.loading')} />
      </EducationShell>
    )
  }

  return (
    <EducationShell>
      <h1 className="text-2xl font-bold text-zenda-navy mb-6">{t('education.createCourse')}</h1>
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {STEPS.map((key, i) => (
          <button
            key={key}
            type="button"
            onClick={() => setStep(i)}
            className={`px-3 py-2 rounded-full text-sm font-semibold whitespace-nowrap ${
              step === i ? 'bg-zenda-primary text-white' : 'bg-white border'
            }`}
          >
            {i + 1}. {t(key)}
          </button>
        ))}
      </div>
      {message ? <ZendaAlert tone="success" className="mb-4">{message}</ZendaAlert> : null}
      {error ? <ZendaAlert tone="error" className="mb-4">{error}</ZendaAlert> : null}

      {step === 0 ? (
        <div className="space-y-4 bg-white rounded-2xl border p-6">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('education.stepInfo')} className="w-full border rounded-xl px-3 py-2" />
          <textarea value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} className="w-full border rounded-xl px-3 py-2" />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full border rounded-xl px-3 py-2 min-h-[140px]" />
          <select value={category} onChange={(e) => setCategory(e.target.value ? Number(e.target.value) : '')} className="border rounded-xl px-3 py-2">
            <option value="">{t('education.category')}</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={language} onChange={(e) => setLanguage(e.target.value)} className="border rounded-xl px-3 py-2">
            <option value="pt">Português</option>
            <option value="en">English</option>
            <option value="fr">Français</option>
            <option value="es">Español</option>
          </select>
          <select value={level} onChange={(e) => setLevel(e.target.value)} className="border rounded-xl px-3 py-2">
            <option value="beginner">{t('education.beginner')}</option>
            <option value="intermediate">{t('education.intermediate')}</option>
            <option value="advanced">{t('education.advanced')}</option>
          </select>
          <select value={kind} onChange={(e) => setKind(e.target.value)} className="border rounded-xl px-3 py-2">
            <option value="course">{t('education.courseTab')}</option>
            <option value="tutorial">{t('education.tutorialTab')}</option>
          </select>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="space-y-4 bg-white rounded-2xl border p-6">
          <div className="flex gap-2">
            <input value={moduleTitle} onChange={(e) => setModuleTitle(e.target.value)} placeholder={t('education.addModule')} className="flex-1 border rounded-xl px-3 py-2" />
            <ZendaButton onClick={() => void addModule()}>{t('education.addModule')}</ZendaButton>
          </div>
          {modules.map((mod) => (
            <div key={mod.id} className="border rounded-xl p-4">
              <button type="button" className="font-semibold" onClick={() => setSelectedModule(mod.id)}>{mod.title}</button>
              <ul className="mt-2 text-sm text-zenda-text-secondary">
                {(mod.lessons || []).map((lesson) => <li key={lesson.id}>— {lesson.title}</li>)}
              </ul>
            </div>
          ))}
          {selectedModule ? (
            <div className="flex flex-col gap-2">
              <input value={lessonTitle} onChange={(e) => setLessonTitle(e.target.value)} placeholder={t('education.lessonTitle')} className="border rounded-xl px-3 py-2" />
              <input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder={t('education.videoUrl')} className="border rounded-xl px-3 py-2" />
              <ZendaButton onClick={() => void addLesson()}>{t('education.addLesson')}</ZendaButton>
            </div>
          ) : null}
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-4 bg-white rounded-2xl border p-6">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={isFree} onChange={(e) => setIsFree(e.target.checked)} />
            {t('education.free')}
          </label>
          <input value={price} onChange={(e) => setPrice(e.target.value)} disabled={isFree} className="border rounded-xl px-3 py-2" />
          <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="border rounded-xl px-3 py-2">
            <option value="USD">USD</option>
            <option value="AOA">AOA</option>
            <option value="EUR">EUR</option>
            <option value="ZAR">ZAR</option>
          </select>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="bg-white rounded-2xl border p-6 space-y-3">
          <p className="font-semibold">{title}</p>
          <p className="text-sm text-zenda-text-secondary">{description}</p>
          <p>{modules.length} {t('education.stepCurriculum')}</p>
        </div>
      ) : null}

      <div className="flex gap-3 mt-6">
        <ZendaButton variant="outline" onClick={() => void saveDraft()}>{t('education.saveDraft')}</ZendaButton>
        {step === 3 ? <ZendaButton onClick={() => void submit()}>{t('education.submitReview')}</ZendaButton> : (
          <ZendaButton onClick={() => setStep((s) => Math.min(s + 1, 3))}>{t('education.stepReview')}</ZendaButton>
        )}
      </div>
    </EducationShell>
  )
}
