import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import Navbar from "../components/Navbar";

function DiscountsPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [menuOpen, setMenuOpen] = useState(false);
  const [profilePhotoURL, setProfilePhotoURL] = useState("");
  const [profileInitial, setProfileInitial] = useState("H");

  // Keep all state from previous wizard steps
  const previousState = location.state || {};

  // Form state
  const [discounts, setDiscounts] = useState(previousState.discounts || {
    newListing: false,
    lastMinute: false,
    weekly: false,
    monthly: false,
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

  const handleToggle = (type) => {
    setDiscounts((prev) => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

  const handleBack = () => {
    navigate("/host/create-listing/weekend-price", { state: previousState });
  };

  const handleNext = () => {
    navigate("/host/create-listing/legal", {
      state: {
        ...previousState,
        discounts,
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
            <h1 className="create-listing-title">Add discounts</h1>
            <p className="create-listing-description">Help your place stand out to get booked faster and earn your first reviews.</p>
            
            <div className="checkbox-cards-list">
              {/* New listing promotion */}
              <button
                type="button"
                className={`checkbox-card ${discounts.newListing ? "checkbox-card-selected" : ""}`}
                onClick={() => handleToggle("newListing")}
              >
                <div className="checkbox-card-content">
                  <div className="checkbox-card-value">20%</div>
                  <div className="checkbox-card-text">
                    <strong>New listing promotion</strong>
                    <p>Offer 20% off your first 3 bookings</p>
                  </div>
                </div>
                <div className={`checkbox-indicator ${discounts.newListing ? "checkbox-indicator-checked" : ""}`}>
                  {discounts.newListing && <i className="fa-solid fa-check" />}
                </div>
              </button>

              {/* Last-minute discount */}
              <button
                type="button"
                className={`checkbox-card ${discounts.lastMinute ? "checkbox-card-selected" : ""}`}
                onClick={() => handleToggle("lastMinute")}
              >
                <div className="checkbox-card-content">
                  <div className="checkbox-card-value">4%</div>
                  <div className="checkbox-card-text">
                    <strong>Last-minute discount</strong>
                    <p>For stays booked 14 days or less before arrival</p>
                  </div>
                </div>
                <div className={`checkbox-indicator ${discounts.lastMinute ? "checkbox-indicator-checked" : ""}`}>
                  {discounts.lastMinute && <i className="fa-solid fa-check" />}
                </div>
              </button>

              {/* Weekly discount */}
              <button
                type="button"
                className={`checkbox-card ${discounts.weekly ? "checkbox-card-selected" : ""}`}
                onClick={() => handleToggle("weekly")}
              >
                <div className="checkbox-card-content">
                  <div className="checkbox-card-value">10%</div>
                  <div className="checkbox-card-text">
                    <strong>Weekly discount</strong>
                    <p>For stays of 7 nights or more</p>
                  </div>
                </div>
                <div className={`checkbox-indicator ${discounts.weekly ? "checkbox-indicator-checked" : ""}`}>
                  {discounts.weekly && <i className="fa-solid fa-check" />}
                </div>
              </button>

              {/* Monthly discount */}
              <button
                type="button"
                className={`checkbox-card ${discounts.monthly ? "checkbox-card-selected" : ""}`}
                onClick={() => handleToggle("monthly")}
              >
                <div className="checkbox-card-content">
                  <div className="checkbox-card-value">25%</div>
                  <div className="checkbox-card-text">
                    <strong>Monthly discount</strong>
                    <p>For stays of 28 nights or more</p>
                  </div>
                </div>
                <div className={`checkbox-indicator ${discounts.monthly ? "checkbox-indicator-checked" : ""}`}>
                  {discounts.monthly && <i className="fa-solid fa-check" />}
                </div>
              </button>
            </div>
            
            <div className="form-sub-note">
              <p>Only one discount will be applied per stay. <span>Learn more</span></p>
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

export default DiscountsPage;

