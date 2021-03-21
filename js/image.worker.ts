import {cropXBy} from './imageProcessing';
import {isAWorkerMessage, WorkerMessage, WorkerResponse, Command, Dimensions} from "./protocols";

self.addEventListener('message', function (received_message) {
  console.group('Logging session brought to you by the image-worker!');

  let command = received_message.data;
  console.log(command);

  let reply: WorkerResponse = {
    status_code: 400,
    error_message: 'Bad Request',
    data: null
  };

  if (isAWorkerMessage(command)) {
    console.log("You sent a valid Worker Message!");
    reply = execute(command);
  } else {
    console.log("Invalid Input!!");
  }

  console.groupEnd();
  self.postMessage(reply, null);
});

function execute(message: WorkerMessage): WorkerResponse {
  let output: WorkerResponse = {
    status_code: 500,
    error_message: 'Internal Server Error',
    data: null
  };

  if (message.command === Command.RESIZE) {
    output.data = resize(message.source_image, message.target_size);
    output.status_code = 200;
    output.error_message = '';
  }

  return output;
}

function resize(image: ImageData, size: Dimensions): ImageData {
  console.log(image.height + " -> " + size.height, image.width + " -> " + size.width);
  return cropXBy(image, 50);
}
