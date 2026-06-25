import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import Navbar from "../components/Navbar";

function DescriptionPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [menuOpen, setMenuOpen] = useState(false);
  const [profilePhotoURL, setProfilePhotoURL] = useState("");
  const [profileInitial, setProfileInitial] = useState("H");
  const previousState = location.state || {};
  const [description, setDescription] = useState(previousState.description || "");

  const address = previousState.address || "";
  const selectedType = previousState.selectedType || "";
  const guests = previousState.guests || 1;
  const bedrooms = previousState.bedrooms || 1;
  const beds = previousState.beds || 1;
  const bathrooms = previousState.bathrooms || 1;
  const amenities = previousState.amenities || [];
  const listingTitle = previousState.listingTitle || "";
  const selectedHighlights = previousState.selectedHighlights || [];
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
        listingTitle,
        photoUrls,
        selectedHighlights,
        description,
      },
    });
  };

  const handleNext = () => {
    if (!description.trim()) return;
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
        photoUrls,
        selectedHighlights,
        description: description.trim(),
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
        <div className="structure-page-card description-page-card">
          <div className="structure-page-header description-page-header">
            <h1 className="create-listing-title">Create your description</h1>
            <p className="create-listing-description">
              Share what makes your place special.
            </p>
          </div>

          <div className="description-textarea-wrapper">
            <textarea
              className="title-textarea description-textarea"
              placeholder="Tell guests what they can expect. Mention the view, the neighborhood, and the cozy details."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={12}
            />
            <div className="description-counter">{description.length}/500</div>
          </div>

          <div className="structure-footer">
            <button type="button" className="create-listing-back-button" onClick={handleBack}>
              Back
            </button>
            <button
              type="button"
              className={`create-listing-button ${!description.trim() ? "disabled-button" : ""}`}
              onClick={handleNext}
              disabled={!description.trim()}
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

export default DescriptionPage;


