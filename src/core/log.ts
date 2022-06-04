declare let window: any

class Logger {
  readonly LEVEL_NONE = 0
  readonly LEVEL_WARNING = 1
  readonly LEVEL_INFO = 2
  readonly LEVEL_DEBUG = 3
  readonly LEVEL_VERBOSE = 4

  private level: number
  private static instance: Logger

  private constructor() {
    this.level = this.LEVEL_WARNING
    if (window.localStorage) {
      const tmp = window.localStorage.getItem('FOSFENO_LOG_LEVEL')
      if (tmp && Number.isInteger(tmp)) {
        this.level = tmp
      }
    }
  }

  public static getInstance() {
    if (Logger.instance === undefined) {
      Logger.instance = new Logger()
    }
    return Logger.instance
  }

  readonly log = (...args: any[]) => {
    switch (this.level) {
      case this.LEVEL_DEBUG:
        this.debug(args)
        break
      case this.LEVEL_INFO:
        this.info(args)
        break
      case this.LEVEL_VERBOSE:
        this.verbose(args)
        break
      case this.LEVEL_WARNING:
        this.warning(args)
        break
      default:
        break
    }
  }

  readonly setLevel = (level: number) => {
    this.level = level
  }

  readonly warning = (...args: any[]) => {
    if (this.level >= this.LEVEL_WARNING) {
      console.log(...args)
    }
  }

  readonly info = (...args: any[]) => {
    if (this.level >= this.LEVEL_INFO) {
      console.log(...args)
    }
  }

  readonly debug = (...args: any[]) => {
    if (this.level >= this.LEVEL_DEBUG) {
      console.log(...args)
    }
  }

  readonly verbose = (...args: any[]) => {
    if (this.level >= this.LEVEL_VERBOSE) {
      console.log(...args)
    }
  }
}

export const log = Logger.getInstance()
