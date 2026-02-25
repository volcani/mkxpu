// drive.jsの先頭（window.fileAsyncCache = {}; の直後）に追加
var generationCanvas = document.createElement('canvas')
window.fileAsyncCache = {};

// ✅ ここに追加
const mkdirp = (dirPath) => {
    const parts = dirPath.split('/').filter(Boolean);
    let current = '';
    for (const part of parts) {
        current += '/' + part;
        try { FS.mkdir(current); } catch(e) {}
    }
};

window.getMappingKey = function(file) {
    return file.toLowerCase()
               .replace(/^\/game\//, '')   // ← 先頭の/game/を除去
               .replace(new RegExp("\\.[^/.]+$"), "")
}

window.loadFileAsync = function(fullPath, bitmap, callback) {
    // noop
    console.log('loadFileAsync called:', fullPath, 'bitmap:', bitmap);  // ← 追加
    const key = getMappingKey(fullPath);
    console.log('  key:', key, 'value:', mapping[key]);  // ← 追加
    
    callback = callback || (() => {});

    // Get mapping key
    const mappingKey = getMappingKey(fullPath);
    const mappingValue = mapping[mappingKey];

    // Check if already loaded
    if (window.fileAsyncCache.hasOwnProperty(mappingKey)) return callback();

    // Show spinner
    if (!bitmap && window.setBusy) window.setBusy();

    // Check if this is a folder
    if (!mappingValue || mappingValue.endsWith("h=")) {
        console.error("Skipping loading", fullPath, mappingValue);
        return callback();
    }

    // Get target URL
    const iurl = "gameasync/" + mappingValue;

    // Get path and filename
    const path = "/game/" + mappingValue.substring(0, mappingValue.lastIndexOf("/"));
    const filename = mappingValue.substring(mappingValue.lastIndexOf("/") + 1).split("?")[0];

    // Main loading function
const load = (cb1) => {
    getLazyAsset(iurl, filename, (data) => {
        mkdirp(path);  // ✅ これで参照できる
        try { FS.unlink(path + "/" + filename); } catch(e) {}
        
        FS.createPreloadedFile(path, filename, new Uint8Array(data), true, true, function() {
            window.fileAsyncCache[mappingKey] = 1;
            if (!bitmap && window.setNotBusy) window.setNotBusy();
            if (window.fileLoadedAsync) window.fileLoadedAsync(fullPath);
            callback();
            if (cb1) cb1();
        }, console.error, false, false, () => {
            try { FS.unlink(path + "/" + filename); } catch (err) {}
        });
    });
}

    // Show progress if doing it synchronously only
    if (bitmap && bitmapSizeMapping[mappingKey]) {
        // Get image
        const sm = bitmapSizeMapping[mappingKey];
        generationCanvas.width = sm[0];
        generationCanvas.height = sm[1];

        // Draw
        var img = new Image;
        img.onload = function(){
            const ctx = generationCanvas.getContext('2d');
            ctx.drawImage(img, 0, 0, sm[0], sm[1]);

            mkdirp(path);  // ← 追加
            // Create dummy from data uri
            try { FS.unlink(path + "/" + filename); } catch(e) {}
            FS.createPreloadedFile(path, filename, generationCanvas.toDataURL(), true, true, function() {
                // Return control to C++
                callback(); callback = () => {};

                // Lazy load and refresh
                load(() => {
                    const reloadBitmap = Module.cwrap('reloadBitmap', 'number', ['number'])
                    reloadBitmap(bitmap);
                });
            }, console.error, false, false, () => {
                try { FS.unlink(path + "/" + filename); } catch (err) {}
            });
        };

        img.src = sm[2];
    } else {
        if (bitmap) {
            console.warn('No sizemap for image', mappingKey);
        }
        load();
    }
}


window.saveFile = function(filename, localOnly) {
    const fpath = '/game/' + filename;
    if (!FS.analyzePath(fpath).exists) return;

    const buf = FS.readFile(fpath);
    localforage.setItem(namespace + filename, buf);

    localforage.getItem(namespace, function(err, res) {
        if (err || !res) res = {};
        res[filename] = { t: Number(FS.stat(fpath).mtime) };
        localforage.setItem(namespace, res);
    });

    if (!localOnly) {
        (window.saveCloudFile || (()=>{}))(filename, buf);
    }
};

var loadFiles = function() {
    localforage.getItem(namespace, function(err, folder) {
        if (err || !folder) return;
        console.log('Locally stored savefiles:', folder);

        Object.keys(folder).forEach((key) => {
            const meta = folder[key];
            localforage.getItem(namespace + key, (err, res) => {
                if (err || !res) return;

                // Don't overwrite existing files
                const fpath = '/game/' + key;
                if (FS.analyzePath(fpath).exists) return;

                FS.writeFile(fpath, res);

                if (Number.isInteger(meta.t)) {
                    FS.utime(fpath, meta.t, meta.t);
                }
            });
        });
    }, console.error);

    (window.loadCloudFiles || (()=>{}))();
}

var createDummies = function() {
    // Base directory
    FS.mkdir('/game');

    // Create dummy objects
    for (var i = 0; i < mappingArray.length; i++) {
        // Get filename
        const file = mappingArray[i][1];
        const filename = '/game/' + file.split("?")[0];

        // Check if folder
        if (file.endsWith('h=')) {
            FS.mkdir(filename);
        } else {
            FS.writeFile(filename, '1');
        }
    }
};

window.setBusy = function() {
    document.getElementById('spinner').style.opacity = "0.5";
};

window.setNotBusy = function() {
    document.getElementById('spinner').style.opacity = "0";
};

window.onerror = function() {
    console.error("An error occured!")
};

function preloadList(jsonArray) {
    jsonArray.forEach((file) => {
        const mappingKey = getMappingKey(file);
        const mappingValue = mapping[mappingKey];
        if (!mappingValue || window.fileAsyncCache[mappingKey]) return;

        // Get path and filename
        const path = "/game/" + mappingValue.substring(0, mappingValue.lastIndexOf("/"));
        const filename = mappingValue.substring(mappingValue.lastIndexOf("/") + 1).split("?")[0];

        // Preload the asset
        getLazyAsset("gameasync/" + mappingValue, filename, (data) => {
            if (!data) return;

            FS.createPreloadedFile(path, filename, new Uint8Array(data), true, true, function() {
                window.fileAsyncCache[mappingKey] = 1;
            }, console.error, false, false, () => {
                try { FS.unlink(path + "/" + filename); } catch (err) {}
            });
        }, true);
    });
}

window.fileLoadedAsync = function(file) {
    document.title = wTitle;

    if (!(/.*Map.*rxdata/i.test(file))) return;

    fetch('preload/' + file + '.json')
        .then(function(response) {
            return response.json();
        })
        .then(function(jsonResponse) {
            setTimeout(() => {
                preloadList(jsonResponse);
            }, 200);
        });
};

var activeStreams = [];
function getLazyAsset(url, filename, callback, noretry) {
    const pdiv = document.getElementById("progress");
    let abortController = new AbortController();
    let abortTimer = 0;

    const end = (message) => {
        pdiv.innerHTML = `${filename} - ${message}`;
        activeStreams.splice(activeStreams.indexOf(filename), 1);
        if (activeStreams.length === 0) {
            pdiv.style.opacity = '0';
        }
        clearTimeout(abortTimer);
    }

    const retry = () => {
        abortController.abort();
        if (noretry) {
            end('skip'); callback(null);
        } else {
            activeStreams.splice(activeStreams.indexOf(filename), 1);
            getLazyAsset(url, filename, callback);
        }
    }

    pdiv.innerHTML = `${filename} - start`;
    pdiv.style.opacity = '0.5';
    activeStreams.push(filename);
    abortTimer = setTimeout(retry, 10000);

    fetch(url, {
        method: 'GET',
        mode: 'cors',              // クロスオリジン対応
        credentials: 'omit',       // クッキー不要
        cache: 'force-cache',      // キャッシュ優先
        signal: abortController.signal
    })
    .then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const contentLength = response.headers.get('content-length');
        const total = contentLength ? parseInt(contentLength) : 0;
        let loaded = 0;

        // 進捗表示
        const reader = response.body.getReader();
        const chunks = [];

        const read = () => reader.read().then(({ done, value }) => {
            if (done) {
                clearTimeout(abortTimer);
                abortTimer = setTimeout(retry, 10000);

                const buffer = new Uint8Array(chunks.reduce((acc, c) => acc + c.length, 0));
                let offset = 0;
                for (const chunk of chunks) {
                    buffer.set(chunk, offset);
                    offset += chunk.length;
                }
                end('done');
                callback(buffer.buffer);
                return;
            }
            chunks.push(value);
            loaded += value.length;
            const loadedKB = Math.round(loaded / 1024);
            const totalKB = total ? Math.round(total / 1024) : '?';
            pdiv.innerHTML = `${filename} - ${loadedKB}KB / ${totalKB}KB`;

            clearTimeout(abortTimer);
            abortTimer = setTimeout(retry, 10000);

            return read();
        });

        return read();
    })
    .catch(err => {
        if (err.name === 'AbortError') return;
        console.error('getLazyAsset error:', err);
        end('error');
        if (noretry) {
            callback(null);
        } else {
            activeStreams.splice(activeStreams.indexOf(filename), 1);
            getLazyAsset(url, filename, callback);
        }
    });
}