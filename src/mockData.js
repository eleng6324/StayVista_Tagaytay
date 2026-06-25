const categories = [
  { id: "home", label: "Homes", icon: "H", description: "Ridge-view villas and cozy cabins" },
  { id: "experiences", label: "Experiences", icon: "E", description: "Food trips, tours, and outdoor activities" },
  { id: "services", label: "Services", icon: "S", description: "Airport rides, chefs, and stay add-ons" }
];

const themedPhoto = (keywords, lock) =>
  `https://loremflickr.com/900/700/${keywords.join(",")}?lock=${lock}`;

const folderImages = {
  "BayAsibiVilla": [
    "3df67f61-a1f4-4399-b57f-8ecfc57476a2.avif",
    "4e296f60-5936-43f2-b88f-91f0f2e2e93c.avif",
    "6202fc96-b387-4a2e-9900-b7e95c7dceea.avif",
    "8e7ad0fd-9f2c-4405-8e20-426b03e45fb1.webp",
    "e6d33f13-52fd-4642-a60f-581152286869.avif"
  ],
  "BayBulaVilla": [
    "230ac7cc-eee5-4f00-92e1-a04dca8c2556.avif",
    "4cb82b09-b286-481e-8da8-28546efed82c.avif",
    "69553317-4930-437a-b3e2-ca7d6c983451.avif",
    "70671782-a03a-460b-a041-e92849ccdeb3.avif",
    "7d22580d-b7da-416c-88c5-727285f91bf9.avif"
  ],
  "CasitaIsabella": [
    "3e1ec754-50d3-47f8-8390-fb0f65b85185.avif",
    "774e6f23-312d-4a60-a97e-5f2a7b8e5dcd.avif",
    "d348434f-32e5-4736-897c-dc94b77c26e1.avif",
    "d3994b71-3ee9-4fce-abf2-bc56f31fe880.avif",
    "f3ea08cc-471b-41cb-8ba0-23e3a5a70276.avif"
  ],
  "Cozy": [
    "144e655f-ab60-459b-8906-219ab3b4e82a.avif",
    "1fd844a0-0d24-4229-985c-3afd7750dd43.avif",
    "89dc1411-f085-41e8-8bd5-3d84ff1d35e3.avif",
    "a4fa3866-4526-45ca-aefc-6c4f300f6eba.avif",
    "c6aadb54-9f70-4df9-9a85-b522a7a5f19a.avif"
  ],
  "DomeGlamping": [
    "60a06eaa-5276-429c-be31-7443a5064491.jpeg",
    "84cfe36e-7915-443b-8301-c4de8a28acc5.avif",
    "87857b54-e77a-456d-97ea-40ed43538b69.avif",
    "8b4819c2-6a73-4f51-8916-6805670cff52.avif",
    "c64051c2-283c-47e6-a3c5-7d23714eb537.avif"
  ],
  "Olive": [
    "2f716877-9530-44a4-b9a4-88a55540ddb6.avif",
    "5f5ec356-4bf6-41f4-ac63-81da64df60d9.webp",
    "8381fd4e-e32b-498c-8244-8391ee5acb50.avif",
    "bc26c106-b1ce-4dd2-82a7-3e818c86383b.avif",
    "fe668f0c-da86-413a-b1fc-5a63373def08.avif"
  ],
  "PrivateModernCabin": [
    "0579cac8-55a7-4051-9868-3c94f709ead1.avif",
    "1662fcc2-f170-4423-b30a-8178814fced0.avif",
    "908ffef9-3080-47d8-be05-d4bdc4d1d84a.avif",
    "b4c7383b-6ea2-43cd-92d9-20ede1d1635f.avif",
    "da4c0f43-e2cc-4322-abc6-c49204d4274a.avif"
  ],
  "Sahara": [
    "0bca3f0a-0a29-41db-bd04-80243c790271.avif",
    "253e28da-1d31-44f9-be05-1d02230b01de.avif",
    "3ffa9d58-c24f-4205-92f4-371ef4b5b025.avif",
    "5b2e5f39-82ea-498b-bc64-00a9f9cfe165.avif",
    "6231dbbf-1db9-403f-955a-8f945b15f4ad.avif"
  ],
  "SerenityCrestBliss": [
    "4fedaa95-2a24-40da-b55c-fa4f60e0b944.avif",
    "8cc9e97e-146b-4cfd-8a11-71e4c2b7d4cb.avif",
    "9a5e1f60-2e45-41b5-ae36-30f81829a418.avif",
    "d9cff944-684d-4a4b-811a-4ac9d9f9d923.avif",
    "ec78d4ec-a01f-455f-a30c-36c911b247f5.avif"
  ],
  "SerenityCrestCalm": [
    "0987a4ae-84e1-4d67-b86d-58fd58b5879f.avif",
    "0b416198-2b16-474a-91aa-626b5214f8e5.avif",
    "3cfcbd4c-dd92-4e1b-aaf7-f128992d1a91.avif",
    "73bd5f0c-94f7-487a-a698-3ce07a400d21.avif",
    "ba1ea0e1-d651-466d-8f9f-1685e71165bc.avif"
  ],
  "TaalLakeviewRetreat": [
    "077f6d83-971c-4e34-aafc-018d2899368d.webp",
    "116bbd49-a22c-4f9f-ac40-400f4cd88a7c.avif",
    "20ed21a5-4672-4f1d-adca-9f3c253f23a7.avif",
    "870b609e-9587-46ac-b9af-caabe75347aa.avif",
    "8e567aa9-5876-47f9-a166-ae5160579898.avif"
  ],
  "VerdeSerinSuite": [
    "4e27e04b-3d35-4c20-b946-09aefc03dd7c.avif",
    "67e04e61-029d-4ece-a6ce-b4705bd86c01.avif",
    "76a2be02-d332-48c5-8ef9-d7ebaa239b5d.avif",
    "d945cc95-7067-43e4-b151-a9e6dee934d5.avif",
    "fe074cb3-9b93-479f-9753-b173c440972f.avif"
  ]
};

const localHomePhoto = (folder, file) => `/images/homes/${folder}/${file}`;
const localExperiencePhoto = (folder, file) => `/images/experiences/${folder}/${file}`;

const listing = (title, type, location, price, rating, review, amenities, availability, image) => {
  let images = [image];
  let folderMatch = image.match(/\/images\/homes\/([^/]+)\//);
  if (folderMatch) {
    const folder = folderMatch[1];
    if (folderImages[folder]) {
      images = folderImages[folder].map(f => `/images/homes/${folder}/${f}`);
    }
  }

  return {
    title,
    type,
    location,
    price,
    rating,
    review,
    amenities,
    availability,
    image,
    images
  };
};

const homeSections = [
  {
    title: "Popular homes in Tagaytay City",
    items: [
      listing("Verde Serin Suite", "Boutique hotel in Tagaytay", "Tagaytay", "PHP 17,346 for 5 nights", "New", "1 bedroom · 1 sofa bed", ["Free cancellation", "Hotel stay", "City access"], "May 10 to 15", localHomePhoto("VerdeSerinSuite", "fe074cb3-9b93-479f-9753-b173c440972f.avif")),
      listing("Serenity Crest Calm - Taal Lake View", "Home in Talisay", "Talisay", "PHP 45,182 for 5 nights", "4.98", "1 bedroom · 1 bed", ["Guest favorite", "Taal view", "Pool"], "May 17 to 22", localHomePhoto("SerenityCrestCalm", "ba1ea0e1-d651-466d-8f9f-1685e71165bc.avif")),
      listing("Serenity Crest Bliss - Taal Lake View", "Home in Talisay", "Talisay", "PHP 40,772 for 5 nights", "4.93", "1 bedroom · 2 beds", ["Guest favorite", "Lakefront", "Nature"], "May 11 to 16", localHomePhoto("SerenityCrestBliss", "4fedaa95-2a24-40da-b55c-fa4f60e0b944.avif")),
      listing("Bay Bula Villa | Tagaytay Overlooking Pool Villa", "Guesthouse in Tagaytay", "Tagaytay", "PHP 53,065 for 5 nights", "5.0", "1 bedroom · 1 king bed", ["Guest favorite", "Overlooking view", "Pool villa"], "May 22 to 27", localHomePhoto("BayBulaVilla", "70671782-a03a-460b-a041-e92849ccdeb3.avif"))
    ]
  },
  {
    title: "Check out homes in Plainview",
    items: [
      listing("Casita Isabella Tiny House on wheels", "Tiny home in Tagaytay", "Tagaytay", "PHP 26,818 for 5 nights", "4.92", "1 bedroom · 1 double bed", ["Guest favorite", "Tiny home", "Nature stay"], "May 24 to 29", localHomePhoto("CasitaIsabella", "d348434f-32e5-4736-897c-dc94b77c26e1.avif")),
      listing("Sahara by Saule Taal Cabins", "Cabin in Talisay", "Talisay", "PHP 35,149 for 5 nights", "4.95", "1 bedroom · 1 king bed", ["Guest favorite", "Cabin stay", "Taal area"], "May 24 to 29", localHomePhoto("Sahara", "0bca3f0a-0a29-41db-bd04-80243c790271.avif")),
      listing("Cozy, Romantic Loft (with Private Onsen)", "Guesthouse in Amadeo", "Amadeo", "PHP 20,209 for 5 nights", "4.96", "1 bedroom · 1 king bed", ["Guest favorite", "Private onsen", "Romantic stay"], "May 17 to 22", localHomePhoto("Cozy", "89dc1411-f085-41e8-8bd5-3d84ff1d35e3.avif")),
      listing("Private Modern Cabin with Pool near Tagaytay", "Cabin in Indang", "Indang", "PHP 78,904 for 5 nights", "4.98", "1 bedroom · 4 beds", ["Guest favorite", "Modern cabin", "Pool"], "May 10 to 15", localHomePhoto("PrivateModernCabin", "da4c0f43-e2cc-4322-abc6-c49204d4274a.avif"))
    ]
  },
  {
    title: "Places to stay in Tagaytay",
    items: [
      listing("Olive by Saule Taal Cabins", "Home in Talisay", "Talisay", "PHP 36,575 for 5 nights", "5.0", "1 bedroom · 1 bed", ["Guest favorite", "Taal area", "Cabin vibe"], "May 26 to 31", localHomePhoto("Olive", "5f5ec356-4bf6-41f4-ac63-81da64df60d9.webp")),
      listing("Bay Asibi Villa | Onsen in Tagaytay with Taal View", "Tiny home in Tagaytay", "Tagaytay", "PHP 60,141 for 5 nights", "4.9", "1 bedroom · 1 king bed", ["Guest favorite", "Onsen", "Taal view"], "May 25 to 30", localHomePhoto("BayAsibiVilla", "3df67f61-a1f4-4399-b57f-8ecfc57476a2.avif")),
      listing("Taal Lakeview Retreat -Breathtaking Panoramic Views", "Tiny home in Talisay", "Talisay", "PHP 52,409 for 5 nights", "New", "2 double beds · 1 bath", ["Panoramic views", "Lake view", "Quiet stay"], "Jun 2 to 7", localHomePhoto("TaalLakeviewRetreat", "870b609e-9587-46ac-b9af-caabe75347aa.avif")),
      listing("Dome Glamping | Private Pool, PS4 + Free Bonfire", "Dome in Tagaytay", "Tagaytay", "PHP 63,450 for 5 nights", "4.94", "4 beds · 1 bath", ["Private pool", "PS4", "Free bonfire"], "May 6 to 11", localHomePhoto("DomeGlamping", "c64051c2-283c-47e6-a3c5-7d23714eb537.avif"))
    ]
  }
];

const experienceSections = [
  {
    title: "Suggested for you",
    items: [
      listing("Sunrise Ridge Breakfast Tour", "Guided experience", "Tagaytay ridge route", "PHP 1,850 / guest", "4.93", "A guest favorite for scenic stops and local breakfast.", ["Guide", "Transport", "Coffee"], "Morning slots available", localExperiencePhoto("SunriseRidgeBreakfastTour", "R.jfif")),
      listing("Taal View Picnic Setup", "Curated date experience", "Viewpoint gardens", "PHP 2,200 / booking", "4.90", "Styled picnic corners with fresh flowers and snacks.", ["Setup crew", "Snacks", "Photo props"], "Reserve 2 days ahead", localExperiencePhoto("TaalViewPicnicSetup", "252445214_4435232109906574_7585047398823894700_n.jpg")),
      listing("Ridge Coffee Crawl", "Hosted tasting trail", "Tagaytay City", "PHP 1,250 / person", "4.89", "Visit scenic cafes and cool-weather brunch stops.", ["Cafe stops", "Host guide", "Snacks"], "Running all week", localExperiencePhoto("RidgeCoffeeCrawl", "1f0111e96f64b0d2a2e197c8af5c1fe8.jpg")),
      listing("Taal View Painting Morning", "Creative workshop", "Tagaytay ridge deck", "PHP 1,450 / guest", "4.86", "Paint with a view while local artists guide your relaxed session.", ["Materials", "Canvas", "Tea"], "Morning session open", localExperiencePhoto("TaalViewPainting", "il_1080xN.6880819781_kc02.webp")),
      listing("Hidden Garden Brunch Club", "Hosted brunch", "Secret garden venue", "PHP 1,780 / guest", "4.88", "A social brunch stop with local pastries and floral styling.", ["Brunch set", "Host", "Garden access"], "Open this Thursday", localExperiencePhoto("HiddenGardenBrunch", "658526399_17918141340335732_2663271616499083977_n.jpg"))
    ]
  },
  {
    title: "Popular experiences in Tagaytay City",
    items: [
      listing("Sunrise Ridge Breakfast Tour", "Guided experience", "Tagaytay ridge route", "PHP 1,850 / person", "4.93", "A guest favorite for scenic stops and local breakfast.", ["Guide", "Transport", "Coffee"], "Morning slots available", localExperiencePhoto("SunriseRidgeBreakfastTour", "R.jfif")),
      listing("Farm and Cafe Day Trail", "Half-day local trip", "Tagaytay and Alfonso", "PHP 1,500 / person", "4.87", "A slow-paced route with fresh food and garden views.", ["Host", "Cafe guide", "Flexible stops"], "Daily afternoon runs", localExperiencePhoto("FarmandCafeDayTrail", "farmhouse-cafe-outside.jpg")),
      listing("Brunch and View Stop", "Food experience", "Tagaytay City", "PHP 980 / person", "4.85", "Join a scenic brunch setup with local favorites and coffee.", ["Brunch set", "Coffee", "Small group"], "Daily morning slots", localExperiencePhoto("HiddenGardenBrunch", "658526399_17918141340335732_2663271616499083977_n.jpg")),
      listing("Horseback Ridge Loop", "Outdoor ride", "Tagaytay Highlands trail", "PHP 1,650 / person", "4.84", "A laid-back horseback route with scenic overlooks and cool winds.", ["Horse guide", "Helmet", "Photo stop"], "Open all weekend", localExperiencePhoto("HorsebackRidgeLoop", "c5153_horseback_in_tagaytay.jpg")),
      listing("Farm-to-Table Tasting Tour", "Food and culture", "Tagaytay outskirts", "PHP 1,980 / guest", "4.91", "Meet growers and enjoy a fresh tasting menu in one slow afternoon.", ["Host chef", "Tasting plates", "Transport"], "Friday to Sunday", localExperiencePhoto("Farm-to-TableTastingTour", "Farmers-Table-Tagaytay.webp"))
    ]
  },
  {
    title: "Happening today in Tagaytay",
    items: [
      listing("Sunset Viewpoint Walk", "Same-day activity", "People's Park route", "PHP 650 / person", "4.82", "A simple guided walk with photo pauses and local stories.", ["Guide", "Sunset stop", "Photos"], "Today at 5:00 PM", localExperiencePhoto("SunsetViewpointWalk", "Picnic-Grove-Tagaytay-1042x608.jpg")),
      listing("Quick Pottery Session", "Creative activity", "Craft studio", "PHP 1,100 / guest", "4.80", "A relaxing studio class for guests who want a slow afternoon.", ["Materials", "Instructor", "Take-home piece"], "Today at 2:00 PM", localExperiencePhoto("QuickPotterySession", "PotteryWorkshopinRizalbyPawtteryStudioArts.jpg")),
      listing("Late-Night Dessert Crawl", "Evening food stop", "Tagaytay center", "PHP 900 / person", "4.78", "A sweet route around the city's dessert spots.", ["3 dessert stops", "Guide", "Night route"], "Tonight at 8:00 PM", themedPhoto(["dessert", "cafe", "night", "food"], 53)),
      listing("Midday Flower Styling Class", "Hands-on workshop", "Tagaytay events studio", "PHP 1,250 / guest", "4.79", "Arrange fresh blooms in a calm indoor class perfect for same-day plans.", ["Flowers", "Mentor", "Wrapping"], "Today at 1:00 PM", localExperiencePhoto("MiddayFlowerStylingClass", "flower-bouquet-workshop-in-manila.webp")),
      listing("Evening Acoustic Dinner", "Live music dining", "Sky deck venue", "PHP 1,650 / guest", "4.83", "Dinner with acoustic sets, cozy lights, and ridge-side breezes.", ["Dinner seat", "Live music", "Welcome drink"], "Tonight at 7:30 PM", localExperiencePhoto("EveningAcousticDinner", "5a006711-b752-45d9-bdac-4f5eb102be27.avif"))
    ]
  },
  {
    title: "Tomorrow in Tagaytay",
    items: [
      listing("Morning Garden Breakfast", "Hosted breakfast", "Crosswinds area", "PHP 1,350 / person", "4.90", "Fresh pastries, local fruit, and a slow scenic morning.", ["Breakfast", "Garden setup", "Coffee"], "Tomorrow at 8:30 AM", themedPhoto(["breakfast", "garden", "morning", "food"], 56)),
      listing("Couple's Flower Picnic", "Styled outdoor setup", "Sungay ridge", "PHP 2,400 / booking", "4.92", "A private setup for anniversaries and laid-back moments.", ["Private setup", "Snacks", "Flowers"], "Tomorrow afternoon", localExperiencePhoto("Couple'sFlowerPicnic", "shutterstock_1718645020.webp")),
      listing("Food Market Run", "Culture and food", "City market area", "PHP 750 / person", "4.83", "Walk, snack, and browse local produce with a friendly host.", ["Guide", "Market snacks", "Tasting tips"], "Tomorrow morning", localExperiencePhoto("FoodMarketRun", "Mahogany-Market-1024x608.webp")),
      listing("Cloud Deck Coffee Workshop", "Coffee experience", "Cecil's Cafe", "PHP 1,100 / guest", "4.87", "Learn brewing basics while overlooking one of Tagaytay's best ridge views.", ["Brewing kit", "Barista", "Tasting flight"], "Tomorrow at 10:00 AM", localExperiencePhoto("CloudDeckCoffeeWorkshop", "eyJrZXkiOiJibG9nXC93cC1jb250ZW50XC91cGxvYWRzXC8yMDI0XC8xMVwvMDYxNjAyMDJcL0NlY2lscy1DYWZlLnBuZyIsImJ1Y2tldCI6ImJvb2t5cmVwb3J0In0=.webp")),
      listing("Tagaytay Bike and Brunch", "Outdoor activity", "Ridge loop start point", "PHP 1,700 / guest", "4.85", "A light scenic ride followed by a brunch stop at a local favorite.", ["Bike rental", "Guide", "Brunch"], "Tomorrow at 7:00 AM", localExperiencePhoto("TagaytayBikeandBrunch", "OIP.webp"))
    ]
  },
  {
    title: "Experiences this weekend",
    items: [
      listing("Barkada Food Crawl", "Group food tour", "Tagaytay City", "PHP 1,450 / person", "4.89", "A fun mix of savory stops, dessert, and chill night views.", ["5 food stops", "Host", "Night route"], "Saturday and Sunday", localExperiencePhoto("BarkadaFoodCrawl", "klaras-bulalo-kafe-in-tagaytay1.jpg")),
      listing("Weekend Wellness Morning", "Yoga and tea", "Ridge deck studio", "PHP 950 / guest", "4.81", "Slow movement, tea, and a fresh open-air setting.", ["Yoga", "Tea", "Open-air"], "Saturday morning", localExperiencePhoto("WeekendWellnessMorning", "nurture-wellness-village-773x773.jpg")),
      listing("Weekend Farm Harvest Walk", "Nature activity", "Tagaytay SVD Farm", "PHP 1,050 / guest", "4.84", "Pick herbs, explore gardens, and enjoy a quiet countryside stop.", ["Farm guide", "Harvest basket", "Tea"], "Sunday morning", localExperiencePhoto("WeekendFarmHarvestWalk", "maxresdefault.jpg")),
      listing("Terraza Bar & Grill in Tagaytay", "Group food tour", "Bar and Grill", "PHP 1,300 / guest", "4.88", "Unwind with Filipino-inspired cocktails and classic spirits.", ["Dine", "View", "Night out"], "Everyday", localExperiencePhoto("TerrazaBar", "131988722_3597631273647059_4996557328618875410_n.jpg"))
    ]
  }
];

const serviceCategoryImages = {
  photography: "/images/photography/photography-genres-pkja1fzloq58qxhw9m9l7mqmfdm94ktp7mt5i35c0w.jpg",
  chefs: "/images/chefs/professional-chef-plating-food-modern-restaurant-kitchen_406939-24995.avif",
  massage: "/images/massage/11062b_944f427e75af4617b94e3528e6c238dc~mv2.avif",
  "prepared meals": "/images/catering/OIP.webp",
  training: "/images/training/19-07-Blog-fitness-training-personal-training.webp",
  makeup: "/images/makeup/OIP.webp",
  hair: "/images/hair/OIP (1).webp",
  "spa treatments": "/images/spa treatments/day_spa_treatments.avif",
  catering: "/images/catering/OIP.webp"
};

const serviceCategories = [
  ["Photography", "7 available", serviceCategoryImages.photography],
  ["Chefs", "4 available", serviceCategoryImages.chefs],
  ["Massage", "5 available", serviceCategoryImages.massage],
  ["Prepared meals", "6 available", serviceCategoryImages["prepared meals"]],
  ["Training", "3 available", serviceCategoryImages.training],
  ["Makeup", "4 available", serviceCategoryImages.makeup],
  ["Hair", "4 available", serviceCategoryImages.hair],
  ["Spa treatments", "5 available", serviceCategoryImages["spa treatments"]],
  ["Catering", "4 available", serviceCategoryImages.catering]
].map(([title, count, image]) => ({ id: title.toLowerCase(), title, count, image }));

const servicesByCategory = {
  photography: [
    { title: "Make your Memories Last for a lifetime", type: "Photography", price: "From PHP 3,500 / guest", image: serviceCategoryImages.photography },
    { title: "Candid Portrait Photography by Chris", type: "In home - Photography", price: "From PHP 6,000 / group", image: serviceCategoryImages.photography },
    { title: "Make Your Memories Last for a lifetime", type: "Photography", price: "From PHP 3,500 / guest", image: serviceCategoryImages.photography },
    { title: "Bho Cheng Photography Service", type: "In home - Photography", price: "From PHP 5,605 / guest", image: serviceCategoryImages.photography },
    { title: "Your Personal Photographer while travelling", type: "In home - Photography", price: "From PHP 4,000 / group", image: serviceCategoryImages.photography },
    { title: "Couple Session at the Ridge", type: "Outdoor photography", price: "From PHP 4,800 / session", image: serviceCategoryImages.photography },
    { title: "Family Portraits in Tagaytay", type: "Lifestyle photography", price: "From PHP 5,200 / group", image: serviceCategoryImages.photography }
  ],
  chefs: [
    { title: "Private Breakfast Chef for Villas", type: "In-home chef", price: "From PHP 4,200 / booking", image: serviceCategoryImages.chefs },
    { title: "Romantic Dinner Setup with Chef", type: "Chef and styling", price: "From PHP 6,800 / booking", image: serviceCategoryImages.chefs },
    { title: "Villa Brunch Chef Experience", type: "Private brunch chef", price: "From PHP 5,100 / booking", image: serviceCategoryImages.chefs },
    { title: "Celebration Night with Personal Chef", type: "In-home chef", price: "From PHP 7,400 / night", image: serviceCategoryImages.chefs }
  ],
  massage: [
    { title: "In-villa Massage Session", type: "Massage", price: "From PHP 1,850 / guest", image: serviceCategoryImages.massage },
    { title: "Deep Tissue Relaxation Hour", type: "Massage therapy", price: "From PHP 2,200 / guest", image: serviceCategoryImages.massage },
    { title: "Swedish Massage for Couples", type: "Couples massage", price: "From PHP 3,900 / pair", image: serviceCategoryImages.massage },
    { title: "Hot Stone Massage Ritual", type: "Spa massage", price: "From PHP 2,650 / guest", image: serviceCategoryImages.massage },
    { title: "Recovery Massage After Ridge Tours", type: "Sports massage", price: "From PHP 2,450 / guest", image: serviceCategoryImages.massage }
  ],
  "prepared meals": [
    { title: "Breakfast Trays for Cool Mornings", type: "Prepared meals", price: "From PHP 1,400 / tray", image: serviceCategoryImages["prepared meals"] },
    { title: "Family Lunch Meal Boxes", type: "Prepared meals", price: "From PHP 3,200 / set", image: serviceCategoryImages["prepared meals"] },
    { title: "Romantic Dinner Ready Set", type: "Prepared meals", price: "From PHP 2,800 / set", image: serviceCategoryImages["prepared meals"] },
    { title: "Brunch Board and Pastry Bundle", type: "Prepared meals", price: "From PHP 2,100 / set", image: serviceCategoryImages["prepared meals"] },
    { title: "Comfort Food Barkada Bundle", type: "Prepared meals", price: "From PHP 4,100 / bundle", image: serviceCategoryImages["prepared meals"] },
    { title: "Healthy Stay Meal Plan", type: "Prepared meals", price: "From PHP 2,600 / day", image: serviceCategoryImages["prepared meals"] }
  ],
  training: [
    { title: "Morning Yoga and Stretch Coach", type: "Training", price: "From PHP 2,100 / session", image: serviceCategoryImages.training },
    { title: "Private Mobility Session", type: "Wellness training", price: "From PHP 1,900 / session", image: serviceCategoryImages.training },
    { title: "Strength Circuit for Small Groups", type: "Fitness training", price: "From PHP 3,500 / group", image: serviceCategoryImages.training }
  ],
  makeup: [
    { title: "Bridal Hair and Makeup", type: "Beauty service", price: "From PHP 4,900 / booking", image: serviceCategoryImages.makeup },
    { title: "Soft Glam for Staycations", type: "Makeup", price: "From PHP 2,200 / guest", image: serviceCategoryImages.makeup },
    { title: "Event Makeup with Touch-up Kit", type: "Makeup", price: "From PHP 3,100 / guest", image: serviceCategoryImages.makeup },
    { title: "Natural Day Look Session", type: "Makeup", price: "From PHP 1,850 / guest", image: serviceCategoryImages.makeup }
  ],
  hair: [
    { title: "Blowout and Styling at Your Villa", type: "Hair service", price: "From PHP 1,600 / guest", image: serviceCategoryImages.hair },
    { title: "Formal Hair Styling for Events", type: "Hair service", price: "From PHP 2,400 / guest", image: serviceCategoryImages.hair },
    { title: "Curls and Waves Session", type: "Hair service", price: "From PHP 1,950 / guest", image: serviceCategoryImages.hair },
    { title: "Hair and Prep for Shoots", type: "Hair service", price: "From PHP 2,700 / booking", image: serviceCategoryImages.hair }
  ],
  "spa treatments": [
    { title: "Spa Night for Couples", type: "Spa treatment", price: "From PHP 3,700 / pair", image: serviceCategoryImages["spa treatments"] },
    { title: "Milk Bath and Aromatherapy", type: "Spa treatment", price: "From PHP 2,900 / guest", image: serviceCategoryImages["spa treatments"] },
    { title: "Ridge Retreat Facial and Spa", type: "Spa treatment", price: "From PHP 2,550 / guest", image: serviceCategoryImages["spa treatments"] },
    { title: "Quiet Evening Spa Package", type: "Spa treatment", price: "From PHP 4,200 / pair", image: serviceCategoryImages["spa treatments"] },
    { title: "Body Scrub and Relaxation Session", type: "Spa treatment", price: "From PHP 2,450 / guest", image: serviceCategoryImages["spa treatments"] }
  ],
  catering: [
    { title: "Family Lunch Buffet Service", type: "Catering", price: "From PHP 7,200 / event", image: serviceCategoryImages.catering },
    { title: "Cocktail Bites for Sunset Gatherings", type: "Catering", price: "From PHP 4,600 / setup", image: serviceCategoryImages.catering },
    { title: "Birthday Feast Catering", type: "Catering", price: "From PHP 8,100 / event", image: serviceCategoryImages.catering },
    { title: "Garden Picnic Catering Set", type: "Catering", price: "From PHP 5,400 / setup", image: serviceCategoryImages.catering }
  ]
};

const serviceCategoryDetails = {
  photography: { eyebrow: "Captured moments", copy: "Book portraits, couple shoots, and travel photo sessions styled around Tagaytay views and villa stays." },
  chefs: { eyebrow: "Private dining", copy: "Bring chef-led breakfasts, dinner setups, and curated villa dining straight to your stay." },
  massage: { eyebrow: "Rest and recovery", copy: "Choose calming massage treatments designed for slow mornings, post-tour recovery, and quiet evenings." },
  "prepared meals": { eyebrow: "Ready-to-serve meals", copy: "Order curated meal bundles, brunch trays, and comfort-food sets without leaving your accommodation." },
  training: { eyebrow: "Wellness sessions", copy: "Stay active with guided stretch sessions, private coaching, and small-group fitness routines." },
  makeup: { eyebrow: "Beauty prep", copy: "Reserve makeup artists for events, photoshoots, and easy staycation glam sessions." },
  hair: { eyebrow: "Styling services", copy: "Get on-site blowouts, formal styling, and prep sessions for portraits, dinners, and celebrations." },
  "spa treatments": { eyebrow: "Relaxation menu", copy: "Unwind with facials, body rituals, and spa packages built for calm Tagaytay resets." },
  catering: { eyebrow: "Gathering essentials", copy: "Set up buffets, cocktail bites, and event-ready catering for birthdays, reunions, and villa nights." }
};

const categoryMoments = {
  home: { eyebrow: "Stay recommendations", title: "Browse cozy places made for cool Tagaytay weekends.", copy: "From private villas to boutique suites, discover spaces with scenic views, thoughtful amenities, and easy booking.", highlights: ["Top rated stays", "Flexible dates", "Family-friendly picks"] },
  experiences: { eyebrow: "Local experiences", title: "Fill your trip with scenic mornings and memorable activities.", copy: "Find breakfast tours, picnic setups, and guided trails curated around Tagaytay's calm pace and fresh air.", highlights: ["Hosted tours", "Photo-ready stops", "Couple and group options"] },
  services: { eyebrow: "Travel add-ons", title: "Make every stay smoother with guest-ready services.", copy: "Add chef setups, transfers, and celebration kits that fit your booking without leaving the app.", highlights: ["Quick add-ons", "Arrival support", "Easy sharing"] }
};

function getListingById(category, title) {
  const decodedTitle = decodeURIComponent(title);
  if (category === "home") {
    for (const section of homeSections) {
      const match = section.items.find((item) => item.title === decodedTitle);
      if (match) return match;
    }
  } else if (category === "experiences") {
    for (const section of experienceSections) {
      const match = section.items.find((item) => item.title === decodedTitle);
      if (match) return match;
    }
  } else if (category === "services") {
    for (const categoryItems of Object.values(servicesByCategory)) {
      const match = categoryItems.find((item) => item.title === decodedTitle);
      if (match) return match;
    }
  }
  return null;
}

export {
  categories,
  themedPhoto,
  localHomePhoto,
  localExperiencePhoto,
  homeSections,
  experienceSections,
  serviceCategories,
  servicesByCategory,
  serviceCategoryDetails,
  categoryMoments,
  getListingById
};
