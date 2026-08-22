import { useEffect, useRef, useState } from "react";
import { loginWithGoogle, requestMagicLink } from "../api";
import type { User } from "../types";
import afoLogo from "../assets/icons/afo-logo.svg";
import googleLogo from "../assets/icons/google-logo.svg";

interface LoginProps {
  onLoggedIn: (token: string, user: User) => void;
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

export function Login({ onLoggedIn }: LoginProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");
  const [googleReady, setGoogleReady] = useState(false);
  // GSI only renders its own button, so it is mounted off-screen and clicked
  // programmatically — that keeps the designed button as the visible control.
  const googleSlotRef = useRef<HTMLDivElement>(null);

  const continueWithEmail = async () => {
    const trimmed = email.trim();
    if (!trimmed || status === "sending") return;
    setStatus("sending");
    setError("");
    try {
      await requestMagicLink(trimmed);
      setStatus("sent");
    } catch (err) {
      setStatus("idle");
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => {
      if (!window.google || !googleSlotRef.current) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => {
          void (async () => {
            try {
              const { token, user } = await loginWithGoogle(response.credential);
              onLoggedIn(token, user);
            } catch (err) {
              setError(err instanceof Error ? err.message : String(err));
            }
          })();
        },
      });
      window.google.accounts.id.renderButton(googleSlotRef.current, {
        theme: "outline",
        size: "large",
      });
      setGoogleReady(true);
    };
    document.body.appendChild(script);
    return () => {
      script.remove();
    };
  }, [onLoggedIn]);

  const signInWithGoogle = () => {
    const button = googleSlotRef.current?.querySelector<HTMLElement>("div[role=button]");
    if (button) button.click();
    else window.google?.accounts.id.prompt();
  };

  return (
    <div className="login">
      <div className="login__card">
        <img src={afoLogo} alt="AFO" className="login__logo" width={68} height={28} />
        <p className="login__title">Sign in or Register</p>
        <div className="login__form">
          <div className="login__primary-group">
            <input
              className="login__input"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void continueWithEmail()}
              disabled={status === "sending"}
            />
            <button
              type="button"
              className="login__continue"
              onClick={() => void continueWithEmail()}
              disabled={status === "sending" || !email.trim()}
            >
              {status === "sending" ? "Sending..." : "Continue with email"}
            </button>
          </div>
          <div className="login__divider">
            <span className="login__divider-line" />
            <span className="login__divider-text">or</span>
            <span className="login__divider-line" />
          </div>
          <button
            type="button"
            className="login__google"
            onClick={signInWithGoogle}
            disabled={!googleReady}
          >
            <img src={googleLogo} alt="" width={20} height={20} />
            Sign in with Google
          </button>
          <div ref={googleSlotRef} className="login__google-slot" aria-hidden="true" />
        </div>
        {status === "sent" && (
          <p className="login__hint">
            메일함에서 로그인 링크를 확인하세요. 링크를 클릭하면 자동으로 로그인됩니다.
          </p>
        )}
        {error && <p className="login__error">{error}</p>}
        {!GOOGLE_CLIENT_ID && (
          <p className="login__hint">
            Google 로그인을 쓰려면 <code>VITE_GOOGLE_CLIENT_ID</code>를 설정하세요.
          </p>
        )}
      </div>
    </div>
  );
}
