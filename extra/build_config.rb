MRuby::Build.new do |conf|
    toolchain :gcc
    conf.gembox 'default'
end

MRuby::CrossBuild.new('wasm32-unknown-gnu') do |conf|
    toolchain :clang

    conf.gembox 'default'

    # mruby-onig-regexpをmruby 2.x互換の古いコミットに固定（canonical:trueで優先）
    # presym.hが存在しない2.1.2との互換性のため最新版を上書き
    conf.gem :github => 'mattn/mruby-onig-regexp', :commit => '3c1a8c4', :canonical => true

    conf.gem :github => 'pulsejet/mruby-marshal'
    conf.gem :github => 'monochromegane/mruby-time-strftime'
    conf.gem :core => 'mruby-eval'

    conf.cc.command = 'emcc'
    conf.cc.flags = %W(-O3 -g0)
    conf.cxx.command = 'em++'
    conf.cxx.flags = %W(-O3 -g0 -std=c++14)

    conf.linker.command = 'emcc'
    conf.archiver.command = 'emar'
end
