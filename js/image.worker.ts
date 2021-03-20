import {cropXBy} from './imageProcessing';

self.addEventListener('message', function (event) {
  console.group('Logging session brought to you by the image-worker!');
  console.log("Repeating the message for now...", event.data.source_image);
  console.groupEnd();

  let output_image: ImageData = cropXBy(event.data.source_image, 50);

  // TODO: eventually process and then return a modified image...
  let reply = {
    output_image: output_image
  };

  self.postMessage(reply, null);

});
