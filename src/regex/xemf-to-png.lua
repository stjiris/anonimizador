-- This lua filter is used by pandoc when converting documents to html.
--
-- Some documents contain legacy images with a very old data format (emf or wmf).
-- Since these images can't be rendered by modern browsers, we need this filter
-- to convert them to png before assembling the final html.
function Image(img)
    local ext = img.src:match("(%.[^.]+)$")

    if not ext or (ext:lower() ~= ".emf" and ext:lower() ~= ".wmf") then
        -- Returning nil/nothing tells Pandoc to leave the image unmodified.
        return nil
    end

    local tmp = os.tmpname()
    local tmp_dir = "/tmp/"
    local tmp_emf = tmp .. ext        -- input
    local tmp_png = tmp .. ".png"     -- output
    local profile = tmp .. ".profile" -- libreoffice user installation

    local mt, contents = pandoc.mediabag.fetch(img.src)

    local f = io.open(tmp_emf, "wb");
    f:write(contents)
    f:close()

    -- Use LibreOffice to convert images to png format.
    pandoc.pipe("env", {
        "HOME=" .. tmp_dir, -- Fixes `unable to create directory '/.cache/dconf'`.
        "soffice",
        "-env:UserInstallation=file://" .. profile, -- Allows for parallel execution.
        "--headless",    -- Use LibreOffice without GUI.
        "--nolockcheck", -- Disables check for remote instances using one installation.
        "--convert-to", "png",
        "--outdir", tmp_dir,
        tmp_emf
    }, "")

    f = io.open(tmp_png, "rb")
    local data = f:read("*a")
    f:close()

    os.remove(tmp)
    os.remove(tmp_emf)
    os.remove(tmp_png)
    os.execute("rm -rf " .. profile)

    pandoc.mediabag.delete(img.src)
    pandoc.mediabag.insert(img.src, "image/png", data)
    return img
end
