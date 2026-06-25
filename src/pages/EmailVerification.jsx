import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { applyActionCode } from "firebase/auth";
import { auth } from "../firebase";
import AuthBackgroundVideo from "../components/AuthBackgroundVideo";

function EmailVerification() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState({ type: "", message: "" });
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const verifyEmail = async () => {
      const oobCode = searchParams.get("oobCode");
      const mode = searchParams.get("mode");

      if (oobCode) {
        try {
          await applyActionCode(auth, oobCode);
          setStatus({
            type: "success",
            message: "Your email has been successfully verified! You can now log in to your StayVista Tagaytay account."
          });
        } catch (error) {
          console.error("Verification error:", error);
          setStatus({
            type: "error",
            message: "This verification link is invalid or has expired. Please request a new verification email."
          });
        } finally {
          setIsProcessing(false);
        }
        return;
      }

      try {
        const currentUser = auth.currentUser;
        if (currentUser) {
          await currentUser.reload();
          if (currentUser.emailVerified) {
            setStatus({
              type: "success",
              message: "Your email is already verified. You can now continue to login."
            });
          } else {
            setStatus({
              type: "error",
              message: "Your verification link was opened, but we could not complete verification automatically. Please return to login and try again or request a new verification email."
            });
          }
        } else if (mode === "verifyEmail") {
          setStatus({
            type: "success",
            message: "Your email verification link was processed. Please continue to login with your StayVista Tagaytay account."
          });
        } else {
          setStatus({
            type: "info",
            message: "If you clicked the verification link, your email may already be verified. Please continue to login. If you still cannot sign in, request a new verification email or register again."
          });
        }
      } catch (error) {
        console.error("Verification fallback error:", error);
        setStatus({
          type: "error",
          message: "Unable to verify your email automatically. Please return to login and try again, or resend the verification email from your account."
        });
      } finally {
        setIsProcessing(false);
      }
    };

    verifyEmail();
  }, [searchParams]);

  return (
    <main className="auth-shell">
      <AuthBackgroundVideo
        videoId="CH9UNh0_pTw"
        title="Tagaytay hotel room tour background video"
      />

      <section className="auth-hero">
        <div className="hero-topbar">
          <div className="brand-badge">StayVista Tagaytay</div>
        </div>

        <p className="eyebrow">Email Verification</p>
        <h1>Your Tagaytay stay awaits</h1>
        <p className="hero-copy">
          We're verifying your email address to ensure a secure and personalized experience
          for your Tagaytay getaways and weekend retreats.
        </p>

        <div className="hero-highlights">
          <div>
            <strong>Secure verification</strong>
            <span>Your email verification helps us keep your account safe and personalized.</span>
          </div>
          <div>
            <strong>Ready to explore</strong>
            <span>Once verified, you can start browsing ridge-view villas and lake-side stays.</span>
          </div>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <div className="auth-card-header">
            <p className="auth-kicker">Verifying your email</p>
            <h2>Email Verification</h2>
            <p>
              Please wait while we verify your email address...
            </p>
          </div>

          {isProcessing && (
            <div className="verification-loading">
              <div className="verification-spinner"></div>
              <p>Verifying your email...</p>
            </div>
          )}

          {status.message && (
            <div className={`status-message ${status.type}`}>
              {status.message}
            </div>
          )}

          {!isProcessing && (status.type === "success" || status.type === "info") && (
            <a
              href="/login"
              className="auth-button"
            >
              Continue to Login
            </a>
          )}

          {!isProcessing && status.type === "error" && (
            <div className="verification-actions">
              <a
                href="/register"
                className="auth-secondary-button"
              >
                Back to Registration
              </a>
              <a
                href="/login"
                className="auth-button"
              >
                Go to Login
              </a>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default EmailVerification;