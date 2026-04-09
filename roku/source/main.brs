sub Main()
    screen = CreateObject("roSGScreen")
    port   = CreateObject("roMessagePort")
    screen.setMessagePort(port)
    scene  = screen.CreateScene("MainScene")
    screen.show()

    ' Deliver openWebUrl field changes to our port
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
                    runWebPlayer(url, scene)
                end if
            end if
        end if
    end while
end sub

sub runWebPlayer(url as string, scene as object)
    r = CreateObject("roRectangle", 0, 0, 1280, 720)
    widget = CreateObject("roHtmlWidget", r)
    widget.setUrl(url)
    widget.show()

    wPort = CreateObject("roMessagePort")
    widget.setMessagePort(wPort)

    while true
        msg = wait(0, wPort)
        if type(msg) = "roHtmlWidgetEvent"
            if msg.isKeyPress()
                if msg.getKey() = 0  ' back key code
                    exit while
                end if
            end if
        end if
    end while

    widget.hide()
    widget = invalid
    scene.webPlayerClosed = true
end sub
