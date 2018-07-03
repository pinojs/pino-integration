'use strict'
const major = Number(process.versions.node.split('.')[0])
const peers =  [
  {
    name: 'pino-filter',
    url: 'https://github.com/pinojs/pino-filter'
  },
  {
    name: 'pino-http-print',
    url: 'https://github.com/pinojs/pino-http-print'
  },
  {
    name: 'pino-toke',
    url: 'https://github.com/pinojs/pino-toke'
  },
  {
    name: 'pino-clf',
    url: 'https://github.com/pinojs/pino-clf'
  },
  {
    name: 'pino-tee',
    url: 'https://github.com/pinojs/pino-tee'
  },
  {
    name: 'restify-pino-logger',
    url: 'https://github.com/pinojs/restify-pino-logger'
  },
  {
    name: 'pino-multi-stream',
    url: 'https://github.com/pinojs/pino-multi-stream'
  },
  {
    name: 'pino-syslog',
    url: 'https://github.com/pinojs/pino-syslog'
  },
  {
    name: 'pino-debug',
    url: 'https://github.com/pinojs/pino-debug'
  },
  {
    name: 'pino-noir',
    url: 'https://github.com/pinojs/pino-noir'
  },
  {
    name: 'koa-pino-logger',
    url: 'https://github.com/pinojs/koa-pino-logger'
  },
  {
    name: 'pino-socket',
    url: 'https://github.com/pinojs/pino-socket',
    divergent: true
  },
  {
    name: 'pino-http',
    url: 'https://github.com/pinojs/pino-http'
  },
  {
    name: 'hapi-pino',
    url: 'https://github.com/pinojs/hapi-pino',
    minNodeVersion: 8,
    divergent: true
  },
  {
    name: 'pino-std-serializers',
    url: 'https://github.com/pinojs/pino-std-serializers'
  },
  {
    name: 'pino-mongodb',
    url: 'https://github.com/pinojs/pino-mongodb'
  },
  {
    name: 'pino-caller',
    url: 'https://github.com/pinojs/pino-caller'
  },
  {
    name: 'pino-pretty',
    url: 'https://github.com/pinojs/pino-pretty'
  },
  {
    name: 'express-pino-logger',
    url: 'https://github.com/pinojs/express-pino-logger'
  }
].filter(({minNodeVersion}) => (minNodeVersion > major) === false)


module.exports = {
  pino: 'http://github.com/pinojs/pino',
  peers
}