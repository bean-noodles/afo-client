import { useState } from "react";
import afoLogo from "../assets/icons/afo-logo.svg";
import googleLogo from "../assets/icons/google-logo.svg";

interface LoginProps {
  onSignIn: (identity: string) => void;
}

export function Login({ onSignIn }: LoginProps) {
  const [email, setEmail] = useState("");

  const continueWithEmail = () => {
    if (!email.trim()) return;
    onSignIn(email.trim());
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
              onKeyDown={(e) => e.key === "Enter" && continueWithEmail()}
            />
            <button
              type="button"
              className="login__continue"
              onClick={continueWithEmail}
            >
              Continue with email
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
            onClick={() => onSignIn("Google")}
          >
            <img src={googleLogo} alt="" width={20} height={20} />
            Sign in with Google
          </button>
        </div>
      </div>
    </div>
  );
}
