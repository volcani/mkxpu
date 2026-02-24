MRuby::Build.new do |conf|
    toolchain :gcc
    conf.gembox 'default'
end

MRuby::CrossBuild.new('wasm32-unknown-gnu') do |conf|
    toolchain :clang

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
    conf.gem :core => 'mruby-compiler'
    conf.gem :core => 'mruby-io'
    conf.gem :core => 'mruby-time'
    conf.gem :core => 'mruby-struct'
    conf.gem :github => 'pulsejet/mruby-marshal'
    conf.gem :github => 'monochromegane/mruby-time-strftime'

    onig_prefix = ENV['ONIG_PREFIX'] || ''

    conf.cc.command = 'emcc'
    conf.cc.flags = ['-g0', "-I#{onig_prefix}/include"]
    conf.cxx.command = 'em++'
    conf.cxx.flags = ['-g0', '-std=c++14', "-I#{onig_prefix}/include"]
    conf.linker.command = 'emcc'
    conf.linker.flags << "-L#{onig_prefix}/lib"
    conf.archiver.command = 'emar'
end