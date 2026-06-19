const API_BASE = 'https://api.themoviedb.org/3';
const IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
const BACKDROP_BASE = 'https://image.tmdb.org/t/p/original';

// DOM Elements
const apikeyModal = document.getElementById('apikey-modal');
const apiKeyInput = document.getElementById('api-key-input');
const saveKeyBtn = document.getElementById('save-key-btn');
const apiError = document.getElementById('api-error');

const hero = document.getElementById('hero');
const heroTitle = document.getElementById('hero-title');
const heroOverview = document.getElementById('hero-overview');
const heroBackdrop = document.getElementById('hero-backdrop');
const heroWatchBtn = document.getElementById('hero-watch-btn');
const heroInfoBtn = document.getElementById('hero-info-btn');

const sectionsContainer = document.getElementById('sections-container');
const searchInput = document.getElementById('search-input');

const detailsModal = document.getElementById('details-modal');
const modalBody = document.getElementById('modal-body');
const closeModals = document.querySelectorAll('.close-modal');

const playerModal = document.getElementById('player-modal');
const iframeContainer = document.getElementById('iframe-container');
const serverSelection = document.getElementById('server-selection');
const serverBtns = document.querySelectorAll('.server-btn');

// State
let API_KEY = localStorage.getItem('tmdb_api_key') || '';
let currentHeroMovie = null;

// Initialize
function init() {
    if (!API_KEY) {
        apikeyModal.classList.add('active');
    } else {
        apikeyModal.classList.remove('active');
        loadHomeData();
    }
}

// Event Listeners
saveKeyBtn.addEventListener('click', () => {
    const key = apiKeyInput.value.trim();
    if (key.length > 20) {
        // Simple validation check
        validateApiKey(key);
    } else {
        apiError.textContent = "Please enter a valid API key.";
    }
});

async function validateApiKey(key) {
    try {
        saveKeyBtn.textContent = "Verifying...";
        const res = await fetch(`${API_BASE}/configuration?api_key=${key}`);
        if (res.ok) {
            API_KEY = key;
            localStorage.setItem('tmdb_api_key', key);
            apikeyModal.classList.remove('active');
            loadHomeData();
        } else {
            throw new Error("Invalid API Key");
        }
    } catch (err) {
        apiError.textContent = "Invalid API Key. Please try again.";
        saveKeyBtn.textContent = "Start Exploring";
    }
}

// Navbar scroll effect
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// Close Modals
closeModals.forEach(btn => {
    btn.addEventListener('click', () => {
        detailsModal.classList.remove('active');
        playerModal.classList.remove('active');
        // Stop video playback by clearing iframe
        iframeContainer.innerHTML = '';
    });
});

// Close modal on outside click
window.addEventListener('click', (e) => {
    if (e.target === detailsModal) {
        detailsModal.classList.remove('active');
    }
    if (e.target === playerModal) {
        playerModal.classList.remove('active');
        iframeContainer.innerHTML = '';
    }
});

// Search
let searchTimeout;
searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const query = e.target.value.trim();
    
    if (query.length > 2) {
        searchTimeout = setTimeout(() => {
            searchMovies(query);
        }, 500);
    } else if (query.length === 0) {
        loadHomeData();
    }
});

// API Calls
async function fetchFromTMDB(endpoint) {
    const url = `${API_BASE}${endpoint}${endpoint.includes('?') ? '&' : '?'}api_key=${API_KEY}`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        return data.results || data;
    } catch (error) {
        console.error("Error fetching data:", error);
        return [];
    }
}

async function loadHomeData() {
    sectionsContainer.innerHTML = '<div class="loader">Loading...</div>';
    hero.style.display = 'flex';
    
    const trending = await fetchFromTMDB('/trending/movie/day');
    const topRated = await fetchFromTMDB('/movie/top_rated');
    const upcoming = await fetchFromTMDB('/movie/upcoming');
    const action = await fetchFromTMDB('/discover/movie?with_genres=28');
    
    // Set Hero
    if (trending.length > 0) {
        // Pick a random trending movie
        const randomIdx = Math.floor(Math.random() * Math.min(5, trending.length));
        setHeroMovie(trending[randomIdx]);
    }

    // Build Sections
    sectionsContainer.innerHTML = '';
    createSection('Trending Now', trending);
    createSection('Top Rated', topRated);
    createSection('Upcoming', upcoming);
    createSection('Action Thrillers', action);
}

async function searchMovies(query) {
    hero.style.display = 'none'; // Hide hero during search
    sectionsContainer.innerHTML = '<div class="loader">Searching...</div>';
    
    const results = await fetchFromTMDB(`/search/movie?query=${encodeURIComponent(query)}`);
    
    sectionsContainer.innerHTML = `
        <h2 class="section-title">Search Results for "${query}"</h2>
        <div class="movie-grid">
            ${results.map(movie => createMovieCardHTML(movie)).join('')}
        </div>
    `;
    
    attachMovieCardListeners();
}

function setHeroMovie(movie) {
    currentHeroMovie = movie;
    heroTitle.textContent = movie.title || movie.name;
    heroOverview.textContent = movie.overview;
    heroBackdrop.style.backgroundImage = `url(${BACKDROP_BASE}${movie.backdrop_path})`;
    
    heroWatchBtn.onclick = () => openPlayer(movie.id);
    heroInfoBtn.onclick = () => showMovieDetails(movie.id);
}

function createSection(title, movies) {
    if (!movies || movies.length === 0) return;
    
    const sectionHtml = `
        <div class="movie-row">
            <h2 class="section-title">${title}</h2>
            <div class="movie-slider">
                ${movies.map(movie => createMovieCardHTML(movie)).join('')}
            </div>
        </div>
    `;
    
    sectionsContainer.insertAdjacentHTML('beforeend', sectionHtml);
    attachMovieCardListeners();
}

function createMovieCardHTML(movie) {
    if (!movie.poster_path) return ''; // Skip if no poster
    return `
        <div class="movie-card" data-id="${movie.id}">
            <img src="${IMAGE_BASE}${movie.poster_path}" alt="${movie.title}" class="movie-poster" loading="lazy">
            <div class="movie-info">
                <div class="movie-title">${movie.title || movie.name}</div>
                <div class="movie-rating">
                    <i class="fa-solid fa-star"></i> ${movie.vote_average ? movie.vote_average.toFixed(1) : 'NR'}
                </div>
            </div>
        </div>
    `;
}

function attachMovieCardListeners() {
    const cards = document.querySelectorAll('.movie-card:not(.listened)');
    cards.forEach(card => {
        card.classList.add('listened');
        card.addEventListener('click', () => {
            const movieId = card.getAttribute('data-id');
            showMovieDetails(movieId);
        });
    });
}

async function showMovieDetails(id) {
    modalBody.innerHTML = '<div class="loader" style="padding: 50px; text-align: center;">Loading details...</div>';
    detailsModal.classList.add('active');
    
    const movie = await fetchFromTMDB(`/movie/${id}?append_to_response=videos,credits`);
    
    // Find trailer if exists
    const videos = movie.videos?.results || [];
    const trailer = videos.find(v => v.type === 'Trailer' && v.site === 'YouTube');
    
    const genres = movie.genres?.map(g => `<span class="genre-tag">${g.name}</span>`).join('') || '';
    
    modalBody.innerHTML = `
        <div class="details-layout">
            <div class="details-backdrop" style="background-image: url(${BACKDROP_BASE}${movie.backdrop_path || movie.poster_path})"></div>
            <div class="details-info-container">
                <img src="${IMAGE_BASE}${movie.poster_path}" class="details-poster" alt="${movie.title}">
                <div class="details-text">
                    <h2 class="details-title">${movie.title}</h2>
                    <div class="details-meta">
                        <span class="meta-rating"><i class="fa-solid fa-star"></i> ${movie.vote_average?.toFixed(1)}</span>
                        <span>${movie.release_date?.substring(0,4) || 'N/A'}</span>
                        <span>${movie.runtime ? movie.runtime + ' min' : ''}</span>
                    </div>
                    <div class="genres">${genres}</div>
                    <p class="details-overview">${movie.overview}</p>
                    <div style="display: flex; gap: 15px; margin-top: 20px;">
                        <button class="btn btn-primary" onclick="openPlayer(${movie.id})">
                            <i class="fa-solid fa-play"></i> Watch Movie
                        </button>
                        ${trailer ? `
                        <button class="btn btn-secondary" onclick="openTrailer('${trailer.key}')">
                            <i class="fa-brands fa-youtube"></i> Trailer
                        </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        </div>
    `;
}

let currentPlayerMovieId = null;

function getIframeUrl(server, movieId) {
    switch (server) {
        case 'vidsrc.me':
            return `https://vidsrc.me/embed/movie?tmdb=${movieId}`;
        case 'vidsrc.to':
            return `https://vidsrc.to/embed/movie/${movieId}`;
        case 'vidlink':
            return `https://vidlink.pro/movie/${movieId}`;
        case 'superembed':
            return `https://multiembed.mov/?video_id=${movieId}&tmdb=1`;
        default:
            return `https://vidsrc.me/embed/movie?tmdb=${movieId}`;
    }
}

if (serverBtns) {
    serverBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (!currentPlayerMovieId) return;
            
            // Update active class
            serverBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            
            // Change iframe src
            const server = e.target.getAttribute('data-server');
            iframeContainer.innerHTML = `<iframe src="${getIframeUrl(server, currentPlayerMovieId)}" allowfullscreen sandbox="allow-scripts allow-same-origin allow-forms"></iframe>`;
        });
    });
}

function openPlayer(movieId) {
    currentPlayerMovieId = movieId;
    detailsModal.classList.remove('active');
    playerModal.classList.add('active');
    if (serverSelection) serverSelection.style.display = 'flex';
    
    // Reset to default server
    if (serverBtns && serverBtns.length > 0) {
        serverBtns.forEach(b => b.classList.remove('active'));
        serverBtns[0].classList.add('active');
        const defaultServer = serverBtns[0].getAttribute('data-server');
        iframeContainer.innerHTML = `<iframe src="${getIframeUrl(defaultServer, movieId)}" allowfullscreen sandbox="allow-scripts allow-same-origin allow-forms"></iframe>`;
    } else {
        iframeContainer.innerHTML = `<iframe src="https://vidsrc.me/embed/movie?tmdb=${movieId}" allowfullscreen sandbox="allow-scripts allow-same-origin allow-forms"></iframe>`;
    }
}

function openTrailer(youtubeKey) {
    currentPlayerMovieId = null;
    detailsModal.classList.remove('active');
    playerModal.classList.add('active');
    if (serverSelection) serverSelection.style.display = 'none';
    iframeContainer.innerHTML = `<iframe src="https://www.youtube.com/embed/${youtubeKey}?autoplay=1" allow="autoplay; encrypted-media" allowfullscreen sandbox="allow-scripts allow-same-origin allow-presentation"></iframe>`;
}

// Start
init();
