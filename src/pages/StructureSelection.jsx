import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import Navbar from "../components/Navbar";

const homeStructureOptions = [
  "House",
  "Apartment",
  "Barn",
  "Bed & breakfast",
  "Boat",
  "Cabin",
  "Camper/RV",
  "Casa particular",
  "Castle",
  "Cave",
  "Container",
  "Cycladic home",
  "Dammuso",
  "Dome",
  "Earth home",
  "Farm",
  "Guesthouse",
  "Hotel",
  "Houseboat",
  "Minsu",
  "Riad",
  "Ryokan",
  "Shepherd's hut",
  "Tent",
  "Tiny home",
  "Tower",
  "Treehouse",
  "Trullo",
  "Windmill",
  "Yurt",
];

const experienceStructureOptions = [
  "Taal Volcano viewing",
  "Picnic spots",
  "Parks",
  "Garden tours",
  "Coffee shops",
  "Farm-to-table dining",
  "Wine tasting",
  "Local breweries",
  "Food market tours",
  "Spa & massage",
  "Yoga",
  "Meditation retreats",
  "Pottery workshops",
  "Local crafts",
  "Souvenir making",
  "Art galleries",
  "Exhibits",
  "Cultural shows",
  "Performances",
  "Horseback riding",
  "Zipline",
  "Outdoor adventure parks",
  "Hiking trails",
  "Bike tours",
  "Boutique hotels",
];

const serviceStructureOptions = [
  "Photography",
  "Chefs",
  "Massage",
  "Prepared meals",
  "Training",
  "Makeup",
  "Hair",
  "Spa treatments",
  "Catering",
];

function StructureSelection() {
  const navigate = useNavigate();
  const location = useLocation();
  const previousState = location.state || {};
  const [menuOpen, setMenuOpen] = useState(false);
  const [profilePhotoURL, setProfilePhotoURL] = useState("");
  const [profileInitial, setProfileInitial] = useState("H");
  const selectedType = previousState.selectedType || "";
  const [selectedOption, setSelectedOption] = useState(previousState.selectedOption || "");
  const address = previousState.address || "";
  const isExperience = selectedType.toLowerCase() === "experience";
  const isService = selectedType.toLowerCase() === "service";
  const structureOptions = isService
    ? serviceStructureOptions
    : isExperience
      ? experienceStructureOptions
      : homeStructureOptions;
  const pageTitle = isService
    ? "What type of service will guests have?"
    : isExperience
      ? "What type of experience will guests book?"
      : "What type of place will guests have?";
  const pageDescription = isService
    ? "Choose the service type that most closely matches your listing. This helps guests know what to expect."
    : isExperience
      ? "Pick the experience category that best describes what guests will do or enjoy."
      : "Choose the property type that most closely matches your listing. This helps guests know what to expect.";

  const openSameTab = (path) => {
    window.location.href = path;
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const handleSelectType = (type) => {
    setSelectedOption(type);
  };

  const handleBack = () => {
    navigate("/host/create-listing/about-your-place", { state: previousState });
  };

  const handleFinish = () => {
    if (!selectedOption) {
      return;
    }
    navigate("/host/create-listing/map-location", {
      state: {
        ...previousState,
        address,
        selectedType,
        selectedOption,
      },
    });
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
        <div className="structure-page-card">
          <div className="structure-page-header">
            <h1 className="create-listing-title">{pageTitle}</h1>
            <p className="create-listing-description">
              {pageDescription}
            </p>
          </div>

          <div className="structure-selection-grid">
            {structureOptions.map((option) => (
              <button
                key={option}
                type="button"
                className={`structure-card ${selectedOption === option ? "structure-card-selected" : ""}`}
                onClick={() => handleSelectType(option)}
              >
                {option}
              </button>
            ))}
          </div>

          <div className="structure-footer">
            <button
              type="button"
              className="create-listing-back-button"
              onClick={handleBack}
            >
              Back
            </button>
            <button
              type="button"
              className="create-listing-button"
              onClick={handleFinish}
              disabled={!selectedOption}
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

export default StructureSelection;


