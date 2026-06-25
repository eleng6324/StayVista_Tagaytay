import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword, sendEmailVerification, updateProfile } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";
import AuthBackgroundVideo from "../components/AuthBackgroundVideo";

function Register() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("guest");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [verificationSent, setVerificationSent] = useState(false);

  const sendVerificationEmailToUser = async (user) => {
    await sendEmailVerification(user, {
      url: `${window.location.origin}/verify-email`,
      handleCodeInApp: true
    });
    setVerificationSent(true);
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus({ type: "", message: "" });

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      await updateProfile(userCredential.user, {
        displayName: fullName
      });

      await setDoc(doc(db, "users", userCredential.user.uid), {
        fullName,
        email,
        role
      });

      await sendVerificationEmailToUser(userCredential.user);

      setStatus({
        type: "success",
        message: `Account created successfully. A verification email has been sent to ${email}. Please check your Gmail inbox and spam folder before logging in.`
      });

      navigate("/login");
    } catch (error) {
      setStatus({
        type: "error",
        message: error.message
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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

        <p className="eyebrow">Your home base in Tagaytay</p>
        <h1>Start with a calm, fresh space built for Tagaytay getaways.</h1>
        <p className="hero-copy">
          Create your account to book peaceful ridge retreats, host memorable stays,
          or manage your guest experience with a cleaner and easier platform.
        </p>

        <div className="hero-highlights">
          <div>
            <strong>For travelers</strong>
            <span>Save favorite stays near Sky Ranch, People&apos;s Park, and scenic cafes.</span>
          </div>
          <div>
            <strong>For hosts</strong>
            <span>Welcome weekend guests looking for cool weather, quiet mornings, and fresh air.</span>
          </div>
        </div>

        <div className="hero-metrics">
          <div>
            <strong>Easy setup</strong>
            <span>Create your account in minutes</span>
          </div>
          <div>
            <strong>Flexible roles</strong>
            <span>Guest, host, or admin</span>
          </div>
          <div>
            <strong>Tagaytay-first</strong>
            <span>Designed around local stays</span>
          </div>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <div className="auth-card-header">
            <p className="auth-kicker">Create your account</p>
            <h2>Register with StayVista Tagaytay</h2>
            <p>
              Set up your profile and start exploring unique stays in Tagaytay.
            </p>
          </div>

          <form className="auth-form" onSubmit={handleRegister}>
            <label className="field">
              <span>Full name</span>
              <input
                type="text"
                placeholder="Juan Dela Cruz"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </label>

            <label className="field">
              <span>Email address</span>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>

            <label className="field">
              <span>Password</span>
              <input
                type="password"
                placeholder="Create a secure password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>

            <label className="field">
              <span>Account type</span>
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="guest">Guest</option>
                <option value="host">Host</option>
                <option value="admin">Admin</option>
              </select>
            </label>

            {status.message && (
              <div className={`status-message ${status.type}`}>{status.message}</div>
            )}

            {verificationSent && (
              <button
                type="button"
                className="auth-secondary-button"
                onClick={async () => {
                  setIsSubmitting(true);
                  setStatus({ type: "", message: "" });
                  try {
                    const currentUser = auth.currentUser;
                    if (!currentUser) {
                      throw new Error("Unable to resend verification email. Please refresh the page and try again.");
                    }
                    await sendVerificationEmailToUser(currentUser);
                    setStatus({
                      type: "success",
                      message: `Verification email resent to ${email}. Check your Gmail inbox and spam folder.`
                    });
                  } catch (error) {
                    setStatus({ type: "error", message: error.message });
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Resending verification..." : "Resend verification email"}
              </button>
            )}

            <button type="submit" className="auth-button" disabled={isSubmitting}>
              {isSubmitting ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="auth-footer">
            Already have an account? <Link to="/login">Log in</Link>
          </p>
        </div>
      </section>
    </main>
  );
}

export default Register;
