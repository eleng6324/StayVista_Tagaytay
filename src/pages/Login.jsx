import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import AuthBackgroundVideo from "../components/AuthBackgroundVideo";

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });

  const handleLogin = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus({ type: "", message: "" });

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      if (!userCredential.user.emailVerified) {
        await signOut(auth);
        setStatus({
          type: "error",
          message: "Your email address is not verified yet. Please check your Gmail inbox and spam folder, then verify your email first."
        });
        return;
      }

      const snapshot = await getDoc(doc(db, "users", userCredential.user.uid));
      const role = snapshot.exists() ? String(snapshot.data().role || "guest").toLowerCase() : "guest";
      if (role) {
        localStorage.setItem(`stayvista-role-view-${userCredential.user.uid}`, role);
      }

      setStatus({
        type: "success",
        message: "Welcome back to StayVista Tagaytay. Preparing your account now."
      });

      if (role === "guest" || role === "user") {
        navigate("/guest");
        return;
      }

      if (role === "host") {
        navigate("/host");
        return;
      }

      if (role === "admin") {
        navigate("/admin");
      }
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
        videoId="px59842WYHg"
        title="Scenic Tagaytay aerial background video"
      />

      <section className="auth-hero">
        <div className="hero-topbar">
          <div className="brand-badge">StayVista Tagaytay</div>
          
        </div>

        <p className="eyebrow">Tagaytay, Philippines</p>
        <h1>Fresh mountain stays with a calm resort feel.</h1>
        <p className="hero-copy">
          Sign in to discover ridge-view villas, relaxing rooms near Taal Lake,
          and thoughtfully hosted spaces designed for quick escapes and cozy weekends.
        </p>

        <div className="hero-highlights">
          <div>
            <strong>Lake and ridge views</strong>
            <span>Browse handpicked stays close to cafes, picnic spots, and cool-weather lookouts.</span>
          </div>
          <div>
            <strong>Warm local hosting</strong>
            <span>Stay with hosts who know the best brunch corners, sunsets, and hidden rest stops.</span>
          </div>
        </div>

        <div className="hero-metrics">
          <div>
            <strong>120+</strong>
            <span>Cozy stays</span>
          </div>
          <div>
            <strong>4.9/5</strong>
            <span>Guest rating</span>
          </div>
          <div>
            <strong>Weekend-ready</strong>
            <span>Fast booking flow</span>
          </div>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <div className="auth-card-header">
            <p className="auth-kicker">Welcome back</p>
            <h2>Log in to your account</h2>
            <p>
              Continue planning your next Tagaytay getaway with a simple, secure sign-in.
            </p>
          </div>

  

          <form className="auth-form" onSubmit={handleLogin}>
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
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>

            {status.message && (
              <div className={`status-message ${status.type}`}>{status.message}</div>
            )}

            <button type="submit" className="auth-button" disabled={isSubmitting}>
              {isSubmitting ? "Signing in..." : "Log in"}
            </button>
          </form>

          <p className="auth-footer">
            New to StayVista Tagaytay? <Link to="/register">Create an account</Link>
          </p>
        </div>
      </section>
    </main>
  );
}

export default Login;
