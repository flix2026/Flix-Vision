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

const SOURCES = {
    vidsrc(id, type, s, e) {
        if (type === 'movie') return `https://vidsrc.xyz/embed/movie/${id}`;
        return `https://vidsrc.xyz/embed/tv/${id}/${s}-${e}`;
    },
    vidsrc2(id, type, s, e) {
        if (type === 'movie') return `https://vidsrc.to/embed/movie/${id}`;
        return `https://vidsrc.to/embed/tv/${id}/${s}/${e}`;
    },
    vidsrc3(id, type, s, e) {
        if (type === 'movie') return `https://vidsrc.me/embed/movie?tmdb=${id}`;
        return `https://vidsrc.me/embed/tv?tmdb=${id}&season=${s}&episode=${e}`;
    },
    smashy(id, type, s, e) {
        if (type === 'movie') return `https://embed.smashystream.com/playere.php?tmdb=${id}`;
        return `https://embed.smashystream.com/playere.php?tmdb=${id}&season=${s}&episode=${e}`;
    },
    autoembed(id, type, s, e) {
        if (type === 'movie') return `https://autoembed.co/movie/tmdb/${id}`;
        return `https://autoembed.co/tv/tmdb/${id}-${s}-${e}`;
    },
    multiembed(id, type, s, e) {
        if (type === 'movie') return `https://multiembed.mov/?video_id=${id}&tmdb=1`;
        return `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${s}&e=${e}`;
    },
    moflix(id, type, s, e) {
        if (type === 'movie') return `https://moflix-stream.xyz/movie/tmdb/${id}`;
        return `https://moflix-stream.xyz/tv/tmdb/${id}/${s}/${e}`;
    }
};

async function playMovie(id, type, title, totalSeasons = 1) {
    currentMediaId = id;
    currentMediaType = type === 'anime' ? 'tv' : type;
    currentSeasonsCount = totalSeasons;

    DOM.playerTitle.textContent = title;
    DOM.playerModal.classList.add('active');

    if (currentMediaType === 'tv') {
        DOM.tvSelectors.style.display = 'flex';
        populateSeasons(totalSeasons);
        await updateEpisodesList(1);
    } else {
        DOM.tvSelectors.style.display = 'none';
        updateVideoSrc();
    }
}

DOM.closePlayer.addEventListener('click', () => {
    DOM.playerModal.classList.remove('active');
    DOM.iframe.src = '';
});

DOM.serverSelect.addEventListener('change', updateVideoSrc);
DOM.adblockToggle.addEventListener('change', updateVideoSrc);

DOM.seasonSelect.addEventListener('change', async (e) => {
    await updateEpisodesList(e.target.value);
    updateVideoSrc();
});

DOM.epSelect.addEventListener('change', updateVideoSrc);

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
    setTimeout(() => { DOM.iframe.src = url; }, 50);
}

function populateSeasons(count) {
    DOM.seasonSelect.innerHTML = '';
    for (let i = 1; i <= count; i++) {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = i;
        DOM.seasonSelect.appendChild(opt);
    }
}

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
            updateVideoSrc();
        }
    } catch (e) {
        console.error('Failed fetching episodes', e);
        DOM.epSelect.innerHTML = '<option value="1">1</option>';
        DOM.epSelect.disabled = false;
        updateVideoSrc();
    }
}
