sub init()
    m.top.functionName = "doFetch"
end sub

sub doFetch()
    http = CreateObject("roUrlTransfer")
    http.setUrl(m.top.url)
    http.enableEncodings(true)
    http.setCertificatesFile("common:/certs/ca-bundle.crt")
    http.addHeader("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
    http.addHeader("Accept", "application/json, text/html, */*")
    http.addHeader("Referer", "https://vidsrc.me/")
    result = http.getToString()
    if result = invalid then result = "{}"
    m.top.result = result
end sub
