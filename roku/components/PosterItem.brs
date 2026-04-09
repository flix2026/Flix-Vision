sub init()
    m.poster   = m.top.findNode("poster")
    m.titleLbl = m.top.findNode("titleLbl")
end sub

sub onContentSet()
    content = m.top.itemContent
    if content = invalid then return
    if content.title <> invalid then m.titleLbl.text = content.title
    if content.hdPosterUrl <> invalid
        if content.hdPosterUrl <> ""
            m.poster.uri = content.hdPosterUrl
        end if
    end if
end sub

sub onFocusChange()
end sub
