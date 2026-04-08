// Core Application Logic
const UI = {
    tabs: document.querySelectorAll('.nav-btn'),
    grid: document.getElementById('media-grid'),
    heroBanner: document.getElementById('hero-banner'),
    heroTitle: document.getElementById('hero-title'),
    heroDesc: document.getElementById('hero-desc'),
    heroPlay: document.getElementById('hero-play'),
    heroInfo: document.getElementById('hero-info'),
    searchInput: document.getElementById('search-input'),
    loader: document.getElementById('infinite-loader'),

    // Filters
    contentFilters: document.getElementById('content-filters'),
    filterGenre: document.getElementById('filter-genre'),
    filterYear: document.getElementById('filter-year'),
    filterSort: document.getElementById('filter-sort'),
    filterColumns: document.getElementById('filter-columns'),

    // Details Modal
    detailsModal: document.getElementById('details-modal'),
    detailsHero: document.getElementById('details-hero'),
    detailsTitle: document.getElementById('details-title'),
    detailsMeta: document.getElementById('details-meta'),
    detailsOverview: document.getElementById('details-overview'),
    detailsPlayBtn: document.getElementById('details-play-btn'),
    detailsTrailerBtn: document.getElementById('details-trailer-btn'),
    closeDetails: document.getElementById('close-details'),
    detailsBackdrop: document.getElementById('details-backdrop'),

    // Trailer Modal
    trailerModal: document.getElementById('trailer-modal'),
    trailerIframe: document.getElementById('trailer-iframe'),
    closeTrailer: document.getElementById('close-trailer'),
    trailerBackdrop: document.getElementById('trailer-backdrop'),

    // Mobile nav
    hamburger: document.getElementById('hamburger-btn'),
    navLinks: document.getElementById('nav-links'),
};

let currentTab = 'home';
let currentPage = 1;
let isFetching = false;
let currentHeroItem = null;
let currentDetailItem = null;

/**
 * Initialization
 */
document.addEventListener('DOMContentLoaded', () => {
    populateYears();
    switchTab('home');
    setupEventListeners();
    applyMobileColumns();
});

function populateYears() {
    const currentYear = new Date().getFullYear();
    for (let y = currentYear; y >= 1900; y--) {
        const opt = document.createElement('option');
        opt.value = y;
        opt.textContent = y;
        UI.filterYear.appendChild(opt);
    }
}

/**
 * Event Listeners
 */
function setupEventListeners() {
    // Hamburger (mobile nav accordion)
    UI.hamburger.addEventListener('click', () => {
        UI.navLinks.classList.toggle('open');
    });

    // Close mobile nav when a tab is clicked
    UI.tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            UI.navLinks.classList.remove('open');
            const targetTab = e.target.dataset.tab;
            if (currentTab !== targetTab || UI.searchInput.value.trim() !== '') {
                UI.searchInput.value = '';
                switchTab(targetTab);
            }
        });
    });

    // Search (Debounce)
    let hideTimer;
    UI.searchInput.addEventListener('input', (e) => {
        clearTimeout(hideTimer);
        const query = e.target.value.trim();
        if (query.length > 2) {
            hideTimer = setTimeout(() => {
                UI.tabs.forEach(t => t.classList.remove('active'));
                searchAndRenderType(query);
            }, 500);
        } else if (query.length === 0) {
            switchTab(currentTab);
        }
    });

    // Modals
    UI.closeDetails.addEventListener('click', closeDetailsModal);
    UI.detailsBackdrop.addEventListener('click', closeDetailsModal);

    // Trailer modal
    UI.closeTrailer.addEventListener('click', closeTrailerModal);
    UI.trailerBackdrop.addEventListener('click', closeTrailerModal);

    // Hero buttons
    UI.heroPlay.addEventListener('click', () => {
        if (currentHeroItem) openDetails(currentHeroItem);
    });
    UI.heroInfo.addEventListener('click', () => {
        if (currentHeroItem) openDetails(currentHeroItem);
    });

    // Detail Play Button
    UI.detailsPlayBtn.addEventListener('click', () => {
        if (!currentDetailItem) return;
        const type = currentDetailItem.media_type || (currentTab === 'anime' ? 'anime' : (currentDetailItem.name ? 'tv' : 'movie'));
        const seasonCount = currentDetailItem.number_of_seasons || 1;
        closeDetailsModal();
        playMovie(currentDetailItem.id, type, currentDetailItem.title || currentDetailItem.name, seasonCount);
    });

    // Trailer Button
    UI.detailsTrailerBtn.addEventListener('click', () => {
        if (currentDetailItem && currentDetailItem._trailerKey) {
            openTrailerModal(currentDetailItem._trailerKey);
        }
    });

    // Infinite Scroll
    window.addEventListener('scroll', () => {
        if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
            loadMore();
        }
    });

    // Navbar scroll effect
    window.addEventListener('scroll', () => {
        const nav = document.querySelector('.navbar');
        if (window.scrollY > 50) nav.classList.add('scrolled');
        else nav.classList.remove('scrolled');
    });

    // Filters
    [UI.filterGenre, UI.filterYear, UI.filterSort].forEach(el => {
        el.addEventListener('change', () => {
            currentPage = 1;
            UI.grid.innerHTML = '';
            loadContent(true);
        });
    });

    // Mobile columns picker
    UI.filterColumns.addEventListener('change', applyMobileColumns);
}

/**
 * Tab Management
 */
async function switchTab(tabId) {
    currentTab = tabId;
    currentPage = 1;
    UI.grid.innerHTML = '';

    // Reset filters
    UI.filterGenre.value = '';
    UI.filterYear.value = '';
    UI.filterSort.value = 'popularity.desc';

    // Show/hide filters (only for discoverable types)
    if (['movies', 'tv', 'anime'].includes(tabId)) {
        UI.contentFilters.style.display = 'flex';
        await populateGenres(tabId);
    } else {
        UI.contentFilters.style.display = 'none';
    }

    // Update active class
    UI.tabs.forEach(t => {
        if (t.dataset.tab === tabId) t.classList.add('active');
        else t.classList.remove('active');
    });

    await loadContent(true);
}

async function populateGenres(tabId) {
    const type = tabId === 'tv' || tabId === 'anime' ? 'tv' : 'movie';
    const data = await getGenres(type);

    // Keep 'All Genres' option
    UI.filterGenre.innerHTML = '<option value="">All Genres</option>';

    if (data && data.genres) {
        data.genres.forEach(g => {
            const opt = document.createElement('option');
            opt.value = g.id;
            opt.textContent = g.name;
            UI.filterGenre.appendChild(opt);
        });
    }
}

/**
 * Load Content based on active state
 */
async function loadContent(isNewTab = false) {
    if (isFetching) return;
    isFetching = true;
    UI.loader.style.display = 'flex';

    let data;
    try {
        const fGenre = UI.filterGenre.value;
        const fYear = UI.filterYear.value;
        const fSort = UI.filterSort.value;
        const isFiltering = fGenre !== '' || fYear !== '' || fSort !== 'popularity.desc';

        if (isFiltering && ['movies', 'tv', 'anime'].includes(currentTab)) {
            const type = (currentTab === 'tv' || currentTab === 'anime') ? 'tv' : 'movie';

            // Fix: map the unified sort key to the correct TMDB field per media type
            let sortBy = fSort;
            if (sortBy === 'release_date.desc' || sortBy === 'release_date.asc') {
                sortBy = type === 'movie'
                    ? sortBy.replace('release_date', 'primary_release_date')
                    : sortBy.replace('release_date', 'first_air_date');
            }

            const params = {
                page: currentPage,
                sort_by: sortBy,
            };

            if (fGenre) {
                params.with_genres = currentTab === 'anime' ? `16,${fGenre}` : fGenre;
            } else if (currentTab === 'anime') {
                params.with_genres = '16';
            }

            if (currentTab === 'anime') {
                params.with_original_language = 'ja';
            }

            if (fYear) {
                if (type === 'movie') params.primary_release_year = fYear;
                else params.first_air_date_year = fYear;
            }

            data = await discoverContent(type, params);
        } else {
            switch (currentTab) {
                case 'home': data = await getTrending(currentPage); break;
                case 'movies': data = await getMovies(currentPage); break;
                case 'tv': data = await getTVShows(currentPage); break;
                case 'anime': data = await getAnime(currentPage); break;
                case 'theaters': data = await getInTheaters(currentPage); break;
            }
        }

        if (data && data.results) {
            if (isNewTab && data.results.length > 0) {
                updateHero(data.results[0]);
            }
            renderGrid(data.results, isNewTab ? 1 : 0); // skip first item if home page new tab
        }
    } catch (e) {
        console.error("Failed loading content segment", e);
    }

    isFetching = false;
    UI.loader.style.display = 'none';
}

/**
 * Search Logic
 */
async function searchAndRenderType(query) {
    currentTab = 'search';
    currentPage = 1;
    UI.grid.innerHTML = '';

    const data = await searchContent(query, currentPage);
    if (data && data.results) {
        if (data.results.length > 0) updateHero(data.results[0]);
        renderGrid(data.results, 1);
    }
}

/**
 * Load Next Page
 */
function loadMore() {
    if (currentTab === 'search') return; // Disable pagination on search for simplicity for now
    currentPage++;
    loadContent(false);
}

/**
 * Update Hero Banner
 */
function updateHero(item) {
    currentHeroItem = item;
    const title = item.title || item.name;
    const desc = item.overview || "No overview available.";
    const bgImage = item.backdrop_path ? `${IMG_BASE_ORIGINAL}${item.backdrop_path}` : FALLBACK_IMG;

    UI.heroTitle.textContent = title;
    UI.heroDesc.textContent = desc;
    UI.heroBanner.style.backgroundImage = `url(${bgImage})`;

    UI.heroTitle.classList.remove('skeleton-text');
    UI.heroDesc.classList.remove('skeleton-text');
    UI.heroPlay.disabled = false;
    UI.heroInfo.disabled = false;
}

/**
 * Grid Rendering
 */
function renderGrid(items, startIndex = 0) {
    for (let i = startIndex; i < items.length; i++) {
        const item = items[i];
        if (!item.poster_path && !item.backdrop_path) continue;

        const title = item.title || item.name;
        const poster = item.poster_path ? `${IMG_BASE_URL}${item.poster_path}` : FALLBACK_IMG;
        const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';
        const year = (item.release_date || item.first_air_date || '').split('-')[0] || '';

        const card = document.createElement('div');
        card.className = 'media-card';
        card.innerHTML = `
            <img src="${poster}" alt="${title}" loading="lazy">
            <div class="card-rating"><i class="fa-solid fa-star"></i> ${rating}</div>
            <div class="card-overlay">
                <div class="card-title">${title}</div>
                <div class="card-meta">
                    <span>${year}</span>
                    <span class="rating"><i class="fa-solid fa-star"></i> ${rating}</span>
                </div>
            </div>
        `;

        card.addEventListener('click', () => openDetails(item));
        UI.grid.appendChild(card);
    }
}

/**
 * Open Details Modal
 */
async function openDetails(item) {
    const type = item.media_type || (item.title ? 'movie' : 'tv');

    const [fullDetails, videosData] = await Promise.all([
        fetchDetails(type, item.id),
        getVideos(type, item.id)
    ]);
    if (!fullDetails) return;

    // Find best trailer from videos
    const trailer = videosData && videosData.results
        ? (videosData.results.find(v => v.site === 'YouTube' && v.type === 'Trailer') ||
           videosData.results.find(v => v.site === 'YouTube'))
        : null;

    fullDetails._trailerKey = trailer ? trailer.key : null;
    currentDetailItem = fullDetails;

    const title = fullDetails.title || fullDetails.name;
    const bgImage = fullDetails.backdrop_path ? `${IMG_BASE_ORIGINAL}${fullDetails.backdrop_path}` : FALLBACK_IMG;
    const rating = fullDetails.vote_average ? fullDetails.vote_average.toFixed(1) : 'N/A';
    const runtime = fullDetails.runtime ? `${fullDetails.runtime} min` : (fullDetails.episode_run_time ? `${fullDetails.episode_run_time[0]} min` : '');
    const genres = (fullDetails.genres || []).map(g => g.name).join(', ');
    const year = (fullDetails.release_date || fullDetails.first_air_date || '').split('-')[0] || '';

    UI.detailsTitle.textContent = title;
    UI.detailsHero.style.backgroundImage = `url(${bgImage})`;

    UI.detailsMeta.innerHTML = `
        <span class="rating"><i class="fa-solid fa-star"></i> ${rating}</span>
        <span>${year}</span>
        ${runtime ? `<span>${runtime}</span>` : ''}
        <span>${genres}</span>
    `;

    UI.detailsOverview.textContent = fullDetails.overview || "No synopsis available.";

    // Show/hide trailer button
    if (fullDetails._trailerKey) {
        UI.detailsTrailerBtn.style.display = 'inline-flex';
    } else {
        UI.detailsTrailerBtn.style.display = 'none';
    }

    UI.detailsModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

/**
 * Close Details Modal
 */
function closeDetailsModal() {
    UI.detailsModal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

/**
 * Open Trailer Modal
 */
function openTrailerModal(youtubeKey) {
    UI.trailerIframe.src = `https://www.youtube.com/embed/${youtubeKey}?autoplay=1`;
    UI.trailerModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

/**
 * Close Trailer Modal
 */
function closeTrailerModal() {
    UI.trailerModal.classList.remove('active');
    UI.trailerIframe.src = '';
    document.body.style.overflow = 'auto';
}

/**
 * Apply mobile grid columns from picker
 */
function applyMobileColumns() {
    const cols = UI.filterColumns ? UI.filterColumns.value : '2';
    UI.grid.style.setProperty('--mobile-cols', cols);
}
