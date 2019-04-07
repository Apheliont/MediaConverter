exports.load = function (ffmpeg) {
  ffmpeg
    .outputOptions([
      '-map 0',
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
      '-ar 48000',
      '-ab 1152k'
    ]);
};