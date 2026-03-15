// Video Player Core Logic
const DOM = {
    playerModal: document.getElementById('player-modal'),
    closePlayer: document.getElementById('close-player'),
    iframe: document.getElementById('video-iframe'),
    serverSelect: document.getElementById('server-dropdown'),
    adblockToggle: document.getElementById('adblock-toggle'),
    tvSelectors: document.getElementById('tv-selector'),
    seasonSelect: document.getElementById('season-dropdown'),
    epSelect: document.getElementById('episode-dropdown'),
    playerTitle: document.getElementById('player-title')
};

let currentMediaId = null;
let currentMediaType = null;
let currentSeasonsCount = 0;

/**
 * Sources directly translated from FlixVision APK source code
 */
const SOURCES = {
    vidsrc(id, type, s, e) {
        if (type === 'movie') return `https://vidsrc.xyz/embed/movie/${id}`;
        return `https://vidsrc.xyz/embed/tv/${id}/${s}-${e}`;
    },
    smashy(id, type, s, e) {
        if (type === 'movie') return `https://embed.smashystream.com/playere.php?tmdb=${id}`;
        return `https://embed.smashystream.com/playere.php?tmdb=${id}&season=${s}&episode=${e}`;
    },
    autoembed(id, type, s, e) {
        // Autoembed only reliably does movies in the basic reverse engineer we found, 
        // but supports TV like this usually:
        if (type === 'movie') return `https://autoembed.co/movie/tmdb/${id}`;
        return `https://autoembed.co/tv/tmdb/${id}-${s}-${e}`;
    }
};

/**
 * Open Player Modal
 */
async function playMovie(id, type, title, totalSeasons = 1) {
    currentMediaId = id;
    currentMediaType = type === 'anime' ? 'tv' : type; // Treat Anime as TV
    currentSeasonsCount = totalSeasons;

    DOM.playerTitle.textContent = title;
    DOM.playerModal.classList.add('active');

    // Handle TV logic
    if (currentMediaType === 'tv') {
        DOM.tvSelectors.style.display = 'flex';
        populateSeasons(totalSeasons);
        await updateEpisodesList(1); // Default strictly to season 1
    } else {
        DOM.tvSelectors.style.display = 'none';
        updateVideoSrc(); // Default movie playback
    }
}

/**
 * Handle closing the player
 */
DOM.closePlayer.addEventListener('click', () => {
    DOM.playerModal.classList.remove('active');
    DOM.iframe.src = ''; // Stop video playback
});

DOM.serverSelect.addEventListener('change', updateVideoSrc);
DOM.adblockToggle.addEventListener('change', updateVideoSrc);

DOM.seasonSelect.addEventListener('change', async (e) => {
    const s = e.target.value;
    await updateEpisodesList(s);
    updateVideoSrc();
});

DOM.epSelect.addEventListener('change', updateVideoSrc);

/**
 * Update the IFrame SRC based on active states
 */
function updateVideoSrc() {
    const server = DOM.serverSelect.value;
    const season = DOM.seasonSelect.value;
    const episode = DOM.epSelect.value;
    const isAdblockEnabled = DOM.adblockToggle.checked;

    if (isAdblockEnabled) {
        DOM.iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation');
    } else {
        DOM.iframe.removeAttribute('sandbox');
    }

    const url = SOURCES[server](currentMediaId, currentMediaType, season, episode);
    // Add small delay to ensure attribute is applied before src change
    setTimeout(() => {
        DOM.iframe.src = url;
    }, 50);
}

/**
 * Build Season dropdown
 */
function populateSeasons(count) {
    DOM.seasonSelect.innerHTML = '';
    // TVDB/TMDB seasons usually start at 1, sometimes 0 for specials. We'll start at 1.
    for (let i = 1; i <= count; i++) {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = i;
        DOM.seasonSelect.appendChild(opt);
    }
}

/**
 * Build Episode dropdown from TMDB data
 */
async function updateEpisodesList(seasonNum) {
    DOM.epSelect.innerHTML = '<option>Loading...</option>';
    DOM.epSelect.disabled = true;

    try {
        const data = await getTVSeasonDetails(currentMediaId, seasonNum);
        if (data && data.episodes) {
            DOM.epSelect.innerHTML = '';
            data.episodes.forEach((ep) => {
                const opt = document.createElement('option');
                opt.value = ep.episode_number;
                opt.textContent = `${ep.episode_number} - ${ep.name || `Episode ${ep.episode_number}`}`;
                DOM.epSelect.appendChild(opt);
            });
            DOM.epSelect.disabled = false;
            updateVideoSrc(); // Play the first episode when list loads
        }
    } catch (e) {
        console.error('Failed fetching episodes', e);
        DOM.epSelect.innerHTML = '<option value="1">1</option>';
        DOM.epSelect.disabled = false;
        updateVideoSrc();
    }
}
