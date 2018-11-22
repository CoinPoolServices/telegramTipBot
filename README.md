# telegramTipBot
Telegram Tipping Bot for Bitcoin based cryptocurrencies

## Requirements:

##### Nodejs
##### Mysql (InnoDB support)
##### sendmail (for error reporting)
##### forever
##### curl

## Installation:
```
git clone https://github.com/mrmikeo/telegramTipBot
cd telegramTipBot
npm install

npm install forever

mysql -u <youruser> -p <yourdatabase> < tipbot.sql
```                                            
Edit telegramBot.js and put in your variables at the top of the program

Once you have your wallet setup and all variables set, then run the bot like:
```
forever start telegramBot.js
```
Instructions on how to create a new Telegram bot with Botfather is here:
https://core.telegram.org/bots#6-botfather

The wallets do not need to run on the same host as the Bot.

Important information for adding your wallets to the database:

### Fields to fill out:
```
  coinname :: The name of the coin
  coincode :: The ticker code of the coin
  limit_confirmations :: Confirmations required for deposit
  min_withdrawal :: Minimum withdraw amount
  connector :: For now, this should always be 'bitcoin-core'
  connector_version :: Just use '0.10.0' to be safe
  hasmethods :: This is an important one, since various wallets have different available methods.  See Below
  depositaccount :: NULL is fine, but you can set this to whatever you like
  hostname :: This is just for your reference, can be the name of the server the wallet runs on
  host :: Hostname or IP address of the wallet
  port :: Port number for the wallet rpc api
  backup_daemon :: Just for reference - the daemon name of the wallet
  runas_user :: Just for reference - the system username this wallet runs under
  masteraddress :: An address in the wallet not used by anybody else
  username :: The RPC username of the wallet
  password :: The RPC password of the wallet
```

### Hasmethods instructions:

After you have installed your wallet client, check to see what methods it supports:
```
walletcoin-cli help
```

If you see all of these in the list of available commands, then use this value for hasmethods:
```
getwalletinfo,getnetworkinfo,getblockchaininfo,getbestblockhash
```


If NOT, then if you see both of these methods in the list of commands, then use this value for hasmethods
```
getinfo,getbestblockhash
```


If you don't see getbestblockhash, then just use this value
```
getinfo
```

### Wallet conf file settings:

Your wallet needs to be configured to send transaction information to your tipbot for new deposits

Here is an example yourcoin.conf file:
```
server=1
daemon=1
keypool=50
rpcuser=<Your rpc username>
rpcpassword=<Your rpc password>
rpcport=9999
rpcallowip=127.0.0.1
rpcallowip=<another external ip if needed>
port=29999
walletnotify=/usr/bin/curl --request GET 'http://127.0.0.1:699/dep/gettransactioninfo/1/%s'
```
In the example above you will see ***gettransactioninfo/1/%s*** ... The '1' in that url is the wallet ID# in the database.
