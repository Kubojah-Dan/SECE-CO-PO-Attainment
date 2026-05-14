import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'

export function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface">
      <div className="text-center max-w-sm">
        <p className="text-brand-300 text-[72px] font-medium leading-none">404</p>
        <h1 className="text-brand-950 text-[20px] font-medium mt-2">Page not found</h1>
        <p className="text-brand-300 text-[13px] mt-2 mb-6">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Button variant="primary" onClick={() => navigate(-1)}>← Go back</Button>
      </div>
    </div>
  )
}
