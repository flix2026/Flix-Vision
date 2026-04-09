sub init()
    m.top.functionName = "doFetch"
end sub

sub doFetch()
    http = CreateObject("roUrlTransfer")
    http.setUrl(m.top.url)
    http.enableEncodings(true)
    http.setCertificatesFile("common:/certs/ca-bundle.crt")
    http.addHeader("User-Agent", "Roku/1.0")
    m.top.result = http.getToString()
end sub
