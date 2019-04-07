exports.load = function (ffmpeg) {
  ffmpeg
    .input("anullsrc=channel_layout=2:sample_rate=48000")
    .inputOption("-f lavfi")
    .outputOptions([
      "-filter_complex",
      "asplit = 2[o1][o2]", // разбиваем 1 стерео на 2 моно
      "-map 0:v:0",
      "-map [o1]",
      "-map [o2]",
      '-f mxf',
      '-vcodec mpeg2video',
      '-b:v 50000000',
      '-minrate 50000000',
      '-maxrate 50000000',
      '-r 25',
      '-bf 2',
      '-flags +cgop',
      '-b_strategy 0',
      '-mpv_flags +strict_gop',
      '-sc_threshold 1000000000',
      '-pix_fmt yuv422p',
      '-flags +ildct+ilme',
      '-top 1',
      '-c:a pcm_s24le',
      '-ab 1152k'
    ]);
};