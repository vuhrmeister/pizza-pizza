/**
 * Library for storing and editing data
 */

const fs = require('fs')
const path = require('path')
const util = require('util')
const helpers = require('./helpers')

const open = util.promisify(fs.open)
const close = util.promisify(fs.close)
const writeFile = util.promisify(fs.writeFile)
const readFile = util.promisify(fs.readFile)
const truncate = util.promisify(fs.truncate)
const unlink = util.promisify(fs.unlink)
const readdir = util.promisify(fs.readdir)

const baseDir = path.join(__dirname, '/../.data/')

// Ensure the base directory exists
createDirIfNotExists(baseDir)

class Data {
  constructor (collectionName) {
    this.collectionName = collectionName
    this.collectionDir = path.join(baseDir, collectionName)
    this.ensureCollectionDirExists()
  }

  ensureCollectionDirExists () {
    createDirIfNotExists(this.collectionDir)
  }

  getFileName (docName) {
    return path.join(this.collectionDir, `${docName}.json`)
  }

  async create (docName, data) {
    let fileDescriptor

    try {
      const fileToOpen = this.getFileName(docName)
      fileDescriptor = await open(fileToOpen, 'wx')
    } catch (err) {
      throw new Error('Could not create new file, it may already exist')
    }

    try {
      const stringData = JSON.stringify(data)
      await writeFile(fileDescriptor, stringData)
    } catch (err) {
      throw new Error('Error writing to new file')
    }

    try {
      await close(fileDescriptor)
    } catch (err) {
      throw new Error('Error closing new file')
    }
  }

  async read (docName) {
    const fileToRead = this.getFileName(docName)
    try {
      const dataString = await readFile(fileToRead, 'utf8')
      const parsedData = helpers.jsonStringToObject(dataString)
      return parsedData
    } catch (err) {
      throw err
    }
  }

  async update (docName, newData) {
    let fileDescriptor
    let currentData

    try {
      const fileToOpen = this.getFileName(docName)
      fileDescriptor = await open(fileToOpen, 'r+')
    } catch (err) {
      throw new Error('Could not open file for updating, it may not exist yet')
    }

    try {
      const dataString = await readFile(fileDescriptor, 'utf8')
      currentData = helpers.jsonStringToObject(dataString)
    } catch (err) {
      throw new Error('Could not read file')
    }

    try {
      await truncate(fileDescriptor)
    } catch (err) {
      throw new Error('Error truncating file')
    }

    const updatedData = {
      ...currentData,
      ...newData
    }

    try {
      const stringData = JSON.stringify(updatedData)
      await writeFile(fileDescriptor, stringData)
    } catch (err) {
      throw new Error('Error writing to existing file')
    }

    try {
      await close(fileDescriptor)
    } catch (err) {
      throw new Error('Error closing existing file')
    }
  }

  async delete (docName) {
    try {
      const fileToDelete = this.getFileName(docName)
      await unlink(fileToDelete)
    } catch (err) {
      throw err
    }
  }

  async list () {
    try {
      const fileList = await readdir(this.collectionDir)
      return fileList.map(fileName => fileName.replace('.json', ''))
    } catch (err) {
      throw err
    }
  }
}

function createDirIfNotExists (path) {
  try {
    fs.mkdirSync(path)
  } catch (err) {
    if (!err.code === 'EEXIST') {
      throw new Error(`Could not create directory: ${this.collectionDir}`)
    }
  }
}

module.exports = Data
