let worker: Worker = null,
  original_image: HTMLCanvasElement = document.getElementById('originalImage') as HTMLCanvasElement,
  original_context: CanvasRenderingContext2D = original_image.getContext('2d'),
  output_image: HTMLCanvasElement = document.getElementById('image') as HTMLCanvasElement,
  output_context: CanvasRenderingContext2D = output_image.getContext("2d"),
  default_image: HTMLImageElement = document.getElementById('default_image') as HTMLImageElement;

if (default_image.complete) {
  startWorker();
} else {
  default_image.onload = startWorker;
}

function startWorker() {
  default_image.crossOrigin = "Anonymous";

  // Put an image in the original_image spot!
  original_image.width = default_image.width;
  original_image.height = default_image.height;
  original_context.drawImage(default_image, 0, 0)

  // Initialize worker!
  if (window.Worker) {
    worker = new Worker(new URL('./image.worker.js', import.meta.url));

    worker.onmessage = function (message) {
      return receiveMessage(message);
    };

    worker.onerror = function (message) {
      console.log("ERROR: ", message.error);
      console.log(message.message, message.filename, message.lineno);
    };
  } else {
    console.error("This browser doesn't support web workers! " +
      "I'm sorry, but they are very crucial to the operation. Please try a different browser!");
  }

  // Not sure why I need this...
  setTimeout(testWorker, 100);
}

function testWorker() {
  let message = {
    target_size: {
      x: 500,
      y: 500,
    },
    source_image: original_context.getImageData(0, 0, original_image.width, original_image.height)
  };

  worker.postMessage(message, null);
}

function receiveMessage(message) {
  let output_image_data: ImageData = message.data.output_image;

  output_image.height = output_image_data.height;
  output_image.width = output_image_data.width;


  output_context.putImageData(output_image_data, 0, 0);
  worker.terminate();
}
