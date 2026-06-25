import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import Navbar from "../components/Navbar";

function formatPrice(value) {
  return `₱${value.toLocaleString()}`;
}

function WeekendPrice() {
  const navigate = useNavigate();
  const location = useLocation();

  const [menuOpen, setMenuOpen] = useState(false);
  const [profilePhotoURL, setProfilePhotoURL] = useState("");
  const [profileInitial, setProfileInitial] = useState("H");
  const previousState = location.state || {};

  const basePrice = previousState.basePrice || 1603;
  const [premium, setPremium] = useState(previousState.weekendPremium ?? 5);
  const [premiumInput, setPremiumInput] = useState(String(previousState.weekendPremium ?? 5));

  const address = previousState.address || "";
  const selectedType = previousState.selectedType || "";
  const pricingModel = previousState.pricingModel || "perGuest";
  const guests = previousState.guests || 1;
  const bedrooms = previousState.bedrooms || 1;
  const beds = previousState.beds || 1;
  const bathrooms = previousState.bathrooms || 1;
  const amenities = previousState.amenities || [];
  const listingTitle = previousState.listingTitle || "";
  const selectedHighlights = previousState.selectedHighlights || [];
  const description = previousState.description || "";
  const photoUrls = previousState.photoUrls || [];

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      setProfilePhotoURL(user.photoURL || "");
      const initial = user.displayName?.trim().charAt(0) || user.email?.trim().charAt(0) || "H";
      setProfileInitial(initial.toUpperCase());
    }
  }, []);

  useEffect(() => {
    setPremiumInput(String(premium));
  }, [premium]);

  const openSameTab = (path) => {
    window.location.href = path;
  };

  const weekendBase = Math.round(basePrice * (1 + premium / 100));
  const guestServiceFee = Math.round(weekendBase * 0.141);
  const guestPrice = weekendBase + guestServiceFee;

  const handleSliderChange = (e) => {
    const val = Number(e.target.value);
    setPremium(val);
  };

  const handleInputChange = (e) => {
    const raw = e.target.value.replace(/[^0-9]/g, "");
    setPremiumInput(raw);
    const num = parseInt(raw || "0", 10);
    if (!Number.isNaN(num)) {
      const clamped = Math.max(0, Math.min(99, num));
      setPremium(clamped);
    }
  };

  const handleInputBlur = () => {
    if (premiumInput === "") {
      setPremium(0);
      setPremiumInput("0");
    }
  };

  const handleBack = () => {
    navigate("/host/create-listing/price", {
      state: {
        ...previousState,
        address,
        selectedType,
        pricingModel,
        guests,
        bedrooms,
        beds,
        bathrooms,
        amenities,
        listingTitle,
        selectedHighlights,
        description,
        basePrice,
        weekendPremium: premium,
        photoUrls,
      },
    });
  };

  const handleNext = () => {
    navigate("/host/create-listing/discounts", {
      state: {
        ...previousState,
        address,
        selectedType,
        pricingModel,
        guests,
        bedrooms,
        beds,
        bathrooms,
        amenities,
        listingTitle,
        selectedHighlights,
        description,
        basePrice,
        weekendPremium: premium,
        weekendBase,
        photoUrls,
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
        </div>
      )}

      <section className="create-listing-container">
        <div className="structure-page-card price-page-card">
          <div className="price-page-content">
            <div>
              <h1 className="create-listing-title">Set a weekend price</h1>
              <p className="create-listing-description price-page-description">Add a premium for Fridays and Saturdays.</p>
            </div>

            <div className="price-display-card">
              <div className="price-amount-row">
                <span className="price-value">{formatPrice(weekendBase)}</span>
              </div>
              <p className="price-subtitle">Guest price before taxes {formatPrice(guestPrice)}</p>
            </div>

            <div className="weekend-premium-section">
              <div className="weekend-premium-header">
                <div>
                  <div className="weekend-premium-title">Weekend premium</div>
                  <div className="weekend-premium-tip">Tip: Try 5%</div>
                </div>
                <div className="weekend-premium-input-wrapper">
                  <input
                    type="text"
                    className="weekend-premium-input"
                    value={premiumInput}
                    onChange={handleInputChange}
                    onBlur={handleInputBlur}
                  />
                  <span className="weekend-premium-symbol">%</span>
                </div>
              </div>

              <input
                type="range"
                min="0"
                max="99"
                value={premium}
                onChange={handleSliderChange}
                className="weekend-premium-slider"
              />

              <div className="weekend-premium-range-labels">
                <span>0%</span>
                <span>99%</span>
              </div>
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

export default WeekendPrice;

