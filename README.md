npm install
ng serve

that's it…

TODO:
- Fix the fading overlap between the left and right images
- Fix the projection which seesm to be a little weird "S" shaped when looking down
- Improve the way to search for the madv data block. For now we are scanning the whole file
- Use an asynchronous rendering for the shader using a callback. Right now, I suspect few frames to be rendered using the wrong rotation matrix, this is due to the thread from the video being out of sync with the one providing the calibration to the shader.
- Extra: we should add ffmpg to convert the video to a equirectangular version anyone could use in their software.
