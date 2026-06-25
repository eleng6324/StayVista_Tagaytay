import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import Navbar from "../components/Navbar";

const defaultAmenitySections = [
  {
    title: "What about these guest favorites?",
    items: [
      { id: "wifi", label: "Wifi", icon: "fa-solid fa-wifi" },
      { id: "tv", label: "TV", icon: "fa-solid fa-tv" },
      { id: "kitchen", label: "Kitchen", icon: "fa-solid fa-kitchen-set" },
      { id: "washer", label: "Washer", icon: "fa-solid fa-tshirt" },
      { id: "freeParking", label: "Free parking on premises", icon: "fa-solid fa-parking" },
      { id: "paidParking", label: "Paid parking on premises", icon: "fa-solid fa-parking" },
      { id: "airConditioning", label: "Air conditioning", icon: "fa-solid fa-wind" },
      { id: "workspace", label: "Dedicated workspace", icon: "fa-solid fa-laptop" },
    ],
  },
  {
    title: "Do you have any standout amenities?",
    items: [
      { id: "pool", label: "Pool", icon: "fa-solid fa-swimming-pool" },
      { id: "hotTub", label: "Hot tub", icon: "fa-solid fa-bath" },
      { id: "patio", label: "Patio", icon: "fa-solid fa-window-maximize" },
      { id: "bbq", label: "BBQ grill", icon: "fa-solid fa-utensils" },
      { id: "outdoorDining", label: "Outdoor dining area", icon: "fa-solid fa-table" },
      { id: "firePit", label: "Fire pit", icon: "fa-solid fa-fire" },
      { id: "poolTable", label: "Pool table", icon: "fa-solid fa-table-tennis" },
      { id: "indoorFireplace", label: "Indoor fireplace", icon: "fa-solid fa-house-chimney" },
      { id: "piano", label: "Piano", icon: "fa-solid fa-music" },
      { id: "exerciseEquipment", label: "Exercise equipment", icon: "fa-solid fa-dumbbell" },
      { id: "lakeAccess", label: "Lake access", icon: "fa-solid fa-water" },
      { id: "beachAccess", label: "Beach access", icon: "fa-solid fa-umbrella-beach" },
      { id: "outdoorShower", label: "Outdoor shower", icon: "fa-solid fa-shower" },
    ],
  },
];

const experienceAmenitySections = [
  {
    title: "Food & Drink",
    items: [
      { id: "complimentaryCoffee", label: "Complimentary coffee", icon: "fa-solid fa-mug-hot" },
      { id: "tea", label: "Tea", icon: "fa-solid fa-mug-saucer" },
      { id: "pastry", label: "Pastry", icon: "fa-solid fa-bread-slice" },
      { id: "snack", label: "Snack", icon: "fa-solid fa-cookie" },
      { id: "farmFreshMeal", label: "Farm‑fresh meal included", icon: "fa-solid fa-carrot" },
      { id: "outdoorDiningView", label: "Outdoor dining with view", icon: "fa-solid fa-table" },
    ],
  },
  {
    title: "Wellness (Spa / Retreat)",
    items: [
      { id: "massageBed", label: "Massage bed", icon: "fa-solid fa-bed" },
      { id: "oils", label: "Oils", icon: "fa-solid fa-droplet" },
      { id: "sauna", label: "Sauna", icon: "fa-solid fa-hot-tub-person" },
      { id: "hotTubAccess", label: "Hot tub access", icon: "fa-solid fa-bath" },
      { id: "relaxationLounge", label: "Relaxation lounge", icon: "fa-solid fa-couch" },
      { id: "yogaMats", label: "Yoga mats", icon: "fa-solid fa-person-praying" },
      { id: "meditationArea", label: "Meditation area", icon: "fa-solid fa-spa" },
    ],
  },
  {
    title: "Nature & Scenic",
    items: [
      { id: "viewingDeck", label: "Viewing deck", icon: "fa-solid fa-mountain" },
      { id: "scenicSpot", label: "Scenic spot", icon: "fa-solid fa-tree" },
      { id: "guidedTour", label: "Guided tour", icon: "fa-solid fa-person-walking" },
      { id: "localGuide", label: "Local guide", icon: "fa-solid fa-map-location-dot" },
      { id: "picnicArea", label: "Picnic area", icon: "fa-solid fa-umbrella-beach" },
      { id: "photoSpots", label: "Photo spots", icon: "fa-solid fa-camera" },
    ],
  },
  {
    title: "Convenience",
    items: [
      { id: "parkingAvailable", label: "Parking available", icon: "fa-solid fa-parking" },
      { id: "shuttleService", label: "Shuttle service", icon: "fa-solid fa-shuttle-space" },
      { id: "transportIncluded", label: "Transport included", icon: "fa-solid fa-bus" },
      { id: "wheelchairAccessible", label: "Wheelchair accessible", icon: "fa-solid fa-wheelchair" },
      { id: "petFriendly", label: "Pet‑friendly", icon: "fa-solid fa-dog" },
    ],
  },
];

const getServiceAmenitySections = (option) => {
  const normalized = (option || "").toLowerCase();
  if (normalized === "photography") {
    return [
      {
        title: "Photography",
        items: [
          { id: "professionalCamera", label: "Professional camera & lighting equipment", icon: "fa-solid fa-camera" },
          { id: "studioSpace", label: "Studio space / backdrop", icon: "fa-solid fa-image" },
          { id: "propsAvailable", label: "Props available", icon: "fa-solid fa-star" },
          { id: "instantPhotoPreview", label: "Instant photo preview / editing station", icon: "fa-solid fa-magic" },
        ],
      },
    ];
  }

  if (["chefs", "catering", "prepared meals"].includes(normalized)) {
    return [
      {
        title: "Food & Catering",
        items: [
          { id: "fullKitchenSetup", label: "Full kitchen setup", icon: "fa-solid fa-kitchen-set" },
          { id: "menuCustomization", label: "Menu customization", icon: "fa-solid fa-utensils" },
          { id: "servingStaff", label: "Serving staff included", icon: "fa-solid fa-user-tie" },
          { id: "tableware", label: "Tableware & utensils provided", icon: "fa-solid fa-plate-utensils" },
          { id: "deliveryOption", label: "Food delivery option", icon: "fa-solid fa-truck" },
        ],
      },
    ];
  }

  if (["massage", "spa treatments"].includes(normalized)) {
    return [
      {
        title: "Massage & Spa",
        items: [
          { id: "massageBed", label: "Massage bed / spa chair", icon: "fa-solid fa-bed" },
          { id: "aromatherapy", label: "Aromatherapy oils & lotions", icon: "fa-solid fa-droplet" },
          { id: "towelsRobes", label: "Towels & robes", icon: "fa-solid fa-towel" },
          { id: "relaxationMusic", label: "Relaxation music / ambiance setup", icon: "fa-solid fa-music" },
          { id: "onsiteHomeService", label: "On‑site or home service option", icon: "fa-solid fa-house-medical" },
        ],
      },
    ];
  }

  if (["makeup", "hair"].includes(normalized)) {
    return [
      {
        title: "Makeup & Hair",
        items: [
          { id: "makeupKit", label: "Professional makeup kit", icon: "fa-solid fa-eye-dropper" },
          { id: "hairstylingTools", label: "Hairstyling tools (dryer, iron, brushes)", icon: "fa-solid fa-scissors" },
          { id: "mirrorLighting", label: "Mirror & lighting setup", icon: "fa-solid fa-lightbulb" },
          { id: "trialSession", label: "Trial session included", icon: "fa-solid fa-handshake" },
          { id: "bridalPackages", label: "Bridal / event packages", icon: "fa-solid fa-ring" },
        ],
      },
    ];
  }

  if (normalized === "training") {
    return [
      {
        title: "Training",
        items: [
          { id: "trainingMaterials", label: "Training materials / handouts", icon: "fa-solid fa-file-lines" },
          { id: "equipmentProvided", label: "Equipment provided (if fitness or workshop)", icon: "fa-solid fa-dumbbell" },
          { id: "venueOnlineOption", label: "Venue or online option", icon: "fa-solid fa-globe" },
          { id: "certificationBadge", label: "Certification / completion badge", icon: "fa-solid fa-certificate" },
          { id: "groupSessions", label: "Group or one‑on‑one sessions", icon: "fa-solid fa-users" },
        ],
      },
    ];
  }

  return [
    {
      title: "Service amenities",
      items: [
        { id: "serviceEquipment", label: "Service equipment available", icon: "fa-solid fa-briefcase" },
        { id: "customOptions", label: "Custom service options", icon: "fa-solid fa-sliders" },
        { id: "flexibleScheduling", label: "Flexible scheduling", icon: "fa-solid fa-calendar-days" },
      ],
    },
  ];
};

const safetyItems = [
  { id: "smokeAlarm", label: "Smoke alarm", icon: "fa-solid fa-bell" },
  { id: "firstAid", label: "First aid kit", icon: "fa-solid fa-first-aid" },
  { id: "fireExtinguisher", label: "Fire extinguisher", icon: "fa-solid fa-fire-extinguisher" },
];

function AmenitiesSelection() {
  const navigate = useNavigate();
  const location = useLocation();
  const previousState = location.state || {};
  const [menuOpen, setMenuOpen] = useState(false);
  const [profilePhotoURL, setProfilePhotoURL] = useState("");
  const [profileInitial, setProfileInitial] = useState("H");
  const [selectedAmenities, setSelectedAmenities] = useState(new Set(previousState.amenities || []));

  const address = previousState.address || "";
  const selectedType = previousState.selectedType || "";
  const selectedOption = previousState.selectedOption || "";
  const isExperience = selectedType.toLowerCase() === "experience";
  const isService = selectedType.toLowerCase() === "service";
  const guests = previousState.guests || 1;
  const bedrooms = previousState.bedrooms || 1;
  const beds = previousState.beds || 1;
  const bathrooms = previousState.bathrooms || 1;

  const amenitySections = isService
    ? getServiceAmenitySections(selectedOption)
    : isExperience
      ? experienceAmenitySections
      : defaultAmenitySections;

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

  const toggleAmenity = (id) => {
    setSelectedAmenities((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleBack = () => {
    navigate("/host/create-listing/stand-out", {
      state: {
        ...previousState,
        address,
        selectedType,
        guests,
        bedrooms,
        beds,
        bathrooms,
        amenities: Array.from(selectedAmenities),
      },
    });
  };

  const handleNext = () => {
    navigate("/host/create-listing/photos", {
      state: {
        ...previousState,
        address,
        selectedType,
        guests,
        bedrooms,
        beds,
        bathrooms,
        amenities: Array.from(selectedAmenities),
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
        <div className="structure-page-card">
          <div className="structure-page-header">
            <h1 className="create-listing-title">
              {isService && selectedOption ? `Pick amenities for your ${selectedOption} service` : "Tell guests what your place has to offer"}
            </h1>
            <p className="create-listing-description">
              {isService && selectedOption
                ? `Select the amenities that best describe your ${selectedOption.toLowerCase()} service.`
                : "You can add more amenities after you publish your listing."}
            </p>
          </div>

          {amenitySections.map((section) => (
            <div key={section.title}>
              <div className="amenity-section">
                <h2>{section.title}</h2>
              </div>
              <div className="amenities-grid">
                {section.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`amenity-card ${selectedAmenities.has(item.id) ? "amenity-card-selected" : ""}`}
                    onClick={() => toggleAmenity(item.id)}
                  >
                    <span className="amenity-icon"><i className={item.icon} aria-hidden="true" /></span>
                    <p className="amenity-label">{item.label}</p>
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="amenity-section">
            <h2>Do you have any of these safety items?</h2>
          </div>
          <div className="amenities-grid">
            {safetyItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`amenity-card ${selectedAmenities.has(item.id) ? "amenity-card-selected" : ""}`}
                onClick={() => toggleAmenity(item.id)}
              >
                <span className="amenity-icon"><i className={item.icon} aria-hidden="true" /></span>
                <p className="amenity-label">{item.label}</p>
              </button>
            ))}
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

export default AmenitiesSelection;


