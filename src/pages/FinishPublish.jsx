import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import Navbar from "../components/Navbar";

function FinishPublish() {
  const navigate = useNavigate();
  const location = useLocation();

  const previousState = location.state || {};

  const [menuOpen, setMenuOpen] = useState(false);
  const [profilePhotoURL, setProfilePhotoURL] = useState("");
  const [profileInitial, setProfileInitial] = useState("H");

  const address = previousState.address || "";
  const selectedType = previousState.selectedType || "";
  const guests = previousState.guests || 1;
  const bedrooms = previousState.bedrooms || 1;
  const beds = previousState.beds || 1;
  const bathrooms = previousState.bathrooms || 1;
  const amenities = previousState.amenities || [];
  const listingTitle = previousState.listingTitle || "";
  const selectedHighlights = previousState.selectedHighlights || [];
  const description = previousState.description || "";
  const photoUrls = previousState.photoUrls || [];
  const isExperience = selectedType.toLowerCase() === "experience";
  const videoSrc = isExperience
    ? "https://www.youtube.com/embed/BTQzHBKkf3I?autoplay=1&mute=1&loop=1&playlist=BTQzHBKkf3I&controls=0&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&disablekb=1&playsinline=1"
    : "https://www.youtube.com/embed/S6kze5XTKJc?autoplay=1&mute=1&loop=1&playlist=S6kze5XTKJc&controls=0&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&disablekb=1&playsinline=1";

  useEffect(() => {
    if (!location.state) {
      navigate("/host/create-listing", { replace: true });
    }
  }, [location.state, navigate]);

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
        listingTitle,
        selectedHighlights,
        description,
        photoUrls,
      },
    });
  };

  const handleNext = () => {
    navigate("/host/create-listing/price", {
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
        <div className="structure-page-card publish-page-card">
          <div className="publish-page-grid">
            <div className="publish-page-copy">
              <p className="step-label">Step 3</p>
              <h1 className="create-listing-title">Finish up and publish</h1>
              <p className="create-listing-description">
                Finally, you'll choose booking settings, set up pricing, and publish your listing.
              </p>
            </div>

            <div className="create-listing-image publish-video-panel">
              <div className="create-listing-video-wrapper">
                <iframe
                  className="create-listing-video"
                  src={videoSrc}
                  title="StayVista Tagaytay listing slideshow"
                  frameBorder="0"
                  allow="autoplay; encrypted-media; fullscreen"
                  allowFullScreen
                />
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

export default FinishPublish;


