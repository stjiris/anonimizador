local mb = require 'pandoc.mediabag'

function Image(img)
    if img.src:match(".emf$") then
        local mt, contents = mb.lookup(img.src)
        local tmp = os.tmpname()
        local tmpIn = tmp .. ".emf"
        local tmpOut = tmp .. ".png"
        local f = io.open(tmpIn, "w");

        f:write(contents)
        f:close()

        local final = pandoc.pipe("libreoffice", {"--headless","--convert-to","png", tmpIn, "--outdir", "/tmp/"}, "")

        f = io.open(tmpOut, "r")
        local content = f:read("*a")
        f:close()

        mb.delete(img.src)
        mb.insert(img.src,"image/png", content)

        os.remove(tmpIn)
        os.remove(tmpOut)
    end
    if img.src:match(".wmf$") then
        local mt, contents = mb.lookup(img.src)
        local tmp = os.tmpname()
        local tmpIn = tmp .. ".wmf"
        local tmpOut = tmp .. ".png"
        local f = io.open(tmpIn, "w");

        f:write(contents)
        f:close()

        local final = pandoc.pipe("libreoffice", {"--headless","--convert-to","png", tmpIn, "--outdir", "/tmp/"}, "")

        f = io.open(tmpOut, "r")
        local content = f:read("*a")
        f:close()

        mb.delete(img.src)
        mb.insert(img.src,"image/png", content)

        os.remove(tmpIn)
        os.remove(tmpOut)
    end
    return img
end
