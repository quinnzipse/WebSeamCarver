import {cropXBy} from './imageProcessing.ts';

self.addEventListener('message', function (event) {
  console.group('Logging session brought to you by the image-worker!');
  console.log("Repeating the message for now...", event.data.source_image);
  console.groupEnd();

  // try {
    cropXBy(event.data.source_image, 50);
  // } catch (e) {
  //   console.error(e);
  // }

  // TODO: eventually process and then return a modified image...
  let reply = {
    output_image: event.data.source_image
  };

  self.postMessage(reply, null);

});
