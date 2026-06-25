import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { collection, addDoc, updateDoc, doc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase";
import Navbar from "../components/Navbar";

function FinalDetailsPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [menuOpen, setMenuOpen] = useState(false);
  const [profilePhotoURL, setProfilePhotoURL] = useState("");
  const [profileInitial, setProfileInitial] = useState("H");

  // Keep all state from previous wizard steps
  const previousState = location.state || {};
  const draftId = previousState.draftId || previousState.listingDraftId;

  // Form state
  const [addressDetails, setAddressDetails] = useState({
    country: "Philippines",
    unit: previousState.addressDetails?.unit || "",
    building: previousState.addressDetails?.building || "",
    street: previousState.addressDetails?.street || previousState.address || "",
    barangay: previousState.addressDetails?.barangay || "",
    city: previousState.addressDetails?.city || "",
    zip: previousState.addressDetails?.zip || "",
    province: previousState.addressDetails?.province || "",
  });

  const [isBusiness, setIsBusiness] = useState(previousState.isBusiness ?? null); // null, 'yes', 'no'
  const [showLocationOption, setShowLocationOption] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [showValidation, setShowValidation] = useState(false);

  // Check if form is valid
  const isFormValid = 
    addressDetails.street.trim() !== "" &&
    addressDetails.city.trim() !== "" &&
    addressDetails.zip.trim() !== "" &&
    addressDetails.province.trim() !== "" &&
    isBusiness !== null;

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

  // Parse the initial address if provided from previous steps
  useEffect(() => {
    if (previousState.address && addressDetails.street === previousState.address && !addressDetails.city) {
      const parseAddress = async () => {
        try {
          const nominatimResponse = await fetch(
            `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(previousState.address)}&limit=1&addressdetails=1&accept-language=en`
          );
          const results = await nominatimResponse.json();
          if (results && results.length > 0) {
            const addr = results[0].address || {};
            const streetStr = addr.road || addr.pedestrian || addr.cycleway || addr.footway || addr.path || addr.trunk || addr.residential || "";
            const cityStr = addr.city || addr.town || addr.municipality || "";
            const zipStr = addr.postcode || "";
            const provinceStr = addr.state || addr.province || addr.region || "";
            const barangayStr = addr.neighbourhood || addr.village || addr.suburb || addr.city_district || "";

            setAddressDetails((prev) => ({
              ...prev,
              street: addr.house_number && streetStr ? `${addr.house_number} ${streetStr}` : streetStr || prev.street,
              city: cityStr,
              zip: zipStr,
              province: provinceStr,
              barangay: barangayStr,
            }));
          } else {
            fallbackParse(previousState.address);
          }
        } catch (error) {
          fallbackParse(previousState.address);
        }
      };

      const fallbackParse = (addrStr) => {
        const parts = addrStr.split(",").map(s => s.trim());
        const len = parts.length;
        if (len >= 3 && parts[len - 1].toLowerCase() === "philippines") {
          const provZip = parts[len - 2].split(" ");
          const zipStr = provZip.pop();
          const provinceStr = provZip.join(" ");
          const cityStr = parts[len - 3];
          const streetStr = parts.slice(0, len - 3).join(", ");
          setAddressDetails(prev => ({
            ...prev,
            street: streetStr || prev.street,
            city: cityStr,
            province: provinceStr,
            zip: zipStr,
          }));
        }
      };

      parseAddress();
    }
  }, [previousState.address, addressDetails.city, addressDetails.street]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setAddressDetails((prev) => ({
      ...prev,
      [name]: value,
    }));
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
          
          const street = addr.road || addr.pedestrian || addr.cycleway || addr.footway || addr.path || addr.trunk || addr.residential || "";
          const city = addr.city || addr.town || addr.municipality || "";
          const zip = addr.postcode || "";
          const province = addr.state || addr.province || addr.region || "";
          const barangay = addr.neighbourhood || addr.village || addr.suburb || addr.city_district || "";

          setAddressDetails((prev) => ({
            ...prev,
            street: addr.house_number && street ? `${addr.house_number} ${street}` : street || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
            city,
            zip,
            province,
            barangay,
          }));
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

  const handleBack = () => {
    navigate("/host/create-listing/legal", {
      state: {
        ...previousState,
        addressDetails,
        isBusiness,
      },
    });
  };

  const handleCreateListing = async () => {
    if (!isFormValid) {
      setShowValidation(true);
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      alert("You must be logged in to create a listing.");
      return;
    }

    try {
      const finalState = {
        ...previousState,
        addressDetails,
        isBusiness,
      };

      if (draftId) {
        await updateDoc(doc(db, "listings", draftId), {
          ...finalState,
          coverPhotoUrl: previousState.photoUrls?.[0] || "",
          photoUrls: previousState.photoUrls || [],
          hostId: user.uid,
          hostEmail: user.email,
          hostName: user.displayName || user.email,
          status: "draft",
          published: false,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, "listings"), {
          ...finalState,
          coverPhotoUrl: previousState.photoUrls?.[0] || "",
          photoUrls: previousState.photoUrls || [],
          hostId: user.uid,
          hostEmail: user.email,
          hostName: user.displayName || user.email,
          status: "draft",
          published: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      navigate("/host", { state: { draftSaved: true } });
    } catch (error) {
      console.error("Error creating listing:", error);
      alert("Failed to save listing. Please try again.");
    }
  };

  // Determine if a specific field has an error to show
  const fieldHasError = (fieldName) => {
    return showValidation && addressDetails[fieldName].trim() === "";
  };

  return (
    <main className="host-shell create-listing-page final-details-page">
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
          <div className="menu-divider" />
          <button type="button" className="menu-item menu-item-icon" onClick={handleLogout}>
            <i className="fa-solid fa-right-from-bracket" aria-hidden="true" />
            <span>Log out</span>
          </button>
        </div>
      )}

      <section className="create-listing-container">
        <div className="structure-page-card list-form-card">
          <div className="list-form-content">
            <h1 className="create-listing-title">Provide a few final details</h1>
            <p className="create-listing-description">This is required to comply with financial regulations and helps us prevent fraud. Your listing will be saved as a draft until you publish it.</p>
            
            <div className="final-details-section">
              <h2 className="final-details-subtitle">What's your residential address?</h2>
              <p className="final-details-subnote">Guests won't see this information.</p>
              
              <div className="address-form-container">
                <div className="address-input-group">
                  <label className="address-input-label">Country/region</label>
                  <select 
                    className="address-input-field"
                    name="country"
                    value={addressDetails.country}
                    onChange={handleInputChange}
                  >
                    <option value="Philippines">Philippines</option>
                  </select>
                </div>
                
                <div className="address-input-group">
                  <input
                    type="text"
                    name="unit"
                    placeholder="Unit, level, etc. (if applicable)"
                    value={addressDetails.unit}
                    onChange={handleInputChange}
                    className="address-input-field"
                  />
                </div>
                
                <div className="address-input-group">
                  <input
                    type="text"
                    name="building"
                    placeholder="Building name (if applicable)"
                    value={addressDetails.building}
                    onChange={handleInputChange}
                    className="address-input-field"
                  />
                </div>
                
                <div className={`address-input-group location-input-wrapper ${fieldHasError('street') ? 'input-error' : ''}`}>
                  <input
                    type="text"
                    name="street"
                    placeholder="Street address"
                    value={addressDetails.street}
                    onChange={handleInputChange}
                    onFocus={() => setShowLocationOption(true)}
                    onBlur={() => setTimeout(() => setShowLocationOption(false), 200)}
                    className="address-input-field"
                  />
                  {showLocationOption && (
                    <div className="location-dropdown-option">
                      <button
                        type="button"
                        className="location-option-btn"
                        onClick={handleUseCurrentLocation}
                        disabled={loadingLocation}
                      >
                        <i className="fa-solid fa-location-arrow" /> {loadingLocation ? "Getting location..." : "Use my current address"}
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="address-input-group">
                  <input
                    type="text"
                    name="barangay"
                    placeholder="Barangay / district (if applicable)"
                    value={addressDetails.barangay}
                    onChange={handleInputChange}
                    className="address-input-field"
                  />
                </div>
                
                <div className={`address-input-group ${fieldHasError('city') ? 'input-error' : ''}`}>
                  <input
                    type="text"
                    name="city"
                    placeholder="City / municipality"
                    value={addressDetails.city}
                    onChange={handleInputChange}
                    className="address-input-field"
                  />
                </div>
                
                <div className={`address-input-group ${fieldHasError('zip') ? 'input-error' : ''}`}>
                  <input
                    type="text"
                    name="zip"
                    placeholder="ZIP code"
                    value={addressDetails.zip}
                    onChange={handleInputChange}
                    className="address-input-field"
                  />
                </div>
                
                <div className={`address-input-group ${fieldHasError('province') ? 'input-error' : ''}`}>
                  <input
                    type="text"
                    name="province"
                    placeholder="Province"
                    value={addressDetails.province}
                    onChange={handleInputChange}
                    className="address-input-field"
                  />
                </div>
              </div>
              
              {showValidation && (!isFormValid) && (
                <div className="validation-error-message">
                  <i className="fa-solid fa-circle-exclamation" />
                  <span>Please enter all of the required fields.</span>
                </div>
              )}
            </div>

            <div className="final-details-section">
              <h2 className="final-details-subtitle">Are you hosting as a business?</h2>
              <p className="final-details-subnote">This means your business is most likely registered with your state or government. <u>Get details</u></p>
              
              <div className="business-hosting-toggle">
                <button
                  type="button"
                  className={`business-btn ${isBusiness === 'yes' ? 'business-btn-selected' : ''}`}
                  onClick={() => setIsBusiness('yes')}
                >
                  Yes
                </button>
                <button
                  type="button"
                  className={`business-btn ${isBusiness === 'no' ? 'business-btn-selected' : ''}`}
                  onClick={() => setIsBusiness('no')}
                >
                  No
                </button>
              </div>
            </div>
          </div>

          <div className="structure-footer">
            <button type="button" className="create-listing-back-button" onClick={handleBack}>
              Back
            </button>
            <button 
              type="button" 
              className={`create-listing-button ${!isFormValid ? 'create-listing-button-disabled' : ''}`} 
              onClick={handleCreateListing}
            >
              Save draft
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

export default FinalDetailsPage;

