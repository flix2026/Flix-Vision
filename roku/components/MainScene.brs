' Flix Vision - MainScene.brs

function tabXPos(t as integer) as integer
    x = [20, 110, 205, 310, 395, 530, 650, 770]
    return x[t]
end function

function tabUW(t as integer) as integer
    w = [44, 56, 68, 44, 80, 70, 68, 84]
    return w[t]
end function

function tabUrl(t as integer, page as integer) as string
    base = "https://api.themoviedb.org/3"
    key  = "?api_key=2f3cb5763db1117fcba3948632f8aad9"
    p    = "&page=" + page.toStr()
    if t = 0 then return base + "/trending/all/day" + key + p
    if t = 1 then return base + "/movie/popular" + key + p
    if t = 2 then return base + "/tv/popular" + key + p
    if t = 3 then return base + "/discover/tv" + key + "&with_genres=16&with_original_language=ja&sort_by=popularity.desc" + p
    if t = 4 then return base + "/movie/now_playing" + key + p
    if t = 5 then return base + "/movie/top_rated" + key + p
    if t = 6 then return base + "/movie/upcoming" + key + p
    if t = 7 then return base + "/tv/airing_today" + key + p
    return base + "/trending/all/day" + key + p
end function

sub init()
    m.currentTab    = 0
    m.currentPage   = 1
    m.totalPages    = 1
    m.items         = CreateObject("roArray", 0, true)
    m.tabFocused    = false
    m.detailsOpen   = false
    m.playerOpen    = false
    m.selectedItem  = invalid
    m.trailerKey    = ""
    m.detailsFocus  = 0
    m.currentSeason = 1
    m.currentEp     = 1

    m.heroPoster      = m.top.findNode("heroPoster")
    m.heroTitle       = m.top.findNode("heroTitle")
    m.heroDesc        = m.top.findNode("heroDesc")
    m.grid            = m.top.findNode("grid")
    m.spinner         = m.top.findNode("spinner")
    m.tabUnderline    = m.top.findNode("tabUnderline")
    m.tabLabels       = CreateObject("roArray", 8, true)
    for i = 0 to 7
        m.tabLabels[i] = m.top.findNode("tab" + i.toStr())
    end for
    m.detailsBg       = m.top.findNode("detailsBg")
    m.detailsPoster   = m.top.findNode("detailsPoster")
    m.detailsTitle    = m.top.findNode("detailsTitle")
    m.detailsMeta     = m.top.findNode("detailsMeta")
    m.detailsOverview = m.top.findNode("detailsOverview")
    m.btnPlayBg       = m.top.findNode("btnPlayBg")
    m.btnPlayLbl      = m.top.findNode("btnPlayLbl")
    m.btnTrailerBg    = m.top.findNode("btnTrailerBg")
    m.btnTrailerLbl   = m.top.findNode("btnTrailerLbl")
    m.btnCloseBg      = m.top.findNode("btnCloseBg")
    m.btnCloseLbl     = m.top.findNode("btnCloseLbl")
    m.focusTrap       = m.top.findNode("focusTrap")

    m.grid.observeField("itemFocused",  "onGridFocus")
    m.grid.observeField("itemSelected", "onGridSelect")
    m.top.observeField("webPlayerClosed", "onWebPlayerClosed")

    loadTab(0)
end sub

sub loadTab(t as integer)
    m.currentTab  = t
    m.currentPage = 1
    m.totalPages  = 1
    m.items       = CreateObject("roArray", 0, true)
    m.spinner.visible = true
    refreshTabBar()
    m.grid.content = CreateObject("roSGNode", "ContentNode")
    doFetch("onTabResult", tabUrl(t, 1))
end sub

sub refreshTabBar()
    for i = 0 to 7
        if i = m.currentTab
            m.tabLabels[i].color = "0xFFFFFFFF"
        else if m.tabFocused
            m.tabLabels[i].color = "0xCCCCCCFF"
        else
            m.tabLabels[i].color = "0xA1A1AAFF"
        end if
    end for
    m.tabUnderline.translation = [tabXPos(m.currentTab), 331]
    m.tabUnderline.width = tabUW(m.currentTab)
end sub

sub doFetch(callback as string, url as string)
    t = CreateObject("roSGNode", "FetchTask")
    t.observeField("result", callback)
    t.url = url
    t.control = "RUN"
    if callback = "onTabResult"
        m.fetchTask = t
    else if callback = "onPageResult"
        m.pageTask = t
    else if callback = "onDetailResult"
        m.detailTask = t
    end if
end sub

sub onTabResult()
    m.spinner.visible = false
    data = parseJSON(m.fetchTask.result)
    if data = invalid then return
    if data.results = invalid then return
    if data.total_pages <> invalid then m.totalPages = data.total_pages
    m.items = data.results
    buildGrid()
    if m.items.count() > 0 then updateHero(m.items[0])
    if not m.tabFocused
        if not m.detailsOpen
            if not m.playerOpen
                m.grid.setFocus(true)
            end if
        end if
    end if
end sub

sub onPageResult()
    m.spinner.visible = false
    data = parseJSON(m.pageTask.result)
    if data = invalid then return
    if data.results = invalid then return
    for each item in data.results
        m.items.push(item)
    end for
    buildGrid()
end sub

sub buildGrid()
    content = CreateObject("roSGNode", "ContentNode")
    for each item in m.items
        node = CreateObject("roSGNode", "ContentNode")
        node.title = itemTitle(item)
        if item.poster_path <> invalid
            if item.poster_path <> ""
                node.hdPosterUrl = "https://image.tmdb.org/t/p/w342" + item.poster_path
                node.sdPosterUrl = "https://image.tmdb.org/t/p/w342" + item.poster_path
            end if
        end if
        content.appendChild(node)
    end for
    m.grid.content = content
end sub

sub updateHero(item as object)
    m.heroTitle.text = itemTitle(item)
    if item.overview <> invalid
        m.heroDesc.text = item.overview
    else
        m.heroDesc.text = ""
    end if
    if item.backdrop_path <> invalid
        if item.backdrop_path <> ""
            m.heroPoster.uri = "https://image.tmdb.org/t/p/w1280" + item.backdrop_path
            return
        end if
    end if
    if item.poster_path <> invalid
        if item.poster_path <> ""
            m.heroPoster.uri = "https://image.tmdb.org/t/p/w780" + item.poster_path
        end if
    end if
end sub

sub onGridFocus()
    idx = m.grid.itemFocused
    if idx < 0 then return
    if idx >= m.items.count() then return
    updateHero(m.items[idx])
    if idx >= m.items.count() - 8
        if m.currentPage < m.totalPages
            m.currentPage = m.currentPage + 1
            m.spinner.visible = true
            doFetch("onPageResult", tabUrl(m.currentTab, m.currentPage))
        end if
    end if
end sub

sub onGridSelect()
    idx = m.grid.itemSelected
    if idx < 0 then return
    if idx >= m.items.count() then return
    m.selectedItem = m.items[idx]
    m.spinner.visible = true
    mt = itemMediaType(m.selectedItem)
    id = m.selectedItem.id.toStr()
    doFetch("onDetailResult", "https://api.themoviedb.org/3/" + mt + "/" + id + "?api_key=2f3cb5763db1117fcba3948632f8aad9&append_to_response=videos")
end sub

sub onDetailResult()
    m.spinner.visible = false
    full = parseJSON(m.detailTask.result)
    if full = invalid
        showDetails(m.selectedItem)
        return
    end if
    m.selectedItem = full
    m.trailerKey = ""
    if full.videos <> invalid
        if full.videos.results <> invalid
            for each v in full.videos.results
                if m.trailerKey = ""
                    if v.site = "YouTube"
                        if v.type = "Trailer"
                            m.trailerKey = v.key
                        end if
                    end if
                end if
            end for
            if m.trailerKey = ""
                for each v in full.videos.results
                    if m.trailerKey = ""
                        if v.site = "YouTube"
                            m.trailerKey = v.key
                        end if
                    end if
                end for
            end if
        end if
    end if
    showDetails(m.selectedItem)
end sub

sub showDetails(item as object)
    m.detailsOpen  = true
    m.detailsFocus = 0
    m.detailsBg.visible       = true
    m.detailsPoster.visible   = true
    m.detailsTitle.visible    = true
    m.detailsMeta.visible     = true
    m.detailsOverview.visible = true
    m.btnPlayBg.visible       = true
    m.btnPlayLbl.visible      = true
    m.btnCloseBg.visible      = true
    m.btnCloseLbl.visible     = true
    m.detailsTitle.text = itemTitle(item)
    if item.overview <> invalid
        m.detailsOverview.text = item.overview
    else
        m.detailsOverview.text = "No overview available."
    end if
    year = ""
    if item.release_date <> invalid
        if len(item.release_date) >= 4
            year = left(item.release_date, 4)
        end if
    end if
    if year = ""
        if item.first_air_date <> invalid
            if len(item.first_air_date) >= 4
                year = left(item.first_air_date, 4)
            end if
        end if
    end if
    rating = "N/A"
    if item.vote_average <> invalid
        r = item.vote_average.toStr()
        if len(r) > 3 then r = left(r, 3)
        rating = r
    end if
    m.detailsMeta.text = year + "  |  " + rating
    if item.poster_path <> invalid
        if item.poster_path <> ""
            m.detailsPoster.uri = "https://image.tmdb.org/t/p/w342" + item.poster_path
        else
            m.detailsPoster.uri = ""
        end if
    else
        m.detailsPoster.uri = ""
    end if
    hasTrailer = (m.trailerKey <> "")
    m.btnTrailerBg.visible  = hasTrailer
    m.btnTrailerLbl.visible = hasTrailer
    highlightDetailBtns()
    m.focusTrap.setFocus(true)
end sub

sub hideDetails()
    m.detailsOpen             = false
    m.detailsBg.visible       = false
    m.detailsPoster.visible   = false
    m.detailsTitle.visible    = false
    m.detailsMeta.visible     = false
    m.detailsOverview.visible = false
    m.btnPlayBg.visible       = false
    m.btnPlayLbl.visible      = false
    m.btnTrailerBg.visible    = false
    m.btnTrailerLbl.visible   = false
    m.btnCloseBg.visible      = false
    m.btnCloseLbl.visible     = false
end sub

sub hideDetailsToGrid()
    hideDetails()
    m.grid.setFocus(true)
end sub

sub highlightDetailBtns()
    m.btnPlayBg.color    = "0x7a0000FF"
    m.btnTrailerBg.color = "0x333333FF"
    m.btnCloseBg.color   = "0x333333FF"
    if m.detailsFocus = 0
        m.btnPlayBg.color = "0xe50914FF"
    else if m.detailsFocus = 1
        if m.trailerKey <> ""
            m.btnTrailerBg.color = "0x666666FF"
        else
            m.btnCloseBg.color = "0x666666FF"
        end if
    else
        m.btnCloseBg.color = "0x666666FF"
    end if
end sub

' ── Web player via main thread roHtmlWidget ─────────────────

sub openWebPlayer(url as string)
    ' kept for reference — not used directly
end sub

sub onWebPlayerClosed()
    m.playerOpen = false
    m.grid.setFocus(true)
end sub

sub startPlayback()
    hideDetails()
    m.playerOpen = true
    mt = itemMediaType(m.selectedItem)
    id = m.selectedItem.id.toStr()
    url = "https://flix.thedevreal33.workers.dev/embed?type=" + mt + "&id=" + id
    if mt = "tv"
        url = url + "&s=" + m.currentSeason.toStr() + "&e=" + m.currentEp.toStr()
    end if
    m.focusTrap.setFocus(true)
    m.top.openWebUrl = url
end sub

sub playTrailer()
    if m.trailerKey = "" then return
    hideDetails()
    m.playerOpen = true
    m.focusTrap.setFocus(true)
    m.top.openWebUrl = "https://flix.thedevreal33.workers.dev/trailer?v=" + m.trailerKey
end sub

function onKeyEvent(key as string, press as boolean) as boolean
    if not press then return false

    if m.playerOpen
        if key = "back"
            ' main thread handles close; just block other keys
            return true
        end if
        return true
    end if

    if m.detailsOpen
        hasTrailer = (m.trailerKey <> "")
        maxFocus = 1
        if hasTrailer then maxFocus = 2
        if key = "left"
            if m.detailsFocus > 0
                m.detailsFocus = m.detailsFocus - 1
                highlightDetailBtns()
            end if
        else if key = "right"
            if m.detailsFocus < maxFocus
                m.detailsFocus = m.detailsFocus + 1
                highlightDetailBtns()
            end if
        else if key = "OK"
            if m.detailsFocus = 0
                startPlayback()
            else if m.detailsFocus = 1
                if hasTrailer
                    playTrailer()
                else
                    hideDetailsToGrid()
                end if
            else
                hideDetailsToGrid()
            end if
        else if key = "back"
            hideDetailsToGrid()
        end if
        return true
    end if

    if m.tabFocused
        if key = "left"
            if m.currentTab > 0
                m.currentTab = m.currentTab - 1
                loadTab(m.currentTab)
            end if
        else if key = "right"
            if m.currentTab < 7
                m.currentTab = m.currentTab + 1
                loadTab(m.currentTab)
            end if
        else if key = "OK"
            m.tabFocused = false
            refreshTabBar()
            m.grid.setFocus(true)
        else if key = "down"
            m.tabFocused = false
            refreshTabBar()
            m.grid.setFocus(true)
        else if key = "back"
            m.tabFocused = false
            refreshTabBar()
            m.grid.setFocus(true)
        end if
        return true
    end if

    if key = "back"
        m.tabFocused = true
        refreshTabBar()
        m.focusTrap.setFocus(true)
        return true
    end if

    return false
end function

function itemTitle(item as object) as string
    if item.title <> invalid
        if item.title <> "" then return item.title
    end if
    if item.name <> invalid
        if item.name <> "" then return item.name
    end if
    return "Unknown"
end function

function itemMediaType(item as object) as string
    if item.media_type <> invalid
        if item.media_type = "tv" then return "tv"
        if item.media_type = "movie" then return "movie"
    end if
    if item.first_air_date <> invalid then return "tv"
    return "movie"
end function
