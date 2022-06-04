import * as PIXI from 'pixi.js'
import { AudioManager } from './audio'

export class ResourceLoader {
  public audio: AudioManager

  readonly pixiApp: PIXI.Application

  private imageFilenames: string[]
  private soundFilenames: string[]
  private numResources: number
  private numDownloadedResources = 0
  private background: PIXI.Graphics

  constructor(
    imageFilenames: string[],
    soundFilenames: string[],
    pixiApp: PIXI.Application
  ) {
    this.imageFilenames = imageFilenames
    this.soundFilenames = soundFilenames
    this.pixiApp = pixiApp
    this.audio = new AudioManager()
    this.numResources = imageFilenames.length + soundFilenames.length
  }

  private downloadSprites(progressCallback: () => void, callback: () => void) {
    let loader = PIXI.Loader.shared
    loader
      .add(this.imageFilenames)
      .onLoad.add((loader, resource) => {
        progressCallback()
        //console.log(`loading: ${resource.url}`);
      })
      .onError.add(() => {
        throw new Error('On loading sprite')
      })
      .load(() => {
        callback()
      })
  }

  private downloadSounds(progressCallback: () => void, callback: () => void) {
    let filenames = this.soundFilenames
    this.audio.loadSounds(filenames, progressCallback, callback)
  }

  downloadResources(callback: () => void) {
    this.initLoadScreen()
    const next = () => {
      this.downloadSounds(
        this.progressCallback.bind(this),
        (() => {
          this.destroyLoadScreen()
          callback()
        }).bind(this)
      )
    }
    this.downloadSprites.bind(this)(() => {
      this.progressCallback()
    }, next.bind(this))
  }

  private initLoadScreen() {
    const width = this.pixiApp.renderer.width
    const height = this.pixiApp.renderer.height

    this.background = new PIXI.Graphics()
    this.background.beginFill(0x000000)
    this.background.drawRect(0, 0, width - 1, height - 1)
    this.background.endFill()
    this.background.x = 0
    this.background.y = 0

    this.background.beginFill(0x000000)
    this.background.lineStyle(1, 0x00ff00)
    this.background.drawRect(width / 2 - 50, height / 2 - 10, 100, 20)
    this.background.endFill()

    this.pixiApp.stage.addChild(this.background)
  }

  private destroyLoadScreen() {
    this.pixiApp.stage.removeChild(this.background)
    this.background.destroy()
  }

  private progressCallback() {
    const width = this.pixiApp.renderer.width
    const height = this.pixiApp.renderer.height
    this.numDownloadedResources += 1
    let progressWidth = Math.floor(
      (this.numDownloadedResources * 100) / this.numResources
    )
    this.background.beginFill(0x00ff00)
    this.background.drawRect(width / 2 - 50, height / 2 - 10, progressWidth, 20)
    this.background.endFill()
  }
}
