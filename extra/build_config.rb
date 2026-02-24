MRuby::Build.new do |conf|
    toolchain :gcc
    conf.gembox 'default'
end

MRuby::CrossBuild.new('wasm32-unknown-gnu') do |conf|
    toolchain :clang

    # gembox 'default'は使わない（mruby-onig-regexpを含むため）
    conf.gem :core => 'mruby-eval'
    conf.gem :core => 'mruby-string-ext'
    conf.gem :core => 'mruby-numeric-ext'
    conf.gem :core => 'mruby-array-ext'
    conf.gem :core => 'mruby-hash-ext'
    conf.gem :core => 'mruby-range-ext'
    conf.gem :core => 'mruby-enum-ext'
    conf.gem :core => 'mruby-compar-ext'
    conf.gem :core => 'mruby-object-ext'
    conf.gem :core => 'mruby-kernel-ext'
    conf.gem :core => 'mruby-print'
    conf.gem :core => 'mruby-io'
    conf.gem :core => 'mruby-math'
    conf.gem :core => 'mruby-time'
    conf.gem :core => 'mruby-struct'
    conf.gem :core => 'mruby-compiler'

    conf.gem :github => 'pulsejet/mruby-marshal'
    conf.gem :github => 'monochromegane/mruby-time-strftime'

    conf.cc.command = 'emcc'
    conf.cc.flags = %W( -g0)
    conf.cxx.command = 'em++'
    conf.cxx.flags = %W( -g0 -std=c++14)
    conf.linker.command = 'emcc'
    conf.archiver.command = 'emar'
end