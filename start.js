'use strict'
const { join } = require('path')
const { mkdirSync } = require('fs')
const { execSync, spawn, spawnSync } = require('child_process')
const branch = process.env.TRAVIS_BRANCH || execSync('git rev-parse --abbrev-ref HEAD').toString().trim()
const { print } = require('easy-table')
const { pino, peers } = require('./config')
const values = Object.values || ((o) => Object.keys(o).map((k) => o[k]))
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

start()

async function start () {
  const master = await Promise.all(peers.map(setup))
  for (const {name, divergent, fail} of master) {
    if (fail === false) await test({name, divergent}) 
  }
  const branch = await Promise.all(peers.map(switchAndLink))
  for (const {name, divergent, fail} of branch) {
    if (fail === false) await integration({name, divergent}) 
  }
  display()
}

async function setup ({name, url, divergent}) {
  console.log(`cloning ${name} repository`)
  const clone = spawn('git', ['clone', url])
  const cloneSuccess = ~~(await once(clone, 'close')) === 0
  if (cloneSuccess === false) {
    console.error(`Fail: Unable to clone ${name}`)
    process.exitCode = 1
    return {name, divergent, fail: true}
  }
  console.log(`${name} cloned, installing dependencies`)
  const ping = setInterval(() => process.stdout.write(Buffer.from([0])), 2000) // keep travis alive
  const install = spawn('npm', ['install'], {cwd: join(REPOS, name), stdio: ['ignore', 'ignore', 'pipe']})
  var installErrs = '  '
  install.stderr.on('data', (chunk) => installErrs += '  ' + chunk)
  const installed = ~~(await once(install, 'close')) === 0
  clearInterval(ping)
  if (installed === false) {
    console.error(`Fail: ${name} unable to install dependencies\n${installErrs}`)
    process.exitCode = 1
    return {name, divergent, fail: true}
  }
  
  return {name, divergent, fail: false}
}

async function test ({name, divergent}) {
  const test = spawn('npm', divergent ? ['test'] : ['test', '--', '--timeout=0'], {cwd: join(REPOS, name), stdio: 'inherit'})
  const tested = ~~(await once(test, 'close')) === 0
  if (tested === false) {
    console.error(`Fail: ${name} failed current test!`)
    process.exitCode = 1
  } else results[name].current = true
}

async function switchAndLink({name, divergent}) {
  console.log(`${name} attempt switch to equivalent branch`)
  const checkout = await spawn('git', ['checkout', branch], {cwd: join(REPOS, name), stdio: 'ignore'})
  await once(checkout, 'close')
  const repoBranch = execSync('git rev-parse --abbrev-ref HEAD', {cwd: join(REPOS, name)}).toString().trim()
  results[name].compare = `pino ${branch} <–> ${name} ${repoBranch} `
  if (repoBranch !== 'master') {
    console.log(`${name} is on ${repoBranch}, reinstalling dependencies`)
    const removeModules = spawn('rm', ['-fr', 'node_modules'], {cwd: join(REPOS, name), stdio: 'ignore'})
    const modulesRemoved = ~~(await once(removeModules, 'close')) === 0
    if (modulesRemoved === false) {
      console.error(`Fail: ${name} unable to reinstall dependencies for ${repoBranch}, could not remove node_modules`)
      process.exitCode = 1
      return {name, divergent, fail: true}
    }
    const reinstall = spawn('npm', ['install'], {cwd: join(REPOS, name), stdio: 'ignore'})
    const reinstalled = ~~(await once(reinstall, 'close')) === 0
    if (reinstalled === false) {
      console.error(`Fail: ${name} unable to reinstall dependencies for ${repoBranch}`)
      process.exitCode = 1
      return {name, divergent, fail: true}
    }
    console.log(`${name} dependencies reinstalled, linking pino ${branch}`)
  } else {
    console.log(`${name} is on ${repoBranch}, linking pino ${branch}`)
  }
  const link = spawnSync('npm', ['link', join(REPOS, 'pino')], {cwd: join(REPOS, name), stdio: 'ignore'})
  const linked = link.status === 0
  if (linked === false) {
    console.error(`Fail: ${name} could not link pino ${branch}!`)
    process.exitCode = 1
    return {name, divergent, fail: true}
  }
  return {name, divergent, fail: false}
}

async function integration ({name, divergent}) {
  console.log(`${name} linked to pino ${branch} running tests to check integration`)
  const integration = spawn('npm', divergent ? ['test'] : ['test', '--', '--timeout=0'], {cwd: join(REPOS, name), stdio: 'inherit'})
  const integrated = ~~(await once(integration,'close')) === 0
  if (integrated === false) {
    console.error(`Fail: ${name} failed integration test!`)
    process.exitCode = 1
    return
  }
  results[name].branch = true
  console.log(`Success: ${name} passed integration test`)
}

function display () {
  const table = values(results).map(({library, current, branch, compare}) => ({
    Library: library, 
    Current: current ? '   ✅' : '   ❌', 
    Branch: branch ? ' ✅' : ' ❌',
    'Branch Test Comparison': compare
  }))
  console.log()
  console.log(print(table))
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