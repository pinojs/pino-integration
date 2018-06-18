'use strict'
const { join } = require('path')
const { mkdirSync } = require('fs')
const { execSync, spawn } = require('child_process')
const branch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim()
const { pino, peers } = require('./config')
const REPOS = join(__dirname, 'repos')
try { execSync(`rm -rf ${REPOS}`) } catch (e) {}
mkdirSync(REPOS)
process.chdir(REPOS)
console.log(`cloning pino and switching to ${branch} branch`)
execSync(`git clone ${pino}`, {stdio: 'ignore'})
execSync(`git checkout ${branch}`, {cwd: join(REPOS, 'pino')}, {stdio: 'ignore'})
console.log(`installing pino dependencies`)
execSync(`npm install`, {cwd: join(REPOS, 'pino')}, {stdio: 'ignore'})
peers.forEach(({name, url}) => {
  check(name, spawn('git', ['clone', url]))
})
process.exitCode = 0
async function check (name, sp) {
  const cloneSuccess = await once(sp, 'close') === 0
  if (cloneSuccess === false) {
    console.error(`Fail: Unable to clone ${name}`)
    process.exitCode = 1
    return
  }
  console.log(`${name} cloned, installing dependencies`)
  const install = spawn('npm', ['install'], {cwd: join(REPOS, name), stdio: 'ignore'})
  const installSuccess = await once(install, 'close') === 0
  if (installSuccess === false) {
    console.error(`Fail: ${name} unable to install dependencies`)
    process.exitCode = 1
    return
  }
  console.log(`${name} dependencies installed, running local tests`)
  const test = spawn('npm', ['test'], {cwd: join(REPOS, name), stdio: 'ignore'})
  const testSuccess = await once(test, 'close') === 0
  if (testSuccess === false) {
    console.error(`Fail: ${name} failed local test!`)
    process.exitCode = 1
    return
  }
  console.log(`${name} local tests passed, running integration tests`)
  const link = spawn('npm', ['link', join(REPOS, 'pino')], {cwd: join(REPOS, name), stdio: 'ignore'})
  const linkSuccess = await once(link, 'close') === 0
  if (linkSuccess === false) {
    console.error(`Fail: ${name} could not link pino!`)
    process.exitCode = 1
    return
  }
  const integration = spawn('npm', ['test'], {cwd: join(REPOS, name), stdio: 'ignore'})
  const integrationSuccess = await once(test, 'close') === 0
  if (integrationSuccess === false) {
    console.error(`Fail: ${name} failed integration test!`)
    process.exitCode = 1
    return
  }
  console.log(`Success: ${name} passed integration tests`)
}

function once (emitter, name) {
  return new Promise((resolve, reject) => {
    if (name !== 'error') emitter.once('error', reject)
    emitter.once(name, (...args) => {
      emitter.removeListener('error', reject)
      resolve(...args)
    })
  })
}