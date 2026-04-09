const API_KEY = '2f3cb5763db1117fcba3948632f8aad9';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const IMG_BASE_ORIGINAL = 'https://image.tmdb.org/t/p/original';
const FALLBACK_IMG = 'https://via.placeholder.com/500x750/18181c/ffffff?text=No+Poster';

async function fetchTMDB(endpoint, params = {}) {
    const url = new URL(`${BASE_URL}${endpoint}`);
    url.searchParams.append('api_key', API_KEY);
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

async function fetchDetails(type, id) {
    if (type === 'anime') type = 'tv';
    return await fetchTMDB(`/${type}/${id}`);
}

async function fetchFullDetails(type, id) {
    if (type === 'anime') type = 'tv';
    return await fetchTMDB(`/${type}/${id}`, {
        append_to_response: 'credits,recommendations,watch/providers,content_ratings,release_dates'
    });
}

async function getTrending(page = 1) {
    return await fetchTMDB('/trending/all/day', { page });
}

async function getMovies(page = 1) {
    return await fetchTMDB('/movie/popular', { page });
}

async function getTVShows(page = 1) {
    return await fetchTMDB('/tv/popular', { page });
}

async function getTopRatedMovies(page = 1) {
    return await fetchTMDB('/movie/top_rated', { page });
}

async function getTopRatedTV(page = 1) {
    return await fetchTMDB('/tv/top_rated', { page });
}

async function getUpcoming(page = 1) {
    return await fetchTMDB('/movie/upcoming', { page });
}

async function getAiringToday(page = 1) {
    return await fetchTMDB('/tv/airing_today', { page });
}

async function getAnime(page = 1) {
    return await fetchTMDB('/discover/tv', {
        page,
        with_genres: '16',
        with_original_language: 'ja',
        sort_by: 'popularity.desc'
    });
}

async function getInTheaters(page = 1) {
    return await fetchTMDB('/movie/now_playing', { page });
}

async function getGenres(type = 'movie') {
    return await fetchTMDB(`/genre/${type}/list`);
}

async function discoverContent(type, params = {}) {
    return await fetchTMDB(`/discover/${type}`, params);
}

async function getTVSeasonDetails(tvId, seasonNumber) {
    return await fetchTMDB(`/tv/${tvId}/season/${seasonNumber}`);
}

async function getVideos(type, id) {
    if (type === 'anime') type = 'tv';
    return await fetchTMDB(`/${type}/${id}/videos`);
}

async function searchContent(query, page = 1) {
    return await fetchTMDB('/search/multi', { query, page });
}

async function getPersonCredits(personId) {
    return await fetchTMDB(`/person/${personId}/combined_credits`);
}

function formatDate(dateString) {
    if (!dateString) return 'Unknown';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}
