const API_KEY = '2f3cb5763db1117fcba3948632f8aad9'; // Extracted from FlixVision APK
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const IMG_BASE_ORIGINAL = 'https://image.tmdb.org/t/p/original';

// Fallback image if poster is missing
const FALLBACK_IMG = 'https://via.placeholder.com/500x750/18181c/ffffff?text=No+Poster';

/**
 * Helper to make API calls to TMDB
 */
async function fetchTMDB(endpoint, params = {}) {
    const url = new URL(`${BASE_URL}${endpoint}`);
    url.searchParams.append('api_key', API_KEY);

    // Add extra params (like page, query, etc)
    for (const [key, value] of Object.entries(params)) {
        url.searchParams.append(key, value);
    }

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`TMDB API Error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching data:', error);
        return null;
    }
}

/**
 * Fetch specific media details
 */
async function fetchDetails(type, id) {
    if (type === 'anime') type = 'tv'; // TMDB stores anime as TV shows
    return await fetchTMDB(`/${type}/${id}`);
}

/**
 * Fetch Home/Trending content
 */
async function getTrending(page = 1) {
    return await fetchTMDB('/trending/all/day', { page });
}

/**
 * Fetch Popular Movies
 */
async function getMovies(page = 1) {
    return await fetchTMDB('/movie/popular', { page });
}

/**
 * Fetch Popular TV Shows
 */
async function getTVShows(page = 1) {
    return await fetchTMDB('/tv/popular', { page });
}

/**
 * Fetch Anime 
 * Since TMDB doesn't have an exclusive native 'anime' endpoint,
 * we filter TV shows by the animation genre (16) and original language (ja)
 */
async function getAnime(page = 1) {
    return await fetchTMDB('/discover/tv', {
        page,
        with_genres: '16',
        with_original_language: 'ja',
        sort_by: 'popularity.desc'
    });
}

/**
 * Fetch In Theaters
 */
async function getInTheaters(page = 1) {
    return await fetchTMDB('/movie/now_playing', { page });
}

/**
 * Fetch Genres
 */
async function getGenres(type = 'movie') {
    return await fetchTMDB(`/genre/${type}/list`);
}

/**
 * Discover Content with Filters
 */
async function discoverContent(type, params = {}) {
    return await fetchTMDB(`/discover/${type}`, params);
}

/**
 * Fetch TV Show Seasons details (to get episode count for dropdowns)
 */
async function getTVSeasonDetails(tvId, seasonNumber) {
    return await fetchTMDB(`/tv/${tvId}/season/${seasonNumber}`);
}

/**
 * Search content
 */
async function searchContent(query, page = 1) {
    return await fetchTMDB('/search/multi', { query, page });
}

/**
 * Format date utility
 */
function formatDate(dateString) {
    if (!dateString) return 'Unknown';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}
