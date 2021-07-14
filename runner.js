import { promises as fs } from 'fs'
import os from 'os'
import path from 'path'
import { xsnap } from '@agoric/xsnap'
import { spawn } from 'child_process'

const compartmentOpts = {
  // Gives each user a global lexical space;
  sloppyGlobalsMode: true,
}

export function createRunner () {
  let isInitialized = false
  let worker
  return {
    initiailize,
    runCommand,
    getSystemState,
    close
  }

  async function initiailize () {
    worker = xsnap({
      os: os.type(),
      spawn
    })
    const kernelSrc = await fs.readFile(path.join(__dirname, 'kernel.js'), 'utf8')
    await worker.evaluate(kernelSrc, compartmentOpts)
    // await worker.evaluate(`handleCommand = (function(){\n${kernelSrc}\n})()`);
    isInitialized = true
  }

  async function runCommand (authorId, command) {
    if (!isInitialized) {
      await initiailize()
    }
    let response
    try {
      response = await worker.issueStringCommand(JSON.stringify({ authorId, command }))
    } catch (err) {
      err.fatal = true
      return { error: err }
    }
    return JSON.parse(response.reply)
  }

  async function getSystemState () {
    const response = await worker.issueStringCommand(JSON.stringify({ authorId: 'system', command: 'systemState' }))
    return JSON.parse(response.reply)
  }

  async function close () {
    try {
      await worker.close()
    } catch (error) {
      console.warn(error)
      await worker.terminate()
    }
  }
}
