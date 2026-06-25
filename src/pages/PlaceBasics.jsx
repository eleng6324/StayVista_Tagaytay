import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import Navbar from "../components/Navbar";

function PlaceBasics() {
  const navigate = useNavigate();
  const location = useLocation();
  const previousState = location.state || {};
  const [menuOpen, setMenuOpen] = useState(false);
  const [profilePhotoURL, setProfilePhotoURL] = useState("");
  const [profileInitial, setProfileInitial] = useState("H");
  const [guests, setGuests] = useState(previousState.guests || 1);
  const [bedrooms, setBedrooms] = useState(previousState.bedrooms || 1);
  const [beds, setBeds] = useState(previousState.beds || 1);
  const [bathrooms, setBathrooms] = useState(previousState.bathrooms || 1);
  const [durationHours, setDurationHours] = useState(previousState.durationHours || 1);

  const address = previousState.address || "";
  const selectedType = previousState.selectedType || "";
  const selectedOption = previousState.selectedOption || "";
  const isService = selectedType.toLowerCase() === "service";
  const isExperience = selectedType.toLowerCase() === "experience";
  const isHome = !isService && !isExperience;

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
    navigate("/host/create-listing/map-location", {
      state: {
        ...previousState,
        address,
        selectedType,
        guests,
        bedrooms,
        beds,
        bathrooms,
        durationHours,
      },
    });
  };

  const handleNext = () => {
    navigate("/host/create-listing/stand-out", {
      state: {
        ...previousState,
        address,
        selectedType,
        guests,
        bedrooms,
        beds,
        bathrooms,
        durationHours,
      },
    });
  };

  const changeCount = (setter, value) => () => setter((current) => Math.max(1, current + value));

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
        <div className="structure-page-card">
          <div className="structure-page-header">
            <h1 className="create-listing-title">
              {isService ? "Share some basics about your service" : "Share some basics about your place"}
            </h1>
            <p className="create-listing-description">
              {isService
                ? `You choose ${selectedOption || "this service"} as your service type.`
                : "You'll add more details later, like bed types."}
            </p>
          </div>

          <div className="counter-grid">
            <div className="counter-row">
              <div>
                <p className="counter-label">Guests</p>
              </div>
              <div className="counter-control">
                <button type="button" className="counter-button" onClick={changeCount(setGuests, -1)}>-</button>
                <span className="counter-value">{guests}</span>
                <button type="button" className="counter-button" onClick={changeCount(setGuests, 1)}>+</button>
              </div>
            </div>

            {isHome && (
              <>
                <div className="counter-row">
                  <div>
                    <p className="counter-label">Bedrooms</p>
                  </div>
                  <div className="counter-control">
                    <button type="button" className="counter-button" onClick={changeCount(setBedrooms, -1)}>-</button>
                    <span className="counter-value">{bedrooms}</span>
                    <button type="button" className="counter-button" onClick={changeCount(setBedrooms, 1)}>+</button>
                  </div>
                </div>

                <div className="counter-row">
                  <div>
                    <p className="counter-label">Beds</p>
                  </div>
                  <div className="counter-control">
                    <button type="button" className="counter-button" onClick={changeCount(setBeds, -1)}>-</button>
                    <span className="counter-value">{beds}</span>
                    <button type="button" className="counter-button" onClick={changeCount(setBeds, 1)}>+</button>
                  </div>
                </div>

                <div className="counter-row">
                  <div>
                    <p className="counter-label">Bathrooms</p>
                  </div>
                  <div className="counter-control">
                    <button type="button" className="counter-button" onClick={changeCount(setBathrooms, -1)}>-</button>
                    <span className="counter-value">{bathrooms}</span>
                    <button type="button" className="counter-button" onClick={changeCount(setBathrooms, 1)}>+</button>
                  </div>
                </div>
              </>
            )}

            {(isService || isExperience) && (
              <div className="counter-row">
                <div>
                  <p className="counter-label">Duration (Hours)</p>
                </div>
                <div className="counter-control">
                  <button type="button" className="counter-button" onClick={changeCount(setDurationHours, -1)}>-</button>
                  <span className="counter-value">{durationHours}</span>
                  <button type="button" className="counter-button" onClick={changeCount(setDurationHours, 1)}>+</button>
                </div>
              </div>
            )}
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

export default PlaceBasics;


