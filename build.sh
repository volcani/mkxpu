#!/bin/bash
set -e

mkdir -p deps
cd deps

# Get libsigc++
if [ ! -d "libsigc++" ]
then
    wget https://github.com/libsigcplusplus/libsigcplusplus/releases/download/2.12.0/libsigc++-2.12.0.tar.xz -O libsigc++.tar.xz
    tar xf libsigc++.tar.xz && rm libsigc++.tar.xz
    mv libsigc++* libsigc++
fi

# Get pixman
if [ ! -d "pixman" ]
then
    wget https://www.cairographics.org/releases/pixman-0.42.0.tar.gz -O pixman.tar.gz
    tar xf pixman.tar.gz && rm pixman.tar.gz
    mv pixman* pixman
fi

# Get physfs
if [ ! -d "physfs" ]
then
    wget https://icculus.org/physfs/downloads/physfs-3.0.2.tar.bz2 -O physfs.tar.bz2
    tar xf physfs.tar.bz2 && rm physfs.tar.bz2
    mv physfs* physfs
fi

# Get mruby
if [ ! -d "mruby" ]
then
    wget https://github.com/mruby/mruby/archive/3.0.0.tar.gz -O mruby.tar.gz
    tar xf mruby.tar.gz && rm mruby.tar.gz
    mv mruby* mruby
fi

# Get emscripten
if [ ! -d "emsdk" ]
then
    git clone https://github.com/emscripten-core/emsdk.git
    cd emsdk
    git pull
    ./emsdk install latest
    ./emsdk activate latest
    cd ..
fi

# Activate emscripten
export EMSDK="$(pwd)/emsdk"
export PATH="$EMSDK/upstream/emscripten:$EMSDK/node/$(ls $EMSDK/node | head -1)/bin:$PATH"
export EM_CONFIG="$EMSDK/.emscripten"

# Build libsigc++
if [ ! -f "libsigc++/sigc++/.libs/libsigc-2.0.a" ]
then
    cd libsigc++
    emconfigure ./autogen.sh
    emconfigure ./configure --enable-static --disable-shared
    emmake make clean
    emmake make -j4 || true
    cd ..
fi

# Build pixman
if [ ! -f "pixman/pixman/.libs/libpixman-1.a" ]
then
    cd pixman
    emconfigure ./configure --enable-static --disable-shared
    emmake make clean
    cd pixman
    emmake make -j4 libpixman-1.la
    cd ../..
fi

# Build physfs
if [ ! -f "physfs/libphysfs.a" ]
then
    cd physfs
    emcmake cmake .
    emmake make clean
    emmake make -j4 physfs-static
    cd ..
fi

# Build oniguruma for Emscripten
if [ ! -f "oniguruma/install/lib/libonig.a" ]  # ✅ 修正
then
    wget https://github.com/kkos/oniguruma/releases/download/v6.9.9/onig-6.9.9.tar.gz -O onig.tar.gz
    tar xf onig.tar.gz && rm onig.tar.gz
    mv onig-6.9.9 oniguruma
    cd oniguruma
    emconfigure ./configure --enable-static --disable-shared --prefix="$(pwd)/install"
    emmake make -j4
    emmake make install
    cd ..
fi

export ONIG_PREFIX="$(pwd)/oniguruma/install"

# Build mruby
if [ ! -f "mruby/build/wasm32-unknown-gnu/lib/libmruby.a" ]
then
    cd mruby
    cp ../../extra/build_config.rb ./build_config.rb
    make clean
    MRUBY_CONFIG="$(pwd)/build_config.rb" make 2>&1
    ls build/wasm32-unknown-gnu/lib/libmruby.a || (echo "ERROR: libmruby.a not generated"; exit 1)
    cd ..
fi

echo "Finished building dependencies"
cd ..

emcmake cmake . -DBINDING=MRUBY -DFORCE32=OFF
emmake make -j4

echo "Finished building MKXP"

mkdir -p build
cp -R mkxp.html mkxp.wasm mkxp.js extra/*.webmanifest extra/js build/

cd build

if [ ! -d "gameasync" ]
then
    wget https://github.com/pulsejet/knight-blade-web-async/archive/gh-pages.zip -O game.zip
    unzip game.zip "knight-blade-web-async-gh-pages/gameasync/*"
    mv knight-blade-web-async-gh-pages/gameasync .
    rm -rf knight-blade-web-async-gh-pages
    rm -f game.zip

    cd gameasync
    if [ ! -f "rgss.rb" ]
    then
        cp ../../extra/rgss.rb .
    fi
    ../../extra/make_mapping.sh
    rm -rf preload ../preload
    cp ../../extra/dump* .
    for f in Data/*
    do
        ./dump.sh "$f" > /dev/null
        echo "Processed file: $f"
    done
    rm dump*
    mv preload ..
    cd ..
fi

mv mkxp.html index.html
touch .nojekyll

echo "Finished everything"
cd ..