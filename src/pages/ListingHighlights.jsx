import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import Navbar from "../components/Navbar";

const highlightOptions = [
  "Peaceful",
  "Unique",
  "Family-friendly",
  "Stylish",
  "Central",
  "Spacious",
  "Cozy",
  "Scenic",
  "Modern",
  "Nature-friendly",
];

function ListingHighlights() {
  const navigate = useNavigate();
  const location = useLocation();

  const [menuOpen, setMenuOpen] = useState(false);
  const [profilePhotoURL, setProfilePhotoURL] = useState("");
  const [profileInitial, setProfileInitial] = useState("H");
  const previousState = location.state || {};
  const [selectedHighlights, setSelectedHighlights] = useState(previousState.selectedHighlights || []);

  const address = previousState.address || "";
  const selectedType = previousState.selectedType || "";
  const guests = previousState.guests || 1;
  const bedrooms = previousState.bedrooms || 1;
  const beds = previousState.beds || 1;
  const bathrooms = previousState.bathrooms || 1;
  const amenities = previousState.amenities || [];
  const listingTitle = previousState.listingTitle || "";
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

  const toggleHighlight = (option) => {
    setSelectedHighlights((prev) => {
      if (prev.includes(option)) {
        return prev.filter((item) => item !== option);
      }
      if (prev.length >= 2) {
        return prev;
      }
      return [...prev, option];
    });
  };

  const handleBack = () => {
    navigate("/host/create-listing/title", {
      state: {
        ...previousState,
        address,
        selectedType,
        guests,
        bedrooms,
        beds,
        bathrooms,
        amenities,
        photoUrls,
        listingTitle,
        selectedHighlights,
      },
    });
  };

  const handleNext = () => {
    if (selectedHighlights.length === 0) {
      return;
    }
    navigate("/host/create-listing/description", {
      state: {
        ...previousState,
        address,
        selectedType,
        guests,
        bedrooms,
        beds,
        bathrooms,
        amenities,
        photoUrls,
        listingTitle,
        selectedHighlights,
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
        <div className="structure-page-card highlights-page-card">
          <div className="structure-page-header highlights-page-header">
            <div className="create-listing-text">
              <h1 className="create-listing-title">Choose up to 2 highlights</h1>
              <p className="create-listing-description">
                Select the best words that describe your home. This helps your title and listing stand out.
              </p>
            </div>
            <div className="highlight-status-card">
              <span className="highlight-status">{selectedHighlights.length} selected of 2</span>
            </div>
          </div>

          <div className="highlights-grid">
            {highlightOptions.map((option) => {
              const selected = selectedHighlights.includes(option);
              return (
                <button
                  type="button"
                  key={option}
                  className={`highlight-option ${selected ? "highlight-option-selected" : ""}`}
                  onClick={() => toggleHighlight(option)}
                >
                  {option}
                </button>
              );
            })}
          </div>

          <div className="highlight-footer-card">
            <p className="highlight-help-text">
              Pick the two options that matter most to guests. You can change them later if needed.
            </p>
          </div>
        </div>

        <div className="structure-footer">
          <button type="button" className="create-listing-back-button" onClick={handleBack}>
            Back
          </button>
          <button
            type="button"
            className={`create-listing-button ${selectedHighlights.length === 0 ? "disabled-button" : ""}`}
            onClick={handleNext}
            disabled={selectedHighlights.length === 0}
          >
            Next
          </button>
        </div>
      </section>
    </main>
  );
}

export default ListingHighlights;


