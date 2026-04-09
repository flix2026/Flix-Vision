sub Main()
    screen = CreateObject("roSGScreen")
    port   = CreateObject("roMessagePort")
    screen.setMessagePort(port)
    scene  = screen.CreateScene("MainScene")
    screen.show()

    scene.observeField("openWebUrl", port)

    while true
        msg = wait(0, port)
        if type(msg) = "roSGScreenEvent"
            if msg.isScreenClosed() then return
        else if type(msg) = "roSGNodeEvent"
            if msg.getField() = "openWebUrl"
                url = msg.getData()
                if url <> ""
                    scene.openWebUrl = ""
                    runWebPlayer(url, screen, port, scene)
                end if
            end if
        end if
    end while
end sub

sub runWebPlayer(url as string, screen as object, port as object, scene as object)
    r = CreateObject("roRectangle", 0, 0, 1280, 720)
    widget = CreateObject("roHtmlWidget", r)

    if widget = invalid
        scene.webPlayerClosed = true
        return
    end if

    ' Route widget events to the SAME port as screen so Back key always works
    widget.setUrl(url)
    widget.setMessagePort(port)
    widget.show()

    while true
        msg = wait(0, port)
        if type(msg) = "roSGScreenEvent"
            if msg.isScreenClosed()
                widget.hide()
                widget = invalid
                return
            end if
        else if type(msg) = "roHtmlWidgetEvent"
            if msg.isKeyPress()
                if msg.getKey() = 0 then exit while  ' back
            end if
        else if type(msg) = "roSGNodeEvent"
            ' new openWebUrl while player open — ignore
        end if
    end while

    widget.hide()
    widget = invalid
    scene.webPlayerClosed = true
end sub
