import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import Navbar from "../components/Navbar";

function AboutYourPlace() {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profilePhotoURL, setProfilePhotoURL] = useState("");
  const [profileInitial, setProfileInitial] = useState("H");
  const previousState = location.state || {};
  const address = previousState.address || "";
  const selectedType = previousState.selectedType || "Home";
  const isExperience = selectedType.toLowerCase() === "experience";
  const isService = selectedType.toLowerCase() === "service";
  const pageTitle = isService
    ? "Tell us about your service"
    : isExperience
      ? "Tell us about your experience"
      : "Tell us about your home";
  const videoSrc = isExperience
    ? "https://www.youtube.com/embed/BTQzHBKkf3I?autoplay=1&mute=1&loop=1&playlist=BTQzHBKkf3I&controls=0&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&disablekb=1&playsinline=1"
    : "https://www.youtube.com/embed/S6kze5XTKJc?autoplay=1&mute=1&loop=1&playlist=S6kze5XTKJc&controls=0&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&disablekb=1&playsinline=1";

  const openSameTab = (path) => {
    window.location.href = path;
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const handleNext = () => {
    navigate("/host/create-listing/structure", { state: { ...previousState, address, selectedType } });
  };

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      setProfilePhotoURL(user.photoURL || "");
      const initial = user.displayName?.trim().charAt(0) || user.email?.trim().charAt(0) || "H";
      setProfileInitial(initial.toUpperCase());
    }
  }, []);

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
        <div className="create-listing-content create-wizard-content">
          <div className="create-listing-text">
            <p className="step-label">Step 1</p>
            <h1 className="create-listing-title">{pageTitle}</h1>
            <p className="create-listing-description">
              {isService
                ? "In this step, we'll ask you to describe the service you offer and the type of guests who would benefit from it."
                : "In this step, we'll ask you which type of property you have and if guests will book the entire place or just a room. Then let us know the location and how many guests can stay."}
            </p>
            <button
              type="button"
              className="create-listing-button create-listing-next-button"
              onClick={handleNext}
            >
              Next
            </button>
          </div>

          <div className="create-listing-image">
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
      </section>
    </main>
  );
}

export default AboutYourPlace;


