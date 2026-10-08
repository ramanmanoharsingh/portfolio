const regionSportsMap = {
  Delhi: ["Cricket", "Football", "Badminton"],
  Mumbai: ["Cricket", "Football", "Tennis"],
  Bengaluru: ["Badminton", "Football", "Table Tennis"],
  Chennai: ["Cricket", "Tennis", "Chess"],
  Goa: ["Football", "Surfing", "Running"],
  Hyderabad: ["Cricket", "Badminton", "Football"],
  Kolkata: ["Football", "Cricket", "Chess"],
  Pune: ["Football", "Running", "Tennis"],
  Ahmedabad: ["Cricket", "Table Tennis", "Badminton"],
  Kochi: ["Football", "Running", "Badminton"]
};

const seedPlayers = [
  ["Aarav Mehta", "Delhi", "Saket", "Badminton", 3.2, "Intermediate", 12, 6, 4.5, 92, "Today Evening"],
  ["Kabir Singh", "Delhi", "Dwarka", "Cricket", 6.8, "Advanced", 22, 9, 4.2, 86, "Weekend"],
  ["Zoya Khan", "Delhi", "Hauz Khas", "Football", 4.1, "Intermediate", 15, 8, 4.7, 95, "Today Evening"],
  ["Pranav Sethi", "Delhi", "Lajpat Nagar", "Tennis", 9.6, "Advanced", 20, 13, 4.1, 81, "Tomorrow Morning"],
  ["Rhea Malhotra", "Delhi", "Rohini", "Table Tennis", 11.2, "Beginner", 7, 6, 4.0, 90, "Today Morning"],
  ["Samar Gill", "Delhi", "Vasant Kunj", "Running", 5.9, "Pro", 35, 8, 4.8, 93, "Weekend"],
  ["Tanishq Verma", "Delhi", "Karol Bagh", "Chess", 7.8, "Intermediate", 19, 16, 4.0, 87, "Tomorrow Morning"],
  ["Nikhil Rao", "Mumbai", "Bandra", "Tennis", 2.5, "Advanced", 18, 7, 4.8, 89, "Tomorrow Morning"],
  ["Ira Shah", "Mumbai", "Andheri", "Cricket", 7.4, "Intermediate", 14, 10, 4.1, 91, "Weekend"],
  ["Dev Kapoor", "Mumbai", "Powai", "Football", 5.3, "Beginner", 6, 7, 4.3, 88, "Today Morning"],
  ["Aditi Kulkarni", "Mumbai", "Dadar", "Badminton", 3.4, "Advanced", 24, 10, 4.6, 92, "Today Evening"],
  ["Yash Oberoi", "Mumbai", "Worli", "Running", 4.9, "Intermediate", 16, 8, 4.5, 97, "Today Morning"],
  ["Farah Contractor", "Mumbai", "Colaba", "Football", 12.7, "Pro", 41, 12, 4.7, 88, "Weekend"],
  ["Sia Bendre", "Mumbai", "Juhu", "Table Tennis", 6.6, "Advanced", 29, 13, 4.6, 90, "Today Evening"],
  ["Maya Iyer", "Bengaluru", "Indiranagar", "Badminton", 1.9, "Advanced", 25, 6, 4.9, 96, "Today Evening"],
  ["Rohan Das", "Bengaluru", "HSR Layout", "Table Tennis", 6.1, "Intermediate", 11, 8, 4.4, 82, "Tomorrow Morning"],
  ["Ananya Bose", "Bengaluru", "Koramangala", "Football", 4.8, "Pro", 32, 9, 4.6, 90, "Weekend"],
  ["Karthik Menon", "Bengaluru", "Whitefield", "Cricket", 9.8, "Intermediate", 18, 9, 4.3, 85, "Today Morning"],
  ["Diya Nambiar", "Bengaluru", "Jayanagar", "Tennis", 7.2, "Advanced", 27, 11, 4.6, 91, "Tomorrow Morning"],
  ["Reyansh Bhat", "Bengaluru", "Malleshwaram", "Chess", 5.5, "Pro", 44, 15, 4.4, 89, "Weekend"],
  ["Omar Qureshi", "Bengaluru", "BTM Layout", "Running", 3.9, "Intermediate", 14, 5, 4.7, 98, "Today Evening"],
  ["Vikram Nair", "Chennai", "Adyar", "Chess", 3.7, "Advanced", 28, 12, 4.5, 87, "Today Morning"],
  ["Meera Raman", "Chennai", "T Nagar", "Tennis", 5.6, "Intermediate", 13, 6, 4.7, 93, "Today Evening"],
  ["Arjun Pillai", "Chennai", "Velachery", "Cricket", 8.9, "Beginner", 5, 5, 4.0, 85, "Weekend"],
  ["Lavanya Krishnan", "Chennai", "Besant Nagar", "Badminton", 4.3, "Advanced", 21, 8, 4.9, 94, "Today Evening"],
  ["Raghav Subramaniam", "Chennai", "Anna Nagar", "Football", 10.2, "Intermediate", 12, 9, 4.2, 84, "Today Morning"],
  ["Naina George", "Chennai", "Mylapore", "Running", 2.8, "Beginner", 8, 3, 4.7, 96, "Weekend"],
  ["Harini Prasad", "Chennai", "Guindy", "Table Tennis", 6.7, "Advanced", 25, 10, 4.5, 91, "Tomorrow Morning"],
  ["Tara D'Souza", "Goa", "Panaji", "Surfing", 2.2, "Advanced", 19, 5, 4.8, 94, "Tomorrow Morning"],
  ["Neil Fernandes", "Goa", "Margao", "Football", 6.5, "Intermediate", 17, 11, 4.2, 86, "Today Evening"],
  ["Sara Gomes", "Goa", "Calangute", "Running", 4.4, "Beginner", 9, 4, 4.6, 98, "Weekend"],
  ["Joel Pereira", "Goa", "Mapusa", "Cricket", 9.1, "Advanced", 23, 14, 4.1, 83, "Today Morning"],
  ["Alisha Noronha", "Goa", "Vagator", "Tennis", 5.2, "Intermediate", 13, 8, 4.5, 92, "Today Evening"],
  ["Manav Naik", "Goa", "Candolim", "Surfing", 3.1, "Pro", 38, 9, 4.9, 95, "Weekend"],
  ["Chris Almeida", "Goa", "Baga", "Football", 2.9, "Advanced", 31, 13, 4.4, 88, "Today Evening"],
  ["Aisha Kapoor", "Delhi", "Nehru Place", "Cricket", 2.6, "Pro", 39, 11, 4.7, 94, "Today Evening"],
  ["Rudra Sen", "Mumbai", "Malad", "Tennis", 8.3, "Intermediate", 15, 12, 4.2, 86, "Tomorrow Morning"],
  ["Milan Joseph", "Bengaluru", "Hebbal", "Badminton", 10.4, "Beginner", 6, 6, 4.1, 88, "Weekend"],
  ["Kavya Srinivasan", "Chennai", "OMR", "Cricket", 7.1, "Pro", 46, 14, 4.8, 90, "Tomorrow Morning"],
  ["Andre Costa", "Goa", "Anjuna", "Running", 7.7, "Intermediate", 16, 7, 4.5, 97, "Today Morning"],
  ["Vivaan Reddy", "Hyderabad", "Gachibowli", "Cricket", 2.1, "Advanced", 34, 12, 4.6, 91, "Today Evening"],
  ["Noor Fatima", "Hyderabad", "Madhapur", "Badminton", 3.8, "Pro", 42, 10, 4.9, 96, "Tomorrow Morning"],
  ["Ishaan Varma", "Hyderabad", "Banjara Hills", "Football", 6.2, "Intermediate", 18, 9, 4.4, 89, "Weekend"],
  ["Tanvi Kulkarni", "Hyderabad", "Kondapur", "Table Tennis", 5.1, "Advanced", 26, 8, 4.5, 93, "Today Morning"],
  ["Armaan Siddiqui", "Hyderabad", "Secunderabad", "Tennis", 9.4, "Intermediate", 17, 12, 4.1, 84, "Today Evening"],
  ["Ritwik Chatterjee", "Kolkata", "Salt Lake", "Football", 2.7, "Advanced", 29, 11, 4.7, 92, "Today Evening"],
  ["Misha Roy", "Kolkata", "Ballygunge", "Chess", 4.6, "Pro", 51, 16, 4.8, 90, "Weekend"],
  ["Ayan Banerjee", "Kolkata", "New Town", "Cricket", 6.9, "Intermediate", 21, 13, 4.2, 87, "Tomorrow Morning"],
  ["Priyanka Das", "Kolkata", "Park Street", "Badminton", 3.4, "Advanced", 24, 9, 4.5, 95, "Today Morning"],
  ["Soham Mitra", "Kolkata", "Dum Dum", "Running", 8.2, "Beginner", 8, 5, 4.3, 97, "Weekend"],
  ["Aarohi Patil", "Pune", "Koregaon Park", "Running", 2.9, "Advanced", 28, 7, 4.8, 98, "Today Morning"],
  ["Vedant Joshi", "Pune", "Baner", "Football", 4.1, "Intermediate", 22, 12, 4.3, 88, "Today Evening"],
  ["Raina Deshmukh", "Pune", "Kothrud", "Tennis", 5.8, "Pro", 40, 9, 4.7, 91, "Tomorrow Morning"],
  ["Neil Bhosale", "Pune", "Viman Nagar", "Cricket", 7.6, "Advanced", 31, 14, 4.4, 86, "Weekend"],
  ["Jiya Shah", "Ahmedabad", "Navrangpura", "Cricket", 3.3, "Pro", 45, 12, 4.8, 94, "Today Evening"],
  ["Dhruv Trivedi", "Ahmedabad", "Satellite", "Table Tennis", 4.8, "Advanced", 27, 8, 4.6, 92, "Today Morning"],
  ["Mehul Parekh", "Ahmedabad", "Maninagar", "Badminton", 6.4, "Intermediate", 19, 9, 4.3, 89, "Weekend"],
  ["Kaira Iqbal", "Ahmedabad", "Bopal", "Football", 8.9, "Beginner", 10, 8, 4.1, 85, "Tomorrow Morning"],
  ["Elias Mathew", "Kochi", "Fort Kochi", "Football", 2.4, "Advanced", 33, 10, 4.6, 93, "Today Evening"],
  ["Anika Thomas", "Kochi", "Edappally", "Badminton", 3.7, "Intermediate", 20, 7, 4.5, 95, "Today Morning"],
  ["Vivek Menon", "Kochi", "Kakkanad", "Running", 5.9, "Pro", 47, 11, 4.9, 98, "Weekend"],
  ["Sara Cherian", "Kochi", "Panampilly Nagar", "Tennis", 7.2, "Advanced", 25, 10, 4.4, 90, "Tomorrow Morning"]
].map((p, index) => ({
  id: index + 1,
  name: p[0],
  region: p[1],
  locality: p[2],
  sport: p[3],
  distanceKm: p[4],
  skillLevel: p[5],
  matchWins: p[6],
  matchLosses: p[7],
  peerFeedback: p[8],
  reliability: p[9],
  availability: p[10]
}));

const seedGames = [
  { id: 1, sport: "Badminton", region: "Bengaluru", venue: "Indiranagar Club", time: "Today Evening", slots: 2, joined: 1 },
  { id: 2, sport: "Cricket", region: "Delhi", venue: "Saket Sports Complex", time: "Weekend", slots: 4, joined: 2 },
  { id: 3, sport: "Football", region: "Goa", venue: "Baga Turf", time: "Today Evening", slots: 3, joined: 1 },
  { id: 4, sport: "Tennis", region: "Mumbai", venue: "Bandra Court 2", time: "Tomorrow Morning", slots: 1, joined: 0 }
];

const storageKey = "playmakerState";
const pageCopy = {
  dashboard: ["Dashboard", "Your sports network, match queue, and player intelligence in one place."],
  discover: ["Discover Players", "Search nearby players using location, skill, rating, availability, and regional sport priority."],
  games: ["Games", "Create games, fill open slots, and find nearby opportunities to play."],
  requests: ["Requests", "Manage player connection requests and confirm matches."],
  profile: ["Profile", "Maintain your sports identity and availability for better matchmaking."],
  trust: ["Trust", "Transparent scoring and clear proof for the problem statement requirements."]
};

const defaultState = {
  activePage: "dashboard",
  user: null,
  profile: { name: "Guest Player", email: "", region: "Bengaluru", sport: "Badminton", skill: "Intermediate", availability: "Today Evening" },
  filters: { query: "", region: "Bengaluru", sport: "Any", skill: "Any", availability: "Any", distance: 10 },
  requests: {},
  games: seedGames,
  lastSearch: "",
  lastRefresh: "",
  recentSearches: []
};

const app = loadState();
let toastTimer = null;

function $(id) {
  return document.getElementById(id);
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(app));
}

function loadState() {
  const raw = localStorage.getItem(storageKey);
  if (!raw) return structuredClone(defaultState);
  try {
    return { ...structuredClone(defaultState), ...JSON.parse(raw) };
  } catch {
    return structuredClone(defaultState);
  }
}

function allSports() {
  return [...new Set(seedPlayers.map(player => player.sport))].sort();
}

function initials(name) {
  return name.split(" ").map(part => part[0]).join("").slice(0, 2).toUpperCase();
}

function rating(player) {
  const skillMap = { Beginner: 40, Intermediate: 65, Advanced: 85, Pro: 95 };
  const total = player.matchWins + player.matchLosses;
  const winRate = total ? player.matchWins / total : 0.5;
  return Number((
    skillMap[player.skillLevel] * 0.35 +
    winRate * 100 * 0.30 +
    player.peerFeedback * 20 * 0.20 +
    player.reliability * 0.15
  ).toFixed(1));
}

function skillScore(playerSkill, selectedSkill) {
  if (selectedSkill === "Any") return 8;
  if (playerSkill === selectedSkill) return 15;
  const rank = { Beginner: 1, Intermediate: 2, Advanced: 3, Pro: 4 };
  return Math.abs(rank[playerSkill] - rank[selectedSkill]) === 1 ? 8 : 0;
}

function matchScore(player) {
  const filters = app.filters;
  const popular = regionSportsMap[filters.region] || [];
  const sameRegion = player.region === filters.region ? 12 : 0;
  const distanceScore = Math.max(0, 30 - player.distanceKm);
  const sportScore = filters.sport === "Any" || player.sport === filters.sport ? 25 : 0;
  const availabilityScore = filters.availability === "Any" || player.availability === filters.availability ? 10 : 0;
  const regionBoost = popular.includes(player.sport) ? 15 : 0;
  const ratingBoost = rating(player) * 0.05;
  return Number((sameRegion + distanceScore + sportScore + skillScore(player.skillLevel, filters.skill) + availabilityScore + regionBoost + ratingBoost).toFixed(1));
}

function matches() {
  const q = app.filters.query.trim().toLowerCase();
  const queryTokens = q.split(/\s+/).filter(Boolean);
  return seedPlayers
    .map(player => ({ ...player, rating: rating(player), matchScore: matchScore(player) }))
    .filter(player => player.region === app.filters.region)
    .filter(player => player.distanceKm <= app.filters.distance)
    .filter(player => app.filters.sport === "Any" || player.sport === app.filters.sport)
    .filter(player => app.filters.skill === "Any" || player.skillLevel === app.filters.skill || skillScore(player.skillLevel, app.filters.skill) > 0)
    .filter(player => app.filters.availability === "Any" || player.availability === app.filters.availability)
    .filter(player => !q || queryTokens.every(token => [player.name, player.sport, player.locality, player.region, player.skillLevel, player.availability].some(value => value.toLowerCase().includes(token))))
    .sort((a, b) => b.matchScore - a.matchScore);
}

function marketSummary() {
  const popular = regionSportsMap[app.filters.region] || [];
  const counts = seedPlayers
    .filter(player => player.region === app.filters.region)
    .reduce((map, player) => ({ ...map, [player.sport]: (map[player.sport] || 0) + 1 }), {});
  return popular.map(sport => `${sport} ${counts[sport] || 0}`).join(" | ");
}

function requestStatus(id) {
  return app.requests[id] || "Request";
}

function requireSignIn(message) {
  if (app.user) return true;
  openAuth();
  showToast(message || "Sign in to continue.");
  return false;
}

function cycleRequest(id) {
  if (!requireSignIn("Sign in to send and confirm player requests.")) return;
  const current = requestStatus(id);
  const next = current === "Request" ? "Requested" : current === "Requested" ? "Confirmed" : "Request";
  if (next === "Request") delete app.requests[id];
  else app.requests[id] = next;
  saveState();
  render();
  showToast(`Request updated to ${next}.`);
}

function joinGame(id) {
  if (!requireSignIn("Sign in to join open games.")) return;
  const game = app.games.find(item => item.id === id);
  if (!game) return;
  if (game.joined >= game.slots) {
    showToast("This game is already full.");
    return;
  }
  game.joined += 1;
  saveState();
  render();
  showToast(`Joined ${game.sport} at ${game.venue}.`);
}

function renderPlayerCard(player) {
  const status = requestStatus(player.id);
  const popular = regionSportsMap[player.region].includes(player.sport);
  const buttonClass = status === "Confirmed" ? "success" : status === "Requested" ? "pending" : "primary";
  const buttonIcon = status === "Confirmed" ? "check-circle-2" : status === "Requested" ? "clock-3" : "send";
  return `
    <article class="player-card">
      <div class="card-top">
        <div class="identity">
          <div class="avatar">${initials(player.name)}</div>
          <div>
            <h3>${player.name}</h3>
            <p>${player.sport} | ${player.locality}, ${player.region}</p>
          </div>
        </div>
        <div class="score">${player.rating}<span>rating</span></div>
      </div>
      <div class="metrics">
        <div class="metric"><small>Distance</small><b>${player.distanceKm} km</b></div>
        <div class="metric"><small>Skill</small><b>${player.skillLevel}</b></div>
        <div class="metric"><small>Fit score</small><b>${player.matchScore}</b></div>
      </div>
      <div class="rating-explain">
        <span style="width:${Math.min(100, player.rating)}%"></span>
        <b>Fair rating:</b> skill, win rate, peer feedback, and reliability are blended to reduce one-signal manipulation.
      </div>
      <div class="tag-row">
        <span class="tag green"><i data-lucide="calendar-check"></i>${player.availability}</span>
        <span class="tag blue"><i data-lucide="thumbs-up"></i>${player.peerFeedback}/5 feedback</span>
        <span class="tag amber"><i data-lucide="shield"></i>${player.reliability}% reliable</span>
        ${popular ? `<span class="tag primary"><i data-lucide="trending-up"></i>Regional priority</span>` : ""}
      </div>
      <button class="btn ${buttonClass}" type="button" onclick="cycleRequest(${player.id})"><i data-lucide="${buttonIcon}"></i>${status}</button>
    </article>
  `;
}

function renderGameCard(game) {
  const remaining = Math.max(0, game.slots - game.joined);
  return `
    <article class="game-card">
      <div class="card-top">
        <div class="identity">
          <div class="avatar">${game.sport.slice(0, 2).toUpperCase()}</div>
          <div>
            <h3>${game.sport} at ${game.venue}</h3>
            <p>${game.region} | ${game.time}</p>
          </div>
        </div>
        <span class="pill">${remaining} slots</span>
      </div>
      <div class="metrics">
        <div class="metric"><small>Joined</small><b>${game.joined}/${game.slots}</b></div>
        <div class="metric"><small>Priority</small><b>${regionSportsMap[game.region].includes(game.sport) ? "High" : "Normal"}</b></div>
        <div class="metric"><small>Status</small><b>${remaining ? "Open" : "Full"}</b></div>
      </div>
      <button class="btn ${remaining ? "primary" : ""}" type="button" onclick="joinGame(${game.id})" ${remaining ? "" : "disabled"}><i data-lucide="user-plus"></i>${remaining ? "Join Game" : "Game Full"}</button>
    </article>
  `;
}

function renderOptions() {
  const regionOptions = Object.keys(regionSportsMap).map(region => `<option>${region}</option>`).join("");
  ["regionSelect", "gameRegion", "profileRegion"].forEach(id => {
    $(id).innerHTML = regionOptions;
  });

  const sportOptions = allSports().map(sport => `<option>${sport}</option>`).join("");
  $("gameSport").innerHTML = sportOptions;
  $("profileSport").innerHTML = sportOptions;

  const orderedSports = ["Any", ...regionSportsMap[app.filters.region], ...allSports().filter(sport => !regionSportsMap[app.filters.region].includes(sport))];
  $("sportSelect").innerHTML = orderedSports.map(sport => `<option>${sport}</option>`).join("");
}

function syncControls() {
  $("searchInput").value = app.filters.query;
  $("regionSelect").value = app.filters.region;
  $("sportSelect").value = app.filters.sport;
  $("skillSelect").value = app.filters.skill;
  $("availabilitySelect").value = app.filters.availability;
  $("distanceRange").value = app.filters.distance;
  $("distanceLabel").textContent = `${app.filters.distance} km`;
  $("profileName").value = app.profile.name;
  $("profileEmail").value = app.profile.email;
  $("profileRegion").value = app.profile.region;
  $("profileSport").value = app.profile.sport;
  $("profileSkill").value = app.profile.skill;
  $("profileAvailability").value = app.profile.availability;
}

function renderPrioritySports() {
  $("prioritySports").innerHTML = regionSportsMap[app.filters.region]
    .map(sport => `<span class="chip primary"><i data-lucide="star"></i>${sport}</span>`)
    .join("");
}

function renderDiscover() {
  const result = matches();
  $("resultCount").textContent = `${result.length} results${app.lastSearch ? ` | searched ${app.lastSearch}` : ""}`;
  $("marketInsight").textContent = `${app.filters.region} priority sports: ${marketSummary()}`;
  $("recentSearches").innerHTML = app.recentSearches.length
    ? app.recentSearches.map(item => `<button class="chip" type="button" onclick="quickSearch('${item.replace(/'/g, "\\'")}')"><i data-lucide="history"></i>${item}</button>`).join("")
    : `<span class="tag">No recent searches yet</span>`;
  $("playerResults").innerHTML = result.length ? result.map(renderPlayerCard).join("") : `<div class="empty">No players match this search. Increase distance, switch locality, or choose Any sport.</div>`;
}

function renderDashboard() {
  const result = matches();
  const confirmed = Object.values(app.requests).filter(status => status === "Confirmed").length;
  const avg = result.length ? (result.reduce((sum, player) => sum + player.rating, 0) / result.length).toFixed(1) : "0";
  $("statNearby").textContent = result.length;
  $("statRating").textContent = avg;
  $("statRequests").textContent = Object.keys(app.requests).length;
  $("statConfirmed").textContent = confirmed;
  $("statUpdated").textContent = app.lastRefresh || "Live demo";
  $("dashboardMatches").innerHTML = result.slice(0, 3).map(renderPlayerCard).join("") || `<div class="empty">No matches yet.</div>`;
  $("dashboardGames").innerHTML = app.games.slice(0, 4).map(renderGameCard).join("");
}

function renderGames() {
  $("gameCount").textContent = `${app.games.length} listed`;
  $("gameList").innerHTML = app.games.map(renderGameCard).join("");
}

function renderRequests() {
  const players = seedPlayers
    .map(player => ({ ...player, rating: rating(player), status: requestStatus(player.id) }))
    .filter(player => player.status !== "Request");

  $("requestTable").innerHTML = players.length ? players.map(player => `
    <tr>
      <td>${player.name}</td>
      <td>${player.sport}</td>
      <td>${player.locality}, ${player.region}</td>
      <td>${player.rating}</td>
      <td><span class="tag ${player.status === "Confirmed" ? "green" : "blue"}">${player.status}</span></td>
      <td><button class="btn ${player.status === "Confirmed" ? "success" : "pending"}" type="button" onclick="cycleRequest(${player.id})">Update</button></td>
    </tr>
  `).join("") : `<tr><td colspan="6" class="empty">No requests yet. Send one from Discover.</td></tr>`;
}

function renderProfile() {
  $("profilePreview").innerHTML = `
    <article class="player-card">
      <div class="card-top">
        <div class="identity">
          <div class="avatar">${initials(app.profile.name)}</div>
          <div>
            <h3>${app.profile.name}</h3>
            <p>${app.profile.sport} | ${app.profile.region}</p>
          </div>
        </div>
        <span class="tag ${app.user ? "green" : "amber"}">${app.user ? "Signed in" : "Guest mode"}</span>
      </div>
      <div class="metrics">
        <div class="metric"><small>Email</small><b>${app.profile.email || "Not set"}</b></div>
        <div class="metric"><small>Skill</small><b>${app.profile.skill}</b></div>
        <div class="metric"><small>Availability</small><b>${app.profile.availability}</b></div>
      </div>
    </article>
  `;
}

function renderAuth() {
  $("loginBtn").hidden = Boolean(app.user);
  $("userChip").hidden = !app.user;
  $("logoutBtn").style.display = app.user ? "inline-flex" : "none";
  if (app.user) $("userChipName").textContent = app.user.name;
}

function render() {
  renderOptions();
  syncControls();
  renderPrioritySports();
  renderDashboard();
  renderDiscover();
  renderGames();
  renderRequests();
  renderProfile();
  renderAuth();
  lucide.createIcons();
}

function setPage(page) {
  app.activePage = page;
  document.querySelectorAll(".page").forEach(item => item.classList.toggle("active", item.id === page));
  document.querySelectorAll("[data-page]").forEach(item => item.classList.toggle("active", item.dataset.page === page));
  $("pageTitle").textContent = pageCopy[page][0];
  $("pageSubtitle").textContent = pageCopy[page][1];
  saveState();
  render();
}

function readFilters() {
  app.filters = {
    query: $("searchInput").value.trim(),
    region: $("regionSelect").value,
    sport: $("sportSelect").value,
    skill: $("skillSelect").value,
    availability: $("availabilitySelect").value,
    distance: Number($("distanceRange").value)
  };
  app.lastSearch = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const summary = [app.filters.query || "nearby", app.filters.region, app.filters.sport, `${app.filters.distance}km`].join(" / ");
  app.recentSearches = [summary, ...(app.recentSearches || []).filter(item => item !== summary)].slice(0, 5);
  saveState();
}

function runSearch() {
  readFilters();
  setPage("discover");
  $("playerResults").scrollIntoView({ behavior: "smooth", block: "start" });
  showToast(`${matches().length} player matches found.`);
}

function refreshApp() {
  seedPlayers.forEach((player, index) => {
    const drift = ((Date.now() / 1000 + index * 7) % 5) - 2;
    player.distanceKm = Number(Math.max(1.1, player.distanceKm + drift * 0.03).toFixed(1));
  });
  app.lastRefresh = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  saveState();
  render();
  showToast(`Live player pool refreshed at ${app.lastRefresh}.`);
}

function quickSearch(summary) {
  const [query, region, sport, distance] = summary.split(" / ");
  $("searchInput").value = query === "nearby" ? "" : query;
  $("regionSelect").value = region || app.filters.region;
  app.filters.region = $("regionSelect").value;
  renderOptions();
  $("sportSelect").value = sport || "Any";
  $("distanceRange").value = Number((distance || "10km").replace("km", "")) || 10;
  runSearch();
}

function openAuth() {
  $("authModal").classList.add("show");
  $("authModal").setAttribute("aria-hidden", "false");
  $("authEmail").value = app.user?.email || app.profile.email || "";
  $("authName").value = app.user?.name || app.profile.name || "";
  $("authEmail").focus();
  lucide.createIcons();
}

function closeAuth() {
  $("authModal").classList.remove("show");
  $("authModal").setAttribute("aria-hidden", "true");
}

function setUser(user) {
  app.user = user;
  app.profile.name = user.name;
  app.profile.email = user.email;
  saveState();
  closeAuth();
  render();
  showToast(`Signed in as ${user.name}.`);
}

function signInEmail() {
  const email = $("authEmail").value.trim();
  const name = $("authName").value.trim() || email.split("@")[0] || "Player";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showToast("Enter a valid email address.");
    return;
  }
  setUser({ name, email, provider: email.endsWith("@gmail.com") ? "Gmail" : "Email" });
}

function signInGmail() {
  setUser({ name: "Gmail Player", email: "player@gmail.com", provider: "Gmail demo" });
}

function signInProvider(provider, domain) {
  const fallbackName = `${provider} Player`;
  setUser({ name: fallbackName, email: `player@${domain}`, provider: `${provider} demo` });
}

function logout() {
  app.user = null;
  saveState();
  closeAuth();
  render();
  showToast("Signed out.");
}

function saveProfile(event) {
  event.preventDefault();
  if (!requireSignIn("Sign in before saving your profile.")) return;
  app.profile = {
    name: $("profileName").value.trim() || app.user.name,
    email: $("profileEmail").value.trim() || app.user.email,
    region: $("profileRegion").value,
    sport: $("profileSport").value,
    skill: $("profileSkill").value,
    availability: $("profileAvailability").value
  };
  app.user.name = app.profile.name;
  app.user.email = app.profile.email;
  saveState();
  render();
  showToast("Profile saved.");
}

function createGame(event) {
  event.preventDefault();
  if (!requireSignIn("Sign in before publishing a game.")) return;
  const venue = $("gameVenue").value.trim();
  if (!venue) {
    showToast("Add a venue or locality for the game.");
    return;
  }
  app.games.unshift({
    id: Date.now(),
    sport: $("gameSport").value,
    region: $("gameRegion").value,
    venue,
    time: $("gameTime").value,
    slots: Number($("gameSlots").value),
    joined: 0
  });
  $("gameForm").reset();
  saveState();
  render();
  showToast("Game published.");
}

function showToast(message) {
  $("toastText").textContent = message;
  $("toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("toast").classList.remove("show"), 2600);
  lucide.createIcons();
}

function bindEvents() {
  document.querySelectorAll("[data-page]").forEach(button => button.addEventListener("click", () => setPage(button.dataset.page)));
  document.querySelectorAll("[data-page-jump]").forEach(button => button.addEventListener("click", () => setPage(button.dataset.pageJump)));
  $("findBtn").addEventListener("click", runSearch);
  $("applyFiltersBtn").addEventListener("click", runSearch);
  $("refreshBtn").addEventListener("click", refreshApp);
  $("searchInput").addEventListener("keydown", event => { if (event.key === "Enter") runSearch(); });
  $("distanceRange").addEventListener("input", () => { $("distanceLabel").textContent = `${$("distanceRange").value} km`; });
  $("regionSelect").addEventListener("change", () => {
    app.filters.region = $("regionSelect").value;
    app.filters.sport = "Any";
    saveState();
    render();
  });
  $("loginBtn").addEventListener("click", openAuth);
  $("userChip").addEventListener("click", openAuth);
  $("closeAuthBtn").addEventListener("click", closeAuth);
  $("emailLoginBtn").addEventListener("click", signInEmail);
  $("gmailBtn").addEventListener("click", signInGmail);
  document.querySelectorAll("[data-provider]").forEach(button => {
    button.addEventListener("click", () => signInProvider(button.dataset.provider, button.dataset.domain));
  });
  $("logoutBtn").addEventListener("click", logout);
  $("authModal").addEventListener("click", event => { if (event.target === $("authModal")) closeAuth(); });
  $("profileForm").addEventListener("submit", saveProfile);
  $("gameForm").addEventListener("submit", createGame);
  $("clearDataBtn").addEventListener("click", () => {
    localStorage.removeItem(storageKey);
    Object.assign(app, structuredClone(defaultState));
    render();
    setPage("dashboard");
    showToast("Demo data reset.");
  });
}

bindEvents();
render();
setPage(app.activePage);
