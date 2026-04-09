sub Main()
    screen = CreateObject("roSGScreen")
    port   = CreateObject("roMessagePort")
    screen.setMessagePort(port)
    scene  = screen.CreateScene("MainScene")
    screen.show()

    while true
        msg = wait(200, port)
        if type(msg) = "roSGScreenEvent"
            if msg.isScreenClosed() then return
        end if

        ' Poll for openWebUrl — field observe from main thread is unreliable
        url = scene.openWebUrl
        if url <> invalid
            if url <> ""
                scene.openWebUrl = ""
                runWebPlayer(url, port, scene)
            end if
        end if
    end while
end sub

sub runWebPlayer(url as string, port as object, scene as object)
    r = CreateObject("roRectangle", 0, 0, 1280, 720)
    widget = CreateObject("roHtmlWidget", r)

    if widget = invalid
        scene.webPlayerClosed = true
        return
    end if

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
                if msg.getKey() = 0 then exit while
            end if
        end if
    end while

    widget.hide()
    widget = invalid
    scene.webPlayerClosed = true
end sub
