const POINTS_DATA_PREFIX = "host-points-data-";
const PROMOTIONS_KEY = "host-points-promotions";
const DAILY_REWARDS = [0.6, 1.2, 0.6, 0.3, 0.3, 0.3, 0.3];
const PROMOTION_COST = 50;
const POINTS_EXPIRY_MONTHS = 12;

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.error(`Unable to parse localStorage key ${key}:`, error);
    return fallback;
  }
}

function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return value;
  } catch (error) {
    console.error(`Unable to save localStorage key ${key}:`, error);
    return value;
  }
}

function makeId(prefix = "id") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function startOfDay(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addMonths(date, months) {
  const copy = new Date(date);
  copy.setMonth(copy.getMonth() + months);
  return copy;
}

function createDefaultPointsData() {
  return {
    history: [],
    dailyCheckIn: {
      lastCheckInDate: null,
      streakDay: 1
    },
    awardedListingIds: []
  };
}

function getPointsDataKey(userId) {
  return `${POINTS_DATA_PREFIX}${userId}`;
}

function getPromotionEntries() {
  return loadJSON(PROMOTIONS_KEY, []);
}

function savePromotionEntries(entries) {
  return saveJSON(PROMOTIONS_KEY, entries);
}

function savePointsData(userId, data) {
  return saveJSON(getPointsDataKey(userId), data);
}

function loadPointsData(userId) {
  const saved = loadJSON(getPointsDataKey(userId), null);
  if (!saved) {
    const defaultData = createDefaultPointsData();
    savePointsData(userId, defaultData);
    return defaultData;
  }
  return saved;
}

function ensurePointsData(userId) {
  const data = loadPointsData(userId);
  const updated = runPointExpiry(data);
  if (updated !== data) {
    savePointsData(userId, updated);
    return updated;
  }
  return data;
}

function runPointExpiry(pointsData) {
  const now = startOfDay(new Date());
  const history = [...pointsData.history];
  const expiredFromIds = new Set(history.filter((tx) => tx.type === "expired" && tx.expiredFromId).map((tx) => tx.expiredFromId));
  let hasExpired = false;

  history.forEach((transaction) => {
    if (transaction.type !== "earn" || !transaction.expiryDate) {
      return;
    }
    if (expiredFromIds.has(transaction.id)) {
      return;
    }
    const expiry = startOfDay(new Date(transaction.expiryDate));
    if (expiry <= now) {
      history.push({
        id: makeId("expired"),
        amount: -Math.abs(Number(transaction.amount) || 0),
        type: "expired",
        description: `Expired points from ${transaction.description || "reward"}`,
        date: now.toISOString(),
        expiredFromId: transaction.id
      });
      hasExpired = true;
    }
  });

  if (!hasExpired) {
    return pointsData;
  }

  return {
    ...pointsData,
    history
  };
}

export function initializeHostPoints(userId) {
  return ensurePointsData(userId);
}

export function getHostPointsHistory(userId) {
  const data = ensurePointsData(userId);
  return [...data.history].sort((a, b) => new Date(b.date) - new Date(a.date));
}

export function getHostPointsBalance(userId) {
  const data = ensurePointsData(userId);
  return data.history.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
}

export function getHostPointsExpiring(userId) {
  const data = ensurePointsData(userId);
  const now = startOfDay(new Date());
  return data.history.filter((tx) => {
    if (tx.type !== "earn" || !tx.expiryDate) return false;
    const expiry = startOfDay(new Date(tx.expiryDate));
    const alreadyExpired = data.history.some((other) => other.type === "expired" && other.expiredFromId === tx.id);
    return !alreadyExpired && expiry > now;
  }).map((tx) => ({
    amount: Number(tx.amount || 0),
    expiresAt: tx.expiryDate
  }));
}

export function getHostDailyCheckInStatus(userId) {
  const data = ensurePointsData(userId);
  const now = startOfDay(new Date());
  const lastDate = data.dailyCheckIn.lastCheckInDate ? startOfDay(new Date(data.dailyCheckIn.lastCheckInDate)) : null;
  const streakDay = Math.min(Math.max(Number(data.dailyCheckIn.streakDay) || 1, 1), 7);
  const checkedInToday = lastDate ? startOfDay(lastDate).getTime() === now.getTime() : false;
  let nextDay = 1;

  if (checkedInToday) {
    nextDay = streakDay;
  } else if (lastDate) {
    const difference = Math.round((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    if (difference === 1) {
      nextDay = Math.min(streakDay + 1, 7);
    } else {
      nextDay = 1;
    }
  }

  return {
    checkedInToday,
    lastCheckInDate: data.dailyCheckIn.lastCheckInDate,
    streakDay,
    nextDay,
    rewardAmount: DAILY_REWARDS[nextDay - 1] || DAILY_REWARDS[0]
  };
}

function addHostPointsTransaction(userId, transaction) {
  const data = ensurePointsData(userId);
  const updated = {
    ...data,
    history: [
      {
        id: makeId("txn"),
        date: new Date().toISOString(),
        ...transaction
      },
      ...data.history
    ]
  };
  savePointsData(userId, updated);
  return updated;
}

export function checkInHostDaily(userId) {
  const status = getHostDailyCheckInStatus(userId);
  if (status.checkedInToday) {
    return { success: false, message: "You already checked in today. Come back tomorrow." };
  }
  const day = status.nextDay;
  const amount = DAILY_REWARDS[day - 1] || 0;
  const updated = ensurePointsData(userId);
  const nextData = {
    ...updated,
    dailyCheckIn: {
      lastCheckInDate: new Date().toISOString(),
      streakDay: day
    }
  };
  savePointsData(userId, nextData);
  const finalData = addHostPointsTransaction(userId, {
    amount,
    type: "earn",
    category: "daily-check-in",
    description: `Daily Check-In (Day ${day})`,
    expiryDate: addMonths(new Date(), POINTS_EXPIRY_MONTHS).toISOString()
  });
  return {
    success: true,
    amount,
    description: `Earned ${amount.toFixed(2)} points for Daily Check-In`,
    points: getHostPointsBalance(userId),
    data: finalData
  };
}

export function awardPointsForListingPublish(userId, listingId) {
  const data = ensurePointsData(userId);
  const alreadyAwarded = data.history.some((tx) => tx.category === "listing-publish" && tx.listingId === listingId);
  if (alreadyAwarded) {
    return { success: false, message: "Points already awarded for this listing." };
  }
  addHostPointsTransaction(userId, {
    amount: 1,
    type: "earn",
    category: "listing-publish",
    listingId,
    description: "Created New Listing",
    expiryDate: addMonths(new Date(), POINTS_EXPIRY_MONTHS).toISOString()
  });
  return { success: true, message: "Earned 1 point for publishing the listing." };
}

export function awardPointsForBookingCompletion(userId, bookingId) {
  const data = ensurePointsData(userId);
  const alreadyAwarded = data.history.some((tx) => tx.category === "booking-completion" && tx.bookingId === bookingId);
  if (alreadyAwarded) {
    return { success: false, message: "Points already awarded for this booking." };
  }
  addHostPointsTransaction(userId, {
    amount: 5,
    type: "earn",
    category: "booking-completion",
    bookingId,
    description: "Completed Booking",
    expiryDate: addMonths(new Date(), POINTS_EXPIRY_MONTHS).toISOString()
  });
  return { success: true, message: "Earned 5 points for completing the booking." };
}

export function getActivePromotionForListing(listingId) {
  const promotions = getPromotionEntries();
  const now = new Date();
  return promotions.find((promo) => promo.listingId === listingId && new Date(promo.endDate) > now) || null;
}

export function getHostPromotions(userId) {
  const promotions = getPromotionEntries();
  return promotions.filter((promo) => promo.hostId === userId && new Date(promo.endDate) > new Date());
}

export function redeemHostPromotion(userId, listingId) {
  const currentBalance = getHostPointsBalance(userId);
  if (currentBalance < PROMOTION_COST) {
    return { success: false, message: "You need at least 50 points to redeem this promotion." };
  }
  const existingPromo = getActivePromotionForListing(listingId);
  if (existingPromo) {
    return { success: false, message: "This listing already has an active promotion." };
  }
  addHostPointsTransaction(userId, {
    amount: -PROMOTION_COST,
    type: "redeem",
    category: "promotion",
    listingId,
    description: "7-Day Listing Promotion"
  });
  const promotions = getPromotionEntries();
  const startDate = new Date();
  const endDate = addMonths(startDate, 0);
  endDate.setDate(startDate.getDate() + 7);
  promotions.push({
    id: makeId("promo"),
    hostId: userId,
    listingId,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString()
  });
  savePromotionEntries(promotions);
  return { success: true, message: "Promotion activated for 7 days." };
}

export function getPointsRewardData(userId) {
  const data = ensurePointsData(userId);
  const balance = getHostPointsBalance(userId);
  const expiring = getHostPointsExpiring(userId);
  const history = getHostPointsHistory(userId);
  const daily = getHostDailyCheckInStatus(userId);
  return { data, balance, expiring, history, daily, rewardSchedule: DAILY_REWARDS, promotionCost: PROMOTION_COST };
}
