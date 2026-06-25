import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import Navbar from "../components/Navbar";

function MapLocationSelection() {
  const navigate = useNavigate();
  const location = useLocation();
  const previousState = location.state || {};
  const [menuOpen, setMenuOpen] = useState(false);
  const [profilePhotoURL, setProfilePhotoURL] = useState("");
  const [profileInitial, setProfileInitial] = useState("H");
  const [isPrecise, setIsPrecise] = useState(previousState.isPrecise ?? true);
  const [center, setCenter] = useState(previousState.center || { lat: 14.1092, lng: 120.9156 });

  const address = previousState.address || "";
  const selectedType = previousState.selectedType || "";

  const zoomDelta = isPrecise ? 0.004 : 0.018;

  const openSameTab = (path) => {
    window.location.href = path;
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const handleMapClick = (e) => {
    // allow clicking overlay to reposition the center marker
    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const width = rect.width;
    const height = rect.height;

    const minLng = center.lng - zoomDelta;
    const maxLng = center.lng + zoomDelta;
    const minLat = center.lat - zoomDelta;
    const maxLat = center.lat + zoomDelta;

    const lng = minLng + (x / width) * (maxLng - minLng);
    const lat = maxLat - (y / height) * (maxLat - minLat);

    setCenter({ lat, lng });
  };

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      setProfilePhotoURL(user.photoURL || "");
      const initial = user.displayName?.trim().charAt(0) || user.email?.trim().charAt(0) || "H";
      setProfileInitial(initial.toUpperCase());
    }
  }, []);

  useEffect(() => {
    if (!address) {
      return;
    }

    const fetchCoords = async () => {
      setIsGeocoding(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(address)}&limit=1&addressdetails=1&accept-language=en`
        );
        const results = await response.json();
        if (results.length > 0) {
          const locationInfo = results[0];
          setCenter({
            lat: parseFloat(locationInfo.lat),
            lng: parseFloat(locationInfo.lon),
          });
        }
      } catch (error) {
        console.error("Geocoding error:", error);
      } finally {
        setIsGeocoding(false);
      }
    };

    fetchCoords();
  }, [address]);

  const handleBack = () => {
    navigate("/host/create-listing/structure", {
      state: {
        ...previousState,
        address,
        selectedType,
        isPrecise,
        center,
      },
    });
  };

  const handleNext = () => {
    navigate("/host/create-listing/place-basics", {
      state: {
        ...previousState,
        address,
        selectedType,
        isPrecise,
        center,
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
        <div className="map-page-card">
          <div className="map-page-header">
            <h1 className="create-listing-title">Choose how guests see your location on a map</h1>
            <p className="create-listing-description">
              We only share your address after guests book. Until then, they see an approximate location.
            </p>
          </div>

          <div className="map-location-bubble">
            <i className="fa-solid fa-location-dot" aria-hidden="true" />
            <span>{address || "No address provided yet"}</span>
          </div>

          <div className="map-canvas" onClick={handleMapClick} style={{ cursor: 'crosshair' }}>
            <iframe
              title="Listing location map"
              className="map-iframe"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${(center.lng - zoomDelta).toFixed(6)},${(center.lat - zoomDelta).toFixed(6)},${(center.lng + zoomDelta).toFixed(6)},${(center.lat + zoomDelta).toFixed(6)}&layer=mapnik`}
              allowFullScreen
            />
            <div className="map-marker">
              <div className="map-marker-pin" />
              <div className="map-marker-dot" />
            </div>
          </div>

          <div className="map-legend-row">
            <div>
              <strong>Show precise location</strong>
              <p className="map-toggle-description">
                Let guests see your home’s exact location on the map before they book.
              </p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={isPrecise}
                onChange={() => setIsPrecise((value) => !value)}
              />
              <span className="toggle-slider" />
            </label>
          </div>

          <div className="map-bottom-bar">
            <div className="map-action-buttons">
              {previousState.returnTo === 'listingEditor' ? (
                <>
                  <button type="button" className="create-listing-back-button" onClick={() => {
                    // Cancel: return to listing editor without saving
                    navigate(`/host/listing-editor/${previousState.listingId}`);
                  }}>
                    Cancel
                  </button>
                  <button type="button" className="create-listing-button" onClick={() => {
                    // Save: return to listing editor with selected center and (optional) address
                    navigate(`/host/listing-editor/${previousState.listingId}`, {
                      state: {
                        from: 'map',
                        center,
                        address: previousState.address || '' ,
                        listingId: previousState.listingId
                      }
                    });
                  }}>
                    Save
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className="create-listing-back-button" onClick={handleBack}>
                    Back
                  </button>
                  <button type="button" className="create-listing-button" onClick={handleNext}>
                    Next
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default MapLocationSelection;


