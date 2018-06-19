'use strict'
const { join } = require('path')
const { mkdirSync } = require('fs')
const { execSync, spawn } = require('child_process')
const branch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim()
const { print } = require('easy-table')
const { pino, peers } = require('./config')
const REPOS = join(__dirname, 'repos')
try { execSync(`rm -rf ${REPOS}`) } catch (e) {}
mkdirSync(REPOS)
process.chdir(REPOS)
console.log(`cloning pino and switching to ${branch} branch`)
execSync(`git clone ${pino}`, {stdio: 'ignore'})
execSync(`git checkout ${branch}`, {cwd: join(REPOS, 'pino')}, {stdio: 'ignore'})
const results = peers.reduce((o, {name}) => Object.assign({
  [name]: { library: name, current: false, branch: false, compare: ''}  
}, o), {})
var count = peers.length
const values = Object.values || ((o) => Object.keys(o).map((k) => o[k]))
peers.forEach(async ({name, url}) => {
  await check(name, url)
  count--
  if (count === 0) {
    const table = values(results).map(({library, current, branch, compare}) => ({
      Library: library, 
      Current: current ? '   ✅' : '   ❌', 
      Branch: branch ? ' ✅' : ' ❌',
      'Branch Test Comparison': compare
    }))
    console.log()
    console.log(print(table))
  }
})
async function check (name, url) {
  console.log(`cloning ${name} repository`)
  const clone = spawn('git', ['clone', url])
  const cloneSuccess = await once(clone, 'close') === 0
  if (cloneSuccess === false) {
    console.error(`Fail: Unable to clone ${name}`)
    process.exitCode = 1
    return
  }
  console.log(`${name} cloned, installing dependencies`)
  const install = spawn('npm', ['install'], {cwd: join(REPOS, name), stdio: 'ignore'})
  const installed = await once(install, 'close') === 0
  if (installed === false) {
    console.error(`Fail: ${name} unable to install dependencies`)
    process.exitCode = 1
    return
  }
  console.log(`${name} dependencies installed, running current tests`)
  const test = spawn('npm', ['test'], {cwd: join(REPOS, name), stdio: 'ignore'})
  const tested = await once(test, 'close') === 0
  if (tested === false) {
    console.error(`Fail: ${name} failed current test!`)
    process.exitCode = 1
  } else results[name].current = true
  console.log(`${name} current tests passed, attempt switch to equivalent branch`)
  const checkout = await spawn('git', ['checkout', branch], {cwd: join(REPOS, name), stdio: 'ignore'})
  await once(checkout, 'close')
  const repoBranch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim()
  results[name].compare = `pino ${branch} <–> ${name} ${repoBranch} `
  console.log(`${name} is on ${repoBranch}, reinstalling dependencies`)
  const removeModules = spawn('rm', ['-fr', 'node_modules'], {cwd: join(REPOS, name), stdio: 'ignore'})
  const modulesRemoved = await once(removeModules, 'close') === 0
  if (modulesRemoved === false) {
    console.error(`Fail: ${name} unable to reinstall dependencies for ${repoBranch}, could not remove node_modules`)
    process.exitCode = 1
    return
  } 
  const reinstall = spawn('npm', ['install'], {cwd: join(REPOS, name), stdio: 'ignore'})
  const reinstalled = await once(reinstall, 'close') === 0
  if (reinstalled === false) {
    console.error(`Fail: ${name} unable to reinstall dependencies for ${repoBranch}`)
    process.exitCode = 1
    return
  }
  console.log(`${name} dependencies reinstalled, running integration tests`)
  const link = spawn('npm', ['install', join(REPOS, 'pino')], {cwd: join(REPOS, name), stdio: 'ignore'})
  const linked = await once(link, 'close') === 0
  if (linked === false) {
    console.error(`Fail: ${name} could not install pino from ${branch}!`)
    process.exitCode = 1
    return
  }
  const integration = spawn('npm', ['test'], {cwd: join(REPOS, name), stdio: 'ignore'})
  const integrated = await once(integration, 'close') === 0
  if (integrated === false) {
    console.error(`Fail: ${name} failed integration test!`)
    process.exitCode = 1
    return
  }
  results[name].branch = true
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