export interface Dimensions {
  width: number,
  height: number
}

export interface WorkerMessage {
  command: Command,
  target_size: Dimensions
  source_image: ImageData
}

export function isAWorkerMessage(object: any): object is WorkerMessage {
  return 'command' in object &&
    'target_size' in object &&
    'source_image' in object
}

export interface WorkerResponse {
  status_code: number,
  error_message: string,
  data: ImageData
}

export function isAWorkerResponse(object: any): object is WorkerResponse {
  return 'status_code' in object &&
    'error_message' in object &&
    'data' in object
}

export enum Command {
  RESIZE,
  PING
}
