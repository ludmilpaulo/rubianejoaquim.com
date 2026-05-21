/**
 * Mobile API smoke test — exercises endpoints used by the Zenda app.
 * Run: node scripts/smoke-test-api.mjs
 * Env: API_BASE=http://127.0.0.1:8000/api TEST_EMAIL=... TEST_PASSWORD=...
 */

const API_BASE = (process.env.API_BASE || 'http://127.0.0.1:8000/api').replace(/\/$/, '')
const EMAIL = process.env.TEST_EMAIL || 'Maitland@2025'
const PASSWORD = process.env.TEST_PASSWORD || 'Maitland@2025'

const results = []

async function req(method, path, { token, body, expect = [200, 201] } = {}) {
  const url = `${API_BASE}${path}`
  const headers = { Accept: 'application/json' }
  if (body) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Token ${token}`

  let res
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch (e) {
    results.push({ path, method, ok: false, status: 0, error: e.message })
    return null
  }

  const ok = expect.includes(res.status)
  let text = ''
  try {
    text = await res.text()
  } catch {
    text = ''
  }
  const snippet = text.slice(0, 120)
  results.push({ path, method, ok, status: res.status, snippet: ok ? '' : snippet })
  if (!ok) return null

  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    return { _raw: text.slice(0, 200) }
  }
}

function list(data) {
  if (Array.isArray(data)) return data
  if (data?.results) return data.results
  return []
}

async function main() {
  console.log(`\nZenda Mobile API Smoke Test`)
  console.log(`API: ${API_BASE}`)
  console.log(`User: ${EMAIL}\n`)

  const login = await req('POST', '/auth/login/', {
    body: { email: EMAIL, password: PASSWORD },
    expect: [200],
  })
  if (!login?.token) {
    console.error('LOGIN FAILED — run: python manage.py seed_test_data')
    printReport()
    process.exit(1)
  }
  const token = login.token
  console.log('✓ Login')

  await req('GET', '/auth/me/', { token })
  await req('GET', '/config/app-version/')
  await req('GET', '/course/enrollment/', { token })
  await req('GET', '/mentorship/requests/', { token, expect: [200, 404] })
  await req('GET', '/subscriptions/mobile/', { token, expect: [200, 404] })

  await req('GET', '/finance/categories/', { token })
  await req('GET', '/finance/personal/expenses/', { token })
  await req('GET', '/finance/personal/expenses/summary/', { token })
  await req('GET', '/finance/personal/budgets/', { token })
  await req('GET', '/finance/personal/goals/', { token })
  await req('GET', '/finance/personal/debts/', { token })
  await req('GET', '/finance/personal/income/', { token })
  await req('GET', '/finance/personal/income/summary/', { token })
  await req('GET', '/finance/dashboard/', { token })
  await req('GET', '/finance/dashboard/health-history/', { token })
  await req('GET', '/finance/dashboard/analytics/', { token })
  await req('GET', '/finance/dashboard/health_score/', { token })
  await req('GET', '/finance/exchange-rates/', { token })
  await req('GET', '/finance/business/sales/', { token })
  await req('GET', '/finance/business/expenses/', { token })
  await req('GET', '/finance/business/metrics/overview/', { token })
  await req('GET', '/finance/receipts/', { token, expect: [200, 404] })

  const budgets = await req('GET', '/finance/personal/budgets/', { token })
  const budgetList = list(budgets)
  if (budgetList[0]?.id) {
    await req('GET', `/finance/personal/budgets/${budgetList[0].id}/expenses/`, { token })
  }

  await req('GET', '/course/course/', { token })
  await req('GET', '/course/lesson/', { token })
  await req('GET', '/tasks/categories/', { token })
  await req('GET', '/tasks/tasks/', { token })
  await req('GET', '/tasks/tasks/today/', { token })
  await req('GET', '/tasks/targets/', { token, expect: [200, 404] })

  await req('GET', '/ai-copilot/conversations/', { token, expect: [200, 403, 404] })
  await req('GET', '/finance-space/spaces/', { token, expect: [200, 403, 404] })

  await req('GET', '/course/referral-points/', { token, expect: [200, 404] })
  await req('GET', '/course/user-points/balance/', { token, expect: [200, 404] })

  printReport()
  const failed = results.filter((r) => !r.ok)
  process.exit(failed.length ? 1 : 0)
}

function printReport() {
  const passed = results.filter((r) => r.ok).length
  const failed = results.filter((r) => !r.ok)
  console.log(`\n--- Results: ${passed}/${results.length} passed ---`)
  for (const f of failed) {
    console.log(`✗ ${f.method} ${f.path} → ${f.status} ${f.error || f.snippet || ''}`)
  }
  if (!failed.length) console.log('All endpoint checks passed.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
