import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import Navbar from "../components/Navbar";

function TitlePage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [menuOpen, setMenuOpen] = useState(false);
  const [profilePhotoURL, setProfilePhotoURL] = useState("");
  const [profileInitial, setProfileInitial] = useState("H");
  const previousState = location.state || {};
  const [listingTitle, setListingTitle] = useState(previousState.listingTitle || "");

  const address = previousState.address || "";
  const selectedType = previousState.selectedType || "";
  const selectedOption = previousState.selectedOption || "";
  const isExperience = selectedType.toLowerCase() === "experience";
  const isService = selectedType.toLowerCase() === "service";
  const guests = previousState.guests || 1;
  const bedrooms = previousState.bedrooms || 1;
  const beds = previousState.beds || 1;
  const bathrooms = previousState.bathrooms || 1;
  const amenities = previousState.amenities || [];
  const photoUrls = previousState.photoUrls || [];

  const getServiceTitlePlaceholder = (option) => {
    const normalized = (option || "").toLowerCase();
    if (normalized === "photography") {
      return "e.g. Photography session with dramatic sunset portraits";
    }
    if (normalized === "chefs") {
      return "e.g. Private chef dinner experience with custom menu";
    }
    if (normalized === "catering") {
      return "e.g. Catering service for intimate dinner events";
    }
    if (normalized === "prepared meals") {
      return "e.g. Prepared meals delivery for small gatherings";
    }
    if (normalized === "massage") {
      return "e.g. Relaxing full-body massage with aromatherapy";
    }
    if (normalized === "spa treatments") {
      return "e.g. Spa treatment package with massage and facial";
    }
    if (normalized === "makeup") {
      return "e.g. Bridal makeup session with glow finish";
    }
    if (normalized === "hair") {
      return "e.g. Hair styling session for weddings and events";
    }
    if (normalized === "training") {
      return "e.g. Personal training program for strength and mobility";
    }
    return "e.g. Service title that highlights what you offer";
  };

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
    navigate("/host/create-listing/photos", {
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
      },
    });
  };

  const handleNext = () => {
    if (!listingTitle.trim()) {
      return;
    }
    navigate("/host/create-listing/highlights", {
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
        listingTitle: listingTitle.trim(),
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
        <div className="structure-page-card title-page-card">
          <div className="structure-page-header title-page-header">
            <h1 className="create-listing-title">
              {isService ? "Now, let's give your service a title" : isExperience ? "Now, let's give your experience a title" : "Now, let's give your house a title"}
            </h1>
          </div>

          <div className="title-page-panel">
            <div className="create-listing-input-wrapper title-input-container">
              <label htmlFor="listingTitle" className="create-listing-label">
                {isService ? "Service title" : isExperience ? "Experience title" : "House title"}
              </label>
              <input
                id="listingTitle"
                type="text"
                className="create-listing-input title-page-input"
                placeholder={isService ? getServiceTitlePlaceholder(selectedOption) : "e.g. Cozy ridge-view studio with pool access"}
                value={listingTitle}
                onChange={(e) => setListingTitle(e.target.value)}
              />
            </div>
            <p className="title-page-help">
              {isService
                ? "Use a descriptive title that highlights what makes your service special."
                : "Use a descriptive title that highlights what makes your space special."}
            </p>
          </div>

          <div className="structure-footer">
            <button type="button" className="create-listing-back-button" onClick={handleBack}>
              Back
            </button>
            <button
              type="button"
              className={`create-listing-button ${!listingTitle.trim() ? "disabled-button" : ""}`}
              onClick={handleNext}
              disabled={!listingTitle.trim()}
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

export default TitlePage;


