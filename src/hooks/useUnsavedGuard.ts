import { useEffect } from 'react'
import { useBlocker } from 'react-router-dom'

/**
 * Blocks React Router navigation and browser tab close when isDirty is true.
 * Shows a native browser confirm dialog (as required by spec for tab-close)
 * and uses useBlocker for in-app navigation.
 */
export function useUnsavedGuard(isDirty: boolean) {
  /* Block in-app navigation */
  useBlocker(({ currentLocation, nextLocation }) => {
    if (!isDirty) return false
    if (currentLocation.pathname === nextLocation.pathname) return false
    return !window.confirm('You have unsaved changes. Leave anyway?')
  })

  /* Block browser tab close / refresh */
  useEffect(() => {
    if (!isDirty) return
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])
}
