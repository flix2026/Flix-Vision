// ═══════════════════════════════════════════════════════════════════════════
// GLOBAL AD BLOCKER — runs immediately, before anything else
// Prevents ANY new tab / popup from opening from this page or its iframes.
// ═══════════════════════════════════════════════════════════════════════════
(function () {
    'use strict';

    // 1. Kill window.open on the parent page entirely.
    window.open = function () { return null; };

    // Lock it so nothing can restore the real one.
    Object.defineProperty(window, 'open', {
        get: function () { return function () { return null; }; },
        set: function () {},
        configurable: false
    });

    // 2. Block top-frame location hijacking from cross-origin iframes.
    try {
        Object.defineProperty(window, 'location', {
            get: function () { return window.location; },
            set: function (val) {
                if (typeof val === 'string' && val.startsWith('#')) {
                    window.location.hash = val;
                }
            },
            configurable: false
        });
    } catch (_) {}

    // 3. Blur killer — if a tab somehow opens, snap focus back instantly.
    let _adBlockActive = false;
    window.__adBlockEnable  = function () { _adBlockActive = true;  };
    window.__adBlockDisable = function () { _adBlockActive = false; };

    window.addEventListener('blur', function () {
        if (!_adBlockActive) return;
        window.focus();
    });

    // 4. Remove ad iframes / scripts injected into the parent document.
    const _parentObserver = new MutationObserver(function (mutations) {
        if (!_adBlockActive) return;
        mutations.forEach(function (m) {
            m.addedNodes.forEach(function (node) {
                if (node.nodeType !== 1) return;
                if (node.tagName === 'IFRAME' && node.id !== 'video-iframe') {
                    const src = node.src || '';
                    if (isAdHref(src) || src === '' || src === 'about:blank') {
                        node.remove();
                    }
                }
                if (node.tagName === 'SCRIPT' && isAdHref(node.src)) {
                    node.remove();
                }
            });
        });
    });
    _parentObserver.observe(document.documentElement, { childList: true, subtree: true });

    function isAdHref(href) {
        if (!href) return false;
        const adPatterns = [
            /jerkmate/, /exoclick/, /trafficjunky/, /trafficstars/,
            /tsyndicate/, /juicyads/, /plugrush/, /adnium/,
            /dtiserv/, /adspyglass/, /ero-advertising/,
            /popads/, /popcash/, /propellerads/, /hilltopads/,
            /adsterra/, /richpush/, /evadav/, /clickaine/,
            /clickadu/, /zeropark/, /voluum/, /voluumtrk/,
            /go\.oc\.to/, /out\/signup/, /prelander/,
            /tracking/, /redirect/, /clk\.php/, /go\.php/,
        ];
        return adPatterns.some(function (p) { return p.test(href); });
    }

    window.__isAdHref = isAdHref;
})();

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
    playerTitle: document.getElementById('player-title'),
    upnextToast: document.getElementById('upnext-toast'),
    upnextTitle: document.getElementById('upnext-title'),
    upnextBar:   document.getElementById('upnext-bar'),
    upnextPlayNow: document.getElementById('upnext-playnow'),
    upnextCancel:  document.getElementById('upnext-cancel'),
};

let currentMediaId = null;
let currentMediaType = null;
let currentSeasonsCount = 0;
let episodeEndTimer = null;      // setTimeout handle for auto-advance
let currentEpisodeRuntime = 0;   // runtime in minutes from TMDB

const SOURCES = {
    vidsrc(id, type, s, e) {
        if (type === 'movie') return `https://vidsrc.xyz/embed/movie/${id}?autoplay=1`;
        return `https://vidsrc.xyz/embed/tv/${id}/${s}-${e}?autoplay=1`;
    },
    vidsrc2(id, type, s, e) {
        if (type === 'movie') return `https://vidsrc.to/embed/movie/${id}?autoplay=1`;
        return `https://vidsrc.to/embed/tv/${id}/${s}/${e}?autoplay=1`;
    },
    vidsrc3(id, type, s, e) {
        if (type === 'movie') return `https://vidsrc.me/embed/movie?tmdb=${id}&autoplay=1`;
        return `https://vidsrc.me/embed/tv?tmdb=${id}&season=${s}&episode=${e}&autoplay=1`;
    },
    smashy(id, type, s, e) {
        if (type === 'movie') return `https://embed.smashystream.com/playere.php?tmdb=${id}&autoPlay=1`;
        return `https://embed.smashystream.com/playere.php?tmdb=${id}&season=${s}&episode=${e}&autoPlay=1`;
    },
    autoembed(id, type, s, e) {
        if (type === 'movie') return `https://autoembed.co/movie/tmdb/${id}?autoplay=1`;
        return `https://autoembed.co/tv/tmdb/${id}-${s}-${e}?autoplay=1`;
    },
    multiembed(id, type, s, e) {
        if (type === 'movie') return `https://multiembed.mov/?video_id=${id}&tmdb=1&autoplay=1`;
        return `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${s}&e=${e}&autoplay=1`;
    },
    moflix(id, type, s, e) {
        if (type === 'movie') return `https://moflix-stream.xyz/movie/tmdb/${id}?autoplay=1`;
        return `https://moflix-stream.xyz/tv/tmdb/${id}/${s}/${e}?autoplay=1`;
    }
};

async function playMovie(id, type, title, totalSeasons = 1) {
    currentMediaId = id;
    currentMediaType = type === 'anime' ? 'tv' : type;
    currentSeasonsCount = totalSeasons;

    DOM.playerTitle.textContent = title;
    DOM.playerModal.classList.add('active');
    window.__adBlockEnable();

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
    clearEpisodeTimer();
    window.__adBlockDisable();
    // Track play stop with duration
    if (typeof AUTH !== 'undefined') AUTH.trackPlayStop();
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

    DOM.iframe.removeAttribute('sandbox');

    const url = SOURCES[server](currentMediaId, currentMediaType, season, episode);

    DOM.iframe.onload = null;
    DOM.iframe.src = url;

    // Cancel any pending auto-advance from a previous episode
    clearEpisodeTimer();

    if (DOM.adblockToggle.checked) {
        DOM.iframe.onload = () => injectAdBlocker(DOM.iframe);
    }

    // Schedule auto-advance to next episode for TV shows
    if (currentMediaType === 'tv') {
        scheduleAutoAdvance();
    }
}

// ─── Auto-advance to next episode ────────────────────────────────────────────

// How many seconds before the episode runtime ends to show the "Up Next" toast
const UPNEXT_WARN_SECS = 30;

function clearEpisodeTimer() {
    if (episodeEndTimer) {
        clearTimeout(episodeEndTimer);
        episodeEndTimer = null;
    }
    hideUpNext();
}

function hideUpNext() {
    DOM.upnextToast.classList.remove('visible');
    // Reset the bar animation so it's clean next time
    DOM.upnextBar.style.animation = 'none';
}

async function scheduleAutoAdvance() {
    clearEpisodeTimer();

    const season  = parseInt(DOM.seasonSelect.value);
    const episode = parseInt(DOM.epSelect.value);

    // Don't schedule if we're already on the last episode of the last season
    const totalEpsInSeason = DOM.epSelect.options.length;
    const isLastEp     = episode >= totalEpsInSeason;
    const isLastSeason = season >= currentSeasonsCount;
    if (isLastEp && isLastSeason) return;

    // Fetch episode runtime from TMDB
    let runtimeMins = 45; // sensible default
    try {
        const seasonData = await getTVSeasonDetails(currentMediaId, season);
        if (seasonData && seasonData.episodes) {
            const epData = seasonData.episodes.find(e => e.episode_number === episode);
            if (epData && epData.runtime && epData.runtime > 0) {
                runtimeMins = epData.runtime;
            }
        }
    } catch (_) {}

    currentEpisodeRuntime = runtimeMins;

    // Fire the toast UPNEXT_WARN_SECS before the runtime ends
    const toastDelayMs = Math.max((runtimeMins * 60 - UPNEXT_WARN_SECS) * 1000, 5000);

    episodeEndTimer = setTimeout(async () => {
        await showUpNext(season, episode);
    }, toastDelayMs);
}

async function showUpNext(season, episode) {
    const totalEpsInSeason = DOM.epSelect.options.length;
    let nextLabel = '';

    if (episode < totalEpsInSeason) {
        const nextEpNum = episode + 1;
        // Get the next episode name from the dropdown option text
        const nextOption = DOM.epSelect.options[nextEpNum - 1];
        nextLabel = nextOption ? `S${season} E${nextOption.text}` : `S${season} E${nextEpNum}`;
    } else {
        nextLabel = `Season ${season + 1}, Episode 1`;
    }

    DOM.upnextTitle.textContent = nextLabel;

    // Trigger the countdown bar over UPNEXT_WARN_SECS seconds
    DOM.upnextBar.style.animation = 'none';
    // Force reflow so the animation restarts cleanly
    void DOM.upnextBar.offsetWidth;
    DOM.upnextBar.style.animation = `upnext-countdown ${UPNEXT_WARN_SECS}s linear forwards`;

    DOM.upnextToast.classList.add('visible');

    // Auto-advance when the countdown expires
    episodeEndTimer = setTimeout(() => {
        hideUpNext();
        advanceToNextEpisode();
    }, UPNEXT_WARN_SECS * 1000);
}

async function advanceToNextEpisode() {
    clearEpisodeTimer();

    const currentSeason = parseInt(DOM.seasonSelect.value);
    const currentEp     = parseInt(DOM.epSelect.value);
    const totalEps      = DOM.epSelect.options.length;

    if (currentEp < totalEps) {
        DOM.epSelect.value = currentEp + 1;
        updateVideoSrc();
    } else if (currentSeason < currentSeasonsCount) {
        DOM.seasonSelect.value = currentSeason + 1;
        await updateEpisodesList(currentSeason + 1);
        // updateEpisodesList calls updateVideoSrc which schedules the next advance
    }
}

// Up Next button handlers
DOM.upnextPlayNow.addEventListener('click', () => {
    clearEpisodeTimer();
    advanceToNextEpisode();
});

DOM.upnextCancel.addEventListener('click', () => {
    clearEpisodeTimer();
});

/**
 * Injects ad-blocking overrides into the iframe's window after it loads.
 * No sandbox attribute is used — the iframe appears completely normal to the embed.
 *
 * Covers:
 *  - window.open()              → new tab pop-up ads
 *  - window.top navigation      → top-frame redirect ads
 *  - setTimeout/setInterval     → delayed pop-up launchers
 *  - Full-screen ad overlays    → transparent <a>/<div> elements covering the player
 *  - MutationObserver           → overlays injected after initial load
 *  - Click-time interception    → catches window.open fired on user click
 */
function injectAdBlocker(iframe) {
    try {
        const iwin = iframe.contentWindow;
        const idoc = iframe.contentDocument;
        if (!iwin || !idoc) return;

        // ── 1. Block window.open ──────────────────────────────────────────────
        iwin.open = function () { return null; };

        // ── 2. Block top-frame navigation ────────────────────────────────────
        try {
            Object.defineProperty(iwin, 'top', { get: () => iwin, configurable: true });
        } catch (_) {}

        // ── 3. Wrap setTimeout / setInterval to kill delayed window.open ─────
        const _setTimeout = iwin.setTimeout;
        iwin.setTimeout = function (fn, delay, ...args) {
            const wrapped = typeof fn === 'string' ? fn : function () {
                try { fn(...args); } catch (_) {}
            };
            return _setTimeout.call(iwin, wrapped, delay);
        };

        const _setInterval = iwin.setInterval;
        iwin.setInterval = function (fn, delay, ...args) {
            const wrapped = typeof fn === 'string' ? fn : function () {
                try { fn(...args); } catch (_) {}
            };
            return _setInterval.call(iwin, wrapped, delay);
        };

        // ── 4. Intercept all clicks inside the iframe ─────────────────────────
        // Re-null window.open right before any click fires so nothing can
        // cache a reference to the real one and call it on interaction.
        idoc.addEventListener('click', (e) => {
            iwin.open = function () { return null; };

            const target = e.target.closest('a');
            if (target) {
                const href = target.getAttribute('href') || '';
                // Kill any link that's clearly an ad redirect (blank href, javascript:, or external non-player domain)
                if (
                    href === '' ||
                    href === '#' ||
                    href.startsWith('javascript') ||
                    isAdLink(target, iwin.location.hostname)
                ) {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                }
            }
        }, true); // capture phase — fires before the embed's own handlers

        // ── 5. Remove full-screen overlay elements ────────────────────────────
        // These are transparent <a> or <div> elements stretched to cover the
        // entire player, designed to intercept the user's click-to-play.
        function removeOverlays(root) {
            if (!root) return;
            const candidates = root.querySelectorAll('a, div, span, iframe');
            candidates.forEach(el => {
                if (el === root) return;
                try {
                    const style   = iwin.getComputedStyle(el);
                    const rect    = el.getBoundingClientRect();
                    const pos     = style.position;
                    const zIndex  = parseInt(style.zIndex) || 0;
                    const isFixed = pos === 'fixed' || pos === 'absolute';
                    const isBig   = rect.width > iwin.innerWidth * 0.5 &&
                                    rect.height > iwin.innerHeight * 0.5;

                    // A large, absolutely/fixed-positioned element with a high z-index
                    // that links somewhere external is almost certainly an ad overlay.
                    if (isFixed && isBig && zIndex > 0) {
                        const href = el.getAttribute('href') || '';
                        const hasExternalLink = href && !href.startsWith('#') && !href.startsWith('javascript');
                        const hasClickHandler = el.onclick || el.getAttribute('onclick');

                        if (hasExternalLink || hasClickHandler) {
                            el.remove();
                            return;
                        }

                        // Also nuke overlays with a target="_blank" that cover the player
                        if (el.getAttribute('target') === '_blank') {
                            el.remove();
                            return;
                        }
                    }

                    // Catch invisible full-cover overlays with no content (pure click traps)
                    if (isFixed && isBig && el.childElementCount === 0 &&
                        (el.textContent.trim() === '') &&
                        (style.opacity === '0' || style.backgroundColor === 'transparent' || style.pointerEvents === 'all')) {
                        el.remove();
                    }
                } catch (_) {}
            });
        }

        // Run once immediately after load
        removeOverlays(idoc.body);

        // ── 6. Watch for overlays injected after load (MutationObserver) ──────
        const observer = new MutationObserver(() => {
            iwin.open = function () { return null; }; // keep nulling it
            removeOverlays(idoc.body);
        });

        observer.observe(idoc.body, { childList: true, subtree: true });

        // Stop observing when the iframe navigates away or is cleared
        iframe.addEventListener('load', () => observer.disconnect(), { once: true });

    } catch (e) {
        console.warn('[AdBlock] Could not inject into iframe (cross-origin):', e.message);
    }
}

/**
 * Returns true if a link points to a known ad / tracking domain.
 * Delegates to the global __isAdHref defined in the IIFE at the top.
 */
function isAdLink(anchor, playerHostname) {
    try {
        const href = anchor.href;
        if (!href) return false;
        const linkHost = new URL(href).hostname;
        if (linkHost === playerHostname) return false;
        return window.__isAdHref(href);
    } catch (_) {
        return false;
    }
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
