import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import Navbar from "../components/Navbar";

function CreateListing() {
  const navigate = useNavigate();
  const location = useLocation();
  const [address, setAddress] = useState("");
  const [profilePhotoURL, setProfilePhotoURL] = useState("");
  const [profileInitial, setProfileInitial] = useState("H");
  const [menuOpen, setMenuOpen] = useState(false);
  const [showLocationOption, setShowLocationOption] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const previousState = location.state || {};
  const selectedType = previousState.selectedType || "Home";

  const handleLogout = async () => {
    await signOut(auth);
  };

  const openSameTab = (path) => {
    window.location.href = path;
  };

  const handleCreateListing = (e) => {
    e.preventDefault();
    if (address.trim()) {
      console.log("Creating listing for address:", address);
      navigate("/host/create-listing/about-your-place", { state: { ...previousState, address, selectedType } });
    }
  };

  const handleUseCurrentLocation = async () => {
    setLoadingLocation(true);
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by this browser.");
      setLoadingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const nominatimResponse = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&addressdetails=1&zoom=18&accept-language=en`
          );
          const nominatimData = await nominatimResponse.json();
          const addr = nominatimData.address || {};
          const addressParts = [];

          const street = addr.road || addr.pedestrian || addr.cycleway || addr.footway || addr.path || addr.trunk || addr.residential;
          if (addr.house_number && street) {
            addressParts.push(`${addr.house_number} ${street}`);
          } else if (street) {
            addressParts.push(street);
          }

          if (addr.building && !addressParts.includes(addr.building)) {
            addressParts.push(addr.building);
          }

          if (addr.neighbourhood) {
            addressParts.push(addr.neighbourhood);
          }
          if (addr.suburb) {
            addressParts.push(addr.suburb);
          }
          if (addr.city_district) {
            addressParts.push(addr.city_district);
          }
          if (addr.village) {
            addressParts.push(addr.village);
          }
          if (addr.town) {
            addressParts.push(addr.town);
          }
          if (addr.city) {
            addressParts.push(addr.city);
          }
          if (addr.state_district) {
            addressParts.push(addr.state_district);
          }
          if (addr.state) {
            addressParts.push(addr.state);
          }
          if (addr.postcode) {
            addressParts.push(addr.postcode);
          }
          if (addr.country) {
            addressParts.push(addr.country);
          }

          const uniqueParts = [...new Set(addressParts)].filter(Boolean);
          let fullAddress;

          if (uniqueParts.length > 0) {
            fullAddress = uniqueParts.join(', ');
          } else if (nominatimData.display_name) {
            fullAddress = nominatimData.display_name;
          } else {
            fullAddress = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
          }

          setAddress(fullAddress);
          setShowLocationOption(false);
        } catch (error) {
          console.error("Error fetching address:", error);
          alert("Unable to retrieve address. Please enter manually.");
        }
        setLoadingLocation(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        alert("Unable to retrieve your location. Please check your browser settings.");
        setLoadingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
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
        <div className="create-listing-content">
          <div className="create-listing-text">
            <h1 className="create-listing-title">Set up your StayVista Tagaytay listing</h1>
            <p className="create-listing-description">
              It's easy to create a great listing—let's start with your address.
            </p>

            <form onSubmit={handleCreateListing} className="create-listing-form">
              <div className="create-listing-input-wrapper">
                <input
                  type="text"
                  placeholder="Enter your address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  onFocus={() => setShowLocationOption(true)}
                  onBlur={() => setTimeout(() => setShowLocationOption(false), 200)} // Delay to allow button click
                  className="create-listing-input"
                  required
                />
                {showLocationOption && (
                  <div className="location-option">
                    <button
                      type="button"
                      className="location-option-btn"
                      onClick={handleUseCurrentLocation}
                      disabled={loadingLocation}
                    >
                      {loadingLocation ? "Getting location..." : "Use my current location"}
                    </button>
                  </div>
                )}
              </div>
              <button 
                type="submit" 
                className="create-listing-button create-listing-next-button"
                disabled={!address.trim()}
              >
                Next
              </button>
            </form>
          </div>

          <div className="create-listing-image">
            <div className="create-listing-video-wrapper">
              <iframe
                className="create-listing-video"
                src="https://www.youtube.com/embed/S6kze5XTKJc?autoplay=1&mute=1&loop=1&playlist=S6kze5XTKJc&controls=0&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&disablekb=1&playsinline=1"
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

export default CreateListing;


