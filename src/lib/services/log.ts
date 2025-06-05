import { warn, error, info } from "@tauri-apps/plugin-log"

export abstract class Log {

  static info(message: string) {
    const now = new Date().toLocaleString()

    const logMessage = `[${now}]:INFO:[${message}]`

    info(logMessage)
  }

  static warn(message: string) {
    const now = new Date().toLocaleString()

    const logMessage = `[${now}]:WARN:[${message}]`

    warn(logMessage)
  }

  static error(message: string, errorMessage?: string) {
    const now = new Date().toLocaleString()

    let logMessage = `[${now}]:ERROR:[${message}]`

    if (errorMessage) {
      logMessage.concat(`:[${errorMessage}]`)
    }

    error(logMessage)
  }

}