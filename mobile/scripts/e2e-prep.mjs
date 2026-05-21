/**
 * Prepare backend + test user for E2E (onboarding skipped, active subscription).
 * Run: node scripts/e2e-prep.mjs
 */
const API = (process.env.API_BASE || 'http://127.0.0.1:8000/api').replace(/\/$/, '')
const EMAIL = process.env.TEST_EMAIL || 'Maitland@2025'
const PASSWORD = process.env.TEST_PASSWORD || 'Maitland@2025'

async function main() {
  const loginRes = await fetch(`${API}/auth/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  })
  if (!loginRes.ok) {
    console.error('Login failed. Run: cd backend && python manage.py seed_test_data')
    process.exit(1)
  }
  const { token } = await loginRes.json()

  await fetch(`${API}/auth/profile/`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Token ${token}`,
    },
    body: JSON.stringify({ onboarding_completed: true }),
  })

  const subRes = await fetch(`${API}/subscriptions/mobile/subscribe/`, {
    method: 'POST',
    headers: { Authorization: `Token ${token}` },
  })
  if (subRes.status === 400) {
    console.log('Subscription already exists (OK)')
  } else if (subRes.ok) {
    console.log('Trial subscription started')
  }

  const me = await fetch(`${API}/subscriptions/mobile/me/`, {
    headers: { Authorization: `Token ${token}` },
  }).then((r) => r.json())
  console.log('has_access:', me.has_access)
  console.log('E2E prep done for', EMAIL)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
