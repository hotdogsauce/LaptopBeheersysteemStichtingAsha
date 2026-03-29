import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { UserProvider, useUser } from "../context/UserContext";
import { ToastProvider } from "../context/ToastContext";
import { ConfirmProvider } from "../context/ConfirmContext";

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

export default function App({ Component, pageProps }: AppProps) {
  return (
    <UserProvider>
      <ToastProvider>
        <ConfirmProvider>
          <AuthGuard>
            <Component {...pageProps} />
          </AuthGuard>
        </ConfirmProvider>
      </ToastProvider>
    </UserProvider>
  );
}
