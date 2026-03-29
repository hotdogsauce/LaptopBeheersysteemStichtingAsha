import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { UserProvider } from "../context/UserContext";
import { ToastProvider } from "../context/ToastContext";
import { ConfirmProvider } from "../context/ConfirmContext";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <UserProvider>
      <ToastProvider>
        <ConfirmProvider>
          <Component {...pageProps} />
        </ConfirmProvider>
      </ToastProvider>
    </UserProvider>
  );
}
