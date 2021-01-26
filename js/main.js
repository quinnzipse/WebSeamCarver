let worker;

let canvas = document.getElementById('image'),
  canvas2 = document.getElementById('originalImage'),
  canvas3 = document.getElementById('edges');

if (typeof (Worker) !== "undefined") {
  let worker = new Worker("js/imageProcessing.js");

  worker.onmessage = message => receiveMessage(message);
} else {
  console.error("This browser doesn't support web workers.");
}

function receiveMessage(message) {
  console.log(message.data);
  worker.terminate();
}
