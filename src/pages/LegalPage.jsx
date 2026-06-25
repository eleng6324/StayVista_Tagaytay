import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import Navbar from "../components/Navbar";

function LegalPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [menuOpen, setMenuOpen] = useState(false);
  const [profilePhotoURL, setProfilePhotoURL] = useState("");
  const [profileInitial, setProfileInitial] = useState("H");

  // Keep all state from previous wizard steps
  const previousState = location.state || {};

  // Form state
  const [safety, setSafety] = useState(previousState.safety || {
    securityCamera: false,
    noiseMonitor: false,
    weapons: false,
  });

  const openSameTab = (path) => {
    window.location.href = path;
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      setProfilePhotoURL(user.photoURL || "");
      const initial = user.displayName?.trim().charAt(0) || user.email?.trim().charAt(0) || "H";
      setProfileInitial(initial.toUpperCase());
    }
  }, []);

  const handleCheckboxChange = (type) => {
    setSafety((prev) => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

  const handleBack = () => {
    navigate("/host/create-listing/discounts", { state: previousState });
  };

  const handleNext = () => {
    navigate("/host/create-listing/final-details", {
      state: {
        ...previousState,
        safety,
      },
    });
  };

  return (
    <main className="host-shell create-listing-page">
      <Navbar
        profilePhotoURL={profilePhotoURL}
        profileInitial={profileInitial}
        onMenuToggle={() => setMenuOpen((value) => !value)}
        menuOpen={menuOpen}
        homePath="/host"
        isHost
      />

      {menuOpen && (
        <div className="guest-menu-dropdown guest-menu-dropdown-fixed">
          <button type="button" className="menu-item menu-item-icon" onClick={() => openSameTab("/account-settings")}>
            <i className="fa-solid fa-gear" aria-hidden="true" />
            <span>Account settings</span>
          </button>
          <div className="menu-divider" />
          <button type="button" className="menu-item menu-item-icon" onClick={handleLogout}>
            <i className="fa-solid fa-right-from-bracket" aria-hidden="true" />
            <span>Log out</span>
          </button>
        </div>
      )}

      <section className="create-listing-container">
        <div className="structure-page-card list-form-card">
          <div className="list-form-content">
            <h1 className="create-listing-title">Share safety details</h1>
            <p className="create-listing-description legal-description">Does your place have any of these? <i className="fa-regular fa-circle-question" /></p>
            
            <div className="safety-checkboxes">
              <label className="safety-checkbox-label">
                <span>Exterior security camera present</span>
                <input
                  type="checkbox"
                  checked={safety.securityCamera}
                  onChange={() => handleCheckboxChange("securityCamera")}
                />
              </label>
              
              <label className="safety-checkbox-label">
                <span>Noise decibel monitor present</span>
                <input
                  type="checkbox"
                  checked={safety.noiseMonitor}
                  onChange={() => handleCheckboxChange("noiseMonitor")}
                />
              </label>

              <label className="safety-checkbox-label">
                <span>Weapon(s) on the property</span>
                <input
                  type="checkbox"
                  checked={safety.weapons}
                  onChange={() => handleCheckboxChange("weapons")}
                />
              </label>
            </div>
            
            <div className="safety-important-notes">
              <strong>Important things to know</strong>
              <p>Security cameras that monitor indoor spaces are not allowed even if they're turned off. All exterior security cameras must be disclosed.</p>
              <p>Be sure to comply with your <u>local laws</u> and review Airbnb's <u>anti-discrimination policy</u> and guest and Host fees.</p>
            </div>
          </div>

          <div className="structure-footer">
            <button type="button" className="create-listing-back-button" onClick={handleBack}>
              Back
            </button>
            <button type="button" className="create-listing-button" onClick={handleNext}>
              Next
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

export default LegalPage;

