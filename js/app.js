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
    sectionTitle: document.getElementById('section-title'),

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
    detailsProviders: document.getElementById('details-providers'),
    detailsProvidersList: document.getElementById('details-providers-list'),
    detailsCastSection: document.getElementById('details-cast-section'),
    detailsCast: document.getElementById('details-cast'),
    detailsRecsSection: document.getElementById('details-recs-section'),
    detailsRecs: document.getElementById('details-recs'),

    // Trailer Modal
    trailerModal: document.getElementById('trailer-modal'),
    trailerIframe: document.getElementById('trailer-iframe'),
    closeTrailer: document.getElementById('close-trailer'),
    trailerBackdrop: document.getElementById('trailer-backdrop'),

    // Mobile nav
    hamburger: document.getElementById('hamburger-btn'),
    navLinks: document.getElementById('nav-links'),
};

const TAB_TITLES = {
    home: 'Trending Now',
    movies: 'Popular Movies',
    tv: 'Popular TV Shows',
    anime: 'Popular Anime',
    theaters: 'In Theaters',
    top_rated: 'Top Rated',
    upcoming: 'Upcoming Movies',
    airing: 'Airing Today',
    search: 'Search Results'
};

let currentTab = 'home';
let currentPage = 1;
let isFetching = false;
let currentHeroItem = null;
let currentDetailItem = null;

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

function setupEventListeners() {
    UI.hamburger.addEventListener('click', () => {
        const isOpen = UI.navLinks.classList.toggle('open');
        if (isOpen) {
            UI.navLinks.style.top = document.querySelector('.navbar').getBoundingClientRect().height + 'px';
        }
    });

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

    UI.closeDetails.addEventListener('click', closeDetailsModal);
    UI.detailsBackdrop.addEventListener('click', closeDetailsModal);
    UI.closeTrailer.addEventListener('click', closeTrailerModal);
    UI.trailerBackdrop.addEventListener('click', closeTrailerModal);

    UI.heroPlay.addEventListener('click', () => { if (currentHeroItem) openDetails(currentHeroItem); });
    UI.heroInfo.addEventListener('click', () => { if (currentHeroItem) openDetails(currentHeroItem); });

    UI.detailsPlayBtn.addEventListener('click', () => {
        if (!currentDetailItem) return;
        const type = currentDetailItem.media_type || (currentTab === 'anime' ? 'anime' : (currentDetailItem.name ? 'tv' : 'movie'));
        const seasonCount = currentDetailItem.number_of_seasons || 1;
        closeDetailsModal();
        playMovie(currentDetailItem.id, type, currentDetailItem.title || currentDetailItem.name, seasonCount);
    });

    UI.detailsTrailerBtn.addEventListener('click', () => {
        if (currentDetailItem && currentDetailItem._trailerKey) {
            openTrailerModal(currentDetailItem._trailerKey);
        }
    });

    window.addEventListener('scroll', () => {
        if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) loadMore();
    });

    window.addEventListener('scroll', () => {
        const nav = document.querySelector('.navbar');
        nav.classList.toggle('scrolled', window.scrollY > 50);
    });

    [UI.filterGenre, UI.filterYear, UI.filterSort].forEach(el => {
        el.addEventListener('change', () => {
            currentPage = 1;
            UI.grid.innerHTML = '';
            loadContent(true);
        });
    });

    UI.filterColumns.addEventListener('change', applyMobileColumns);
}

async function switchTab(tabId) {
    currentTab = tabId;
    currentPage = 1;
    UI.grid.innerHTML = '';
    UI.sectionTitle.textContent = TAB_TITLES[tabId] || '';

    UI.filterGenre.value = '';
    UI.filterYear.value = '';
    UI.filterSort.value = 'popularity.desc';

    if (['movies', 'tv', 'anime'].includes(tabId)) {
        UI.contentFilters.style.display = 'flex';
        UI.filterGenre.style.display = '';
        UI.filterYear.style.display = '';
        await populateGenres(tabId);
    } else {
        UI.contentFilters.style.display = 'none';
        UI.filterGenre.style.display = 'none';
        UI.filterYear.style.display = 'none';
    }

    UI.tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tabId));
    await loadContent(true);
}

async function populateGenres(tabId) {
    const type = tabId === 'tv' || tabId === 'anime' ? 'tv' : 'movie';
    const data = await getGenres(type);
    UI.filterGenre.innerHTML = '<option value="">All Genres</option>';
    if (data && data.genres && data.genres.length > 0) {
        data.genres.forEach(g => {
            const opt = document.createElement('option');
            opt.value = g.id;
            opt.textContent = g.name;
            UI.filterGenre.appendChild(opt);
        });
        UI.filterGenre.style.display = '';
    } else {
        UI.filterGenre.style.display = 'none';
    }
}

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
            let sortBy = fSort;
            if (sortBy === 'release_date.desc' || sortBy === 'release_date.asc') {
                sortBy = type === 'movie'
                    ? sortBy.replace('release_date', 'primary_release_date')
                    : sortBy.replace('release_date', 'first_air_date');
            }
            const params = { page: currentPage, sort_by: sortBy };
            if (sortBy.startsWith('vote_average')) params['vote_count.gte'] = 100;
            if (fGenre) {
                params.with_genres = currentTab === 'anime' ? `16,${fGenre}` : fGenre;
            } else if (currentTab === 'anime') {
                params.with_genres = '16';
            }
            if (currentTab === 'anime') params.with_original_language = 'ja';
            if (fYear) {
                if (type === 'movie') params.primary_release_year = fYear;
                else params.first_air_date_year = fYear;
            }
            data = await discoverContent(type, params);
        } else {
            switch (currentTab) {
                case 'home':      data = await getTrending(currentPage); break;
                case 'movies':    data = await getMovies(currentPage); break;
                case 'tv':        data = await getTVShows(currentPage); break;
                case 'anime':     data = await getAnime(currentPage); break;
                case 'theaters':  data = await getInTheaters(currentPage); break;
                case 'top_rated': data = await getTopRatedMovies(currentPage); break;
                case 'upcoming':  data = await getUpcoming(currentPage); break;
                case 'airing':    data = await getAiringToday(currentPage); break;
            }
        }

        if (data && data.results) {
            if (isNewTab && data.results.length > 0) updateHero(data.results[0]);
            renderGrid(data.results, isNewTab ? 1 : 0);
        }
    } catch (e) {
        console.error('Failed loading content segment', e);
    }

    isFetching = false;
    UI.loader.style.display = 'none';
}

async function searchAndRenderType(query) {
    currentTab = 'search';
    currentPage = 1;
    UI.grid.innerHTML = '';
    UI.sectionTitle.textContent = TAB_TITLES.search;
    const data = await searchContent(query, currentPage);
    if (data && data.results) {
        if (data.results.length > 0) updateHero(data.results[0]);
        renderGrid(data.results, 1);
    }
}

function loadMore() {
    if (currentTab === 'search') return;
    currentPage++;
    loadContent(false);
}

function updateHero(item) {
    currentHeroItem = item;
    UI.heroTitle.textContent = item.title || item.name;
    UI.heroDesc.textContent = item.overview || 'No overview available.';
    UI.heroBanner.style.backgroundImage = `url(${item.backdrop_path ? IMG_BASE_ORIGINAL + item.backdrop_path : FALLBACK_IMG})`;
    UI.heroTitle.classList.remove('skeleton-text');
    UI.heroDesc.classList.remove('skeleton-text');
    UI.heroPlay.disabled = false;
    UI.heroInfo.disabled = false;
}

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

async function openDetails(item) {
    let type = item.media_type;
    if (!type) {
        if (currentTab === 'movies' || currentTab === 'theaters' || currentTab === 'top_rated' || currentTab === 'upcoming') type = 'movie';
        else if (currentTab === 'tv' || currentTab === 'anime' || currentTab === 'airing') type = 'tv';
        else type = item.title ? 'movie' : 'tv';
    }

    const [fullDetails, videosData] = await Promise.all([
        fetchFullDetails(type, item.id),
        getVideos(type, item.id)
    ]);
    if (!fullDetails) return;

    const trailer = videosData && videosData.results
        ? (videosData.results.find(v => v.site === 'YouTube' && v.type === 'Trailer') ||
           videosData.results.find(v => v.site === 'YouTube'))
        : null;

    fullDetails._trailerKey = trailer ? trailer.key : null;
    fullDetails._type = type;
    currentDetailItem = fullDetails;

    const title = fullDetails.title || fullDetails.name;
    const bgImage = fullDetails.backdrop_path ? `${IMG_BASE_ORIGINAL}${fullDetails.backdrop_path}` : FALLBACK_IMG;
    const rating = fullDetails.vote_average ? fullDetails.vote_average.toFixed(1) : 'N/A';
    const runtime = fullDetails.runtime ? `${fullDetails.runtime} min`
        : (fullDetails.episode_run_time && fullDetails.episode_run_time[0] ? `${fullDetails.episode_run_time[0]} min` : '');
    const genres = (fullDetails.genres || []).map(g => g.name).join(', ');
    const year = (fullDetails.release_date || fullDetails.first_air_date || '').split('-')[0] || '';

    // Content rating
    let certif = '';
    if (type === 'movie' && fullDetails.release_dates && fullDetails.release_dates.results) {
        const us = fullDetails.release_dates.results.find(r => r.iso_3166_1 === 'US');
        if (us && us.release_dates && us.release_dates[0]) certif = us.release_dates[0].certification;
    } else if (type === 'tv' && fullDetails.content_ratings && fullDetails.content_ratings.results) {
        const us = fullDetails.content_ratings.results.find(r => r.iso_3166_1 === 'US');
        if (us) certif = us.rating;
    }

    UI.detailsTitle.textContent = title;
    UI.detailsHero.style.backgroundImage = `url(${bgImage})`;
    UI.detailsMeta.innerHTML = `
        <span class="rating"><i class="fa-solid fa-star"></i> ${rating}</span>
        <span>${year}</span>
        ${runtime ? `<span>${runtime}</span>` : ''}
        ${certif ? `<span class="certif-badge">${certif}</span>` : ''}
        <span>${genres}</span>
    `;
    UI.detailsOverview.textContent = fullDetails.overview || 'No synopsis available.';
    UI.detailsTrailerBtn.style.display = fullDetails._trailerKey ? 'inline-flex' : 'none';

    // Watch Providers
    const providers = fullDetails['watch/providers'];
    const providerResults = providers && providers.results && providers.results.US;
    const flatrate = providerResults && (providerResults.flatrate || providerResults.free || []);
    if (flatrate && flatrate.length > 0) {
        UI.detailsProvidersList.innerHTML = flatrate.map(p =>
            `<img src="${IMG_BASE_URL}${p.logo_path}" alt="${p.provider_name}" title="${p.provider_name}" class="provider-logo">`
        ).join('');
        UI.detailsProviders.style.display = '';
    } else {
        UI.detailsProviders.style.display = 'none';
    }

    // Cast
    const cast = fullDetails.credits && fullDetails.credits.cast ? fullDetails.credits.cast.slice(0, 10) : [];
    if (cast.length > 0) {
        UI.detailsCast.innerHTML = cast.map(c => `
            <div class="cast-card">
                <img src="${c.profile_path ? IMG_BASE_URL + c.profile_path : 'https://via.placeholder.com/80x80/18181c/ffffff?text=?'}" alt="${c.name}">
                <span>${c.name}</span>
            </div>
        `).join('');
        UI.detailsCastSection.style.display = '';
    } else {
        UI.detailsCastSection.style.display = 'none';
    }

    // Recommendations
    const recs = fullDetails.recommendations && fullDetails.recommendations.results
        ? fullDetails.recommendations.results.filter(r => r.poster_path).slice(0, 8)
        : [];
    if (recs.length > 0) {
        UI.detailsRecs.innerHTML = recs.map(r => `
            <div class="rec-card" data-id="${r.id}" data-type="${r.media_type || type}">
                <img src="${IMG_BASE_URL}${r.poster_path}" alt="${r.title || r.name}" loading="lazy">
                <span>${r.title || r.name}</span>
            </div>
        `).join('');
        UI.detailsRecs.querySelectorAll('.rec-card').forEach(card => {
            card.addEventListener('click', () => {
                const recItem = recs.find(r => r.id == card.dataset.id);
                if (recItem) openDetails(recItem);
            });
        });
        UI.detailsRecsSection.style.display = '';
    } else {
        UI.detailsRecsSection.style.display = 'none';
    }

    UI.detailsModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeDetailsModal() {
    UI.detailsModal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

function openTrailerModal(youtubeKey) {
    UI.trailerIframe.src = `https://www.youtube.com/embed/${youtubeKey}?autoplay=1`;
    UI.trailerModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeTrailerModal() {
    UI.trailerModal.classList.remove('active');
    UI.trailerIframe.src = '';
    document.body.style.overflow = 'auto';
}

function applyMobileColumns() {
    const cols = UI.filterColumns ? UI.filterColumns.value : '2';
    UI.grid.style.setProperty('--mobile-cols', cols);
}
