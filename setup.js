'use strict'
const { execSync } = require('child_process') 
const branch = execSync('git rev-parse --abbrev-ref HEAD')
const { pino, peers } = require('./config')

for (const {name, url} of peers) {
  console.log(name, url)
}
