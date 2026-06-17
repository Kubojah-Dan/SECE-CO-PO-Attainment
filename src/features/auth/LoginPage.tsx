import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ShieldCheck,
  Building2,
  User,
  Award,
  Eye,
  EyeOff,
} from 'lucide-react'
import { useAuthStore } from './useAuthStore'
import { ROLE_ROUTES } from './authTypes'
import type { Role } from './authTypes'
import { RoleCard } from '@/components/ui/RoleCard'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import logoUrl from '@/assets/logo.svg'

/* ─── Role definitions ─── */
interface RoleDef {
  key: Role
  title: string
  description: string
  icon: React.ReactNode
  accentColor: string
  accentBg: string
  badgeLabel: string
}

const ROLES: RoleDef[] = [
  {
    key: 'super_admin',
    title: 'Super Admin',
    description: 'Full system control',
    icon: <ShieldCheck size={20} />,
    accentColor: '#1A1F4E',
    accentBg: '#F5F6FD',
    badgeLabel: 'Super Admin',
  },
  {
    key: 'hod',
    title: 'HOD',
    description: 'Department head access',
    icon: <Building2 size={20} />,
    accentColor: '#0D6E5A',
    accentBg: '#E0F7F2',
    badgeLabel: 'Head of Department',
  },
  {
    key: 'faculty',
    title: 'Faculty',
    description: 'Course & CO management',
    icon: <User size={20} />,
    accentColor: '#4A52A3',
    accentBg: '#ECEDF8',
    badgeLabel: 'Faculty Member',
  },
  {
    key: 'iqac',
    title: 'IQAC',
    description: 'Accreditation & audit',
    icon: <Award size={20} />,
    accentColor: '#8A5200',
    accentBg: '#FEF4E4',
    badgeLabel: 'IQAC Coordinator',
  },
]

/* ─── Form validation ─── */
function validateEmail(value: string): string | undefined {
  if (!value.trim()) return 'Email / Employee ID is required'
  if (value.trim().length < 3) return 'Must be at least 3 characters'
  return undefined
}

function validatePassword(value: string): string | undefined {
  if (!value) return 'Password is required'
  if (value.length < 6) return 'Must be at least 6 characters'
  return undefined
}

/* ─── KPI Chip ─── */
function KpiChip({ label }: { label: string }) {
  return (
    <span className="text-white/70 text-[12px] font-medium px-1">{label}</span>
  )
}

/* ─── Login Page ─── */
export function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuthStore()

  // Role selection
  const [selectedRole, setSelectedRole] = useState<Role>('faculty')
  const activeDef = ROLES.find((r) => r.key === selectedRole)!

  // Form fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Validation errors (shown on blur)
  const [emailError, setEmailError] = useState<string | undefined>()
  const [passwordError, setPasswordError] = useState<string | undefined>()

  // Submit state
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState<string | undefined>()

  const handleEmailBlur = () => setEmailError(validateEmail(email))
  const handlePasswordBlur = () => setPasswordError(validatePassword(password))

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    // Validate all fields before submitting
    const eErr = validateEmail(email)
    const pErr = validatePassword(password)
    setEmailError(eErr)
    setPasswordError(pErr)
    if (eErr ?? pErr) return

    setLoading(true)
    setApiError(undefined)

    try {
      await login(email.trim(), password, selectedRole)
      navigate(ROLE_ROUTES[selectedRole], { replace: true })
    } catch (err: unknown) {
      if (err instanceof Error) {
        setApiError(err.message)
      } else {
        setApiError('Login failed. Please check your credentials.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full font-sans">
      {/* ─── LEFT PANEL ─── */}
      <div className="hidden md:flex md:w-[44%] bg-brand-900 flex-col justify-between p-10 relative overflow-hidden">
        {/* Subtle decorative circle */}
        <div
          className="absolute -bottom-32 -right-32 w-72 h-72 rounded-full"
          style={{ background: 'rgba(255,255,255,0.04)' }}
          aria-hidden="true"
        />
        <div
          className="absolute -top-20 -left-20 w-56 h-56 rounded-full"
          style={{ background: 'rgba(255,255,255,0.03)' }}
          aria-hidden="true"
        />

        {/* Logo + wordmark */}
        <div>
          <div className="flex items-center gap-3 mb-10">
            <img
              src={logoUrl}
              alt="OBE Attain logo"
              className="w-10 h-10"
            />
            <span className="text-white text-base font-medium tracking-tight">
              OBE Attain
            </span>
          </div>

          {/* Headline */}
          <h2 className="text-white text-[28px] font-medium leading-tight max-w-[280px] mb-4">
            CO-PO/PSO attainment, automated.
          </h2>

          {/* Subtext */}
          <p className="text-white/60 text-sm leading-relaxed max-w-[260px]">
            End-to-end outcome tracking for NBA and NAAC accreditation.
          </p>
        </div>

        {/* KPI chips */}
        <div className="flex items-center gap-0">
          <KpiChip label="12 POs" />
          <span className="text-white/20 text-sm">|</span>
          <KpiChip label="Direct + Indirect" />
          <span className="text-white/20 text-sm">|</span>
          <KpiChip label="NBA Ready" />
        </div>
      </div>

      {/* ─── RIGHT PANEL ─── */}
      <div className="flex flex-1 items-center justify-center bg-white px-6 py-10">
        <div className="w-full max-w-[400px]">
          {/* Mobile logo (shown only on small screens) */}
          <div className="flex md:hidden items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-brand-900 flex items-center justify-center">
              <img src={logoUrl} alt="" className="w-5 h-5" />
            </div>
            <span className="text-brand-950 text-sm font-medium">OBE Attain</span>
          </div>

          {/* Heading */}
          <div className="mb-7">
            <h1 className="text-brand-950 text-[18px] font-medium leading-tight">
              Sign in
            </h1>
            <p className="text-brand-300 text-[13px] mt-1">
              Choose your role to continue
            </p>
          </div>

          {/* Role selector */}
          <div
            className="grid grid-cols-2 gap-2.5 mb-4"
            role="group"
            aria-label="Select your role"
          >
            {ROLES.map((role) => (
              <RoleCard
                key={role.key}
                id={`role-card-${role.key}`}
                icon={role.icon}
                title={role.title}
                description={role.description}
                active={selectedRole === role.key}
                onClick={() => setSelectedRole(role.key)}
                accentColor={role.accentColor}
                accentBg={role.accentBg}
              />
            ))}
          </div>

          {/* Active role badge */}
          <div className="mb-6 flex items-center gap-2">
            <Badge
              label={activeDef.badgeLabel}
              bg={activeDef.accentBg}
              color={activeDef.accentColor}
            />
          </div>

          {/* Sign in form */}
          <form onSubmit={handleSubmit} noValidate>
            <div className="flex flex-col gap-4">
              {/* Email / Employee ID */}
              <Input
                id="login-email"
                label="Email / Employee ID"
                type="text"
                placeholder="you@institution.edu"
                value={email}
                onChange={setEmail}
                onBlur={handleEmailBlur}
                error={emailError}
                disabled={loading}
                autoComplete="username"
              />

              {/* Password with show/hide toggle */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="login-password"
                  className="text-[13px] font-medium text-brand-950"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={handlePasswordBlur}
                    disabled={loading}
                    autoComplete="current-password"
                    aria-invalid={!!passwordError}
                    aria-describedby={passwordError ? 'login-password-error' : undefined}
                    className={[
                      'w-full rounded-input border px-3.5 py-2.5 pr-11 text-sm text-brand-950',
                      'placeholder:text-brand-300 bg-white',
                      'transition-colors duration-150',
                      passwordError
                        ? 'border-red-400 focus:border-red-500'
                        : 'border-brand-100 focus:border-brand-900',
                      loading ? 'opacity-50 cursor-not-allowed bg-brand-50' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-300 hover:text-brand-700 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff size={16} aria-hidden="true" />
                    ) : (
                      <Eye size={16} aria-hidden="true" />
                    )}
                  </button>
                </div>
                {passwordError && (
                  <p
                    id="login-password-error"
                    role="alert"
                    className="text-[12px] text-red-500 font-medium"
                  >
                    {passwordError}
                  </p>
                )}
              </div>

              {/* API error */}
              {apiError && (
                <div
                  role="alert"
                  className="rounded-card border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-600"
                >
                  {apiError}
                </div>
              )}

              {/* Submit */}
              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={loading}
                disabled={loading}
                className="w-full mt-1"
              >
                {loading
                  ? 'Signing in…'
                  : `Sign in as ${activeDef.badgeLabel}`}
              </Button>
            </div>
          </form>

          {/* Footer link */}
          <p className="mt-6 text-center text-[12px] text-brand-300">
            Need access?{' '}
            <a
              href="mailto:admin@institution.edu"
              className="text-brand-700 hover:text-brand-900 transition-colors underline underline-offset-2"
            >
              Contact your admin
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
