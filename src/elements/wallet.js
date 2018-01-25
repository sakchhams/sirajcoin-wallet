require("babel-polyfill")
let { createHash, randomBytes } = require('crypto')
let fs = require('fs')
let Wallet = require(__dirname+'/client/wallet-methods.js')
let { connect } = require('lotion')
let mkdirp = require('mkdirp').sync
let { dirname, join } = require('path')
let genesis = require(__dirname+'/genesis.json')
let config = require(__dirname+'/config.js')

const HOME = process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE
const keyPath = join(HOME, '.sirajcoin/keys.json')

let privkey

try {
  // load existing key
  let privkeyContents = fs.readFileSync(keyPath, 'utf8')
  let privkeyHex = JSON.parse(privkeyContents)[0].private
  privkey = Buffer.from(privkeyHex, 'hex')
} catch (err) {
  if (err.code !== 'ENOENT') throw err
  // no key, generate one
  let keys = [ { private: randomBytes(32).toString('hex') } ]
  let keysJson = JSON.stringify(keys, null, '  ')
  mkdirp(dirname(keyPath))
  fs.writeFileSync(keyPath, keysJson, 'utf8')
  privkey = Buffer.from(keys[0].private, 'hex')
  console.log(`Generated private key, saving to "${keyPath}"`)
}

let nodes = config.peers.map((addr) => `ws://${addr}:46657`)

var walletInfo = async function(card) {
  let client = await connect(null, { genesis, nodes })
  let wallet = Wallet(privkey, client)
  card.set('address', wallet.address)
  let balance
  try {
    balance = await wallet.getBalance()
    balance = balance / 1e8
    card.set('balance', balance)
  } catch (err) {
    //retry on 'invalid state from node' didn't seem to work.
    console.log(`error retreiving balance: "${err.message}"`)
    card.onError(err.message)
  }
}

var transfer = async function(card, amount, address) {
  let client = await connect(null, { genesis, nodes })
  let wallet = Wallet(privkey, client)
  amount = Number(amount) * 1e8
  try {
    let response = await wallet.send(client, amount)
    card.onSent()
  } catch(err) {
    card.onError(err.message)
  }
}
