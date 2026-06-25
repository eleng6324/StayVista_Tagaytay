import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import Navbar from "../components/Navbar";

function CoHostSearch() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [profilePhotoURL, setProfilePhotoURL] = useState("");
  const [profileInitial, setProfileInitial] = useState("H");
  const [address, setAddress] = useState("");
  const [showLocationSuggestion, setShowLocationSuggestion] = useState(false);
  const [resultsVisible, setResultsVisible] = useState(false);

  const cohostProfiles = [
    {
      id: 1,
      name: "Ava Mendoza",
      rate: "₱950/night",
      discount: "10% off first stay",
      promos: ["Free cleaning", "Early check-in"],
      location: "Tagaytay City, Philippines",
      description: "Experienced co-host with 250+ stays and local hospitality support.",
      images: ["#d9f2df", "#f8f8f8", "#e8f4e7"]
    },
    {
      id: 2,
      name: "Miguel Santos",
      rate: "₱1,200/night",
      discount: "15% discount for weekly bookings",
      promos: ["Airport pickup", "Welcome basket"],
      location: "Silang, Tagaytay",
      description: "Personalized guest experience with curated local tours.",
      images: ["#f8f8f8", "#d9f2df", "#e9e5ff"]
    },
    {
      id: 3,
      name: "Rina Valdez",
      rate: "₱1,050/night",
      discount: "5% off on first booking",
      promos: ["Photo-ready setup", "24/7 guest chat"],
      location: "Mendez, Cavite",
      description: "Trusted co-host specializing in luxury and boutique properties.",
      images: ["#e8f4e7", "#f8f8f8", "#d9f2df"]
    }
  ];

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      setProfilePhotoURL(user.photoURL || "");
      const initial = user.displayName?.trim().charAt(0) || user.email?.trim().charAt(0) || "H";
      setProfileInitial(initial.toUpperCase());
    }
  }, []);

  const handleSearch = (event) => {
    event.preventDefault();
    if (address.trim()) {
      setShowLocationSuggestion(false);
      setResultsVisible(true);
    }
  };

  const handleUseCurrentLocation = () => {
    setAddress("Current location");
    setShowLocationSuggestion(false);
    setResultsVisible(true);
  };

  return (
    <main className="host-shell cohost-shell">
      <Navbar
        profilePhotoURL={profilePhotoURL}
        profileInitial={profileInitial}
        onMenuToggle={() => setMenuOpen((value) => !value)}
        menuOpen={menuOpen}
      />

      <section className="cohost-page-panel">
        <div className="cohost-search-card">
          <form onSubmit={handleSearch} className="cohost-search-form">
            <div className="cohost-search-field">
              <input
                type="text"
                placeholder="Enter your address"
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                onFocus={() => setShowLocationSuggestion(true)}
                className="cohost-search-input"
              />
              <button type="submit" className="cohost-search-button" aria-label="Search address">
                <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
              </button>
            </div>

            {showLocationSuggestion && !resultsVisible && (
              <button
                type="button"
                className="cohost-location-suggestion"
                onClick={handleUseCurrentLocation}
              >
                <i className="fa-solid fa-location-dot" aria-hidden="true" />
                <span>Use my current location</span>
              </button>
            )}
          </form>
        </div>

        {resultsVisible ? (
          <div className="cohost-results-grid">
            {cohostProfiles.map((host) => (
              <div key={host.id} className="cohost-result-card">
                <div className="cohost-card-images">
                  {host.images.map((color, index) => (
                    <div
                      key={index}
                      className="cohost-card-image"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div className="cohost-card-copy">
                  <div className="cohost-card-title-row">
                    <h2>{host.name}</h2>
                    <span className="cohost-card-rate">{host.rate}</span>
                  </div>
                  <p className="cohost-card-location">{host.location}</p>
                  <p className="cohost-card-description">{host.description}</p>
                  <div className="cohost-card-meta">
                    <span className="cohost-card-meta-item">Discount: {host.discount}</span>
                    <span className="cohost-card-meta-item">Promos: {host.promos.join(", ")}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="cohost-empty-state">
            <div className="cohost-empty-illustration">
              <div className="cohost-map-card">
                <div className="cohost-map-square square-1" />
                <div className="cohost-map-square square-2" />
                <div className="cohost-map-square square-3" />
                <div className="cohost-pin" />
                <div className="cohost-car" />
              </div>
            </div>
            <div className="cohost-empty-copy">
              <h1>No co-hosts nearby</h1>
              <p>When new nearby co-hosts join, they'll show up here.</p>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

export default CoHostSearch;
