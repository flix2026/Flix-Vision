sub init()
    m.BASE = "https://flix.thedevreal33.workers.dev/tmdb"
    m.IMGBASE = "https://image.tmdb.org/t/p/w342"
    m.WORKER = "https://flix.thedevreal33.workers.dev"

    m.TABS = ["Trending", "Movies", "TV Shows", "Anime", "Top Rated", "Upcoming"]
    m.TAB_ENDPOINTS = [
        "/trending/all/day?page=1",
        "/movie/popular?page=1",
        "/tv/popular?page=1",
        "/discover/tv?with_genres=16&with_original_language=ja&sort_by=popularity.desc&page=1",
        "/movie/top_rated?page=1",
        "/movie/upcoming?page=1"
    ]

    m.currentTab = 0
    m.currentItems = []

    m.grid = m.top.findNode("grid")
    m.spinner = m.top.findNode("spinner")
    m.statusLabel = m.top.findNode("statusLabel")
    m.tabLabel = m.top.findNode("tabLabel")

    m.grid.observeField("itemSelected", "onItemSelected")

    loadTab(0)
end sub

sub loadTab(tabIndex as integer)
    m.currentTab = tabIndex
    m.tabLabel.text = m.TABS[tabIndex]
    m.spinner.visible = true
    m.statusLabel.text = "Loading..."

    url = m.BASE + m.TAB_ENDPOINTS[tabIndex]

    m.fetchTask = CreateObject("roSGNode", "FetchTask")
    m.fetchTask.url = url
    m.fetchTask.observeField("result", "onDataLoaded")
    m.fetchTask.control = "RUN"
end sub

sub onDataLoaded()
    m.spinner.visible = false
    data = parseJSON(m.fetchTask.result)

    if data = invalid
        m.statusLabel.text = "Failed to load."
        return
    end if

    if data.results = invalid
        m.statusLabel.text = "No results."
        return
    end if

    m.currentItems = data.results
    content = CreateObject("roSGNode", "ContentNode")

    for each item in data.results
        node = CreateObject("roSGNode", "ContentNode")

        title = ""
        if item.title <> invalid
            title = item.title
        else if item.name <> invalid
            title = item.name
        end if
        node.title = title

        if item.poster_path <> invalid
            if item.poster_path <> ""
                node.hdPosterUrl = m.IMGBASE + item.poster_path
            end if
        end if

        mediaType = "movie"
        if item.media_type <> invalid
            mediaType = item.media_type
        else if item.title = invalid
            mediaType = "tv"
        end if
        node.shortDescriptionLine1 = mediaType

        content.appendChild(node)
    end for

    m.grid.content = content
    m.grid.setFocus(true)
    m.statusLabel.text = m.TABS[m.currentTab]
end sub

sub onItemSelected()
    idx = m.grid.itemSelected
    if idx < 0 then return
    if idx >= m.currentItems.count() then return

    item = m.currentItems[idx]

    mediaType = "movie"
    if item.media_type <> invalid
        mediaType = item.media_type
    else if item.title = invalid
        mediaType = "tv"
    end if

    mediaId = item.id.toStr()

    m.statusLabel.text = "Resolving stream..."
    m.spinner.visible = true

    resolveUrl = m.WORKER + "/resolve?type=" + mediaType + "&id=" + mediaId
    if mediaType = "tv"
        resolveUrl = resolveUrl + "&s=1&e=1"
    end if

    m.resolveTask = CreateObject("roSGNode", "FetchTask")
    m.resolveTask.url = resolveUrl
    m.resolveTask.observeField("result", "onStreamResolved")
    m.resolveTask.control = "RUN"
end sub

sub onStreamResolved()
    m.spinner.visible = false
    data = parseJSON(m.resolveTask.result)

    if data = invalid
        m.statusLabel.text = "Stream resolve failed."
        return
    end if

    if data.streams = invalid
        m.statusLabel.text = "No streams found."
        return
    end if

    if data.streams.count() = 0
        m.statusLabel.text = "No streams found."
        return
    end if

    streamUrl = data.streams[0]

    content = CreateObject("roSGNode", "ContentNode")
    content.url = streamUrl
    content.streamFormat = "hls"

    video = CreateObject("roSGNode", "Video")
    video.width = 1280
    video.height = 720
    video.content = content
    video.control = "play"
    m.top.appendChild(video)
    video.setFocus(true)
    m.statusLabel.text = "Playing..."
end sub

function onKeyEvent(key as string, press as boolean) as boolean
    if not press then return false

    if key = "right" and m.grid.hasFocus()
        newTab = m.currentTab + 1
        if newTab >= m.TABS.count() then newTab = 0
        loadTab(newTab)
        return true
    end if

    if key = "left" and m.grid.hasFocus()
        newTab = m.currentTab - 1
        if newTab < 0 then newTab = m.TABS.count() - 1
        loadTab(newTab)
        return true
    end if

    return false
end function
