import {Command, isAWorkerResponse, WorkerMessage, WorkerResponse} from "./protocols";

let worker: Worker = null,
  original_canvas: HTMLCanvasElement = document.getElementById('originalImage') as HTMLCanvasElement,
  output_canvas: HTMLCanvasElement = document.getElementById('image') as HTMLCanvasElement,
  default_image_url = 'https://images2.minutemediacdn.com/image/upload/c_fill,g_auto,h_1248,w_2220/f_auto,q_auto,w_1100/v1554925323/shape/mentalfloss/clocks_1.png';

function initialize_page() {
  let downloaded_image = new Image;
  downloaded_image.crossOrigin = 'Anonymous';
  downloaded_image.onload = () => drawImageOnCanvas(downloaded_image, original_canvas);
  downloaded_image.src = default_image_url; // TODO: Make this a variable

  startWorker();
}

function startWorker() {
  if (window.Worker) {
    worker = new Worker(new URL('./image.worker', import.meta.url));

    worker.onmessage = function (message) {
      return receiveMessage(message);
    };

    worker.onerror = function (message) {
      console.log("ERROR: ", message.error, message.message);
      return true;
    };
  } else {
    console.error("This browser doesn't support web workers! " +
      "I'm sorry, but they are very crucial to the operation. Please try a different browser!");
  }
}

export function testWorker() {
  let source_image_data: ImageData =
    original_canvas
      .getContext('2d')
      .getImageData(0, 0, original_canvas.width, original_canvas.height);

  let message: WorkerMessage = {
    command: Command.RESIZE,
    target_size: {
      width: 500,
      height: 500,
    },
    source_image: source_image_data,
  };

  sendMessageToWorker(message);
}

function sendMessageToWorker(message: WorkerMessage) {
  worker.postMessage(message, null);
}

function receiveMessage(message: MessageEvent) {
  let response = message.data;

  if (response.status_code !== 200) {
    console.error(response.status_code, response.error_message);
    return;
  }

  if (isAWorkerResponse(message.data)) {
    loadResponseImage(message.data);
  } else {
    console.error("Got invalid response from worker!");
  }
}

function loadResponseImage(response: WorkerResponse) {
  let output_image_data: ImageData = response.data;

  drawImageDataOnCanvas(output_image_data, output_canvas);
}

function drawImageOnCanvas(image_element: HTMLImageElement, canvas: HTMLCanvasElement) {
  let canvas_context = canvas.getContext('2d');
  canvas.width = image_element.width;
  canvas.height = image_element.height;
  canvas_context.drawImage(image_element, 0, 0);
}

function drawImageDataOnCanvas(image: ImageData, canvas: HTMLCanvasElement) {
  let canvas_context = canvas.getContext('2d');
  canvas.width = image.width;
  canvas.height = image.height;
  canvas_context.putImageData(image, 0, 0);
}

initialize_page();
