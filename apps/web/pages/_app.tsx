import "@/styles/globals.css";
import "react-day-picker/style.css";
import type { AppProps } from "next/app";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { UserProvider, useUser } from "../context/UserContext";
import { ToastProvider } from "../context/ToastContext";
import { ConfirmProvider } from "../context/ConfirmContext";
import { LanguageProvider } from "../context/LanguageContext";
import PageProgressBar from "../components/PageProgressBar";
import FirstLoginFlow from "../components/FirstLoginFlow";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { loggedIn } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (!loggedIn && router.pathname !== '/login') {
      router.replace('/login')
    }
  }, [loggedIn, router.pathname])

  if (!loggedIn && router.pathname !== '/login') return null
  return <>{children}</>
}

/** Shown once per user after first login. Checks localStorage flag. */
function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { loggedIn, loggedInUser } = useUser()
  const router = useRouter()
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    if (!loggedIn || !loggedInUser || router.pathname === '/login') {
      setShowOnboarding(false)
      return
    }
    const flag = localStorage.getItem(`asha-onboarded-${loggedInUser.userId}`)
    if (!flag) setShowOnboarding(true)
  }, [loggedIn, loggedInUser?.userId, router.pathname])

  return (
    <>
      {children}
      {showOnboarding && (
        <FirstLoginFlow onDone={() => setShowOnboarding(false)} />
      )}
    </>
  )
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <LanguageProvider>
      <UserProvider>
        <ToastProvider>
          <ConfirmProvider>
            <PageProgressBar />
            <AuthGuard>
              <OnboardingGuard>
                <Component {...pageProps} />
              </OnboardingGuard>
            </AuthGuard>
          </ConfirmProvider>
        </ToastProvider>
      </UserProvider>
    </LanguageProvider>
  );
}
