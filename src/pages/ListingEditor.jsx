import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import Navbar from "../components/Navbar";
import { storage } from "../firebase";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { awardPointsForListingPublish } from "../utils/hostRewards";

function normalizeAmenityLabel(value) {
  return value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[’'‘`]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .replace(/\s+/g, "");
}

function ListingEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profilePhotoURL, setProfilePhotoURL] = useState("");
  const [profileInitial, setProfileInitial] = useState("H");
  const [listing, setListing] = useState(null);
  const [emailVerified, setEmailVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteFlow, setShowDeleteFlow] = useState(false);
  const [deleteStep, setDeleteStep] = useState(1);
  const [deleteReasons, setDeleteReasons] = useState([]);
  const [deleteProcessing, setDeleteProcessing] = useState(false);
  const [showPublishConfirmation, setShowPublishConfirmation] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const deleteOptions = [
    "I'm no longer able to host.",
    "I'm not ready to host right now.",
    "I expected more from the platform.",
    "I was hoping to make more money.",
    "I expected things to go more smoothly with guests.",
    "This is a duplicate listing."
  ];

  useEffect(() => {
    // If navigated back from map selection with a chosen center, apply it
    if (location?.state?.from === 'map' && location.state.listingId === id && location.state.center) {
      setLocationCenter(location.state.center);
      if (location.state.address) {
        setAddressDetails((prev) => ({ ...prev, street: location.state.address }));
      }
      // clear the navigation state to avoid repeated application
      try {
        window.history.replaceState({}, document.title);
      } catch (e) {
        // ignore
      }
    }
    const user = auth.currentUser;
    if (user) {
      setProfilePhotoURL(user.photoURL || "");
      const initial = user.displayName?.trim().charAt(0) || user.email?.trim().charAt(0) || "H";
      setProfileInitial(initial.toUpperCase());
      if (user.emailVerified) {
        setEmailVerified(true);
      } else {
        const refreshEmail = async () => {
          try {
            await user.reload();
            if (user.emailVerified) {
              setEmailVerified(true);
            }
          } catch (error) {
            console.warn("Unable to refresh email verification status:", error);
          }
        };
        refreshEmail();
      }
    }
  }, [id, location?.state?.from, location.state?.listingId, location.state?.center, location.state?.address]);

  useEffect(() => {
    const fetchListing = async () => {
      try {
        const listingRef = doc(db, "listings", id);
        const listingSnap = await getDoc(listingRef);
        if (listingSnap.exists()) {
          setListing({ id: listingSnap.id, ...listingSnap.data() });
        } else {
          setListing(null);
        }
      } catch (error) {
        console.error("Error loading listing editor:", error);
        setListing(null);
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchListing();
    } else {
      setIsLoading(false);
    }
  }, [id]);

  const openDeleteFlow = () => {
    setShowDeleteFlow(true);
    setDeleteStep(1);
    setDeleteReasons([]);
  };

  const closeDeleteFlow = () => {
    setShowDeleteFlow(false);
    setDeleteStep(1);
    setDeleteReasons([]);
  };

  const toggleDeleteReason = (reason) => {
    setDeleteReasons((prev) =>
      prev.includes(reason) ? prev.filter((item) => item !== reason) : [...prev, reason]
    );
  };

  const handleDeleteListing = async () => {
    if (!id) {
      return;
    }

    setDeleteProcessing(true);
    try {
      await deleteDoc(doc(db, "listings", id));
      navigate("/host");
    } catch (error) {
      console.error("Failed to delete listing:", error);
      window.alert("Unable to delete this listing at the moment. Please try again later.");
    } finally {
      setDeleteProcessing(false);
    }
  };

  const handlePublish = () => {
    setShowPublishConfirmation(true);
  };

  const closePublishConfirmation = () => {
    setShowPublishConfirmation(false);
  };

  const confirmPublish = async () => {
    if (!listing?.id) return;
    setPublishing(true);
    try {
      const hostName = auth.currentUser?.displayName || "Host";
      const hostPhotoURL = listing?.hostInfo?.photoUrl || auth.currentUser?.photoURL || "";
      
      const listingRef = doc(db, "listings", listing.id);
      await updateDoc(listingRef, {
        published: true,
        status: "published",
        publishedAt: new Date(),
        updatedAt: new Date(),
        hostName: hostName,
        hostPhotoURL: hostPhotoURL,
        hostId: auth.currentUser?.uid,
        hostEmail: auth.currentUser?.email
      });
      setListing((prev) => ({ ...prev, published: true, status: "published", publishedAt: new Date(), hostName, hostPhotoURL, hostId: auth.currentUser?.uid, hostEmail: auth.currentUser?.email }));
      if (auth.currentUser?.uid) {
        awardPointsForListingPublish(auth.currentUser.uid, listing.id);
      }
      setShowPublishConfirmation(false);
      navigate("/guest");
    } catch (error) {
      console.error("Failed to publish listing:", error);
      window.alert("Unable to publish the listing right now. Please try again.");
    } finally {
      setPublishing(false);
    }
  };

  const bedTypes = [
    "Single",
    "Double",
    "Queen",
    "King",
    "Small double",
    "Bunk bed",
    "Sofa bed",
    "Couch",
    "Floor mattress",
    "Air mattress",
    "Crib",
    "Toddler bed",
    "Hammock",
    "Water bed"
  ];

  const allAmenityOptions = [
    "Air conditioning",
    "Backyard",
    "Baking sheet",
    "Barbecue utensils",
    "Bathtub",
    "BBQ grill",
    "Beach access",
    "Beach essentials",
    "Bed linens",
    "Bidet",
    "Bikes",
    "Blender",
    "Board games",
    "Body soap",
    "Books and reading material",
    "Bowling alley",
    "Bread maker",
    "Breakfast",
    "Ceiling fan",
    "Children's playroom",
    "Children’s bikes",
    "Children’s books and toys",
    "Cleaning available during stay",
    "Cleaning products",
    "Clothing storage",
    "Coffee",
    "Coffee maker",
    "Conditioner",
    "Cooking basics",
    "Crib",
    "Dedicated workspace",
    "Dining table",
    "Dishes and silverware",
    "Dishwasher",
    "Dryer",
    "Elevator",
    "Essentials",
    "Exercise equipment",
    "Extra pillows and blankets",
    "Fire extinguisher",
    "Fire pit",
    "First aid kit",
    "Free parking on premises",
    "Free street parking",
    "Freezer",
    "Game console",
    "Gated community",
    "Gym",
    "Hair dryer",
    "Hammock",
    "Hangers",
    "Heating",
    "Hot tub",
    "Hot water kettle",
    "Indoor fireplace",
    "Iron",
    "Kitchen",
    "Kitchenette",
    "Lake access",
    "Microwave",
    "Mini fridge",
    "Mini golf",
    "Movie theater",
    "Outdoor dining area",
    "Outdoor furniture",
    "Outdoor kitchen",
    "Outdoor playground",
    "Outdoor shower",
    "Oven",
    "Patio or balcony",
    "Piano",
    "Ping pong table",
    "Pool",
    "Pool table",
    "Portable fans",
    "Private entrance",
    "Private living room",
    "Record player",
    "Recycling",
    "Refrigerator",
    "Resort access",
    "Rice maker",
    "Safe",
    "Sauna",
    "Shampoo",
    "Shower gel",
    "Single level home",
    "Skate ramp",
    "Smoke alarm",
    "Solar panels",
    "Sound system",
    "Stove",
    "Sun loungers",
    "Toaster",
    "Trash compactor",
    "TV",
    "Washer",
    "Waterfront",
    "Wifi",
    "Wine glasses"
  ];

  const amenityIconMap = {
    wifi: "wifi",
    tv: "tv",
    kitchen: "kitchen-set",
    kitchenette: "kitchen-set",
    oven: "bread-slice",
    microwave: "bowl-food",
    toaster: "bread-slice",
    dishwasher: "sink",
    refrigerator: "snowflake",
    washer: "tshirt",
    dryer: "fan",
    freeparkingonpremises: "parking",
    freestreetparking: "parking",
    paidparkingonpremises: "parking",
    airconditioning: "wind",
    backyard: "leaf",
    bakingsheet: "bread-slice",
    barbecueutensils: "utensils",
    bathtub: "bathtub",
    bbqgrill: "hotdog",
    beachaccess: "umbrella-beach",
    beachessentials: "glasses",
    bedlinens: "tshirt",
    bidet: "toilet",
    bikes: "bicycle",
    blender: "blender",
    boardgames: "chess",
    bodysoap: "soap",
    booksandreadingmaterial: "child",
    bowlingalley: "bowling-ball",
    breadmaker: "bread-slice",
    breakfast: "coffee",
    carbonmonoxidealarm: "smoking",
    ceilingfan: "fan",
    childrensplayroom: "child",
    childrensbikes: "bicycle",
    childrensbooksandtoys: "child",
    cleaningavailableduringstay: "broom",
    cleaningproducts: "broom",
    clothingstorage: "tshirt",
    coffee: "coffee",
    coffeemaker: "coffee",
    conditioner: "soap",
    cookingbasics: "cutlery",
    crib: "baby-carriage",
    dedicatedworkspace: "laptop",
    diningtable: "table",
    dishesandsilverware: "utensils",
    dryingrackforclothing: "tshirt",
    ebikecharger: "bicycle",
    elevator: "up-down",
    essentials: "soap",
    exerciseequipment: "dumbbell",
    extrapillowsandblankets: "bed",
    firepit: "fire",
    fireextinguisher: "fire-extinguisher",
    firstaidkit: "first-aid",
    freezer: "snowflake",
    gameconsole: "gamepad",
    gatedcommunity: "torii-gate",
    gym: "dumbbell",
    hairdryer: "fan",
    hammock: "chair",
    hangers: "shirt",
    heating: "thermometer",
    hottub: "hot-tub",
    hotwaterkettle: "mug-hot",
    indoorfireplace: "fire",
    iron: "shirt",
    lakeaccess: "water",
    longtermstaysallowed: "calendar",
    minifridge: "snowflake",
    minigolf: "golf-ball",
    movietheater: "film",
    outdoordiningarea: "table",
    outdoorfurniture: "chair",
    outdoorkitchen: "kitchen-set",
    outdoorplayground: "child",
    outdoorshower: "shower",
    patioorbalcony: "window-maximize",
    piano: "music",
    pingpongtable: "table-tennis",
    pool: "swimming-pool",
    pooltable: "table-tennis",
    portablefans: "fan",
    privateentrance: "door-open",
    privatelivingroom: "chair",
    recordplayer: "record-vinyl",
    recycling: "recycle",
    ricemaker: "bowl-rice",
    resortaccess: "umbrella-beach",
    safe: "vault",
    sauna: "spa",
    singlelevelhome: "house",
    skateramp: "person-skating",
    smokealarm: "smoking",
    solarpanels: "solar-panel",
    soundsystem: "volume-high",
    trashcompactor: "trash",
    wineglasses: "wine-glass",
    shampoo: "soap",
    showergel: "shower",
    stove: "kitchen-set",
    sunloungers: "chair",
    waterfront: "water"
  };

  const renderAmenityIcon = (amenity) => {
    const iconKey = amenityIconMap[normalizeAmenityLabel(amenity)] || 'default';

    if (iconKey !== 'default') {
      return <i className={`fa-solid fa-${iconKey}`} aria-hidden="true" style={{ width: 18, height: 18, fontSize: 18, display: 'block' }} />;
    }

    const fill = '#166534';

    switch (iconKey) {
      case 'wifi':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4.93 9.07C8.52 5.48 15.48 5.48 19.07 9.07" stroke={fill} strokeWidth="2" strokeLinecap="round" />
            <path d="M7.76 11.88C10.36 9.28 13.64 9.28 16.24 11.88" stroke={fill} strokeWidth="2" strokeLinecap="round" />
            <path d="M10.59 14.71C11.98 13.32 13.99 13.32 15.38 14.71" stroke={fill} strokeWidth="2" strokeLinecap="round" />
            <path d="M12 18H12.01" stroke={fill} strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
      case 'tv':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="5" width="18" height="12" rx="2" stroke={fill} strokeWidth="2" />
            <path d="M8 21L12 17L16 21" stroke={fill} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );
      case 'stove':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="4" y="6" width="16" height="12" rx="2" stroke={fill} strokeWidth="2" />
            <path d="M8 6V4M16 6V4" stroke={fill} strokeWidth="2" strokeLinecap="round" />
            <path d="M7 10H17" stroke={fill} strokeWidth="2" strokeLinecap="round" />
            <path d="M7 14H11" stroke={fill} strokeWidth="2" strokeLinecap="round" />
            <path d="M13 14H17" stroke={fill} strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
      case 'utensils':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M7 3V14" stroke={fill} strokeWidth="2" strokeLinecap="round" />
            <path d="M11 3V14" stroke={fill} strokeWidth="2" strokeLinecap="round" />
            <path d="M3 7H9" stroke={fill} strokeWidth="2" strokeLinecap="round" />
            <path d="M15 8C15 8 16 6 18 6C20 6 21 8 21 8V19C21 19 19 20 17 20C15 20 15 19 15 19V8Z" stroke={fill} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );
      case 'microwave':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="4" y="6" width="16" height="12" rx="2" stroke={fill} strokeWidth="2" />
            <path d="M7 9H14" stroke={fill} strokeWidth="2" strokeLinecap="round" />
            <path d="M7 13H11" stroke={fill} strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
      case 'toaster':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="5" y="9" width="14" height="8" rx="2" stroke={fill} strokeWidth="2" />
            <path d="M7 9V6" stroke={fill} strokeWidth="2" strokeLinecap="round" />
            <path d="M17 9V6" stroke={fill} strokeWidth="2" strokeLinecap="round" />
            <path d="M9 13H15" stroke={fill} strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
      case 'dishwasher':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="5" y="4" width="14" height="16" rx="2" stroke={fill} strokeWidth="2" />
            <path d="M8 10H16" stroke={fill} strokeWidth="2" strokeLinecap="round" />
            <path d="M8 14H10" stroke={fill} strokeWidth="2" strokeLinecap="round" />
            <path d="M12 14H14" stroke={fill} strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
      case 'fridge':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="6" y="4" width="12" height="16" rx="2" stroke={fill} strokeWidth="2" />
            <path d="M10 8H14" stroke={fill} strokeWidth="2" strokeLinecap="round" />
            <path d="M10 12H14" stroke={fill} strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
      case 'dryer':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="5" y="4" width="14" height="16" rx="2" stroke={fill} strokeWidth="2" />
            <circle cx="12" cy="12" r="3" stroke={fill} strokeWidth="2" />
          </svg>
        );
      case 'table-tennis':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 16L12 12" stroke={fill} strokeWidth="2" strokeLinecap="round" />
            <path d="M12 12L16 16" stroke={fill} strokeWidth="2" strokeLinecap="round" />
            <circle cx="7" cy="17" r="2" fill={fill} />
            <circle cx="17" cy="7" r="2" fill={fill} />
          </svg>
        );
      case 'umbrella-beach':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 4L6 8H18L12 4Z" stroke={fill} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M12 4V20" stroke={fill} strokeWidth="2" strokeLinecap="round" />
            <path d="M8 8C8 8 9.5 12 12 12C14.5 12 16 8 16 8" stroke={fill} strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
      case 'hot-tub':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 16C5 14.343 6.343 13 8 13H16C17.657 13 19 14.343 19 16V18H5V16Z" stroke={fill} strokeWidth="2" />
            <path d="M7 13V11C7 9.895 7.895 9 9 9H15C16.105 9 17 9.895 17 11V13" stroke={fill} strokeWidth="2" />
          </svg>
        );
      case 'baby-carriage':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 12H10L12 8H18" stroke={fill} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="7" cy="18" r="2" stroke={fill} strokeWidth="2" />
            <circle cx="17" cy="18" r="2" stroke={fill} strokeWidth="2" />
            <path d="M10 12H18" stroke={fill} strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
      case 'cube':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 8L12 5L18 8V16L12 19L6 16V8Z" stroke={fill} strokeWidth="2" strokeLinejoin="round" />
            <path d="M12 5V19" stroke={fill} strokeWidth="2" strokeLinecap="round" />
            <path d="M18 8L12 11L6 8" stroke={fill} strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
      case 'chair':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 8H18V12H6V8Z" stroke={fill} strokeWidth="2" strokeLinecap="round" />
            <path d="M8 12V18" stroke={fill} strokeWidth="2" strokeLinecap="round" />
            <path d="M16 12V18" stroke={fill} strokeWidth="2" strokeLinecap="round" />
            <path d="M4 18H20" stroke={fill} strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
      case 'bread-slice':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 4H16C18.209 4 20 5.791 20 8V16C20 18.209 18.209 20 16 20H8C5.791 20 4 18.209 4 16V8C4 5.791 5.791 4 8 4Z" stroke={fill} strokeWidth="2" />
            <path d="M7 10H17" stroke={fill} strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
      case 'mug-saucer':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 8H15C16.105 8 17 8.895 17 10V13C17 14.105 16.105 15 15 15H6" stroke={fill} strokeWidth="2" strokeLinecap="round" />
            <path d="M18 9.5C18.6667 9.5 19.3333 9.83333 19.3333 10.5C19.3333 11.1667 18.6667 11.5 18 11.5" stroke={fill} strokeWidth="2" strokeLinecap="round" />
            <path d="M4 17H16" stroke={fill} strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
      case 'temperature-high':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 21C12 21 16 17.5 16 13.5C16 11.0147 14.2091 9 12 9C9.79086 9 8 11.0147 8 13.5C8 17.5 12 21 12 21Z" stroke={fill} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M12 5V9" stroke={fill} strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
      case 'snowflake':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 3V21" stroke={fill} strokeWidth="2" strokeLinecap="round" />
            <path d="M3 12H21" stroke={fill} strokeWidth="2" strokeLinecap="round" />
            <path d="M5.636 5.636L18.364 18.364" stroke={fill} strokeWidth="2" strokeLinecap="round" />
            <path d="M18.364 5.636L5.636 18.364" stroke={fill} strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
      case 'laptop':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="4" y="5" width="16" height="12" rx="2" stroke={fill} strokeWidth="2" />
            <path d="M2 19H22" stroke={fill} strokeWidth="2" />
          </svg>
        );
      case 'fire-extinguisher':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 6H15" stroke={fill} strokeWidth="2" strokeLinecap="round" />
            <path d="M8 6V4H16V6" stroke={fill} strokeWidth="2" strokeLinejoin="round" />
            <path d="M10 6V19H14V6" stroke={fill} strokeWidth="2" />
            <circle cx="12" cy="15" r="2" stroke={fill} strokeWidth="2" />
          </svg>
        );
      case 'biohazard':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="3" stroke={fill} strokeWidth="2" />
            <path d="M12 5.5C10.067 5.5 8.367 6.483 7.318 8.062" stroke={fill} strokeWidth="2" strokeLinecap="round" />
            <path d="M16.682 8.062C15.633 6.483 13.933 5.5 12 5.5" stroke={fill} strokeWidth="2" strokeLinecap="round" />
            <path d="M5.5 12C5.5 13.933 6.483 15.633 8.062 16.682" stroke={fill} strokeWidth="2" strokeLinecap="round" />
            <path d="M16.682 15.318C15.633 16.517 13.933 17.5 12 17.5" stroke={fill} strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
      case 'shower':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 3V8" stroke={fill} strokeWidth="2" strokeLinecap="round" />
            <path d="M8 8H16" stroke={fill} strokeWidth="2" strokeLinecap="round" />
            <path d="M9 12V14" stroke={fill} strokeWidth="2" strokeLinecap="round" />
            <path d="M12 12V16" stroke={fill} strokeWidth="2" strokeLinecap="round" />
            <path d="M15 12V14" stroke={fill} strokeWidth="2" strokeLinecap="round" />
            <path d="M8 20H16" stroke={fill} strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
      case 'alarm':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 4C8.68629 4 6 6.68629 6 10V14C6 17.3137 8.68629 20 12 20C15.3137 20 18 17.3137 18 14V10C18 6.68629 15.3137 4 12 4Z" stroke={fill} strokeWidth="2" />
            <path d="M12 8V12" stroke={fill} strokeWidth="2" strokeLinecap="round" />
            <path d="M12 16H12.01" stroke={fill} strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
      case 'resort':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="6" y="8" width="12" height="10" rx="2" stroke={fill} strokeWidth="2" />
            <path d="M9 8V6H15V8" stroke={fill} strokeWidth="2" />
            <path d="M8 14H16" stroke={fill} strokeWidth="2" />
          </svg>
        );
      case 'rice-cooker':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="7" y="8" width="10" height="8" rx="2" stroke={fill} strokeWidth="2" />
            <path d="M9 8V6H15V8" stroke={fill} strokeWidth="2" />
            <path d="M12 12H12.01" stroke={fill} strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
      case 'curtains':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="6" y="5" width="12" height="14" rx="2" stroke={fill} strokeWidth="2" />
            <path d="M12 5V19" stroke={fill} strokeWidth="2" />
            <path d="M8 5V19" stroke={fill} strokeWidth="2" />
          </svg>
        );
      case 'safe':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="5" y="5" width="14" height="14" rx="2" stroke={fill} strokeWidth="2" />
            <circle cx="14" cy="12" r="2" stroke={fill} strokeWidth="2" />
            <path d="M8 12H10" stroke={fill} strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
      case 'sauna':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="6" y="8" width="12" height="10" rx="2" stroke={fill} strokeWidth="2" />
            <path d="M9 8C9 5.79086 10.7909 4 13 4" stroke={fill} strokeWidth="2" />
            <path d="M8 12C8 10 9 9 10 9C11 9 12 10 12 12" stroke={fill} strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
      case 'house':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 12L12 4L21 12" stroke={fill} strokeWidth="2" strokeLinecap="round" />
            <path d="M6 12V20H18V12" stroke={fill} strokeWidth="2" />
          </svg>
        );
      case 'skateboard':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 12H19" stroke={fill} strokeWidth="2" strokeLinecap="round" />
            <circle cx="7" cy="17" r="2" stroke={fill} strokeWidth="2" />
            <circle cx="17" cy="17" r="2" stroke={fill} strokeWidth="2" />
          </svg>
        );
      case 'ski':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 19L18 5" stroke={fill} strokeWidth="2" strokeLinecap="round" />
            <path d="M7 10L13 16" stroke={fill} strokeWidth="2" strokeLinecap="round" />
            <path d="M4 20H20" stroke={fill} strokeWidth="2" />
          </svg>
        );
      case 'solar-panel':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="5" y="8" width="14" height="8" rx="2" stroke={fill} strokeWidth="2" />
            <path d="M8 8V6M16 8V6M12 4V8" stroke={fill} strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
      case 'speaker':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="6" y="8" width="6" height="8" rx="1" stroke={fill} strokeWidth="2" />
            <path d="M12 10L16 7V17L12 14" stroke={fill} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );
      case 'table-guard':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 5H19V19H5V5Z" stroke={fill} strokeWidth="2" />
            <path d="M12 5V19" stroke={fill} strokeWidth="2" />
            <path d="M5 12H19" stroke={fill} strokeWidth="2" />
          </svg>
        );
      case 'theme':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L14 9H21L15.5 14L17.5 21L12 17L6.5 21L8.5 14L3 9H10L12 2Z" stroke={fill} strokeWidth="2" strokeLinejoin="round" />
          </svg>
        );
      case 'trash':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="7" y="7" width="10" height="12" rx="2" stroke={fill} strokeWidth="2" />
            <path d="M9 7V5H15V7" stroke={fill} strokeWidth="2" />
          </svg>
        );
      case 'wine-glass':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 4H16C16 7 14 9 12 9C10 9 8 7 8 4Z" stroke={fill} strokeWidth="2" />
            <path d="M12 9V16" stroke={fill} strokeWidth="2" />
            <path d="M10 16H14" stroke={fill} strokeWidth="2" />
          </svg>
        );
      case 'archway':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 18V10C6 8.343 7.343 7 9 7H15C16.657 7 18 8.343 18 10V18" stroke={fill} strokeWidth="2" strokeLinecap="round" />
            <path d="M6 18H18" stroke={fill} strokeWidth="2" strokeLinecap="round" />
            <path d="M12 7V3" stroke={fill} strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
      case 'wind':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 7H17C18.1046 7 19 7.89543 19 9C19 10.1046 18.1046 11 17 11H7" stroke={fill} strokeWidth="2" strokeLinecap="round" />
            <path d="M9 15H21C22.1046 15 23 15.8954 23 17C23 18.1046 22.1046 19 21 19H11" stroke={fill} strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
      case 'flower':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 12C12 13.6569 10.6569 15 9 15C7.34315 15 6 13.6569 6 12C6 10.3431 7.34315 9 9 9C10.6569 9 12 10.3431 12 12Z" stroke={fill} strokeWidth="2" />
            <path d="M15 12C15 13.6569 16.3431 15 18 15C19.6569 15 21 13.6569 21 12C21 10.3431 19.6569 9 18 9C16.3431 9 15 10.3431 15 12Z" stroke={fill} strokeWidth="2" />
            <path d="M12 15C12 16.6569 13.3431 18 15 18C16.6569 18 18 16.6569 18 15C18 13.3431 16.6569 12 15 12C13.3431 12 12 13.3431 12 15Z" stroke={fill} strokeWidth="2" />
            <path d="M12 9C12 7.34315 10.6569 6 9 6C7.34315 6 6 7.34315 6 9C6 10.6569 7.34315 12 9 12C10.6569 12 12 10.6569 12 9Z" stroke={fill} strokeWidth="2" />
            <path d="M12 4V20" stroke={fill} strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
      case 'bathtub':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 13H20V17C20 18.1046 19.1046 19 18 19H6C4.89543 19 4 18.1046 4 17V13Z" stroke={fill} strokeWidth="2" />
            <path d="M7 13V10C7 8.89543 7.89543 8 9 8H15C16.1046 8 17 8.89543 17 10V13" stroke={fill} strokeWidth="2" />
            <path d="M8 5C8 3.89543 8.89543 3 10 3H11" stroke={fill} strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
      case 'barbecue-grill':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 10H18" stroke={fill} strokeWidth="2" strokeLinecap="round" />
            <path d="M7 10V15C7 16.1046 7.89543 17 9 17H15C16.1046 17 17 16.1046 17 15V10" stroke={fill} strokeWidth="2" />
            <path d="M8 7C8 5.89543 8.89543 5 10 5H14C15.1046 5 16 5.89543 16 7" stroke={fill} strokeWidth="2" />
            <path d="M9 19L7 21" stroke={fill} strokeWidth="2" strokeLinecap="round" />
            <path d="M15 19L17 21" stroke={fill} strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
      case 'sunset':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 17H21" stroke={fill} strokeWidth="2" strokeLinecap="round" />
            <path d="M8 13L12 9L16 13" stroke={fill} strokeWidth="2" strokeLinecap="round" />
            <path d="M4.5 11.5L3 9" stroke={fill} strokeWidth="2" strokeLinecap="round" />
            <path d="M19.5 11.5L21 9" stroke={fill} strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
      case 'sunglasses':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 12H7L9 8H15L17 12H21" stroke={fill} strokeWidth="2" strokeLinecap="round" />
            <path d="M7 12V15C7 16.1046 7.89543 17 9 17H10" stroke={fill} strokeWidth="2" />
            <path d="M15 12V15C15 16.1046 14.1046 17 13 17H12" stroke={fill} strokeWidth="2" />
            <path d="M9.5 6.5L10.5 6" stroke={fill} strokeWidth="2" strokeLinecap="round" />
            <path d="M14.5 6.5L13.5 6" stroke={fill} strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
      case 'towel':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="5" y="6" width="14" height="12" rx="3" stroke={fill} strokeWidth="2" />
            <path d="M9 6V18" stroke={fill} strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
      case 'toilet':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 4H16V6H8V4Z" stroke={fill} strokeWidth="2" />
            <path d="M10 6V12C10 13.6569 11.3431 15 13 15H14C15.6569 15 17 13.6569 17 12V6" stroke={fill} strokeWidth="2" />
            <path d="M7 19C7 17.8954 7.89543 17 9 17H15C16.1046 17 17 17.8954 17 19" stroke={fill} strokeWidth="2" />
          </svg>
        );
      case 'bike':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="7" cy="17" r="3" stroke={fill} strokeWidth="2" />
            <circle cx="17" cy="17" r="3" stroke={fill} strokeWidth="2" />
            <path d="M7 17H11L13 11H15" stroke={fill} strokeWidth="2" strokeLinecap="round" />
            <path d="M13 11L10 11" stroke={fill} strokeWidth="2" strokeLinecap="round" />
            <path d="M15 13L17 11" stroke={fill} strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
      case 'blender':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="8" y="4" width="8" height="6" rx="1" stroke={fill} strokeWidth="2" />
            <path d="M10 10V17" stroke={fill} strokeWidth="2" strokeLinecap="round" />
            <path d="M14 10V17" stroke={fill} strokeWidth="2" strokeLinecap="round" />
            <path d="M7 17H17" stroke={fill} strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
      case 'chess':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 20H16" stroke={fill} strokeWidth="2" />
            <path d="M10 20V14H14V20" stroke={fill} strokeWidth="2" />
            <path d="M11 14V10H13V14" stroke={fill} strokeWidth="2" />
            <path d="M12 10L10 6H14L12 10Z" stroke={fill} strokeWidth="2" />
          </svg>
        );
      case 'soap':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="5" y="7" width="14" height="8" rx="2" stroke={fill} strokeWidth="2" />
            <path d="M8 10H16" stroke={fill} strokeWidth="2" />
            <path d="M9 14H15" stroke={fill} strokeWidth="2" />
          </svg>
        );
      case 'book':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 4H18V20H6V4Z" stroke={fill} strokeWidth="2" />
            <path d="M10 4V20" stroke={fill} strokeWidth="2" />
          </svg>
        );
      case 'bowling':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="6" stroke={fill} strokeWidth="2" />
            <circle cx="10" cy="10" r="1" fill={fill} />
            <circle cx="12" cy="8" r="1" fill={fill} />
            <circle cx="14" cy="10" r="1" fill={fill} />
          </svg>
        );
      case 'bread':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 10C6 7.79086 7.79086 6 10 6H14C16.2091 6 18 7.79086 18 10V16C18 17.1046 17.1046 18 16 18H8C6.89543 18 6 17.1046 6 16V10Z" stroke={fill} strokeWidth="2" />
            <path d="M8 10H16" stroke={fill} strokeWidth="2" />
          </svg>
        );
      case 'coffee':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M7 6H16C17.6569 6 19 7.34315 19 9V12C19 13.6569 17.6569 15 16 15H7" stroke={fill} strokeWidth="2" strokeLinecap="round" />
            <path d="M8 15V17C8 18.1046 8.89543 19 10 19H13" stroke={fill} strokeWidth="2" strokeLinecap="round" />
            <path d="M16 9H18" stroke={fill} strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
      case 'fan':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="3" stroke={fill} strokeWidth="2" />
            <path d="M12 3V7" stroke={fill} strokeWidth="2" strokeLinecap="round" />
            <path d="M12 17V21" stroke={fill} strokeWidth="2" strokeLinecap="round" />
            <path d="M3 12H7" stroke={fill} strokeWidth="2" strokeLinecap="round" />
            <path d="M17 12H21" stroke={fill} strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
      case 'teddy-bear':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="8" r="3" stroke={fill} strokeWidth="2" />
            <path d="M7 7C7 5.89543 7.89543 5 9 5H15C16.1046 5 17 5.89543 17 7" stroke={fill} strokeWidth="2" />
            <path d="M5 14C5 11.7909 6.79086 10 9 10H15C17.2091 10 19 11.7909 19 14V18H5V14Z" stroke={fill} strokeWidth="2" />
          </svg>
        );
      case 'spoon-fork':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 4V20" stroke={fill} strokeWidth="2" strokeLinecap="round" />
            <path d="M11 4L11 12" stroke={fill} strokeWidth="2" strokeLinecap="round" />
            <path d="M11 16H14" stroke={fill} strokeWidth="2" strokeLinecap="round" />
            <path d="M16 4V12" stroke={fill} strokeWidth="2" strokeLinecap="round" />
            <path d="M16 16H18" stroke={fill} strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
      case 'bucket':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 8H16L18 19H6L8 8Z" stroke={fill} strokeWidth="2" />
            <path d="M7 8L6 5H18L17 8" stroke={fill} strokeWidth="2" />
          </svg>
        );
      case 'cabinet':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="6" y="5" width="12" height="14" rx="2" stroke={fill} strokeWidth="2" />
            <path d="M12 5V19" stroke={fill} strokeWidth="2" />
            <path d="M8 11H10" stroke={fill} strokeWidth="2" />
            <path d="M14 11H16" stroke={fill} strokeWidth="2" />
          </svg>
        );
      case 'shampoo':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 4H16V9H8V4Z" stroke={fill} strokeWidth="2" />
            <path d="M8 9V18C8 19.1046 8.89543 20 10 20H14C15.1046 20 16 19.1046 16 18V9" stroke={fill} strokeWidth="2" />
          </svg>
        );
      case 'cutlery':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M7 4V20" stroke={fill} strokeWidth="2" strokeLinecap="round" />
            <path d="M10 6V18" stroke={fill} strokeWidth="2" strokeLinecap="round" />
            <path d="M12 4L18 10" stroke={fill} strokeWidth="2" strokeLinecap="round" />
            <path d="M12 7L18 13" stroke={fill} strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
      case 'crib':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="6" y="7" width="12" height="10" rx="2" stroke={fill} strokeWidth="2" />
            <path d="M6 11H18" stroke={fill} strokeWidth="2" />
            <path d="M9 7V4" stroke={fill} strokeWidth="2" strokeLinecap="round" />
            <path d="M15 7V4" stroke={fill} strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
      case 'table':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="5" y="7" width="14" height="6" rx="2" stroke={fill} strokeWidth="2" />
            <path d="M7 13V19" stroke={fill} strokeWidth="2" />
            <path d="M17 13V19" stroke={fill} strokeWidth="2" />
          </svg>
        );
      case 'hanger':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 4C12 2.89543 12.8954 2 14 2C15.1046 2 16 2.89543 16 4C16 5.10457 15.1046 6 14 6H10C8.89543 6 8 5.10457 8 4C8 2.89543 8.89543 2 10 2C11.1046 2 12 2.89543 12 4Z" stroke={fill} strokeWidth="2" />
            <path d="M5 8H19" stroke={fill} strokeWidth="2" />
            <path d="M12 4V12" stroke={fill} strokeWidth="2" />
          </svg>
        );
      case 'up-down':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 4V20" stroke={fill} strokeWidth="2" strokeLinecap="round" />
            <path d="M8 8L12 4L16 8" stroke={fill} strokeWidth="2" strokeLinecap="round" />
            <path d="M8 16L12 20L16 16" stroke={fill} strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
      case 'toothbrush':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="6" y="4" width="2" height="12" rx="1" fill={fill} />
            <path d="M8 4H15" stroke={fill} strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
      case 'pillow':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="5" y="7" width="14" height="10" rx="3" stroke={fill} strokeWidth="2" />
            <path d="M5 11C8 10 10 8 12 8C14 8 16 10 19 11" stroke={fill} strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
      case 'parking':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="6" y="4" width="10" height="16" rx="2" stroke={fill} strokeWidth="2" />
            <path d="M12 8V16" stroke={fill} strokeWidth="2" strokeLinecap="round" />
            <path d="M10 12H15" stroke={fill} strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
      case 'game-controller':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 12C6 9.79086 7.79086 8 10 8H14C16.2091 8 18 9.79086 18 12C18 14.2091 16.2091 16 14 16H10C7.79086 16 6 14.2091 6 12Z" stroke={fill} strokeWidth="2" />
            <path d="M9 11V13" stroke={fill} strokeWidth="2" strokeLinecap="round" />
            <path d="M11 12H12" stroke={fill} strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
      case 'gate':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 4V20" stroke={fill} strokeWidth="2" />
            <path d="M16 4V20" stroke={fill} strokeWidth="2" />
            <path d="M8 12H16" stroke={fill} strokeWidth="2" />
          </svg>
        );
      case 'hair-dryer':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M7 11H14L17 8V16L14 13H7V11Z" stroke={fill} strokeWidth="2" strokeLinecap="round" />
            <path d="M5 10H7V14H5V10Z" stroke={fill} strokeWidth="2" />
          </svg>
        );
      case 'swing':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 4V8" stroke={fill} strokeWidth="2" strokeLinecap="round" />
            <path d="M16 4V8" stroke={fill} strokeWidth="2" strokeLinecap="round" />
            <path d="M8 8H16" stroke={fill} strokeWidth="2" />
            <path d="M10 8V16H14V8" stroke={fill} strokeWidth="2" />
          </svg>
        );
      case 'thermometer':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 3V13" stroke={fill} strokeWidth="2" strokeLinecap="round" />
            <circle cx="12" cy="17" r="3" stroke={fill} strokeWidth="2" />
          </svg>
        );
      case 'kettle':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 16C6 11.5817 8.68629 8 12 8C15.3137 8 18 11.5817 18 16V18H6V16Z" stroke={fill} strokeWidth="2" />
            <path d="M9 8V5H15V8" stroke={fill} strokeWidth="2" />
          </svg>
        );
      case 'chimney':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="7" y="7" width="10" height="10" rx="2" stroke={fill} strokeWidth="2" />
            <path d="M10 7V4" stroke={fill} strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
      case 'lake':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 17C7 14 10 16 12 16C14 16 17 14 20 17" stroke={fill} strokeWidth="2" strokeLinecap="round" />
            <path d="M4 19C7 16 10 18 12 18C14 18 17 16 20 19" stroke={fill} strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
      case 'calendar':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="4" y="4" width="16" height="16" rx="2" stroke={fill} strokeWidth="2" />
            <path d="M4 10H20" stroke={fill} strokeWidth="2" />
            <path d="M8 4V8" stroke={fill} strokeWidth="2" />
            <path d="M16 4V8" stroke={fill} strokeWidth="2" />
          </svg>
        );
      case 'mini-fridge':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="7" y="4" width="10" height="16" rx="2" stroke={fill} strokeWidth="2" />
            <path d="M7 10H17" stroke={fill} strokeWidth="2" />
          </svg>
        );
      case 'golf':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M11 4L12 20" stroke={fill} strokeWidth="2" />
            <path d="M12 4L16 6" stroke={fill} strokeWidth="2" />
            <circle cx="5" cy="18" r="2" stroke={fill} strokeWidth="2" />
          </svg>
        );
      case 'popcorn':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M7 8C7 5.79086 8.79086 4 11 4H13C15.2091 4 17 5.79086 17 8V9H7V8Z" stroke={fill} strokeWidth="2" />
            <path d="M7 9H17L15 20H9L7 9Z" stroke={fill} strokeWidth="2" />
          </svg>
        );
      case 'slide':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 8L10 4L14 8" stroke={fill} strokeWidth="2" strokeLinecap="round" />
            <path d="M10 4V16" stroke={fill} strokeWidth="2" strokeLinecap="round" />
            <path d="M6 16H14" stroke={fill} strokeWidth="2" />
          </svg>
        );
      case 'window':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="5" y="5" width="14" height="14" rx="2" stroke={fill} strokeWidth="2" />
            <path d="M5 12H19" stroke={fill} strokeWidth="2" />
            <path d="M12 5V19" stroke={fill} strokeWidth="2" />
          </svg>
        );
      case 'ping-pong':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="8" cy="16" r="2" fill={fill} />
            <circle cx="16" cy="8" r="2" fill={fill} />
            <path d="M8 16L16 8" stroke={fill} strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
      case 'pool':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="12" cy="16" rx="8" ry="3" stroke={fill} strokeWidth="2" />
            <path d="M4 16V11C4 9.34315 5.34315 8 7 8H17C18.6569 8 20 9.34315 20 11V16" stroke={fill} strokeWidth="2" />
          </svg>
        );
      case 'billiards':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="4" y="8" width="16" height="8" rx="2" stroke={fill} strokeWidth="2" />
            <circle cx="9" cy="12" r="1.5" fill={fill} />
            <circle cx="15" cy="12" r="1.5" fill={fill} />
          </svg>
        );
      case 'door':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="7" y="4" width="10" height="16" rx="2" stroke={fill} strokeWidth="2" />
            <circle cx="15" cy="12" r="1" fill={fill} />
          </svg>
        );
      case 'recorder':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="6" stroke={fill} strokeWidth="2" />
            <circle cx="12" cy="12" r="2" fill={fill} />
          </svg>
        );
      case 'recycling':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 4L8 10H16L12 4Z" stroke={fill} strokeWidth="2" />
            <path d="M12 20L8 14H16L12 20Z" stroke={fill} strokeWidth="2" />
            <path d="M4 12H20" stroke={fill} strokeWidth="2" />
          </svg>
        );
      case 'washing-machine':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="5" y="4" width="14" height="16" rx="2" stroke={fill} strokeWidth="2" />
            <circle cx="12" cy="12" r="4" stroke={fill} strokeWidth="2" />
          </svg>
        );
      default:
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="9" stroke={fill} strokeWidth="2" fill="none" />
            <text x="12" y="15" textAnchor="middle" fontSize="10" fill={fill} fontFamily="Arial, sans-serif">{amenity[0]?.toUpperCase()}</text>
          </svg>
        );
    }
  };

  const locationFeatureOptions = [
    { key: "beachAccess", label: "Beach access", description: "Guests can enjoy a nearby beach" },
    { key: "lakeAccess", label: "Lake access", description: "Guests can get to a lake using a path or dock" },
    { key: "laundromatNearby", label: "Laundromat nearby", description: "Guests can use a nearby laundromat" },
    { key: "privateEntrance", label: "Private entrance", description: "An entrance that’s only available to guests" },
    { key: "resortAccess", label: "Resort access", description: "Guests can use nearby resort facilities" },
    { key: "skiInSkiOut", label: "Ski-in/Ski-out", description: "Guests can access ski lifts without transportation" },
    { key: "waterfront", label: "Waterfront", description: "A property that’s right next to a body of water" },
  ];

  const scenicViewOptions = [
    "Bay view",
    "Beach view",
    "Canal view",
    "City skyline view",
    "Courtyard view",
    "Desert view",
    "Garden view",
    "Golf course view",
    "Harbor view",
    "Lake view",
    "Marina view",
    "Mountain view",
    "Ocean view",
    "Park view",
    "Pool view",
    "Resort view",
    "River view",
    "Sea view",
    "Valley view",
    "Vineyard view",
    "Landmark view"
  ];

  const [selectedSection, setSelectedSection] = useState("photo-tour");
  const [locationCenter, setLocationCenter] = useState(null);
  const [isMapAdjusting, setIsMapAdjusting] = useState(false);
  const [adjustingCenter, setAdjustingCenter] = useState(null);
  const [locationExpandedPanel, setLocationExpandedPanel] = useState(null);
  const [locationSaving, setLocationSaving] = useState(false);
  const [locationSaveMessage, setLocationSaveMessage] = useState("");
  const [addressDetails, setAddressDetails] = useState({
    unit: "",
    building: "",
    street: "",
    barangay: "",
    city: "",
    zip: "",
    province: ""
  });
  const [locationFeatures, setLocationFeatures] = useState({
    beachAccess: false,
    lakeAccess: false,
    laundromatNearby: false,
    privateEntrance: false,
    resortAccess: false,
    skiInSkiOut: false,
    waterfront: false,
  });
  const [neighborhoodDescription, setNeighborhoodDescription] = useState("");
  const [gettingAround, setGettingAround] = useState("");
  const [scenicViews, setScenicViews] = useState([]);
  const [aboutMe, setAboutMe] = useState("");
  const [hostProfilePreview, setHostProfilePreview] = useState("");
  const [hostProfileFile, setHostProfileFile] = useState(null);
  const [hostInterests, setHostInterests] = useState([]);
  const [showInterestsModal, setShowInterestsModal] = useState(false);
  const [tempSelectedInterests, setTempSelectedInterests] = useState([]);
  const profileInputRef = useRef(null);
  const [bookingSetting, setBookingSetting] = useState("approve-first-5");
  const [houseRulesState, setHouseRulesState] = useState({
    petsAllowed: false,
    eventsAllowed: false,
    smokingAllowed: false,
    quietHours: false,
    commercialPhotographyAllowed: false,
    numberOfGuests: 1,
    checkInTime: '3:00 PM',
    checkOutTime: '11:00 AM'
  });
  const [cancellationPolicyState, setCancellationPolicyState] = useState({
    shortTerm: 'Flexible',
    additional: 'None',
    longTerm: 'Firm Long Term'
  });
  const [policyDraft, setPolicyDraft] = useState(cancellationPolicyState);
  const [activePolicyPanel, setActivePolicyPanel] = useState(null);

  const allInterests = [
    "Food scenes","Outdoors","Movies","Coffee","Photography","Shopping","Animals","Live music",
    "Anime","Cooking","Walking","Reading","Playing music","Museums","Video games","Self-care"
  ];

  const renderBookingIcon = (icon, color) => {
    const fill = color || '#111827';
    switch (icon) {
      case 'calendar-alt':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 4H18" stroke={fill} strokeWidth="2" strokeLinecap="round" />
            <path d="M6 4V6" stroke={fill} strokeWidth="2" strokeLinecap="round" />
            <path d="M18 4V6" stroke={fill} strokeWidth="2" strokeLinecap="round" />
            <rect x="4" y="6" width="16" height="14" rx="2" stroke={fill} strokeWidth="2" />
            <path d="M8 10H9M11 10H12M14 10H15M8 14H9M11 14H12M14 14H15" stroke={fill} strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
      case 'bolt':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M13 2L7 12H11L10 22L17 12H13L14 2Z" fill={fill} />
          </svg>
        );
      case 'check-square':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="3" width="18" height="18" rx="3" stroke={fill} strokeWidth="2" />
            <path d="M8 12L11 15L16 9" stroke={fill} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );
      default:
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke={fill} strokeWidth="2" />
          </svg>
        );
    }
  };

  const bookingSettingsOptions = [
    {
      key: "approve-first-5",
      title: "Approve your first 5 bookings",
      subtitle: "Start by reviewing reservation requests, then switch to Instant Book so guests can book automatically.",
      badge: "0 of 5 approved",
      icon: "calendar-alt",
      iconColor: "#2563eb"
    },
    {
      key: "instant-book",
      title: "Use Instant Book",
      subtitle: "Let guests book automatically, which can help you get more bookings.",
      icon: "bolt",
      iconColor: "#f59e0b"
    },
    {
      key: "approve-all",
      title: "Approve all bookings",
      subtitle: "Always review reservation requests.",
      icon: "check-square",
      iconColor: "#10b981"
    }
  ];
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [editState, setEditState] = useState({
    listingTitle: "",
    propertyCategory: "House",
    selectedType: "Home",
    listingType: "Entire place",
    floorsInBuilding: 1,
    listingFloor: 1,
    yearBuilt: "",
    propertySize: "",
    propertySizeUnit: "square feet"
  });
  const [pricingState, setPricingState] = useState({
    basePrice: 1600,
    weekendPrice: 1632,
    discounts: {
      weekly: false,
      monthly: false,
    },
    weeklyDiscount: 10,
    monthlyDiscount: 25,
  });
  const [bedCounts, setBedCounts] = useState(() =>
    bedTypes.reduce((acc, type) => ({ ...acc, [type]: 0 }), {})
  );
  const [availabilityState, setAvailabilityState] = useState({
    minimumNights: 1,
    maximumNights: 365,
    advanceNotice: "Same day",
    sameDayCheckinTime: "12:00 AM",
    operatingHours: "",
    sessionDuration: "",
  });
  const [guestCount, setGuestCount] = useState(1);
  const [editingGuests, setEditingGuests] = useState(false);
  const [guestInput, setGuestInput] = useState("1");
  const [descriptionState, setDescriptionState] = useState("");
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [amenitiesMode, setAmenitiesMode] = useState("view");
  const addAmenitiesRef = useRef(null);

  useEffect(() => {
    if (amenitiesMode === "add" && addAmenitiesRef.current) {
      addAmenitiesRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [amenitiesMode]);

  useEffect(() => {
    if (listing) {
      setEditState({
        listingTitle: listing.listingTitle || "",
        propertyCategory: listing.propertyCategory || "House",
        selectedType: listing.selectedType || "Home",
        listingType: listing.listingType || "Entire place",
        floorsInBuilding: listing.floorsInBuilding || 1,
        listingFloor: listing.listingFloor || 1,
        yearBuilt: listing.yearBuilt || "",
        propertySize: listing.propertySize || "",
        propertySizeUnit: listing.propertySizeUnit || "square feet"
      });

      const basePrice = listing.basePrice ?? 1600;
      const weekendPremium = listing.weekendPremium ?? 2;
      const weekendPrice = listing.weekendPrice != null
        ? listing.weekendPrice
        : Math.round(basePrice * (1 + weekendPremium / 100));

      setPricingState({
        basePrice,
        weekendPrice,
        discounts: {
          weekly: listing.discounts?.weekly || false,
          monthly: listing.discounts?.monthly || false,
        },
        weeklyDiscount: listing.weeklyDiscount ?? 10,
        monthlyDiscount: listing.monthlyDiscount ?? 25,
      });

      setAvailabilityState({
        minimumNights: listing.minimumNights ?? 1,
        maximumNights: listing.maximumNights ?? 365,
        advanceNotice: listing.advanceNotice || "Same day",
        sameDayCheckinTime: listing.sameDayCheckinTime || "12:00 AM",
      });

      setGuestCount(listing.guests ?? 1);
      setDescriptionState(listing.description || "");
      setSelectedAmenities(listing.amenities || []);
      setAmenitiesMode("view");
      setAddressDetails({
        unit: listing.addressDetails?.unit || "",
        building: listing.addressDetails?.building || "",
        street: listing.addressDetails?.street || listing.address || "",
        barangay: listing.addressDetails?.barangay || "",
        city: listing.addressDetails?.city || "",
        zip: listing.addressDetails?.zip || "",
        province: listing.addressDetails?.province || "",
      });
      setLocationFeatures({
        beachAccess: listing.locationFeatures?.beachAccess || false,
        lakeAccess: listing.locationFeatures?.lakeAccess || false,
        laundromatNearby: listing.locationFeatures?.laundromatNearby || false,
        privateEntrance: listing.locationFeatures?.privateEntrance || false,
        resortAccess: listing.locationFeatures?.resortAccess || false,
        skiInSkiOut: listing.locationFeatures?.skiInSkiOut || false,
        waterfront: listing.locationFeatures?.waterfront || false,
      });
      setNeighborhoodDescription(listing.neighborhoodDescription || "");
      setGettingAround(listing.gettingAround || "");
      setScenicViews(listing.scenicViews || []);
      // populate host info if available
      setAboutMe(listing.hostInfo?.aboutMe || "");
      setHostInterests(listing.hostInfo?.interests || []);
      setHostProfilePreview(listing.hostInfo?.photoUrl || "");
      const normalizedBookingSetting = ["approve-first-5", "instant-book", "approve-all"].includes(listing.bookingSettings)
        ? listing.bookingSettings
        : "approve-first-5";
      setBookingSetting(normalizedBookingSetting);
    }
  }, [listing]);

  useEffect(() => {
    setGuestInput(guestCount.toString());
  }, [guestCount]);

  if (isLoading) {
    return (
      <main className="host-shell create-listing-page">
        <Navbar
          profilePhotoURL={profilePhotoURL}
          profileInitial={profileInitial}
          onMenuToggle={() => setMenuOpen((value) => !value)}
          menuOpen={menuOpen}
          homePath="/host"
        />
        <section className="create-listing-container">
          <div className="structure-page-card">
            <h2>Loading listing editor…</h2>
          </div>
        </section>
      </main>
    );
  }

  if (!listing) {
    return (
      <main className="host-shell create-listing-page">
        <Navbar
          profilePhotoURL={profilePhotoURL}
          profileInitial={profileInitial}
          onMenuToggle={() => setMenuOpen((value) => !value)}
          menuOpen={menuOpen}
          homePath="/host"
        />
        <section className="create-listing-container">
          <div className="structure-page-card">
            <h2>Listing not found</h2>
            <p>The listing you selected could not be loaded.</p>
            <button type="button" className="create-listing-button" onClick={() => navigate("/host")}>Back to listings</button>
          </div>
        </section>
      </main>
    );
  }

  const photoCount = listing.photoUrls?.length || 0;
  const selectedType = (listing.selectedType || listing.listingType || "Home").toString();
  const isService = selectedType.toLowerCase() === "service";
  const sleepingText = `${listing.guests || 1} guests · ${listing.bedrooms || 1} bed · ${listing.beds || 1} bed · ${listing.bathrooms || 1} bath`;
  const pricingText = listing.basePrice ? `₱${listing.basePrice.toLocaleString()} / night` : "Set your price";
  const weekendText = listing.weekendPremium != null ? `${listing.weekendPremium}% weekend premium` : "Set weekend pricing";
  const descriptionText = descriptionState || "Add a description";
  const amenitiesText = selectedAmenities.length ? selectedAmenities.join(", ") : "Add amenities";
  const locationText = listing.addressDetails?.address || listing.address || "Add location";
  const hostName = auth.currentUser?.displayName || "Host";


  const handleHostProfileFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setHostProfileFile(file);
      setHostProfilePreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage("");

    const weekendPremium = pricingState.basePrice > 0
      ? Math.round((pricingState.weekendPrice / pricingState.basePrice - 1) * 100)
      : 0;

    let updateData;
    if (selectedSection === "title") {
      updateData = { listingTitle: editState.listingTitle };
    } else if (selectedSection === "pricing") {
      updateData = {
        basePrice: pricingState.basePrice,
        weekendPremium,
        weekendPrice: pricingState.weekendPrice,
        discounts: pricingState.discounts,
        weeklyDiscount: pricingState.weeklyDiscount,
        monthlyDiscount: pricingState.monthlyDiscount,
      };
    } else if (selectedSection === "sleeping-arrangements") {
      updateData = {
        sleepingArrangements: bedCounts,
      };
    } else if (selectedSection === "availability") {
      updateData = {
        minimumNights: availabilityState.minimumNights,
        maximumNights: availabilityState.maximumNights,
        advanceNotice: availabilityState.advanceNotice,
        sameDayCheckinTime: availabilityState.sameDayCheckinTime,
        operatingHours: availabilityState.operatingHours,
        sessionDuration: availabilityState.sessionDuration,
      };
    } else if (selectedSection === "number-of-guests") {
      updateData = {
        guests: guestCount,
      };
    } else if (selectedSection === "description") {
      updateData = {
        description: descriptionState,
      };
    } else if (selectedSection === "about-host") {
      // handle host profile upload (if any) and about info
      let photoUrl = listing.hostInfo?.photoUrl || "";
      if (hostProfileFile) {
        try {
          const uid = auth.currentUser?.uid || 'anon';
          const sRef = storageRef(storage, `hostProfiles/${uid}/${Date.now()}_${hostProfileFile.name}`);
          await uploadBytes(sRef, hostProfileFile);
          const downloadURL = await getDownloadURL(sRef);
          photoUrl = downloadURL;
          setHostProfilePreview(downloadURL);
          setHostProfileFile(null);
        } catch (err) {
          console.error('Profile upload failed', err);
        }
      }
      updateData = {
        hostInfo: {
          aboutMe: aboutMe,
          interests: hostInterests,
          photoUrl: photoUrl
        }
      };
    } else if (selectedSection === "booking-settings") {
      updateData = {
        bookingSettings: bookingSetting,
      };
    } else if (selectedSection === "house-rules") {
      updateData = {
        houseRules: houseRulesState,
      };
    } else if (selectedSection === "cancellation-policy") {
      updateData = {
        cancellationPolicy: cancellationPolicyState,
      };
    } else if (selectedSection === "amenities") {
      updateData = {
        amenities: selectedAmenities,
      };
    } else {
      updateData = { updatedAt: new Date() };
    }

    try {
      const listingRef = doc(db, "listings", id);
      await updateDoc(listingRef, updateData);
      setListing((prev) => ({ ...prev, ...updateData }));
      setSaveMessage("Saved successfully.");
    } catch (error) {
      console.error("Save failed", error);
      setSaveMessage("Save failed, please try again.");
    } finally {
      setSaving(false);
      window.setTimeout(() => setSaveMessage(""), 3000);
    }
  };

  const handleCancel = () => {
    if (!listing) return;

    if (selectedSection === "title") {
      setEditState((prev) => ({ ...prev, listingTitle: listing.listingTitle || "" }));
    }

    if (selectedSection === "pricing") {
      const basePrice = listing.basePrice ?? 1600;
      const weekendPremium = listing.weekendPremium ?? 2;
      const weekendPrice = listing.weekendPrice != null
        ? listing.weekendPrice
        : Math.round(basePrice * (1 + weekendPremium / 100));

      setPricingState({
        basePrice,
        weekendPrice,
        discounts: {
          weekly: listing.discounts?.weekly || false,
          monthly: listing.discounts?.monthly || false,
        },
        weeklyDiscount: listing.weeklyDiscount ?? 10,
        monthlyDiscount: listing.monthlyDiscount ?? 25,
      });
    }

    if (selectedSection === "sleeping-arrangements") {
      const savedArrangements = listing.sleepingArrangements || {};
      setBedCounts(bedTypes.reduce((acc, type) => ({
        ...acc,
        [type]: savedArrangements[type] || 0,
      }), {}));
    }

    if (selectedSection === "description") {
      setDescriptionState(listing.description || "");
    }

    if (selectedSection === "about-host") {
      setAboutMe(listing.hostInfo?.aboutMe || "");
      setHostInterests(listing.hostInfo?.interests || []);
      setHostProfilePreview(listing.hostInfo?.photoUrl || "");
      setHostProfileFile(null);
    }

    if (selectedSection === "booking-settings") {
      setBookingSetting(listing.bookingSettings || "approve-first-5");
    }

    if (selectedSection === "house-rules") {
      setHouseRulesState(listing.houseRules && typeof listing.houseRules === 'object'
        ? listing.houseRules
        : {
          petsAllowed: false,
          eventsAllowed: false,
          smokingAllowed: false,
          quietHours: false,
          commercialPhotographyAllowed: false,
          numberOfGuests: 1,
          checkInTime: '3:00 PM',
          checkOutTime: '11:00 AM'
        }
      );
    }

    if (selectedSection === "cancellation-policy") {
      setCancellationPolicyState(listing.cancellationPolicy && typeof listing.cancellationPolicy === 'object'
        ? listing.cancellationPolicy
        : {
          shortTerm: 'Flexible',
          additional: 'None',
          longTerm: 'Firm Long Term'
        }
      );
    }

    if (selectedSection === "amenities") {
      setSelectedAmenities(listing.amenities || []);
      setAmenitiesMode("view");
    }
  };

  const handleLocationSave = async (panelKey) => {
    if (!listing) return;
    setLocationSaving(true);
    setLocationSaveMessage("");

    let updateData = {};
    if (panelKey === "address") {
      updateData = {
        addressDetails: { ...addressDetails },
        address: addressDetails.street || listing.address || ""
      };
    }
    if (panelKey === "features") {
      updateData = { locationFeatures: { ...locationFeatures } };
    }
    if (panelKey === "neighborhood") {
      updateData = { neighborhoodDescription };
    }
    if (panelKey === "gettingAround") {
      updateData = { gettingAround };
    }
    if (panelKey === "scenicViews") {
      updateData = { scenicViews };
    }

    try {
      const listingRef = doc(db, "listings", id);
      await updateDoc(listingRef, updateData);
      setListing((prev) => ({ ...prev, ...updateData }));
      setLocationSaveMessage("Saved successfully.");
    } catch (error) {
      console.error("Location save failed", error);
      setLocationSaveMessage("Save failed, please try again.");
    } finally {
      setLocationSaving(false);
      window.setTimeout(() => setLocationSaveMessage(""), 3000);
    }
  };

  const handleLocationCancel = (panelKey) => {
    if (!listing) return;
    setLocationSaveMessage("");

    if (panelKey === "address") {
      setAddressDetails({
        unit: listing.addressDetails?.unit || "",
        building: listing.addressDetails?.building || "",
        street: listing.addressDetails?.street || listing.address || "",
        barangay: listing.addressDetails?.barangay || "",
        city: listing.addressDetails?.city || "",
        zip: listing.addressDetails?.zip || "",
        province: listing.addressDetails?.province || "",
      });
    }
    if (panelKey === "features") {
      setLocationFeatures({
        beachAccess: listing.locationFeatures?.beachAccess || false,
        lakeAccess: listing.locationFeatures?.lakeAccess || false,
        laundromatNearby: listing.locationFeatures?.laundromatNearby || false,
        privateEntrance: listing.locationFeatures?.privateEntrance || false,
        resortAccess: listing.locationFeatures?.resortAccess || false,
        skiInSkiOut: listing.locationFeatures?.skiInSkiOut || false,
        waterfront: listing.locationFeatures?.waterfront || false,
      });
    }
    if (panelKey === "neighborhood") {
      setNeighborhoodDescription(listing.neighborhoodDescription || "");
    }
    if (panelKey === "gettingAround") {
      setGettingAround(listing.gettingAround || "");
    }
    if (panelKey === "scenicViews") {
      setScenicViews(listing.scenicViews || []);
    }
  };

  const bookingSettingsText = bookingSetting === "instant-book"
    ? "Use Instant Book"
    : bookingSetting === "approve-all"
      ? "Approve all bookings"
      : "Approve your first 5 bookings then instant book";

  const houseRulesText = listing.houseRules && typeof listing.houseRules === 'object'
    ? 'House rules set'
    : listing.houseRules || 'Add house rules';

  const cancellationPolicyText = listing.cancellationPolicy && typeof listing.cancellationPolicy === 'object'
    ? listing.cancellationPolicy.shortTerm
    : listing.cancellationPolicy || 'Flexible';

  const summaryItems = [
    { title: "Photo tour", content: `${photoCount} photos`, subtitle: "Preview and update your cover image.", sectionKey: "photo-tour" },
    { title: "Title", content: listing.listingTitle || "Add a title", sectionKey: "title" },
    ...(!isService ? [{ title: "Sleeping arrangements", content: sleepingText, sectionKey: "sleeping-arrangements" }] : []),
    { title: "Pricing", content: `${pricingText}${listing.weekendPremium != null ? ` · ${weekendText}` : ""}`, sectionKey: "pricing" },
    { title: "Availability", content: isService
        ? `${availabilityState.operatingHours || "Set operating hours"} · ${availabilityState.sessionDuration || "Set session duration"}`
        : `${availabilityState.minimumNights}–${availabilityState.maximumNights} night stays · ${availabilityState.advanceNotice} advance notice`,
      sectionKey: "availability" },
    { title: "Number of guests", content: `${guestCount} guest${guestCount !== 1 ? 's' : ''}`, sectionKey: "number-of-guests" },
    { title: "Description", content: descriptionText, sectionKey: "description" },
    { title: "Amenities", content: amenitiesText, sectionKey: "amenities" },
    { title: "Location", content: locationText, sectionKey: "location" },
    { title: "About the host", content: hostName, sectionKey: "about-host" },
    { title: "Co-hosts", content: listing.coHosts?.length ? listing.coHosts.join(", ") : "Add co-host details", sectionKey: "cohosts" },
    { title: "Booking settings", content: bookingSettingsText, sectionKey: "booking-settings" },
    ...(!isService ? [{ title: "House rules", content: houseRulesText, sectionKey: "house-rules" }] : []),
    { title: "Cancellation policy", content: cancellationPolicyText, sectionKey: "cancellation-policy" }
  ];


  const renderSectionContent = () => {
    if (selectedSection === "photo-tour") {
      const urls = listing.photoUrls || [];

      return (
        <div className="editor-step-card photo-tour-card">
          <h2>Photo tour</h2>
          <p className="create-listing-description">
            {isService
              ? "Upload all service photos in a flat gallery. Guests will see the full photo tour without separate bedroom or bathroom sections."
              : "Manage photos and add details. Guests will only see your tour if every room has a photo."}
          </p>
          <div className="photo-tour-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginTop: 16 }}>
            {urls.length > 0 ? (
              urls.map((url, index) => (
                <div key={url + index} className="photo-card" style={{ borderRadius: 12, padding: 16, background: '#fff', boxShadow: '0 1px 0 rgba(0,0,0,0.04)', textAlign: 'center' }}>
                  <img src={url} alt={`Gallery item ${index + 1}`} style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 8 }} />
                  <div style={{ marginTop: 8, fontWeight: 600 }}>Photo {index + 1}</div>
                </div>
              ))
            ) : (
              <div className="photo-card" style={{ borderRadius: 12, padding: 16, background: '#fff', boxShadow: '0 1px 0 rgba(0,0,0,0.04)', textAlign: 'center' }}>
                <div style={{ width: '100%', height: 120, borderRadius: 8, background: '#f3f4f6' }} />
                <div style={{ marginTop: 8, fontWeight: 600 }}>No photos yet</div>
                <div style={{ fontSize: 13, color: '#6b7280' }}>Add service photos to showcase your offering.</div>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (selectedSection === "about-host") {
      const profileSrc = hostProfilePreview || profilePhotoURL || null;

      return (
        <div className="editor-step-card" style={{ padding: '32px', background: '#ffffff', borderRadius: 24, border: '1px solid rgba(15, 23, 42, 0.08)' }}>
          <div style={{ display: 'grid', gap: 18 }}>
            <div>
              <h2 style={{ marginBottom: 8 }}>About the host</h2>
              <p className="create-listing-description">Add a profile photo, write a short bio, and show interests to help guests get to know you.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 280px) 1fr', gap: 24, alignItems: 'start' }}>
              <div style={{ display: 'grid', placeItems: 'center' }}>
                <div style={{ width: 160, height: 160, borderRadius: 9999, background: '#fdecef', display: 'grid', placeItems: 'center', position: 'relative' }}>
                  {profileSrc ? (
                    <img src={profileSrc} alt="Host" style={{ width: 160, height: 160, objectFit: 'cover', borderRadius: 9999 }} />
                  ) : (
                    <div style={{ fontSize: 64, fontWeight: 700, color: '#9f1239' }}>{profileInitial}</div>
                  )}
                  <input
                    ref={profileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleHostProfileFileChange}
                  />
                </div>
                <button type="button" className="create-listing-button" style={{ marginTop: 18, padding: '8px 12px', borderRadius: 9999 }} onClick={() => profileInputRef.current?.click()}>
                  <i className="fa-solid fa-camera" style={{ marginRight: 8 }} /> {hostProfileFile ? 'Change' : 'Add'}
                </button>
              </div>

              <div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: 8 }}>About me</label>
                  <textarea value={aboutMe} onChange={(e) => setAboutMe(e.target.value)} placeholder="Write a short bio that guests will see on your profile." style={{ width: '100%', minHeight: 160, borderRadius: 12, border: '1px solid rgba(15,23,42,0.08)', padding: 12, fontSize: 15 }} />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <label style={{ fontWeight: 600 }}>My interests</label>
                    <div style={{ color: '#64748b', fontSize: 14 }}>{hostInterests.length}/20 selected</div>
                  </div>

                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    {hostInterests.length > 0 ? hostInterests.map((it) => (
                      <div key={it} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 9999, border: '1px solid rgba(15,23,42,0.08)', background: '#fff' }}>
                        <span style={{ fontWeight: 600 }}>{it}</span>
                        <button type="button" onClick={() => setHostInterests((prev) => prev.filter((x) => x !== it))} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#6b7280' }}>×</button>
                      </div>
                    )) : (
                      // show three dashed add buttons
                      <>
                        <button type="button" onClick={() => { setTempSelectedInterests(hostInterests); setShowInterestsModal(true); }} style={{ width: 68, height: 48, borderRadius: 12, border: '2px dashed rgba(15,23,42,0.12)', background: 'transparent', cursor: 'pointer' }}>+</button>
                        <button type="button" onClick={() => { setTempSelectedInterests(hostInterests); setShowInterestsModal(true); }} style={{ width: 68, height: 48, borderRadius: 12, border: '2px dashed rgba(15,23,42,0.12)', background: 'transparent', cursor: 'pointer' }}>+</button>
                        <button type="button" onClick={() => { setTempSelectedInterests(hostInterests); setShowInterestsModal(true); }} style={{ width: 68, height: 48, borderRadius: 12, border: '2px dashed rgba(15,23,42,0.12)', background: 'transparent', cursor: 'pointer' }}>+</button>
                      </>
                    )}
                    <div>
                      <button type="button" onClick={() => { setTempSelectedInterests(hostInterests); setShowInterestsModal(true); }} style={{ borderRadius: 9999, border: '1px solid rgba(15,23,42,0.12)', padding: '8px 12px', background: '#fff', cursor: 'pointer' }}>Show all</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button className="create-listing-back-button" type="button" onClick={handleCancel} disabled={saving}>Cancel</button>
              <button className="create-listing-button" type="button" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </div>

            {saveMessage && <p className="editor-save-feedback" style={{ marginTop: 8 }}>{saveMessage}</p>}

            {showInterestsModal && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'grid', placeItems: 'center', zIndex: 60 }}>
                <div style={{ width: 760, maxWidth: '95%', background: '#fff', borderRadius: 16, padding: 20 }}>
                  <h3 style={{ marginTop: 0 }}>What are you into?</h3>
                  <p style={{ color: '#64748b' }}>Pick some interests you enjoy that you want to show on your profile.</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginTop: 12 }}>
                    {allInterests.map((it) => {
                      const selected = tempSelectedInterests.includes(it);
                      return (
                        <button key={it} type="button" onClick={() => {
                          setTempSelectedInterests((prev) => prev.includes(it) ? prev.filter(x => x !== it) : (prev.length < 20 ? [...prev, it] : prev));
                        }} style={{ textAlign: 'left', padding: '10px 12px', borderRadius: 12, border: selected ? '1px solid #111827' : '1px solid rgba(15,23,42,0.08)', background: selected ? '#111827' : '#fff', color: selected ? '#fff' : '#111827', cursor: 'pointer' }}>
                          {it}
                        </button>
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
                    <div style={{ color: '#64748b' }}>{tempSelectedInterests.length}/20 selected</div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button type="button" className="create-listing-back-button" onClick={() => setShowInterestsModal(false)}>Cancel</button>
                      <button type="button" className="create-listing-button" onClick={() => { setHostInterests(tempSelectedInterests); setShowInterestsModal(false); }}>Save</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (selectedSection === "cohosts") {
      return (
        <div className="editor-step-card" style={{ padding: '32px', background: '#ffffff', borderRadius: 24, border: '1px solid rgba(15, 23, 42, 0.08)' }}>
          <div style={{ display: 'grid', gap: 20 }}>
            <div>
              <h2 style={{ marginBottom: 8 }}>Invite a co-host</h2>
              <p className="create-listing-description">A co-host can help you with everything from managing your calendar to welcoming guests.</p>
              <button type="button" style={{ display: 'inline-block', color: '#111827', fontWeight: 600, marginTop: 8 }} onClick={() => window.location.href = '/host/create-listing/co-host'}>Learn about co-hosting</button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button type="button" className="create-listing-button" style={{ minWidth: 140, padding: '12px 18px', fontSize: 14 }}>Get started</button>
            </div>
          </div>
        </div>
      );
    }

    if (selectedSection === "booking-settings") {
      return (
        <div className="editor-step-card" style={{ padding: '32px', background: '#ffffff', borderRadius: 24, border: '1px solid rgba(15, 23, 42, 0.08)' }}>
          <div style={{ display: 'grid', gap: 20 }}>
            <div>
              <h2 style={{ marginBottom: 8 }}>Booking settings</h2>
              <p className="create-listing-description">Choose how guests book your listing. The first option is selected automatically.</p>
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              {bookingSettingsOptions.map((option) => {
                const selected = bookingSetting === option.key;
                return (
                  <button key={option.key} type="button" onClick={() => setBookingSetting(option.key)} style={{ display: 'flex', alignItems: 'center', gap: 16, width: '100%', borderRadius: 18, border: selected ? '1px solid rgba(17, 24, 39, 0.16)' : '1px solid rgba(15, 23, 42, 0.08)', padding: '18px 20px', background: selected ? '#f8fafc' : '#fff', textAlign: 'left', cursor: 'pointer' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: option.iconColor ? `${option.iconColor}1a` : '#eef2ff', display: 'grid', placeItems: 'center', color: option.iconColor || '#111827' }}>
                      {renderBookingIcon(option.icon, option.iconColor)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700 }}>{option.title}</div>
                      <div style={{ marginTop: 6, color: '#64748b', fontSize: 14 }}>{option.subtitle}</div>
                    </div>
                    <div style={{ width: 24, height: 24, borderRadius: 9999, border: selected ? '1px solid #111827' : '1px solid rgba(15,23,42,0.12)', display: 'grid', placeItems: 'center', background: selected ? '#111827' : '#fff', color: selected ? '#fff' : '#64748b', fontWeight: 700 }}>
                      {selected ? '✓' : ''}
                    </div>
                  </button>
                );
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button className="create-listing-back-button" type="button" onClick={handleCancel} disabled={saving}>Cancel</button>
              <button className="create-listing-button" type="button" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
            {saveMessage && <p className="editor-save-feedback" style={{ marginTop: 8 }}>{saveMessage}</p>}
          </div>
        </div>
      );
    }

    if (selectedSection === "title") {
      return (
        <div className="editor-step-card" style={{ padding: '32px', background: '#ffffff', borderRadius: 24, border: '1px solid rgba(15, 23, 42, 0.08)' }}>
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ marginBottom: 8 }}>Title editor</h2>
            <p className="create-listing-description">Write a short, memorable title that helps guests understand what makes your place special.</p>
          </div>
          <div className="title-input-container" style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label htmlFor="listingTitle" style={{ fontWeight: 600, color: '#0f172a' }}>{editState.listingTitle.length}/50 available</label>
              <span style={{ fontSize: 14, color: '#64748b' }}>{editState.listingTitle.length === 0 ? 'Start typing your title' : 'Keep it clear and concise'}</span>
            </div>
            <input
              id="listingTitle"
              className="create-listing-input"
              type="text"
              value={editState.listingTitle}
              onChange={(event) => setEditState({ ...editState, listingTitle: event.target.value })}
              placeholder="Write a short, memorable title"
              style={{ minHeight: 70, borderRadius: 18, padding: '18px 16px', fontSize: 18, border: '1px solid rgba(15, 23, 42, 0.12)' }}
            />
          </div>
          <div style={{ marginTop: 26, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button className="create-listing-back-button" type="button" onClick={handleCancel} disabled={saving}>
              Cancel
            </button>
            <button className="create-listing-button" type="button" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
          {saveMessage && <p className="editor-save-feedback" style={{ marginTop: 16 }}>{saveMessage}</p>}
        </div>
      );
    }

    if (selectedSection === "pricing") {
      return (
        <div className="editor-step-card" style={{ padding: '32px', background: '#ffffff', borderRadius: 24, border: '1px solid rgba(15, 23, 42, 0.08)' }}>
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ marginBottom: 8 }}>Pricing</h2>
            <p className="create-listing-description">Set your nightly price, weekend pricing, and discounts for your listing.</p>
          </div>

          <div style={{ display: 'grid', gap: 18 }}>
            <div style={{ borderRadius: 18, padding: 24, background: '#f8fafc', border: '1px solid rgba(15, 23, 42, 0.08)' }}>
              <label htmlFor="basePrice" style={{ display: 'block', marginBottom: 10, fontWeight: 600 }}>Nightly price</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 20, color: '#111827' }}>₱</span>
                <input
                  id="basePrice"
                  type="number"
                  min="0"
                  value={pricingState.basePrice}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    setPricingState((prev) => ({
                      ...prev,
                      basePrice: Number.isNaN(value) ? 0 : value,
                      weekendPrice: prev.weekendPrice > 0 ? Math.max(prev.weekendPrice, Number.isNaN(value) ? 0 : value) : prev.weekendPrice,
                    }));
                  }}
                  style={{ width: '160px', borderRadius: 14, border: '1px solid rgba(15, 23, 42, 0.12)', padding: '14px 16px', fontSize: 20 }}
                />
              </div>
            </div>

            <div style={{ borderRadius: 18, padding: 24, background: '#fff', border: '1px solid rgba(15, 23, 42, 0.08)' }}>
              <label htmlFor="weekendPrice" style={{ display: 'block', marginBottom: 10, fontWeight: 600 }}>Custom weekend price</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 20, color: '#111827' }}>₱</span>
                <input
                  id="weekendPrice"
                  type="number"
                  min="0"
                  value={pricingState.weekendPrice}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    setPricingState((prev) => ({
                      ...prev,
                      weekendPrice: Number.isNaN(value) ? 0 : value,
                    }));
                  }}
                  style={{ width: '160px', borderRadius: 14, border: '1px solid rgba(15, 23, 42, 0.12)', padding: '14px 16px', fontSize: 20 }}
                />
              </div>
              <p style={{ marginTop: 10, color: '#64748b', fontSize: 14 }}>
                Weekend price automatically updates the weekend premium.
              </p>
            </div>

            <div style={{ borderRadius: 18, padding: 24, background: '#fff', border: '1px solid rgba(15, 23, 42, 0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <div style={{ fontWeight: 600 }}>Discounts</div>
                </div>
              </div>

              <div style={{ display: 'grid', gap: 14 }}>
                <div style={{ padding: '18px', borderRadius: 16, background: pricingState.discounts.weekly ? '#ecfdf5' : '#f8fafc', border: pricingState.discounts.weekly ? '1px solid #34d399' : '1px solid rgba(15, 23, 42, 0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 700 }}>Weekly discount</div>
                  <div style={{ fontSize: 13, color: '#475569' }}>For stays of 7 nights or more</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <input
                  type="range"
                  min="0"
                  max="99"
                  className="discount-slider"
                  value={pricingState.weeklyDiscount}
                  onChange={(event) => setPricingState((prev) => ({ ...prev, weeklyDiscount: Number(event.target.value) }))}
                />
                <span style={{ minWidth: 52, textAlign: 'right', fontWeight: 700 }}>{pricingState.weeklyDiscount}%</span>
              </div>
            </div>

            <div style={{ padding: '18px', borderRadius: 16, background: pricingState.discounts.monthly ? '#ecfdf5' : '#f8fafc', border: pricingState.discounts.monthly ? '1px solid #34d399' : '1px solid rgba(15, 23, 42, 0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 700 }}>Monthly discount</div>
                  <div style={{ fontSize: 13, color: '#475569' }}>For stays of 28 nights or more</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <input
                  type="range"
                  min="0"
                  max="99"
                  className="discount-slider"
                  value={pricingState.monthlyDiscount}
                  onChange={(event) => setPricingState((prev) => ({ ...prev, monthlyDiscount: Number(event.target.value) }))}
                />
                <span style={{ minWidth: 52, textAlign: 'right', fontWeight: 700 }}>{pricingState.monthlyDiscount}%</span>
              </div>
            </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 26, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button className="create-listing-back-button" type="button" onClick={handleCancel} disabled={saving}>
              Cancel
            </button>
            <button className="create-listing-button" type="button" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
          {saveMessage && <p className="editor-save-feedback" style={{ marginTop: 16 }}>{saveMessage}</p>}
        </div>
      );
    }

    if (selectedSection === "description") {
      return (
        <div className="editor-step-card" style={{ padding: '32px', background: '#ffffff', borderRadius: 24, border: '1px solid rgba(15, 23, 42, 0.08)' }}>
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ marginBottom: 8 }}>Create your description</h2>
            <p className="create-listing-description">Share what makes your place special.</p>
          </div>

          <textarea
            id="descriptionEditor"
            value={descriptionState}
            maxLength={500}
            onChange={(event) => setDescriptionState(event.target.value)}
            placeholder="Write a description that helps guests understand what makes your place special."
            style={{
              width: '100%',
              minHeight: 220,
              borderRadius: 18,
              border: '1px solid rgba(15, 23, 42, 0.12)',
              padding: '18px 16px',
              fontSize: 16,
              lineHeight: 1.6,
              resize: 'vertical',
              background: '#fff',
              color: '#111827'
            }}
          />
          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#64748b', fontSize: 14 }}>{descriptionState.length}/500</span>
          </div>

          <div style={{ marginTop: 26, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button className="create-listing-back-button" type="button" onClick={handleCancel} disabled={saving}>
              Cancel
            </button>
            <button className="create-listing-button" type="button" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
          {saveMessage && <p className="editor-save-feedback" style={{ marginTop: 16 }}>{saveMessage}</p>}
        </div>
      );
    }

    if (selectedSection === "location") {
      const formattedAddress = [
        addressDetails.street,
        addressDetails.barangay,
        addressDetails.city,
        addressDetails.zip,
        addressDetails.province
      ].filter(Boolean).join(", ");

      const mapQuery = formattedAddress || listing.address || "Philippines";

      const renderLocationPanel = (panelKey, title, subtitle, content) => {
        const isOpen = locationExpandedPanel === panelKey;
        return (
          <div style={{ borderRadius: 18, background: '#fff', border: '1px solid rgba(15, 23, 42, 0.08)', overflow: 'hidden' }}>
            <button
              type="button"
              onClick={() => setLocationExpandedPanel(isOpen ? null : panelKey)}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '22px 24px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#fff',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              <div>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>{title}</div>
                <div style={{ color: '#64748b', fontSize: 14 }}>{subtitle}</div>
              </div>
              <span style={{ color: '#111827', fontWeight: 700 }}>{isOpen ? 'v' : '>'}</span>
            </button>
            {isOpen && (
              <div style={{ padding: '24px', borderTop: '1px solid rgba(15, 23, 42, 0.08)' }}>
                {content}
                <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                  <button className="create-listing-back-button" type="button" onClick={() => handleLocationCancel(panelKey)} disabled={locationSaving}>
                    Cancel
                  </button>
                  <button className="create-listing-button" type="button" onClick={() => handleLocationSave(panelKey)} disabled={locationSaving}>
                    {locationSaving ? 'Saving…' : 'Save'}
                  </button>
                </div>
                {locationSaveMessage && <p className="editor-save-feedback" style={{ marginTop: 16 }}>{locationSaveMessage}</p>}
              </div>
            )}
          </div>
        );
      };

      return (
        <div className="editor-step-card" style={{ padding: '32px', background: '#ffffff', borderRadius: 24, border: '1px solid rgba(15, 23, 42, 0.08)' }}>
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ marginBottom: 8 }}>Location</h2>
            <p className="create-listing-description">Update the address, local features, neighborhood details, and scenic views for this listing.</p>
          </div>

          <div style={{ display: 'grid', gap: 18 }}>
            <div style={{ borderRadius: 18, overflow: 'hidden', border: '1px solid rgba(15, 23, 42, 0.08)', background: '#fff', position: 'relative' }}>
              <div style={{ width: '100%', minHeight: 260, background: '#f8fafc', position: 'relative' }}>
                <iframe
                  title="Listing location map"
                  src={(() => {
                    if ((isMapAdjusting ? adjustingCenter : locationCenter) && (isMapAdjusting ? adjustingCenter : locationCenter).lat && (isMapAdjusting ? adjustingCenter : locationCenter).lng) {
                      const center = isMapAdjusting ? adjustingCenter : locationCenter;
                      return `https://maps.google.com/maps?q=${center.lat},${center.lng}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
                    }
                    return `https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&t=&z=12&ie=UTF8&iwloc=&output=embed`;
                  })()}
                  style={{ width: '100%', height: 260, border: 0, pointerEvents: isMapAdjusting ? 'none' : 'auto' }}
                  loading="lazy"
                />

                {isMapAdjusting && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      zIndex: 11,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      cursor: 'grab',
                      userSelect: 'none'
                    }}
                    draggable={true}
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragEnd={(e) => {
                      const mapRect = e.currentTarget.parentElement.getBoundingClientRect();
                      const x = e.clientX - mapRect.left;
                      const y = e.clientY - mapRect.top;
                      const width = mapRect.width;
                      const height = mapRect.height;

                      const zoomDelta = 0.018;
                      const baseCenter = adjustingCenter || locationCenter || { lat: 14.1092, lng: 120.9156 };
                      const minLng = baseCenter.lng - zoomDelta;
                      const maxLng = baseCenter.lng + zoomDelta;
                      const minLat = baseCenter.lat - zoomDelta;
                      const maxLat = baseCenter.lat + zoomDelta;

                      const lng = minLng + (x / width) * (maxLng - minLng);
                      const lat = maxLat - (y / height) * (maxLat - minLat);

                      setAdjustingCenter({ lat: Math.max(-90, Math.min(90, lat)), lng: Math.max(-180, Math.min(180, lng)) });
                    }}
                  >
                    <i className="fa-solid fa-location-dot" style={{ color: '#ef4444', fontSize: 32, textShadow: '0 2px 4px rgba(0,0,0,0.2)' }} />
                  </div>
                )}

                {!isMapAdjusting && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMapAdjusting(true);
                      setAdjustingCenter(locationCenter || null);
                    }}
                    style={{ position: 'absolute', right: 16, top: 16, zIndex: 12, background: '#fff', border: '1px solid rgba(15,23,42,0.08)', padding: '8px 12px', borderRadius: 10, cursor: 'pointer', fontWeight: 600 }}
                  >
                    Adjust
                  </button>
                )}
              </div>

              {isMapAdjusting && (
                <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(15, 23, 42, 0.08)', display: 'flex', justifyContent: 'flex-end', gap: 12, background: '#f8fafc' }}>
                  <button
                    type="button"
                    className="create-listing-back-button"
                    onClick={() => {
                      setIsMapAdjusting(false);
                      setAdjustingCenter(null);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="create-listing-button"
                    onClick={() => {
                      if (adjustingCenter && adjustingCenter.lat && adjustingCenter.lng) {
                        setLocationCenter(adjustingCenter);
                      }
                      setIsMapAdjusting(false);
                      setAdjustingCenter(null);
                    }}
                  >
                    Save
                  </button>
                </div>
              )}
            </div>

            {renderLocationPanel(
              'address',
              'Address',
              'Add or update the property address details.',
              <div style={{ borderRadius: 16, border: '1px solid rgba(15, 23, 42, 0.12)', overflow: 'hidden', background: '#fff' }}>
                {[
                  { name: 'unit', label: 'Unit, level, etc. (if applicable)' },
                  { name: 'building', label: 'Building name (if applicable)' },
                  { name: 'street', label: 'Street address' },
                  { name: 'barangay', label: 'Barangay / district (if applicable)' },
                  { name: 'city', label: 'City / municipality' },
                  { name: 'zip', label: 'ZIP code' },
                  { name: 'province', label: 'Province' }
                ].map((field, idx) => (
                  <div
                    key={field.name}
                    style={{
                      borderBottom: idx < 6 ? '1px solid rgba(15, 23, 42, 0.08)' : 'none',
                      padding: '14px 16px',
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <div style={{ position: 'absolute', left: 16, top: 8, fontSize: 12, color: '#64748b', fontWeight: 500, pointerEvents: 'none' }}>
                      {field.label}
                    </div>
                    <input
                      name={field.name}
                      value={addressDetails[field.name]}
                      onChange={(event) => setAddressDetails((prev) => ({ ...prev, [field.name]: event.target.value }))}
                      type="text"
                      style={{
                        width: '100%',
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        fontSize: 16,
                        color: '#111827',
                        fontWeight: 500,
                        paddingTop: 20,
                        paddingBottom: 0,
                        paddingLeft: 0,
                        paddingRight: 0
                      }}
                    />
                  </div>
                ))}
              </div>
            )}

            {renderLocationPanel(
              'features',
              'Location features',
              'Select the nearby features that best describe the property.',
              <div style={{ display: 'grid', gap: 12 }}>
                {locationFeatureOptions.map((option) => (
                  <label
                    key={option.key}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr auto',
                      gap: 12,
                      alignItems: 'center',
                      borderRadius: 16,
                      border: '1px solid rgba(15, 23, 42, 0.08)',
                      padding: '18px 20px',
                      background: '#f8fafc',
                      cursor: 'pointer'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, marginBottom: 4 }}>{option.label}</div>
                      <div style={{ fontSize: 14, color: '#64748b' }}>{option.description}</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={locationFeatures[option.key]}
                      onChange={() => setLocationFeatures((prev) => ({
                        ...prev,
                        [option.key]: !prev[option.key],
                      }))}
                      style={{ width: 20, height: 20, accentColor: '#111827' }}
                    />
                  </label>
                ))}
              </div>
            )}

            {renderLocationPanel(
              'neighborhood',
              'Neighborhood description',
              'Add details that help guests understand the neighborhood.',
              <div>
                <textarea
                  value={neighborhoodDescription}
                  onChange={(event) => setNeighborhoodDescription(event.target.value)}
                  placeholder="Share some highlights about the neighborhood."
                  style={{
                    width: '100%',
                    minHeight: 180,
                    borderRadius: 18,
                    border: '1px solid rgba(15, 23, 42, 0.12)',
                    padding: '18px 16px',
                    fontSize: 16,
                    lineHeight: 1.6,
                    resize: 'vertical',
                    background: '#fff',
                    color: '#111827'
                  }}
                />
              </div>
            )}

            {renderLocationPanel(
              'gettingAround',
              'Getting around',
              'Tell guests how they can travel locally and where to park.',
              <div>
                <textarea
                  value={gettingAround}
                  onChange={(event) => setGettingAround(event.target.value)}
                  placeholder="Let guests know how they can get around the neighborhood and what parking is like."
                  style={{
                    width: '100%',
                    minHeight: 180,
                    borderRadius: 18,
                    border: '1px solid rgba(15, 23, 42, 0.12)',
                    padding: '18px 16px',
                    fontSize: 16,
                    lineHeight: 1.6,
                    resize: 'vertical',
                    background: '#fff',
                    color: '#111827'
                  }}
                />
              </div>
            )}

            {renderLocationPanel(
              'scenicViews',
              'Scenic views',
              'Select the views guests will enjoy from the property.',
              <div style={{ display: 'grid', gap: 12 }}>
                {scenicViewOptions.map((option) => (
                  <label
                    key={option}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr auto',
                      gap: 12,
                      alignItems: 'center',
                      borderRadius: 16,
                      border: '1px solid rgba(15, 23, 42, 0.08)',
                      padding: '18px 20px',
                      background: '#f8fafc',
                      cursor: 'pointer'
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>{option}</span>
                    <input
                      type="checkbox"
                      checked={scenicViews.includes(option)}
                      onChange={() => {
                        setScenicViews((prev) =>
                          prev.includes(option)
                            ? prev.filter((view) => view !== option)
                            : [...prev, option]
                        );
                      }}
                      style={{ width: 20, height: 20, accentColor: '#111827' }}
                    />
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    if (selectedSection === "amenities") {
      const isEditingAmenities = amenitiesMode === "edit";
      const isAddingAmenities = amenitiesMode === "add";
      const selectedAmenitySet = new Set(selectedAmenities.map(normalizeAmenityLabel));

      return (
        <div className="editor-step-card" style={{ padding: '32px', background: '#ffffff', borderRadius: 24, border: '1px solid rgba(15, 23, 42, 0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ marginBottom: 8 }}>Amenities</h2>
              <p className="create-listing-description">You’ve added these to your listing so far.</p>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setAmenitiesMode(isEditingAmenities ? 'view' : 'edit')}
                style={{
                  borderRadius: 9999,
                  border: '1px solid rgba(15, 23, 42, 0.12)',
                  background: isEditingAmenities ? '#111827' : '#fff',
                  color: isEditingAmenities ? '#fff' : '#111827',
                  padding: '10px 18px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  minWidth: 90
                }}
              >
                {isEditingAmenities ? 'Done' : 'Edit'}
              </button>
              <button
                type="button"
                onClick={() => setAmenitiesMode(isAddingAmenities ? 'view' : 'add')}
                style={{
                  borderRadius: 9999,
                  border: '1px solid rgba(15, 23, 42, 0.12)',
                  background: '#fff',
                  color: '#111827',
                  padding: '10px 18px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  minWidth: 90
                }}
              >
                +
              </button>
            </div>
          </div>

          <div style={{ marginTop: 24, display: 'grid', gap: 24 }}>
            <div style={{ borderRadius: 18, padding: 24, background: '#f8fafc', border: '1px solid rgba(15, 23, 42, 0.08)' }}>
              {selectedAmenities.length ? selectedAmenities.map((amenity) => (
                <div key={amenity} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', padding: '14px 0', borderBottom: '1px solid rgba(15, 23, 42, 0.08)' }}>
                  <div style={{ display: 'flex', gap: 14, alignItems: 'center', flex: 1 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 14, background: '#fff', display: 'grid', placeItems: 'center', border: '1px solid rgba(15, 23, 42, 0.08)', color: '#166534' }}>
                      {renderAmenityIcon(amenity)}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600 }}>{amenity}</div>
                      <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>A feature included in your listing.</p>
                    </div>
                  </div>
                  {isEditingAmenities && (
                    <button
                      type="button"
                      onClick={() => setSelectedAmenities((prev) => prev.filter((item) => item !== amenity))}
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 10,
                        border: '1px solid rgba(15, 23, 42, 0.12)',
                        background: '#fff',
                        color: '#374151',
                        cursor: 'pointer',
                        display: 'grid',
                        placeItems: 'center',
                        fontSize: 18,
                        fontWeight: 700,
                      }}
                    >
                      −
                    </button>
                  )}
                </div>
              )) : (
                <p style={{ color: '#64748b', margin: 0 }}>No amenities have been added yet.</p>
              )}
            </div>

            {isAddingAmenities && (
              <div ref={addAmenitiesRef} style={{ borderRadius: 18, padding: 24, background: '#fff', border: '1px solid rgba(15, 23, 42, 0.08)' }}>
                <h3 style={{ marginBottom: 18 }}>Add amenities</h3>
                <div style={{ display: 'grid', gap: 12 }}>
                  {allAmenityOptions.map((option) => {
                    const normalizedOption = normalizeAmenityLabel(option);
                    const selected = selectedAmenitySet.has(normalizedOption);
                    return (
                      <div key={option} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, borderRadius: 16, border: '1px solid rgba(15, 23, 42, 0.08)', padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 36, height: 36, borderRadius: 12, background: '#f8fafc', display: 'grid', placeItems: 'center', color: '#166534' }}>
                            {renderAmenityIcon(option)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600 }}>{option}</div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (!selected) {
                              setSelectedAmenities((prev) => {
                                const next = prev.slice();
                                next.push(option);
                                return next;
                              });
                            }
                          }}
                          disabled={selected}
                          style={{
                            minWidth: 50,
                            borderRadius: 12,
                            border: '1px solid rgba(15, 23, 42, 0.12)',
                            background: selected ? '#f3f4f6' : '#fff',
                            color: selected ? '#6b7280' : '#111827',
                            cursor: selected ? 'not-allowed' : 'pointer',
                            padding: '8px 12px',
                            fontWeight: 700,
                          }}
                        >
                          {selected ? 'Added' : '+'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div style={{ marginTop: 26, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button className="create-listing-back-button" type="button" onClick={handleCancel} disabled={saving}>
              Cancel
            </button>
            <button className="create-listing-button" type="button" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
          {saveMessage && <p className="editor-save-feedback" style={{ marginTop: 16 }}>{saveMessage}</p>}
        </div>
      );
    }

    if (selectedSection === "house-rules") {
      return (
        <div className="editor-step-card" style={{ padding: '32px', background: '#ffffff', borderRadius: 24, border: '1px solid rgba(15, 23, 42, 0.08)' }}>
          <div style={{ display: 'grid', gap: 20 }}>
            <div>
              <h2 style={{ marginBottom: 8 }}>House rules</h2>
              <p className="create-listing-description">Guests are expected to follow your rules and may be removed if they don't.</p>
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              {[
                { key: 'petsAllowed', label: 'Pets allowed', description: 'You can refuse pets, but must reasonably accommodate service animals.' },
                { key: 'eventsAllowed', label: 'Events allowed', description: '' },
                { key: 'smokingAllowed', label: 'Smoking, vaping, e-cigarettes allowed', description: '' },
                { key: 'quietHours', label: 'Quiet hours', description: '' },
                { key: 'commercialPhotographyAllowed', label: 'Commercial photography and filming allowed', description: '' }
              ].map((rule) => (
                <div key={rule.key} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'center', padding: '18px 20px', borderRadius: 18, border: '1px solid rgba(15, 23, 42, 0.08)', background: '#fff' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{rule.label}</div>
                    {rule.description && <div style={{ marginTop: 6, color: '#64748b', fontSize: 14 }}>{rule.description}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button type="button" onClick={() => setHouseRulesState((prev) => ({ ...prev, [rule.key]: false }))} style={{ width: 32, height: 32, borderRadius: 12, border: '1px solid rgba(15, 23, 42, 0.12)', background: houseRulesState[rule.key] ? '#111827' : '#f8fafc', color: houseRulesState[rule.key] ? '#fff' : '#111827', cursor: 'pointer' }}>×</button>
                    <button type="button" onClick={() => setHouseRulesState((prev) => ({ ...prev, [rule.key]: true }))} style={{ width: 32, height: 32, borderRadius: 12, border: '1px solid rgba(15, 23, 42, 0.12)', background: houseRulesState[rule.key] ? '#111827' : '#f8fafc', color: houseRulesState[rule.key] ? '#fff' : '#111827', cursor: 'pointer' }}>✓</button>
                  </div>
                </div>
              ))}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: 16, padding: '18px 20px', borderRadius: 18, border: '1px solid rgba(15, 23, 42, 0.08)', background: '#fff' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>Number of guests</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button type="button" onClick={() => setHouseRulesState((prev) => ({ ...prev, numberOfGuests: Math.max(1, prev.numberOfGuests - 1) }))} style={{ width: 32, height: 32, borderRadius: 10, border: '1px solid rgba(15, 23, 42, 0.12)', background: '#fff', cursor: 'pointer' }}>−</button>
                  <span style={{ minWidth: 28, textAlign: 'center', fontWeight: 600 }}>{houseRulesState.numberOfGuests}</span>
                  <button type="button" onClick={() => setHouseRulesState((prev) => ({ ...prev, numberOfGuests: prev.numberOfGuests + 1 }))} style={{ width: 32, height: 32, borderRadius: 10, border: '1px solid rgba(15, 23, 42, 0.12)', background: '#fff', cursor: 'pointer' }}>+</button>
                </div>
              </div>            
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button className="create-listing-back-button" type="button" onClick={handleCancel} disabled={saving}>Cancel</button>
              <button className="create-listing-button" type="button" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
            {saveMessage && <p className="editor-save-feedback" style={{ marginTop: 8 }}>{saveMessage}</p>}
          </div>
        </div>
      );
    }

    if (selectedSection === "cancellation-policy") {
      const shortTermOptions = [
        { title: 'Flexible', subtitle: 'Full refund at least 1 day before check-in • Partial refund within 1 day of check-in' },
        { title: 'Moderate', subtitle: 'Full refund at least 5 days before check-in • Partial refund within 5 days of check-in' },
        { title: 'Limited', subtitle: 'Full refund at least 14 days before check-in • Partial refund 7-14 days before check-in' },
        { title: 'Firm', subtitle: 'Full refund at least 30 days before check-in • Partial refund 7-30 days before check-in' }
      ];
      const additionalOptions = [
        { title: 'None', subtitle: "Don't offer an additional policy option." },
        { title: 'Non-refundable', subtitle: 'Allow guests to pay you 10% less for a non-refundable reservation.' }
      ];
      const longTermOptions = [
        { title: 'Firm Long Term', subtitle: 'Full refund up to 30 days before check-in • After that, the first 30 days of the stay are non-refundable' },
        { title: 'Strict Long Term', subtitle: 'Full refund if canceled within 48 hours of booking and at least 28 days before check-in • After that, the first 30 days of the stay are non-refundable' }
      ];

      const openPolicyPanel = (panel) => {
        setPolicyDraft(cancellationPolicyState);
        setActivePolicyPanel(panel);
      };

      const closePolicyPanel = () => {
        setPolicyDraft(cancellationPolicyState);
        setActivePolicyPanel(null);
      };

      const savePolicyPanel = () => {
        setCancellationPolicyState(policyDraft);
        setActivePolicyPanel(null);
      };

      const renderPolicyOptions = (options, selectedKey, onSelect) => (
        <div style={{ display: 'grid', gap: 12 }}>
          {options.map((option) => (
            <button
              key={option.title}
              type="button"
              onClick={() => onSelect(option.title)}
              style={{
                width: '100%',
                textAlign: 'left',
                borderRadius: 18,
                border: selectedKey === option.title ? '1px solid rgba(17, 24, 39, 0.16)' : '1px solid rgba(15, 23, 42, 0.08)',
                background: selectedKey === option.title ? '#f8fafc' : '#fff',
                padding: '18px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer'
              }}
            >
              <div>
                <div style={{ fontWeight: 700 }}>{option.title}</div>
                <div style={{ marginTop: 6, color: '#64748b', fontSize: 14 }}>{option.subtitle}</div>
              </div>
              <span style={{ color: selectedKey === option.title ? '#111827' : '#64748b', fontWeight: 700 }}>›</span>
            </button>
          ))}
        </div>
      );

      return (
        <div className="editor-step-card" style={{ padding: '32px', background: '#ffffff', borderRadius: 24, border: '1px solid rgba(15, 23, 42, 0.08)' }}>
          <div style={{ display: 'grid', gap: 20 }}>
            <div>
              <h2 style={{ marginBottom: 8 }}>Cancellation policy</h2>
              <p className="create-listing-description">Review the full policies in the Help Center.</p>
            </div>
            <div style={{ display: 'grid', gap: 20 }}>
              <div>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Short-term stays</div>
                <div style={{ color: '#64748b', fontSize: 14, marginBottom: 12 }}>Applies to stays under 28 nights. All standard stay policies include a 24-hour free cancellation period.</div>
                <div style={{ display: 'grid', gap: 12 }}>
                  <button
                    type="button"
                    onClick={() => openPolicyPanel('shortTerm')}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      borderRadius: 18,
                      border: '1px solid rgba(15, 23, 42, 0.08)',
                      background: '#fff',
                      padding: '18px 20px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700 }}>Your policy</div>
                      <div style={{ marginTop: 6, color: '#64748b', fontSize: 14 }}>{cancellationPolicyState.shortTerm}</div>
                    </div>
                    <span style={{ color: '#64748b', fontWeight: 700 }}>›</span>
                  </button>
                  {activePolicyPanel === 'shortTerm' && (
                    <div style={{ display: 'grid', gap: 12, padding: '18px', borderRadius: 18, border: '1px solid rgba(15, 23, 42, 0.12)', background: '#f8fafc' }}>
                      {renderPolicyOptions(shortTermOptions, policyDraft.shortTerm, (value) => setPolicyDraft((prev) => ({ ...prev, shortTerm: value })))}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                        <button className="create-listing-back-button" type="button" onClick={closePolicyPanel}>Cancel</button>
                        <button className="create-listing-button" type="button" onClick={savePolicyPanel}>Save</button>
                      </div>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => openPolicyPanel('additional')}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      borderRadius: 18,
                      border: '1px solid rgba(15, 23, 42, 0.08)',
                      background: '#fff',
                      padding: '18px 20px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700 }}>Additional policy options</div>
                      <div style={{ marginTop: 6, color: '#64748b', fontSize: 14 }}>{cancellationPolicyState.additional}</div>
                    </div>
                    <span style={{ color: '#64748b', fontWeight: 700 }}>›</span>
                  </button>
                  {activePolicyPanel === 'additional' && (
                    <div style={{ display: 'grid', gap: 12, padding: '18px', borderRadius: 18, border: '1px solid rgba(15, 23, 42, 0.12)', background: '#f8fafc' }}>
                      {renderPolicyOptions(additionalOptions, policyDraft.additional, (value) => setPolicyDraft((prev) => ({ ...prev, additional: value })))}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                        <button className="create-listing-back-button" type="button" onClick={closePolicyPanel}>Cancel</button>
                        <button className="create-listing-button" type="button" onClick={savePolicyPanel}>Save</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Long-term stays</div>
                <div style={{ color: '#64748b', fontSize: 14, marginBottom: 12 }}>Applies to stays 28 nights or longer.</div>
                <button
                  type="button"
                  onClick={() => openPolicyPanel('longTerm')}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    borderRadius: 18,
                    border: '1px solid rgba(15, 23, 42, 0.08)',
                    background: '#fff',
                    padding: '18px 20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700 }}>Your policy</div>
                    <div style={{ marginTop: 6, color: '#64748b', fontSize: 14 }}>{cancellationPolicyState.longTerm}</div>
                  </div>
                  <span style={{ color: '#64748b', fontWeight: 700 }}>›</span>
                </button>
                {activePolicyPanel === 'longTerm' && (
                  <div style={{ display: 'grid', gap: 12, padding: '18px', borderRadius: 18, border: '1px solid rgba(15, 23, 42, 0.12)', background: '#f8fafc' }}>
                    {renderPolicyOptions(longTermOptions, policyDraft.longTerm, (value) => setPolicyDraft((prev) => ({ ...prev, longTerm: value })))}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                      <button className="create-listing-back-button" type="button" onClick={closePolicyPanel}>Cancel</button>
                      <button className="create-listing-button" type="button" onClick={savePolicyPanel}>Save</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      );
    }

    if (selectedSection === "sleeping-arrangements") {
      const bedTypes = [
        "Single",
        "Double",
        "Queen",
        "King",
        "Small double",
        "Bunk bed",
        "Sofa bed",
        "Couch",
        "Floor mattress",
        "Air mattress",
        "Crib",
        "Toddler bed",
        "Hammock",
        "Water bed"
      ];

      return (
        <div className="editor-step-card sleeping-arrangements-card">
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 280 }}>
              <div style={{ marginBottom: 24 }}>
                <h2>Add sleeping arrangements</h2>
                <p className="create-listing-description">Make it clear to guests which type of bed is in each room.</p>
              </div>

              <div style={{ border: '1px solid rgba(15, 23, 42, 0.08)', borderRadius: 18, padding: 18, display: 'flex', alignItems: 'center', gap: 14, background: '#fff' }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: '#f8fafc', display: 'grid', placeItems: 'center' }}>
                  <i className="fa-solid fa-bed" style={{ color: '#2563eb' }} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>Bedroom</div>
                  <div style={{ color: '#6b7280' }}>Add details</div>
                </div>
              </div>
            </div>

            <div style={{ flex: 1, minWidth: 320, background: '#fff', borderRadius: 18, border: '1px solid rgba(15, 23, 42, 0.08)', padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                  <h3 style={{ margin: 0 }}>Bedroom</h3>
                </div>
                <button type="button" style={{ width: 38, height: 38, borderRadius: 10, background: '#f8fafc', border: '1px solid rgba(15, 23, 42, 0.08)', color: '#374151', cursor: 'pointer' }}>
                  <i className="fa-solid fa-plus" />
                </button>
              </div>

              <div style={{ display: 'grid', gap: 14 }}>
                {bedTypes.map((type) => (
                  <div key={type} style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid rgba(15, 23, 42, 0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <i className="fa-solid fa-bed" style={{ width: 20, color: '#475569' }} />
                      <span>{type}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => setBedCounts((prev) => ({ ...prev, [type]: Math.max(0, prev[type] - 1) }))}
                        style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid rgba(15, 23, 42, 0.12)', background: '#fff', color: '#374151', cursor: 'pointer' }}
                      >−</button>
                      <span>{bedCounts[type]}</span>
                      <button
                        type="button"
                        onClick={() => setBedCounts((prev) => ({ ...prev, [type]: prev[type] + 1 }))}
                        style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid rgba(15, 23, 42, 0.12)', background: '#fff', color: '#374151', cursor: 'pointer' }}
                      >+</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div style={{ marginTop: 26, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button className="create-listing-back-button" type="button" onClick={handleCancel} disabled={saving}>
              Cancel
            </button>
            <button className="create-listing-button" type="button" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
          {saveMessage && <p className="editor-save-feedback" style={{ marginTop: 16 }}>{saveMessage}</p>}
        </div>
      );
    }

    if (selectedSection === "availability") {
      const advanceNoticeOptions = ["Same day", "1 day", "2 days", "3 days", "7 days"];
      const timeOptions = [
        "6:00 AM", "7:00 AM", "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM",
        "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM",
        "6:00 PM", "7:00 PM", "8:00 PM", "9:00 PM", "10:00 PM", "11:00 PM",
        "12:00 AM"
      ];

      return (
        <div className="editor-step-card" style={{ padding: '32px', background: '#ffffff', borderRadius: 24, border: '1px solid rgba(15, 23, 42, 0.08)' }}>
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ marginBottom: 8 }}>Availability</h2>
            <p className="create-listing-description">Set your booking requirements and availability settings.</p>
          </div>

          <div style={{ display: 'grid', gap: 24 }}>
            {isService ? (
              <>
                <div style={{ borderRadius: 18, padding: 24, background: '#f8fafc', border: '1px solid rgba(15, 23, 42, 0.08)' }}>
                  <h3 style={{ marginBottom: 16, fontSize: 16, fontWeight: 600 }}>Operating Hours / Schedule (by appointment only)</h3>
                  <div>
                    <label htmlFor="operatingHours" style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>Operating hours</label>
                    <input
                      id="operatingHours"
                      type="text"
                      value={availabilityState.operatingHours}
                      onChange={(event) => setAvailabilityState((prev) => ({ ...prev, operatingHours: event.target.value }))}
                      placeholder="e.g., 9 AM – 6 PM"
                      style={{
                        width: '100%',
                        borderRadius: 14,
                        border: '1px solid rgba(15, 23, 42, 0.12)',
                        padding: '12px 14px',
                        fontSize: 16,
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                <div style={{ borderRadius: 18, padding: 24, background: '#f8fafc', border: '1px solid rgba(15, 23, 42, 0.08)' }}>
                  <h3 style={{ marginBottom: 16, fontSize: 16, fontWeight: 600 }}>Session Duration</h3>
                  <div>
                    <label htmlFor="sessionDuration" style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>Session duration</label>
                    <input
                      id="sessionDuration"
                      type="text"
                      value={availabilityState.sessionDuration}
                      onChange={(event) => setAvailabilityState((prev) => ({ ...prev, sessionDuration: event.target.value }))}
                      placeholder="e.g., 30 mins massage, 2‑hour photo shoot, full‑day"
                      style={{
                        width: '100%',
                        borderRadius: 14,
                        border: '1px solid rgba(15, 23, 42, 0.12)',
                        padding: '12px 14px',
                        fontSize: 16,
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>
              </>
            ) : (
              <div style={{ borderRadius: 18, padding: 24, background: '#f8fafc', border: '1px solid rgba(15, 23, 42, 0.08)' }}>
                <h3 style={{ marginBottom: 16, fontSize: 16, fontWeight: 600 }}>Trip length</h3>
                <p className="create-listing-description" style={{ marginBottom: 16 }}>These settings apply to all nights, unless you customize them by date.</p>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label htmlFor="minimumNights" style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>Minimum nights</label>
                    <input
                      id="minimumNights"
                      type="number"
                      min="1"
                      max="365"
                      value={availabilityState.minimumNights}
                      onChange={(event) => {
                        let value = parseInt(event.target.value, 10) || 1;
                        value = Math.max(1, Math.min(365, value));
                        setAvailabilityState((prev) => ({
                          ...prev,
                          minimumNights: value,
                        }));
                      }}
                      style={{
                        width: '100%',
                        borderRadius: 14,
                        border: '1px solid rgba(15, 23, 42, 0.12)',
                        padding: '12px 14px',
                        fontSize: 16,
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label htmlFor="maximumNights" style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>Maximum nights</label>
                    <input
                      id="maximumNights"
                      type="number"
                      min="1"
                      max="365"
                      value={availabilityState.maximumNights}
                      onChange={(event) => {
                        let value = parseInt(event.target.value, 10) || 365;
                        value = Math.max(1, Math.min(365, value));
                        setAvailabilityState((prev) => ({
                          ...prev,
                          maximumNights: value,
                        }));
                      }}
                      style={{
                        width: '100%',
                        borderRadius: 14,
                        border: '1px solid rgba(15, 23, 42, 0.12)',
                        padding: '12px 14px',
                        fontSize: 16,
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            <div style={{ borderRadius: 18, padding: 24, background: '#fff', border: '1px solid rgba(15, 23, 42, 0.08)' }}>
              <h3 style={{ marginBottom: 16, fontSize: 16, fontWeight: 600 }}>Advance notice</h3>
              <p className="create-listing-description" style={{ marginBottom: 16 }}>How much notice do you need between a guest's booking and their arrival?</p>
              
              <div>
                <label htmlFor="advanceNotice" style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>Notice period</label>
                <select
                  id="advanceNotice"
                  value={availabilityState.advanceNotice}
                  onChange={(event) =>
                    setAvailabilityState((prev) => ({
                      ...prev,
                      advanceNotice: event.target.value,
                    }))
                  }
                  style={{
                    width: '100%',
                    borderRadius: 14,
                    border: '1px solid rgba(15, 23, 42, 0.12)',
                    padding: '12px 14px',
                    fontSize: 16,
                    boxSizing: 'border-box',
                    background: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  {advanceNoticeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {availabilityState.advanceNotice === "Same day" && (
              <div style={{ borderRadius: 18, padding: 24, background: '#fff', border: '1px solid rgba(15, 23, 42, 0.08)' }}>
                <h3 style={{ marginBottom: 16, fontSize: 16, fontWeight: 600 }}>Same day booking time</h3>
                <p className="create-listing-description" style={{ marginBottom: 16 }}>Guests can book on the same day as check-in until this time.</p>
                
                <div>
                  <label htmlFor="sameDayCheckinTime" style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>Booking cutoff time</label>
                  <select
                    id="sameDayCheckinTime"
                    value={availabilityState.sameDayCheckinTime}
                    onChange={(event) =>
                      setAvailabilityState((prev) => ({
                        ...prev,
                        sameDayCheckinTime: event.target.value,
                      }))
                    }
                    style={{
                      width: '100%',
                      borderRadius: 14,
                      border: '1px solid rgba(15, 23, 42, 0.12)',
                      padding: '12px 14px',
                      fontSize: 16,
                      boxSizing: 'border-box',
                      background: '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    {timeOptions.map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          <div style={{ marginTop: 26, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button className="create-listing-back-button" type="button" onClick={handleCancel} disabled={saving}>
              Cancel
            </button>
            <button className="create-listing-button" type="button" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
          {saveMessage && <p className="editor-save-feedback" style={{ marginTop: 16 }}>{saveMessage}</p>}
        </div>
      );
    }

    if (selectedSection === "number-of-guests") {
      return (
        <div className="editor-step-card" style={{ padding: '32px', background: '#ffffff', borderRadius: 24, border: '1px solid rgba(15, 23, 42, 0.08)' }}>
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ marginBottom: 8 }}>Number of guests</h2>
            <p className="create-listing-description">How many guests can fit comfortably in your space?</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
            <div style={{ marginBottom: 32 }}>
              {editingGuests ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={guestInput}
                    onChange={(e) => setGuestInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        let value = parseInt(guestInput, 10) || 1;
                        value = Math.max(1, Math.min(20, value));
                        setGuestCount(value);
                        setEditingGuests(false);
                      } else if (e.key === 'Escape') {
                        setEditingGuests(false);
                        setGuestInput(guestCount.toString());
                      }
                    }}
                    autoFocus
                    style={{
                      fontSize: 80,
                      fontWeight: 700,
                      color: '#111827',
                      width: 150,
                      textAlign: 'center',
                      border: '2px solid #2563eb',
                      borderRadius: 14,
                      padding: '8px 12px',
                      boxSizing: 'border-box',
                      fontFamily: 'inherit'
                    }}
                  />
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#6b7280' }}>✓</div>
                </div>
              ) : (
                <div
                  onDoubleClick={() => {
                    setEditingGuests(true);
                    setGuestInput(guestCount.toString());
                  }}
                  style={{
                    cursor: 'pointer',
                    userSelect: 'none',
                    padding: '24px 0',
                    minWidth: 180,
                    display: 'flex',
                    justifyContent: 'center',
                    borderRadius: 18,
                    background: '#f8fafc',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#edf2f7')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                >
                  <div style={{ fontSize: 80, fontWeight: 700, color: '#111827', lineHeight: 1 }}>
                    {guestCount}
                  </div>
                </div>
              )}
              <p style={{ marginTop: 8, color: '#6b7280', fontSize: 14, textAlign: 'center' }}>
                {guestCount === 1 ? '1 guest' : `${guestCount} guests`}
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setGuestCount((prev) => Math.max(1, prev - 1))}
                disabled={guestCount <= 1}
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 10,
                  border: '2px solid rgba(15, 23, 42, 0.12)',
                  background: guestCount <= 1 ? '#f3f4f6' : '#fff',
                  color: guestCount <= 1 ? '#d1d5db' : '#374151',
                  cursor: guestCount <= 1 ? 'not-allowed' : 'pointer',
                  fontSize: 24,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                −
              </button>

              <button
                type="button"
                onClick={() => setGuestCount((prev) => Math.min(20, prev + 1))}
                disabled={guestCount >= 20}
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 10,
                  border: '2px solid rgba(15, 23, 42, 0.12)',
                  background: guestCount >= 20 ? '#f3f4f6' : '#fff',
                  color: guestCount >= 20 ? '#d1d5db' : '#374151',
                  cursor: guestCount >= 20 ? 'not-allowed' : 'pointer',
                  fontSize: 24,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                +
              </button>
            </div>
          </div>

          <div style={{ marginTop: 32, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button className="create-listing-back-button" type="button" onClick={handleCancel} disabled={saving}>
              Cancel
            </button>
            <button className="create-listing-button" type="button" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
          {saveMessage && <p className="editor-save-feedback" style={{ marginTop: 16 }}>{saveMessage}</p>}
        </div>
      );
    }

    return (
      <div className="editor-step-card">
        <h2>{summaryItems.find((item) => item.sectionKey === selectedSection)?.title || "Section"}</h2>
        <p>Review the current details here. Title and property type are editable now.</p>
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button className="create-listing-back-button" type="button" onClick={handleCancel} disabled={saving}>
            Cancel
          </button>
          <button className="create-listing-button" type="button" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
        {saveMessage && <p className="editor-save-feedback">{saveMessage}</p>}
      </div>
    );
  };

  return (
    <main className="host-shell create-listing-page listing-editor-page">
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
          <button type="button" className="menu-item menu-item-icon" onClick={() => window.location.href = "/account-settings"}> 
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
          <button type="button" className="menu-item menu-item-icon" onClick={() => window.location.href = "/host/cohosts"}> 
            <i className="fa-solid fa-users" aria-hidden="true" />
            <span>Find a co-host</span>
          </button>
          <button type="button" className="menu-item menu-item-icon" onClick={() => window.location.href = "/host/create-listing"}> 
            <i className="fa-solid fa-square-plus" aria-hidden="true" />
            <span>Create a new listing</span>
          </button>
          <button type="button" className="menu-item menu-item-icon"> 
            <i className="fa-solid fa-user-plus" aria-hidden="true" />
            <span>Refer a host</span>
          </button>

          <div className="menu-divider" />

          <button type="button" className="menu-item menu-item-icon" onClick={async () => { await signOut(auth); }}>
            <i className="fa-solid fa-right-from-bracket" aria-hidden="true" />
            <span>Log out</span>
          </button>
        </div>
      )}

      <section className="listing-editor-layout">
        <aside className="editor-sidebar">
          <div className="editor-sidebar-header">
            <div className="editor-sidebar-header-top">
              <h1>Listing editor</h1>
              <button
                type="button"
                className="editor-header-delete-btn"
                onClick={openDeleteFlow}
                aria-label="Delete listing"
                style={{ color: '#dc2626' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: 'currentColor' }}>
                  <path d="M8 6H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M6 6H18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M8 6V4H16V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M7 6L7.5 20.5C7.5 21.3284 8.17157 22 9 22H15C15.8284 22 16.5 21.3284 16.5 20.5L17 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M10 10V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M14 10V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <p className="editor-sidebar-copy">Review and refine your listing details before publishing.</p>
          </div>

          <div className="editor-sidebar-scroll">
            <button
              type="button"
              className="editor-sidebar-card"
              onClick={() => navigate(`/host/verify-listing/${id}`)}
              style={{
                textAlign: 'left',
                background: emailVerified ? '#ecfdf5' : undefined,
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: emailVerified ? '#16a34a' : '#dc2626', display: 'inline-block' }} />
                <span style={{ fontWeight: 700 }}>
                  {emailVerified ? "You can now publish your listing" : "Complete required steps"}
                </span>
              </div>
              {emailVerified ? null : (
                <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>
                  Finish these final tasks to publish your listing and start getting booked.
                </p>
              )}
            </button>
            {summaryItems.map((item) => (
              <div
                key={item.title}
                className={`editor-sidebar-card ${selectedSection === item.sectionKey ? "editor-sidebar-card-selected" : ""}`}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedSection(item.sectionKey)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    setSelectedSection(item.sectionKey);
                  }
                }}
              >
                <div>
                  <span>{item.title}</span>
                </div>
                <p>{item.content}</p>
                {item.subtitle && <p className="editor-sidebar-note">{item.subtitle}</p>}
              </div>
            ))}
          </div>

          {emailVerified && (
            <div className="editor-sidebar-footer">
              <button type="button" className="create-listing-button" onClick={handlePublish}>
                Publish
              </button>
            </div>
          )}
        </aside>

        <div className="listing-editor-main">
          <div className="editor-main-grid">
            {renderSectionContent()}
          </div>
        </div>
      </section>

      {showDeleteFlow && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(18, 34, 22, 0.48)', display: 'grid', placeItems: 'center', padding: 24, zIndex: 200 }}>
          <div style={{ width: 'min(620px, 100%)', background: '#ffffff', borderRadius: 24, padding: 24, boxShadow: '0 36px 80px rgba(0, 0, 0, 0.18)' }}>
            {deleteStep === 1 ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 20 }}>
                  <div>
                    <h3 style={{ margin: 0 }}>Let us know why you changed your mind about hosting</h3>
                    <p style={{ margin: '10px 0 0', color: '#64748b' }}>Choose all that apply</p>
                  </div>
                  <button type="button" className="close-modal-button" onClick={closeDeleteFlow} aria-label="Close delete flow">×</button>
                </div>
                <div style={{ display: 'grid', gap: 12, marginBottom: 24 }}>
                  {deleteOptions.map((reason) => (
                    <label key={reason} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 16, border: '1px solid #e5e7eb', cursor: 'pointer', background: deleteReasons.includes(reason) ? '#f8fafc' : '#ffffff' }}>
                      <input
                        type="checkbox"
                        checked={deleteReasons.includes(reason)}
                        onChange={() => toggleDeleteReason(reason)}
                        style={{ width: 18, height: 18, accentColor: '#16a34a' }}
                      />
                      <span style={{ color: '#111827' }}>{reason}</span>
                    </label>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button type="button" className="create-listing-back-button delete-modal-action-button" onClick={closeDeleteFlow}>Cancel</button>
                  <button type="button" className="create-listing-button delete-modal-action-button" onClick={() => setDeleteStep(2)} disabled={deleteReasons.length === 0}>Next</button>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 20 }}>
                  <div>
                    <h3 style={{ margin: 0 }}>Remove this listing?</h3>
                    <p style={{ margin: '10px 0 0', color: '#64748b' }}>This is permanent—you’ll no longer be able to find or edit this listing.</p>
                  </div>
                  <button type="button" className="close-modal-button" onClick={closeDeleteFlow} aria-label="Close delete flow">×</button>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button type="button" className="create-listing-back-button delete-modal-action-button" onClick={closeDeleteFlow}>Cancel</button>
                  <button type="button" className="create-listing-button delete-modal-action-button" onClick={handleDeleteListing} disabled={deleteReasons.length === 0 || deleteProcessing}>
                    {deleteProcessing ? 'Removing…' : 'Yes, remove'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showPublishConfirmation && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(18, 34, 22, 0.6)', display: 'grid', placeItems: 'center', padding: 24, zIndex: 220 }}>
          <div style={{ width: 'min(560px, 100%)', background: '#ffffff', borderRadius: 24, padding: 28, boxShadow: '0 36px 80px rgba(0, 0, 0, 0.18)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 20 }}>
              <div>
                <h3 style={{ margin: 0 }}>Publish this listing?</h3>
                <p style={{ margin: '10px 0 0', color: '#64748b' }}>
                  Once you publish, this listing will be visible in the guest home under the Homes category.
                </p>
              </div>
              <button type="button" className="close-modal-button" onClick={closePublishConfirmation} aria-label="Close publish confirmation">×</button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" className="create-listing-back-button" onClick={closePublishConfirmation}>Cancel</button>
              <button type="button" className="create-listing-button" onClick={confirmPublish} disabled={publishing}>
                {publishing ? 'Publishing…' : 'Publish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default ListingEditor;


