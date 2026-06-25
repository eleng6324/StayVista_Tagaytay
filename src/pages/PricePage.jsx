import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import Navbar from "../components/Navbar";

function formatPrice(value) {
  return `₱${value.toLocaleString()}`;
}

function PricePage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [menuOpen, setMenuOpen] = useState(false);
  const [profilePhotoURL, setProfilePhotoURL] = useState("");
  const [profileInitial, setProfileInitial] = useState("H");
  const previousState = location.state || {};
  const [basePrice, setBasePrice] = useState(previousState.basePrice || 1603);
  const [isEditing, setIsEditing] = useState(false);
  const [draftPrice, setDraftPrice] = useState(String(previousState.basePrice || 1603));
  const [pricingModel, setPricingModel] = useState(previousState.pricingModel || "perGuest");

  const address = previousState.address || "";
  const selectedType = previousState.selectedType || "";
  const isExperience = selectedType.toLowerCase() === "experience";
  const guests = previousState.guests || 1;
  const bedrooms = previousState.bedrooms || 1;
  const beds = previousState.beds || 1;
  const bathrooms = previousState.bathrooms || 1;
  const amenities = previousState.amenities || [];
  const listingTitle = previousState.listingTitle || "";
  const selectedHighlights = previousState.selectedHighlights || [];
  const description = previousState.description || "";
  const photoUrls = previousState.photoUrls || [];

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

  const handleBack = () => {
    navigate("/host/create-listing/publish", {
      state: {
        ...previousState,
        address,
        selectedType,
        guests,
        bedrooms,
        beds,
        bathrooms,
        amenities,
        listingTitle,
        selectedHighlights,
        description,
        photoUrls,
        basePrice,
        pricingModel,
      },
    });
  };

  const MIN_PRICE = 617;
  const MAX_PRICE = 6166403;

  const handlePriceClick = () => {
    setDraftPrice(basePrice.toString());
    setIsEditing(true);
  };

  const parsedDraftPrice = parseInt(draftPrice.replace(/[^0-9]/g, ""), 10);
  const isDraftPriceNumeric = !Number.isNaN(parsedDraftPrice);

  // Experience-specific ranges
  const EXPERIENCE_PER_GUEST_MIN = 250;
  const EXPERIENCE_PER_GUEST_MAX = 500;
  const EXPERIENCE_PER_GROUP_MIN = 2000;
  const EXPERIENCE_PER_GROUP_MAX = 3500;

  const dynamicMin = isExperience
    ? (pricingModel === "perGuest" ? EXPERIENCE_PER_GUEST_MIN : EXPERIENCE_PER_GROUP_MIN)
    : MIN_PRICE;
  const dynamicMax = isExperience
    ? (pricingModel === "perGuest" ? EXPERIENCE_PER_GUEST_MAX : EXPERIENCE_PER_GROUP_MAX)
    : MAX_PRICE;

  const draftPriceValid = isDraftPriceNumeric && parsedDraftPrice >= dynamicMin && parsedDraftPrice <= dynamicMax;
  const draftValidationError = isEditing && draftPrice !== ""
    ? !isDraftPriceNumeric
      ? "Please enter a valid base price."
      : parsedDraftPrice < dynamicMin
        ? `Please set a base price between ${formatPrice(dynamicMin)} - ${formatPrice(dynamicMax)}.`
        : parsedDraftPrice > dynamicMax
          ? `Please set a base price between ${formatPrice(dynamicMin)} - ${formatPrice(dynamicMax)}.`
          : null
    : null;

  // When pricing model changes for experiences, ensure draft price stays within range
  useEffect(() => {
    if (!isExperience) return;
    const min = pricingModel === "perGuest" ? EXPERIENCE_PER_GUEST_MIN : EXPERIENCE_PER_GROUP_MIN;
    const current = parseInt(String(draftPrice).replace(/[^0-9]/g, ""), 10);
    if (Number.isNaN(current) || current < min) {
      setDraftPrice(String(min));
    }
  }, [pricingModel, isExperience]);

  const handleSave = (event) => {
    event.stopPropagation();
    if (!draftPriceValid) return;
    setBasePrice(parsedDraftPrice);
    setIsEditing(false);
  };

  const handleNext = () => {
    const priceToPass = isExperience ? parsedDraftPrice : basePrice;
    if (isExperience && !draftPriceValid) {
      alert('Please enter a valid weekday base price in PHP.');
      return;
    }

    navigate("/host/create-listing/weekend-price", {
      state: {
        ...previousState,
        address,
        selectedType,
        guests,
        bedrooms,
        beds,
        bathrooms,
        amenities,
        listingTitle,
        selectedHighlights,
        description,
        photoUrls,
        basePrice: priceToPass,
        pricingModel: isExperience ? pricingModel : previousState.pricingModel,
      },
    });
  };

  const serviceFeeRate = isExperience ? 0.12 : 0.141;
  const effectiveBasePrice = isExperience && draftPriceValid ? parsedDraftPrice : basePrice;
  const serviceFee = Math.round(effectiveBasePrice * serviceFeeRate);
  const guestPrice = effectiveBasePrice + serviceFee;
  const youEarn = Math.round(effectiveBasePrice - serviceFee);

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
          <button type="button" className="menu-item menu-item-icon"> 
            <i className="fa-solid fa-book-open" aria-hidden="true" />
            <span>Hosting resources</span>
          </button>
          <button type="button" className="menu-item menu-item-icon"> 
            <i className="fa-solid fa-circle-question" aria-hidden="true" />
            <span>Get help</span>
          </button>
          <button type="button" className="menu-item menu-item-icon" onClick={() => openSameTab("/host/cohosts")}> 
            <i className="fa-solid fa-users" aria-hidden="true" />
            <span>Find a co-host</span>
          </button>
          <button type="button" className="menu-item menu-item-icon" onClick={() => openSameTab("/host/create-listing")}> 
            <i className="fa-solid fa-square-plus" aria-hidden="true" />
            <span>Create a new listing</span>
          </button>
          <button type="button" className="menu-item menu-item-icon"> 
            <i className="fa-solid fa-user-plus" aria-hidden="true" />
            <span>Refer a host</span>
          </button>

          <div className="menu-divider" />

          <button type="button" className="menu-item menu-item-icon" onClick={handleLogout}> 
            <i className="fa-solid fa-right-from-bracket" aria-hidden="true" />
            <span>Log out</span>
          </button>
        </div>
      )}

      <section className="create-listing-container">
        <div className="structure-page-card price-page-card">
          <div className="price-page-content">
            <div>
              <h1 className="create-listing-title">
                {isExperience ? "Create a pricing model for your experience" : "Now, set a weekday base price"}
              </h1>
              <p className="create-listing-description price-page-description">
                {isExperience
                  ? "Choose a pricing model and enter your weekday base price in PHP. You’ll set a weekend price next."
                  : `Tip: ${formatPrice(guestPrice)}. You’ll set a weekend price next.`}
              </p>
            </div>

            {isExperience ? (
              <>
                <div className="create-listing-input-wrapper price-model-wrapper">
                  <label htmlFor="pricingModel" className="create-listing-label">
                    Pricing model
                  </label>
                  <select
                    id="pricingModel"
                    className="create-listing-input"
                    value={pricingModel}
                    onChange={(e) => setPricingModel(e.target.value)}
                  >
                    <option value="perGuest">Per Guest (per head) – base price charged per person.</option>
                    <option value="perGroup">Per Group / Session – flat rate for the whole group or session.</option>
                  </select>
                </div>

                <div className="create-listing-input-wrapper price-input-wrapper">
                  <label htmlFor="weekdayBasePrice" className="create-listing-label">
                    Weekday base price (PHP)
                  </label>
                  <input
                    id="weekdayBasePrice"
                    type="text"
                    className="create-listing-input"
                    value={draftPrice}
                    onChange={(e) => setDraftPrice(e.target.value)}
                    placeholder="e.g. 1603"
                  />
                  <p className="price-help" style={{ marginTop: 8, color: '#6b6b6b' }}>
                    Allowed: {formatPrice(dynamicMin)} – {formatPrice(dynamicMax)} per {pricingModel === 'perGuest' ? 'person' : 'session'}
                  </p>
                </div>
                {draftValidationError && (
                  <p className="price-error-message">Error: {draftValidationError}</p>
                )}
              </>
            ) : (
              <div className="price-display-card" onClick={() => !isEditing && handlePriceClick()}>
                <div className="price-amount-row">
                  <span className="price-value">{formatPrice(basePrice)}</span>
                  <button type="button" className="price-edit-button" onClick={(e) => { e.stopPropagation(); handlePriceClick(); }}>
                    <i className="fa-solid fa-pencil" aria-hidden="true" />
                  </button>
                </div>
                {isEditing && (
                  <div className="price-edit-row">
                    <input
                      type="text"
                      className="create-listing-input price-edit-input"
                      value={draftPrice}
                      onChange={(e) => setDraftPrice(e.target.value)}
                    />
                    <button type="button" className="create-listing-button price-save-button" onClick={handleSave}>
                      Save
                    </button>
                  </div>
                )}
                {draftValidationError && (
                  <p className="price-error-message">Error: {draftValidationError}</p>
                )}
              </div>
            )}

            <div className="price-breakdown-card">
              <div className="price-breakdown-row">
                <span>Base price</span>
                <strong>{formatPrice(effectiveBasePrice)}</strong>
              </div>
              <div className="price-breakdown-row">
                <span>Guest service fee</span>
                <strong>{formatPrice(serviceFee)}</strong>
              </div>
              <div className="price-breakdown-divider" />
              <div className="price-breakdown-row price-breakdown-total">
                <span>Guest price before taxes</span>
                <strong>{formatPrice(guestPrice)}</strong>
              </div>
            </div>

            <div className="price-earn-card">
              <span>You earn</span>
              <strong>{formatPrice(youEarn)}</strong>
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

export default PricePage;


