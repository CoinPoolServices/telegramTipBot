/*
 * Telegram Tipping Bot for Bitcoin based cryptocurrencies
 *
 * Author:  Michael Osullivan
 * Author Telegram:  @Mr_MikeO
 *
 */

var request 			= require('request');
var Big 				= require('big.js');
const bitcoinClient 	= require('bitcoin-core');
const nodemailer 		= require('nodemailer');
var express 			= require('express');        // call express
var app					= express();                 // define our app using express
var mysql 				= require('mysql');
const TelegramBot 		= require('node-telegram-bot-api');

// Variables -- Edit the Database and Email variables to your environment

var masterdb_host = '127.0.0.1';
var db_username = '<username>';
var db_password = '<password>';
var db_database = '<database>';

var requirePrivate = true;  // true/false whether to require certain actions like deposit/withdraw/balance to only be done in private conversation with the bot

var error_from_email = 'your email address';
var error_to_email = 'your email address';

// Replace the value below with the Telegram token and username you receive from @BotFather

const token = '<telegram token>';
var botusername = "@yourbotsusername":

// End Variables

process.env.NTBA_FIX_319 = true;

var pool = mysql.createPool({
    connectionLimit : 40, //important
    host     : masterdb_host,
    user     : db_username,
    password : db_password,
    database : db_database,
    debug    :  false,
    supportBigNumbers : true
});

var sqlq = '';

// use a timeout value of 10 seconds
var timeoutInMilliseconds = 10*1000;

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, {polling: true});

var commandlist = "\
/help -- Get a list of commands\n\n\
/availabletips -- Get a list of assets you can tip with\n\
/balance {TICKER} -- Get your tipping balance.  Use ticker for just one asset or blank for all\n\
/deposit {TICKER} -- Get your tipping deposit address\n\
/deposits -- List your recent tipping deposits\n\
/tip {TICKER} {TELEGRAMUSERNAME} {AMOUNT} -- Tip another telegram user\n\
/withdraw {TICKER} {ADDRESS} {AMOUNT} -- Withdraw your tips to an address\n\
/withdraws -- List your recent tipping withdraws\n\
";

// Listen for any kind of message. There are different kinds of
// messages.
bot.on('message', (msg) => {

	const chatId = msg.chat.id;
	const chatRoomType = msg.chat.type;
	const chatUserName = msg.from.username;
	
	var primaryinput = msg.text.replace(botusername, '');
		
	var inputs = primaryinput.split(" ");
	
	var command = inputs[0];
	
	if (command == '/balances') command = '/balance';
	
	var iscommand = 0;
	if (command.indexOf('/') != -1) iscommand = 1;
	
	switch(command) {
	
		case "/help":
			bot.sendMessage(chatId, commandlist);
			break;
			
		case "/availabletips":
		
	  		sqlq = "SELECT `tipbot_wallets`.`coincode`, `tipbot_wallets`.`coinname` FROM `tipbot_wallets` WHERE `active` = 1 ORDER BY `coinname` ASC";

			handle_database(sqlq,function(err, result){

	  			if (err)
	  			{

					returnmsg = 'Whoah!  Some kind of error happened...   Tell the admin!';
						
					bot.sendMessage(chatId, returnmsg);
					
					error_handle(err, 'availabletips', 'error');

	  			}
	  			else if (result.length == 0)
	  			{
	  					
					returnmsg = 'No assets are currently available for tipping.';
						
					bot.sendMessage(chatId, returnmsg);
	  					
	  			}
	  			else
	  			{   
				
					returnmsg = 'Assets available for tipping:\n---------------------------\n';

					result.forEach( (balanceinfo) => {
							
						if (balanceinfo.balance == null) balanceinfo.balance = 0;
					
						returnmsg += balanceinfo.coinname + ' (' + balanceinfo.coincode + ')\n';

					});

					bot.sendMessage(chatId, returnmsg);
							
				}
						
			});
				
			break;
			
		case "/deposit":
		
			if (chatRoomType != 'private' && requirePrivate == true)
			{
			
				bot.sendMessage(chatId, 'Talk to me in direct chat if you want this information. (Click me and then Send Message)');
			
			}
			else
			{
			
				var returnmsg;
				var haserr = 0;
				
				var coincode = '';
				var cleancoincode = '';
			
				if (inputs[1])
				{
			
					coincode = inputs[1];			
					cleancoincode = coincode.replace(/[^a-z0-9]/gi,'');
				
				}

				if (coincode != cleancoincode || cleancoincode.length > 10)
				{
					returnmsg = 'Check your asset ticker code format... That looks weird...';
					haserr = 1;
				}
			
				if (cleancoincode == '')
				{
					returnmsg = 'Tell me which asset you would like to deposit';
					haserr = 1;
				}
			
				cleancoincode = cleancoincode.toUpperCase();
			
				if (haserr == 0)
				{
			
	  				sqlq = "SELECT `id` FROM `tipbot_wallets` WHERE `coincode` = " + mysql.escape(cleancoincode) + " AND `active` = 1 LIMIT 1";
	  				
					handle_database(sqlq,function(err, result){

	  					if (err)
	  					{

							returnmsg = 'Whoah!  Some kind of error happened...   Tell the admin!';
						
							bot.sendMessage(chatId, returnmsg);
							
							error_handle(err, 'deposit', 'error');

	  					}
	  					else
	  					{   
	  			
	  						if (result.length == 0)
	  						{
	  							returnmsg = 'We don\'t have ' + cleancoincode + " available for tipping...";
	  						
	  							bot.sendMessage(chatId, returnmsg);
	  						
	  						}
	  						else
	  						{
			
								var walletid = result[0].id;
							
	  							sqlq = "SELECT `address` FROM `tipbot_addresses` WHERE `wallet_id` = " + mysql.escape(walletid) + " AND `telegramuser` = " + mysql.escape(chatUserName) + " LIMIT 1";
	  								  							
								handle_database(sqlq,function(err, result){

	  								if (err)
	  								{
	
										returnmsg = 'Whoah!  Some kind of error happened...   Tell the admin!';
										
										bot.sendMessage(chatId, returnmsg);
										
										error_handle(err, 'deposit', 'error');

	  								}
	  								else
	  								{
	  							
	  									if (result.length > 0)
	  									{
	  									
	  										balanceUpdate(chatUserName, walletid);
	  									
	  										returnmsg = 'Your tipping deposit address for ' + cleancoincode + ' is ' + result[0].address;
	  									
	  										bot.sendMessage(chatId, returnmsg);
	  									
	  									}
	  									else
	  									{
	  									
	  										sqlq = "UPDATE `tipbot_addresses` SET `telegramuser` = " + mysql.escape(chatUserName) + " WHERE `wallet_id` = " + mysql.escape(walletid) + " AND `telegramuser` IS NULL LIMIT 1";
											handle_database(sqlq,function(err, result){

	  											if (err)
	  											{
	
													returnmsg = 'Whoah!  Some kind of error happened...   Tell the admin!';
										
													bot.sendMessage(chatId, returnmsg);
													
													error_handle(err, 'deposit', 'error');

	  											}
	  											else
	  											{
	  									
	  												sqlq = "SELECT `address` FROM `tipbot_addresses` WHERE `wallet_id` = " + mysql.escape(walletid) + " AND `telegramuser` = " + mysql.escape(chatUserName) + " LIMIT 1";
	  								  							
													handle_database(sqlq,function(err, result){

	  													if (err)
	  													{
	
															returnmsg = 'Whoah!  Some kind of error happened...   Tell the admin!';
										
															bot.sendMessage(chatId, returnmsg);
															
															error_handle(err, 'deposit', 'error');

	  													}
	  													else
	  													{
	  							
	  														if (result.length > 0)
	  														{
	  									
	  															balanceUpdate(chatUserName, walletid);
	  									
	  															returnmsg = 'Your tipping deposit address for ' + cleancoincode + ' is ' + result[0].address;
	  									
	  															bot.sendMessage(chatId, returnmsg);
	  									
	  														}
	  														else
	  														{
	  									

	  															returnmsg = 'An Error Occurred while generating a new address.  Tell the admin!';
	  									
	  															bot.sendMessage(chatId, returnmsg);
	  															
	  															error_handle(err, 'deposit', 'error');
	  															
	  														}
	  														
	  													}
	  													
	  												});
	  										
	  											}
	  											
	  										});

										}
										
									}
									
								});
								
							}
							
						}
						
					});
					
				}
				else
				{

					bot.sendMessage(chatId, returnmsg);
				
				}
			
			}
			break;
			
		case "/withdraw":
		
			if (chatRoomType != 'private' && requirePrivate == true)
			{
			
				bot.sendMessage(chatId, 'Talk to me in direct chat if you want this information. (Click me and then Send Message)');
			
			}
			else
			{
		
				if (inputs[1] && inputs[2] && inputs[3])
				{
			
					var coincode = inputs[1];
					var cleancoincode = coincode.replace(/[^a-z0-9]/gi,'');
				
					var address = inputs[2];
					var cleanaddress = address.replace(/[^a-z0-9]/gi,'');
									
					var amount = parseFloat(inputs[3]).toFixed(8);
				
					if (amount == null || amount <= 0)
					{
				
						bot.sendMessage(chatId, 'Invalid amount.  Should be a number with no more than 8 decimal places.');
				
					}
					else if (coincode != cleancoincode || cleancoincode.length > 10)
					{
				
						bot.sendMessage(chatId, 'Invalid ticker.  Should be alphanumeric only.');
				
					}
					else if (address != cleanaddress)
					{
				
						bot.sendMessage(chatId, 'Invalid withdraw address.  Should be alphanumeric only.');
				
					}
					else
					{
				
						cleancoincode = cleancoincode.toUpperCase();
			
	  					sqlq = "SELECT `id` FROM `tipbot_wallets` WHERE `coincode` = " + mysql.escape(cleancoincode) + " AND `active` = 1 LIMIT 1";
						handle_database(sqlq,function(err, result){

	  						if (err)
	  						{

								returnmsg = 'Whoah!  Some kind of error happened...   Tell the admin!';
						
								bot.sendMessage(chatId, returnmsg);
								
								error_handle(err, 'withdraw', 'error');

	  						}
	  						else
	  						{   
	  			
	  							if (result.length == 0)
	  							{
	  								returnmsg = 'We don\'t have ' + cleancoincode + " available for tipping. Try /availabletips";
	  						
	  								bot.sendMessage(chatId, returnmsg);
	  						
	  							}
	  							else
	  							{
			
									var walletid = result[0].id;

	  								sqlq = "SELECT `id` FROM `tipbot_balances` WHERE `telegramuser` = " + mysql.escape(chatUserName) + " AND `wallet_id` = " + mysql.escape(walletid) + " AND `balance` >= " + parseFloat(amount) + " LIMIT 1";
	  							
	  					console.log(sqlq);		
	  							
									handle_database(sqlq,function(err, result){

	  									if (err)
	  									{

											returnmsg = 'Whoah!  Some kind of error happened...   Tell the admin!';
						
											bot.sendMessage(chatId, returnmsg);
											
											error_handle(err, 'withdraw', 'error');

	  									}
	  									else
	  									{   

	  										if (result.length == 0)
	  										{
	  											returnmsg = 'You don\'t have enough ' + cleancoincode + " to make this withdraw.";
	  							
	  											bot.sendMessage(chatId, returnmsg);
	  						
	  										}
	  										else
	  										{
	  						
	  											sqlq = "INSERT INTO `tipbot_withdraws` (`id`, `telegramuser`, `wallet_id`, `to_address`, `amount`, `processed`, `created_at`, `updated_at`) VALUES (null, " + mysql.escape(chatUserName) + ", " + mysql.escape(walletid) + ", " + mysql.escape(cleanaddress) + ", " + mysql.escape(amount) + ", 0, NOW(), NOW())";
	  											handle_database(sqlq,function(err, result){
	  										
	  												balanceUpdate(chatUserName, walletid);
	  										
	  												returnmsg = 'You have sucessfully made a withdraw request of ' + amount + ' ' + cleancoincode + ' to address ' + cleanaddress;
	  												bot.sendMessage(chatId, returnmsg);
	  										
	  											});
	  						
	  										}

										}
									
									});
							
								}
							
							}
						
						});

					}
			
				}
				else
				{
		
					bot.sendMessage(chatId, 'Invalid command format.  Try: /withdraw {TICKER} {ADDRESS} {AMOUNT}');
			
				}
			
			}
			break;
			
			
		case "/tip":
		
			if (inputs[1] && inputs[2] && inputs[3])
			{
			
				var coincode = inputs[1];
				var cleancoincode = coincode.replace(/[^a-z0-9]/gi,'');
				
				var recipient = inputs[2];
				var recipienttwo = recipient.replace('@','');
				var cleanrecipient = recipient.replace(/[^a-z0-9_]/gi,'');
				
				var amount = parseFloat(inputs[3]).toFixed(8);
				
				if (amount == null || amount <= 0)
				{
				
					bot.sendMessage(chatId, 'Invalid amount.  Should be a number with no more than 8 decimal places.');
				
				}
				else if (coincode != cleancoincode || cleancoincode.length > 10)
				{
				
					bot.sendMessage(chatId, 'Invalid ticker.  Should be alphanumeric only.');
				
				}
				else if (recipient.indexOf("@") == -1)
				{
				
					bot.sendMessage(chatId, 'Invalid recipient.  Should be a telegram username like @MrMike_O');
				
				}
				else if (recipienttwo != cleanrecipient)
				{
				
					bot.sendMessage(chatId, 'Invalid recipient.  Telegram usernames are alphanumeric or underscore only.');
				
				}
				else
				{
				
					cleancoincode = cleancoincode.toUpperCase();
			
	  				sqlq = "SELECT `id` FROM `tipbot_wallets` WHERE `coincode` = " + mysql.escape(cleancoincode) + " AND `active` = 1 LIMIT 1";
					handle_database(sqlq,function(err, result){

	  					if (err)
	  					{

							returnmsg = 'Whoah!  Some kind of error happened...   Tell the admin!';
						
							bot.sendMessage(chatId, returnmsg);
							
							error_handle(err, 'tip', 'error');

	  					}
	  					else
	  					{   
	  			
	  						if (result.length == 0)
	  						{
	  							returnmsg = 'We don\'t have ' + cleancoincode + " available for tipping. Try /availabletips";
	  						
	  							bot.sendMessage(chatId, returnmsg);
	  						
	  						}
	  						else
	  						{
			
								var walletid = result[0].id;

	  							sqlq = "SELECT `id` FROM `tipbot_balances` WHERE `telegramuser` = " + mysql.escape(chatUserName) + " AND `wallet_id` = " + mysql.escape(walletid) + " AND `balance` >= " + parseFloat(amount) + " LIMIT 1";
	  							
	  					console.log(sqlq);		
	  							
								handle_database(sqlq,function(err, result){

	  								if (err)
	  								{

										returnmsg = 'Whoah!  Some kind of error happened...   Tell the admin!';
						
										bot.sendMessage(chatId, returnmsg);
										
										error_handle(err, 'tip', 'error');

	  								}
	  								else
	  								{   

	  									if (result.length == 0)
	  									{
	  										returnmsg = 'You don\'t have enough ' + cleancoincode + " to do this tip.";
	  						
	  										bot.sendMessage(chatId, returnmsg);
	  						
	  									}
	  									else
	  									{
	  						
	  										sqlq = "INSERT INTO `tipbot_tips` (`id`, `from_telegramuser`, `to_telegramuser`, `wallet_id`, `amount`, `created_at`, `updated_at`) VALUES (null, " + mysql.escape(chatUserName) + ", " + mysql.escape(cleanrecipient) + ", " + mysql.escape(walletid) + ", " + mysql.escape(amount) + ", NOW(), NOW())";
	  										handle_database(sqlq,function(err, result){
	  										
	  											balanceUpdate(chatUserName, walletid);
	  											balanceUpdate(cleanrecipient, walletid);
	  										
	  											returnmsg = '@' + chatUserName + ' has tipped @' + cleanrecipient + ' with ' + amount + ' ' + cleancoincode;
	  											bot.sendMessage(chatId, returnmsg);
	  										
	  										});
	  						
	  									}

									}
									
								});
							
							}
							
						}
						
					});

				
				}
				
			
			
			}
			else
			{
		
				bot.sendMessage(chatId, 'Invalid command format.  Try: /tip {TICKER} {TELEGRAMUSERNAME} {AMOUNT}');
			
			}
			break;
			
		case "/balance":
			
			if (chatRoomType != 'private' && requirePrivate == true)
			{
			
				bot.sendMessage(chatId, 'Talk to me in direct chat if you want this information. (Click me and then Send Message)');
			
			}
			else
			{

				var returnmsg;
				var haserr = 0;
				
				var coincode = '';
				var cleancoincode = '';
				
				if (inputs[1])
				{
			
					var coincode = inputs[1];			
					var cleancoincode = coincode.replace(/[^a-z0-9]/gi,'');
				
					if (cleancoincode != '')
					{

						if (coincode != cleancoincode || cleancoincode.length > 10)
						{
							returnmsg = 'Check your asset ticker code format... That looks weird...';
							haserr = 1;
						}
			
						cleancoincode = cleancoincode.toUpperCase();

					}
					
				}

				if (haserr == 0)
				{
			
					if (cleancoincode != '')
					{
				  				
	  					sqlq = "SELECT `tipbot_balances`.*, `tipbot_wallets`.`coincode`, `tipbot_wallets`.`coinname` FROM `tipbot_wallets` LEFT JOIN `tipbot_balances` ON (`tipbot_wallets`.`id` = `tipbot_balances`.`wallet_id` AND `telegramuser` = " + mysql.escape(chatUserName) + ") WHERE `coincode` = " + mysql.escape(cleancoincode) + " AND `active` = 1 ORDER BY `tipbot_balances`.`balance` DESC";
	  				
	  				}
	  				else
	  				{
	  				
	  					sqlq = "SELECT `tipbot_balances`.*, `tipbot_wallets`.`coincode`, `tipbot_wallets`.`coinname` FROM `tipbot_wallets` LEFT JOIN `tipbot_balances` ON (`tipbot_wallets`.`id` = `tipbot_balances`.`wallet_id` AND `telegramuser` = " + mysql.escape(chatUserName) + ") WHERE `active` = 1 ORDER BY `tipbot_balances`.`balance` DESC";
	  				
	  				}
	  				
					handle_database(sqlq,function(err, result){

	  					if (err)
	  					{

							returnmsg = 'Whoah!  Some kind of error happened...   Tell the admin!';
						
							bot.sendMessage(chatId, returnmsg);
							
							error_handle(err, 'balance', 'error');

	  					}
	  					else if (result.length == 0)
	  					{
	  					
	  						if (cleancoincode != '')
	  						{
	  					
								returnmsg = cleancoincode + ' is not currently part of the tipping system.';
							
							}
							else
							{
							
								returnmsg = 'No balances are available.';
							
							}
						
							bot.sendMessage(chatId, returnmsg);
	  					
	  					}
	  					else
	  					{   
				
							returnmsg = 'Your tipping balances:\n----------------------------\n';

							result.forEach( (balanceinfo) => {
							
								if (balanceinfo.balance == null) balanceinfo.balance = 0;
					
								returnmsg += balanceinfo.coinname + ' balance is: ' + balanceinfo.balance + ' ' + balanceinfo.coincode + '\n';

							});

							bot.sendMessage(chatId, returnmsg);
							
						}
						
					});
					
				}
				else
				{
				
					bot.sendMessage(chatId, returnmsg);
				
				}
			
			}
			break;
			
		case "/deposits":
			
			if (chatRoomType != 'private' && requirePrivate == true)
			{
			
				bot.sendMessage(chatId, 'Talk to me in direct chat if you want this information. (Click me and then Send Message)');
			
			}
			else
			{

				var returnmsg;
				var haserr = 0;

	  				
	  			sqlq = "SELECT `tipbot_deposits`.*, `tipbot_wallets`.`coincode`, `tipbot_wallets`.`coinname` FROM `tipbot_wallets` INNER JOIN `tipbot_deposits` ON (`tipbot_wallets`.`id` = `tipbot_deposits`.`wallet_id` AND `telegramuser` = " + mysql.escape(chatUserName) + ") ORDER BY `tipbot_deposits`.`id` DESC LIMIT 20";

	  			handle_database(sqlq,function(err, result){

	  				if (err)
	  				{

						returnmsg = 'Whoah!  Some kind of error happened...   Tell the admin!';
						bot.sendMessage(chatId, returnmsg);
						error_handle(err, 'deposits', 'error');

	  				}
	  				else if (result.length == 0)
	  				{
	  					
						returnmsg = 'You have no recent or pending deposits.';
						bot.sendMessage(chatId, returnmsg);
	  					
	  				}
	  				else
	  				{   
				
						returnmsg = 'Your recent tipping deposits:\n----------------------------\n';

						result.forEach( (depositinfo) => {
												
							if (depositinfo.posted == 1)
							{
								returnmsg += depositinfo.coinname + ' deposit of ' + depositinfo.amount + ' ' + depositinfo.coincode + ' posted on ' + depositinfo.posted_date + '\n ⤷ TXID ' + depositinfo.transaction_id + '\n';
							}
							else
							{
								returnmsg += depositinfo.coinname + ' deposit of ' + depositinfo.amount + ' ' + depositinfo.coincode + ' (Not yet posted)\n ⤷ TXID ' + depositinfo.transaction_id + '\n';
							}

						});

						bot.sendMessage(chatId, returnmsg);
							
					}
						
				});
					
			
			}
			break;

		case "/withdraws":
			
			if (chatRoomType != 'private' && requirePrivate == true)
			{
			
				bot.sendMessage(chatId, 'Talk to me in direct chat if you want this information. (Click me and then Send Message)');
			
			}
			else
			{

				var returnmsg;
				var haserr = 0;

	  				
	  			sqlq = "SELECT `tipbot_withdraws`.*, `tipbot_wallets`.`coincode`, `tipbot_wallets`.`coinname` FROM `tipbot_wallets` INNER JOIN `tipbot_withdraws` ON (`tipbot_wallets`.`id` = `tipbot_withdraws`.`wallet_id` AND `telegramuser` = " + mysql.escape(chatUserName) + ") ORDER BY `tipbot_withdraws`.`id` DESC LIMIT 20";

	  			handle_database(sqlq,function(err, result){

	  				if (err)
	  				{

						returnmsg = 'Whoah!  Some kind of error happened...   Tell the admin!';
						bot.sendMessage(chatId, returnmsg);
						error_handle(err, 'withdraws', 'error');

	  				}
	  				else if (result.length == 0)
	  				{
	  					
						returnmsg = 'You have no recent or pending withdraws.';
						bot.sendMessage(chatId, returnmsg);
	  					
	  				}
	  				else
	  				{   
				
						returnmsg = 'Your recent tipping withdraws:\n----------------------------\n';

						result.forEach( (withdrawinfo) => {
												
							if (withdrawinfo.processed == 1)
							{
								returnmsg += withdrawinfo.coinname + ' withdraw of ' + withdrawinfo.amount + ' ' + withdrawinfo.coincode + ' to address ' + withdrawinfo.to_address + ' processed on ' + withdrawinfo.processed_date + '\n ⤷ TXID ' + withdrawinfo.transaction_id + '\n';
							}
							else
							{
								returnmsg += withdrawinfo.coinname + ' withdraw of ' + withdrawinfo.amount + ' ' + withdrawinfo.coincode + ' to address ' + withdrawinfo.to_address + ' (Not yet processed)\n\n';
							}

						});

						bot.sendMessage(chatId, returnmsg);
							
					}
						
				});
					
			
			}
			break;
	
		default:
		
			if (iscommand == 1)
			{
				bot.sendMessage(chatId, 'I don\'t know that command (' + command + ')..  Try /help');
			}
	
	}


});

/*
* Process deposits, withdraws, and wallet infos every 5 minutes
*/

setInterval(function(){ 

	checkAddressPools();
	checkWalletInfos();
	checkPendingDeposits();
	checkPendingWithdrawals();

}, 300000);


checkAddressPools();
checkWalletInfos();
checkPendingDeposits();
checkPendingWithdrawals();

// Webservice

var port = process.env.PORT || 699;        // set our port

// ROUTES FOR OUR API
// =============================================================================
var router = express.Router();              // get an instance of the express Router

// test route to make sure everything is working (accessed at GET http://localhost:699/dep)

router.get('/', function(req, res) {
    res.json({ message: 'It works, now what?'});   
});

// This is how the wallet tells us there is a new deposit
router.route('/gettransactioninfo/:id/:trxid')
    .get(function(req, res) {
    
		sqlq = "SELECT * FROM `tipbot_wallets` WHERE `active`= 1 AND `type` = 'Tip' AND `id` = " + mysql.escape(req.params.id);
		handle_database(sqlq,function(err, result){
			    
		  	if (err)
		  	{

    			message = {error: {code: 400, message: 'Unknown error', description: 'An error has occurred.  Try your request again.'}};
    			error_handle(message, 'gettransactioninfo', 'error');
    			res.status(400).json(message);
	
			}
 			else if (result.length == 0)
			{

    			message = {error: {code: 2002, message: 'Wallet not found or inactive', description: 'Check wallet ID'}};
    			res.status(400).json(message);
    				  		
			}
			else
			{   
				
				var walletinfo = result[0];
					
				console.log(req.params.trxid);
				console.log(req.params.id);
				
				getTransaction(req.params.trxid, walletinfo, walletinfo.username, walletinfo.password, function(err, trxresult) {

					processTransactionInfo(walletinfo.id, trxresult.txid, trxresult.details, walletinfo.connector);

				});

    			var message = {error: {code: 200, message: 'OK'}};
    			res.status(200).json(message);
    			
    		}
    		
    	});
    
    });

/////
// Catch any unmatching routes
/////    
    
router.route('*')
    .get(function(req, res) {
    
    	var message = {error: {code: 400, message: 'Method not found', description: 'You should not be here.'}};
    	res.status(400).json(message);

    });
    
    
// REGISTER OUR ROUTES -------------------------------
// all of our routes will be prefixed with /
app.use('/dep', router);

// START THE SERVER
// =============================================================================
app.listen(port);
console.log('The magic happens on port ' + port);


function checkPendingDeposits()
{

	console.log('Checking pending deposits');

	sqlq = "SELECT * FROM `tipbot_deposits` WHERE `posted` = 0";
	handle_database(sqlq,function(err, result){

		if (err)
		{
	
			return false;

		}
		else
		{   
	  			
			if (result.length > 0)
			{

				result.forEach( (row) => {
				
					sqlq = "SELECT * FROM `tipbot_wallets` WHERE `active`= 1 AND `type` = 'Tip' AND `id` = " + mysql.escape(row.wallet_id);
					handle_database(sqlq,function(err, result){
			    
		  				if (err)
		  				{

    						error_handle(err, 'gettransactioninfo', 'error');
	
						}
 						else if (result.length == 0)
						{

							console.log("Wallet #" + row.wallet_id + " is not active");
    				  		
						}
						else
						{   
				
							var walletinfo = result[0];
				
							getTransaction(row.transaction_id, walletinfo, walletinfo.username, walletinfo.password, function(err, trxresult) {

								processTransactionInfo(walletinfo.id, trxresult.txid, trxresult.details, walletinfo.connector);

							});

    			
    					}
    		
    				});
				
				});
				
				return true;
				
			}
			else
			{
			
				return true;
			
			}
			
		}
		
	});

}

function checkPendingWithdrawals()
{

	console.log('Checking pending withdraws');

	sqlq = "SELECT * FROM `tipbot_withdraws` WHERE `processed` = 0";
	handle_database(sqlq,function(err, result){

		if (err)
		{
	
			return false;

		}
		else
		{   
	  			
			if (result.length > 0)
			{

				result.forEach( (row) => {
				
					sqlq = "SELECT * FROM `tipbot_wallets` WHERE `active`= 1 AND `type` = 'Tip' AND `id` = " + mysql.escape(row.wallet_id);
					handle_database(sqlq,function(err, resulttwo){
			    
		  				if (err)
		  				{

    						error_handle(err, 'gettransactioninfo', 'error');
	
						}
 						else if (resulttwo.length == 0)
						{

							console.log("Wallet #" + row.wallet_id + " is not active");
    				  		
						}
						else
						{   
				
							var walletinfo = resulttwo[0];
							
							var bclient = new bitcoinClient({ version: walletinfo.connector_version, host: walletinfo.host, port: walletinfo.port, username: walletinfo.username, password: walletinfo.password });
														
							bclient.validateAddress(row.to_address).then((validresponse) => updateAddressValidity(row.id, validresponse.isvalid, row, walletinfo)).catch((err) => error_handle(err, 'validateaddress', 'error'));

    					}
    		
    				});
				
				});
				
			}
			
			return true;
			
		}
		
	});

}

function recordTrxid(withdrawid, trxid)
{

	if (withdrawid > 0 && trxid)
	{
	
		sqlq = "UPDATE `tipbot_withdraws` SET `transaction_id` = " + mysql.escape(trxid) + ", `updated_at` = NOW() WHERE `id` = " + mysql.escape(withdrawid);		
		
		handle_database(sqlq,function(err, result){
		
			return true;
		
		});
		
	}
	
	return false;

}

function updateAddressValidity(withdrawid, isvalid, withdrawinfo, walletinfo)
{

	if (isvalid == true || isvalid == 'true')
	{
		sqlq = "UPDATE `tipbot_withdraws` SET `processed` = 1, `updated_at` = NOW(), `processed_date` = NOW() WHERE `id` = " + mysql.escape(withdrawid);		
		
		handle_database(sqlq,function(err, result){

			var bclient = new bitcoinClient({ version: walletinfo.connector_version, host: walletinfo.host, port: walletinfo.port, username: walletinfo.username, password: walletinfo.password });
														
			bclient.sendToAddress(withdrawinfo.to_address, withdrawinfo.amount).then((trxid) => recordTrxid(withdrawid, trxid)).catch((err) => console.log(row.to_address + ':' + row.amount + ':' + err));

			return true;

		});
		
	}
	else
	{
		sqlq = "DELETE FROM `tipbot_withdraws` WHERE `processed` = 0 AND `id` = " + mysql.escape(withdrawid);
		
		handle_database(sqlq,function(err, result){
			// Updated
			
			balanceUpdate(withdrawinfo.telegramuser, withdrawinfo.wallet_id);
			return true;
		});
		
	}

}


function checkAddressPools()
{

	console.log('Checking address pools');

	var poolsize = 10;

	sqlq = "SELECT * FROM `tipbot_wallets` WHERE `active` = 1";
	handle_database(sqlq,function(err, result){

		if (err)
		{
	
			return false;

		}
		else
		{   
	  			
			if (result.length > 0)
			{

				result.forEach( (row) => {

					sqlq = "SELECT count(*) as `addrcount` FROM `tipbot_addresses` WHERE `telegramuser` IS NULL AND `wallet_id` = " + row.id;
					handle_database(sqlq,function(err, resulttwo){

						if (!err)
						{
					
							resulttwo.forEach( (rowtwo) => {
						
								if (rowtwo.addrcount < poolsize)
								{

									for (i = rowtwo.addrcount; i < poolsize; i++)
									{
								
										var bclient = new bitcoinClient({ version: row.connector_version, host: row.host, port: row.port, username: row.username, password: row.password });
							
										bclient.getNewAddress().then((address) => processAddressInfo(row.id, address)).catch((err) => error_handle(err, 'getnewaddress', 'error'));
							
									}
							
								}
						
							});

						}
				
					});

				});

			}
			
			return true;
		
		}
		
	});

}

function checkWalletInfos()
{

	console.log('Checking wallet infos');

	sqlq = "SELECT * FROM `tipbot_wallets` WHERE `active` = 1";
	handle_database(sqlq,function(err, result){

		if (err)
		{
	
			return false;

		}
		else
		{   
	  			
			if (result.length > 0)
			{

				result.forEach( (row) => {


					var hasmethods = row.hasmethods.split(",");
										
					if (row.connector == 'bitcoin-core')
					{
					
						console.log("Process Wallet Info Called for ID " + row.id);
	
						var bclient = new bitcoinClient({ version: row.connector_version, host: row.host, port: row.port, username: row.username, password: row.password });					
					
						if (hasmethods.indexOf('getwalletinfo') >= 0)
						{
							bclient.getWalletInfo().then((info) => processWalletInfo(row.id, info, '', row.blockheight)).catch((err) => error_handle(err, 'getwalletinfo', 'error'));
						}
						
						if (row['hasmethods'] == 'getinfo')
						{
							bclient.getInfo().then((info) => processWalletInfo(row.id, info, 'simpleversion', row.blockheight)).catch((err) => error_handle(err, 'getinfo', 'error'));
							bclient.getBlockTemplate({}).then((info) => processWalletInfo(row.id, info, 'getblocktemplate', row.blockheight)).catch((err) => error_handle(err, 'getblocktemplate' + row.id, 'error'));
						}
						else if (row['hasmethods'] == 'getinfonoparm')
						{
							bclient.getInfo().then((info) => processWalletInfo(row.id, info, 'simpleversion', row.blockheight)).catch((err) => error_handle(err, 'getinfo', 'error'));
							bclient.getBlockTemplate().then((info) => processWalletInfo(row.id, info, 'getblocktemplate', row.blockheight)).catch((err) => error_handle(err, 'getblocktemplate' + row.id, 'error'));
						}
						else if (row['hasmethods'] == 'getinfo,getbestblockhash')
						{
							bclient.getInfo().then((info) => processWalletInfo(row.id, info, 'simpleversion', row.blockheight)).catch((err) => error_handle(err, 'getinfo', 'error'));
						}
						else if (hasmethods.indexOf('getinfo') >= 0)
						{
							bclient.getInfo().then((info) => processWalletInfo(row.id, info, '', row.blockheight)).catch((err) => error_handle(err, 'getinfo', 'error'));
						}
						
						if (hasmethods.indexOf('getnetworkinfo') >= 0)
						{
							bclient.getNetworkInfo().then((info) => processWalletInfo(row.id, info, 'version', row.blockheight)).catch((err) => error_handle(err, 'getnetworkinfo', 'error'));
						}
						
						if (hasmethods.indexOf('getblockchaininfo') >= 0)
						{
							bclient.getBlockchainInfo().then((info) => processWalletInfo(row.id, info, '', row.blockheight)).catch((err) => error_handle(err, 'getblockchaininfo', 'error'));
						}
						
						if (hasmethods.indexOf('getbestblockhash') >= 0)
						{
							bclient.getBestBlockHash().then((blockinfo) => bclient.getBlock(blockinfo).then((info) => processWalletInfo(row.id, info, 'blocktime', row.blockheight))).catch((err) => error_handle(err, 'getbestblockhash', 'error'));
						}
						
						bclient.getBalance('*', 10).then((info) => processWalletInfoSimple(row.id, 'balance_confirmed', info)).catch((err) => error_handle(err, 'getconfirmedbalance', 'error'));
							
						bclient.getPeerInfo().then((info) => processPeerInfo(row.id, info)).catch((err) => error_handle(err, 'getpeerinfo', 'error'));
					
					}

				});
			
				return true;

			}
			else
			{
		
				return false;
			
			}

		}

	});
	
}


function processAddressInfo(id, address)
{

	console.log("processAddressInfo::" + id + "::" + address);

	sqlq = "INSERT INTO `tipbot_addresses` (`id`, `telegramuser`, `wallet_id`, `address`, `created_at`, `updated_at`) VALUES (null, null, " + mysql.escape(id) + ", " + mysql.escape(address) + ", NOW(), NOW())";

	handle_database(sqlq,function(err, result){
		console.log(err);
		// Inserted
		return true;
	});

}



function processWalletInfoSimple(id, field, data)
{

	sqlq = "UPDATE `tipbot_wallets` SET `" + field + "` = " + mysql.escape(data) + ", `updated_at` = NOW() WHERE `id` = " + mysql.escape(id);

	//console.log(sqlq);

	handle_database(sqlq,function(err, result){
	
		if (err)
		{
			return false;
		}
		else
		{
			return true;
		}

	});

}

function processPeerInfo(id, info)
{

	var addresses = [];
	var addrstring = '';

	info.forEach( (peerdata) => {   
	
		addresses.push(peerdata['addr']);
	
	});
	
	if (addresses.length > 0)
	{
	
		addrstring = addresses.toString();

		sqlq = "UPDATE `tipbot_wallets` SET `peerdata` = " + mysql.escape(addrstring) + ", `updated_at` = NOW() WHERE `id` = " + mysql.escape(id);

		handle_database(sqlq,function(err, result){
	
			if (err)
			{
				return false;
			}
			else
			{
				return true;
			}

		});
	
	}
	
	return true;

}

function processWalletInfo(id, info, options = '', currentchainsize = 0)
{
	
	var sqlupdate = '';

	if (options == 'version' && isset(info['version'])) sqlupdate += "`version`=" + mysql.escape(info['version']) + ",";
	if (options == 'version' && isset(info['subversion'])) sqlupdate += "`subversion`=" + mysql.escape(info['subversion']) + ",";
	
	if (options == 'simpleversion')
	{

		sqlupdate += "`subversion`=" + mysql.escape(info['version']) + ",";
		sqlupdate += "`version`=" + mysql.escape(info['protocolversion']) + ",";

	}

	if (options == 'getblocktemplate' && isset(info['mintime'])) 
	{
		var newDate = new Date(info['mintime']*1000);
		sqlupdate += "`lastblock`=" + mysql.escape(newDate) + ",";
	}
	
	if (isset(info['connections'])) sqlupdate += "`connections`=" + mysql.escape(info['connections']) + ",";
	
	if (isset(info['balance'])) sqlupdate += "`balance`=" + mysql.escape(info['balance']) + ",";
		
	if (isset(info['blocks']))
	{
		sqlupdate += "`blockheight`=" + mysql.escape(info['blocks']) + ",";		
	}

	if (info['warnings']) sqlupdate += "`alerts`=" + mysql.escape(info['warnings']) + ",";

	if (options == 'blocktime' && info['time']) 
	{
		var newDate = new Date(info['time']*1000);
		sqlupdate += "`lastblock`=" + mysql.escape(newDate) + ",";
	}
		
	sqlq = "UPDATE `tipbot_wallets` SET " + sqlupdate + "`updated_at` = NOW() WHERE `id` = " + mysql.escape(id);
		
	handle_database(sqlq,function(err, result){

		return true;

	});

}

function isset(variable) {
    try {
        return typeof eval(variable) !== 'undefined';
    } catch (err) {
        return false;
    }
}

function connectClient(walletinfo, username, password, res)
{

	var bclient = null;

	if (walletinfo.connector == 'bitcoin-core')
	{

		bclient = new bitcoinClient({ version: walletinfo.connector_version, host: walletinfo.host, port: walletinfo.port, username: username, password: password });

	}
	else
	{
	
		// Wallets other than bitcoin clones are not yet implemented
	
	}

	res(bclient);
	return;

}

function getTransaction(transactionid, walletinfo, username, password, res)
{

	var transinfo = [];
		
	if (!transactionid || !walletinfo || !username || !password)
	{
		
		console.log('Missing information');
	
		res(null,transinfo);
		return;
	}

	connectClient(walletinfo, username, password, function(bclient) {
	
		if (bclient == null)
		{
	
			console.log("Connection Issue at connectClient");
	
		}

		if (walletinfo.connector == 'bitcoin-core')
		{

			bclient.getTransaction(transactionid, function(err, info) {

				transinfo = [];
			
				if (info)
				{
			
					transinfo['details'] = [];
			
					var confirmations = info['confirmations'];
					var trxdetails = info['details'];
				
					if (info['blocktime'])
					{
						var blocktime = new Date(info['blocktime'] * 1000);
					}
					else if (info['time'])
					{
						var blocktime = new Date(info['time'] * 1000);
					}
					else
					{
						var blocktime = '';
					}
					
					var blockhash = info['blockhash'];
					var blockindex = info['blockindex'];
					var txid = transactionid; //info['txid'];
					var fee = 0;
					if (info['fee'])
					{
						fee = info['fee'];
					}
					
					var walletconflicts = info['walletconflicts']; // an array
					
					if (walletconflicts)
					{

						walletconflicts.forEach((conflicttrxid) => {
						
							console.log(" ************ Wallet Conflicts!!! ************");
						
							console.log("Send Trxid: " + conflicttrxid + " as reversed");
													
						});
					
					}

					transinfo['totalamount'] = info['amount'];
					transinfo['blocktime'] = blocktime;
					transinfo['blockhash'] = blockhash;
					transinfo['blockindex'] = blockindex;
					transinfo['txid'] = txid;
					transinfo['confirmations'] = confirmations;
					transinfo['fee'] = fee;

					trxdetails.forEach((singletrx, index) => {

						var temptrx = [];
						temptrx['confirmations'] = confirmations;
						transinfo['confirmations'] = confirmations;
						temptrx['amount'] = singletrx['amount'];
						temptrx['type'] = singletrx['category'];
						temptrx['address'] = singletrx['address'];
						temptrx['paymentid'] = '';
						if (singletrx['fee'])
						{
							temptrx['fee'] = singletrx['fee'];
						}
							else
						{
							temptrx['fee'] = 0;
						}
		
						transinfo['details'].push(temptrx);
	
					});			

				
				}
				else
				{
				
					console.log(err);
				
				}

console.log("xxxxx Crypto (" + walletinfo.notes + ") xxxxx");					
console.log(transinfo); 				
console.log("xxxxx Crypto (" + walletinfo.notes + ") xxxxx");					

				res(null,transinfo);
				return;
				
			});
		
		}
		else
		{
		
			// Unknown connector
	
			res(null,transinfo);
			return;
	
		}
	
	});


}

function processTransactionInfo(id, trxid, transinfo, connector)
{
	
	if (transinfo)
	{

		transinfo.forEach((singletrx, index) => {
	
			if (singletrx['type'] == 'receive' && parseFloat(singletrx['amount']) > 0)
			{

				sqlq = "SELECT `tipbot_addresses`.*, `tipbot_wallets`.`limit_confirmations`, `tipbot_wallets`.`active`, `tipbot_wallets`.`type`, `tipbot_wallets`.`id` as `walletid` FROM `tipbot_addresses` INNER JOIN `tipbot_wallets` ON (`tipbot_wallets`.`id` = `tipbot_addresses`.`wallet_id`) WHERE `wallet_id` = " + mysql.escape(id) + " AND `address` = " + mysql.escape(singletrx['address']);
				
				console.log(sqlq);

				handle_database(sqlq,function(err, result){

			  		if (err)
			  		{

    					error_handle(sqlq, 'processTransactionInfo', 'error');
	
					}
					else if (result.length == 0)
					{

    					console.log("Do nothing - " + singletrx['address'] + " is not one of our addresses");
    				  		
					}
					else
					{   
			
						var useraddressinfo = result[0];
				
						if (useraddressinfo['active'] == 0)
						{

							console.log('Wallet ' + useraddressinfo['walletid'] + ' not active');
					
						}
						else
						{
							var canpost = 0;
							if (useraddressinfo['limit_confirmations'] <= singletrx['confirmations'])
							{
								canpost = 1;
								console.log("This CAN be posted");
							}
					
							var telegramuser = useraddressinfo['telegramuser'];
							var walletid = useraddressinfo['walletid'];
							var addressid = useraddressinfo['id'];

							sqlq = "SELECT * FROM `tipbot_deposits` WHERE `amount` = " + mysql.escape(singletrx['amount']) + " AND `telegramuser` = " + mysql.escape(telegramuser) + " AND `wallet_id` = " + mysql.escape(walletid) + " AND `transaction_id` = " + mysql.escape(trxid);
			
							handle_database(sqlq,function(err, result){

		  						if (err)
		  						{

    								error_handle(sqlq, 'processTransactionInfo', 'error');
		
								}
								else if (result.length == 0)
								{
	
									console.log("Transaction not yet inserted");									
	
									if (canpost == 1)
									{
	
										sqlq = "INSERT INTO `tipbot_deposits` (`id`, `telegramuser`, `wallet_id`, `transaction_id`, `amount`, `posted`, `confirmations`, `address`, `address_id`, `posted_date`, `created_at`, `updated_at`)"
											+ " VALUES (null, " + mysql.escape(telegramuser) + ", " + mysql.escape(walletid) + ", " + mysql.escape(trxid) + ", " + mysql.escape(singletrx['amount']) + ", " + mysql.escape(canpost) + ", " + mysql.escape(singletrx['confirmations']) + ", " + mysql.escape(singletrx['address']) + ", " + mysql.escape(addressid) + ", NOW(), NOW(), NOW())";

									}
									else
									{
										sqlq = "INSERT INTO `tipbot_deposits` (`id`, `telegramuser`, `wallet_id`, `transaction_id`, `amount`, `posted`, `confirmations`, `address`, `address_id`, `created_at`, `updated_at`)"
											+ " VALUES (null, " + mysql.escape(telegramuser) + ", " + mysql.escape(walletid) + ", " + mysql.escape(trxid) + ", " + mysql.escape(singletrx['amount']) + ", " + mysql.escape(canpost) + ", " + mysql.escape(singletrx['confirmations']) + ", " + mysql.escape(singletrx['address']) + ", " + mysql.escape(addressid) + ", NOW(), NOW())";

									}

									handle_database(sqlq,function(err, result){
							
										if (!err && canpost == 1)
										{

	        								// do balance update
											balanceUpdate(telegramuser, walletid);

								
										}
														
									});
    				  		
								}
								else
								{  
			
									console.log("Transaction exists - Update");
			
									var depositinfo = result[0];
							
									if (depositinfo['posted'] == 1)
									{
							
										console.log("Transaction already paid.  Check for reversals...");
										
										
										if (singletrx['confirmations'] < 0)
										{
										
											// Reversal -- This is bad
											
											console.log("A reversal has occurred!!!!");
											
											sqlq = "UPDATE `tipbot_deposits` SET `posted` = -1, `confirmations` = " + mysql.escape(singletrx['confirmations']) + ", `updated_at` = NOW() WHERE `id` = " + mysql.escape(depositinfo['id']);

											handle_database(sqlq,function(err, result){

												// do balance update
												balanceUpdate(telegramuser, walletid);						
										
											});
										
										}
			
									}
									else if (depositinfo['posted'] == 0)
									{
							
										if (canpost == 1)
										{
							
											sqlq = "UPDATE `tipbot_deposits` SET `posted` = 1, `posted_date` = NOW(), `confirmations` = " + mysql.escape(singletrx['confirmations']) + ", `updated_at` = NOW() WHERE `id` = " + mysql.escape(depositinfo['id']);
							
										}
										else
										{
								
											sqlq = "UPDATE `tipbot_deposits` SET `confirmations` = " + mysql.escape(singletrx['confirmations']) + ", `updated_at` = NOW() WHERE `id` = " + mysql.escape(depositinfo['id']);
								
										}
																
										handle_database(sqlq,function(err, result){
							
											if (canpost == 1)
											{
										
    	    									// do balance update
    	    									balanceUpdate(telegramuser, walletid);
									
											}
																												
										});
								
									}
			
								}
			
							});
				
						}
	
					}

				});
	
			}
	
		});
	
	}
	
	return true;

}


function balanceUpdate(telegramuser, walletid)
{

	console.log("Balance Update -- " + telegramuser + ":" + walletid);

	if (telegramuser != '' && walletid > 0)
	{

	  	var totaldeposits = 0;
	  	var totalwithdrawals = 0;
	  	var totalreceives = 0;
	  	var totalsends = 0;

	  	// Deposits
	  	
	  	sqlq = "SELECT SUM(`amount`) AS `total` FROM `tipbot_deposits` WHERE `telegramuser`= " + mysql.escape(telegramuser) + " AND `wallet_id` = " + mysql.escape(walletid) + " AND `posted` = 1";
	  	
	  	handle_database(sqlq,function(err, result)
	  	{
	  		
	  		result.forEach( (row) => {
	  		
	  			totaldeposits += row['total'];
	  		
	  		});
	  				  		
	  		// Withdrawals
	  		
	  		sqlq = "SELECT SUM(`amount`) AS `total` FROM `tipbot_withdraws` WHERE `telegramuser`= " + mysql.escape(telegramuser) + " AND `wallet_id` = " + mysql.escape(walletid);
	  		
	  		handle_database(sqlq,function(err, result)
	  		{
	  		
	  			result.forEach( (row) => {
	  		
	  				totalwithdrawals += row['total'];
	  		
	  			});
	  					  				
	  			// total receives
	  			sqlq = "SELECT SUM(`amount`) AS `total` FROM `tipbot_tips` WHERE `to_telegramuser` = " + mysql.escape(telegramuser) + " AND `wallet_id` = " + mysql.escape(walletid);

		 		handle_database(sqlq,function(err, result)
		  		{
	  		
		  			result.forEach( (row) => {
	  		
		  				totalreceives += row['total'];
	  		
		  			});

	  				// total sends
	  				sqlq = "SELECT SUM(`amount`) AS `total` FROM `tipbot_tips` WHERE `from_telegramuser` = " + mysql.escape(telegramuser) + " AND `wallet_id` = " + mysql.escape(walletid);

		  			handle_database(sqlq,function(err, result)
		  			{
	  		
		  				result.forEach( (row) => {
	  		
		  					totalsends += row['total'];
	  		
		  				});
		  				
		  				
						var balance = new Big(0);
						balance = balance.plus(totaldeposits).minus(totalwithdrawals).plus(totalreceives).minus(totalsends);

		  				var truebalance = balance.round(8,0).toFixed(8);
		  				
		  				sqlq = "INSERT INTO `tipbot_balances` (`id`, `telegramuser`, `wallet_id`, `balance`, `created_at`, `updated_at`) VALUES (null, " + mysql.escape(telegramuser) + ", " + mysql.escape(walletid) + ", " + mysql.escape(truebalance) + ", NOW(), NOW()) ON DUPLICATE KEY UPDATE `balance` = " + mysql.escape(truebalance) + ", `updated_at` = NOW()";
		  				handle_database(sqlq,function(err, result)
		  				{
		  			
		  				});
		  				
		  			});
		  			
		  		});
		  		
		  	});
		  	
		});

	}
	
	return true;

}


function error_handle(error, caller = 'Unknown', severity = 'error')
{

	var scriptname = 'telegramBot';

	console.log("Error Handle has been called!");

	let transporter = nodemailer.createTransport({
	    sendmail: true,
	    newline: 'unix',
	    path: '/usr/sbin/sendmail'
	});
	transporter.sendMail({
	    from: error_from_email,
	    to: error_to_email,
	    subject: 'OhNo! Error in ' + scriptname + ' at ' + caller,
	    text: 'OhNo! Error in ' + scriptname + ' at ' + caller + '\n\n' + JSON.stringify(error)
	}, (err, info) => {
	    console.log(err);
	    console.log(info);
	});
	
}


function handle_database(req,res) {

    pool.getConnection(function(err,connection){
        if (err) {
          if (connection) connection.release();
          console.log("ERROR IN DATABASE CONNECTION");
          error_handle(err, 'handle_database');
          res({"code" : 100, "status" : "Error in connection database"},null);
          return;
        }   

        //console.log('connected to db as id ' + connection.threadId);

        connection.query(req,function(err,rows){
        	//console.log('releasing db connection id ' + connection.threadId);
            connection.release();
            if(!err) {
                res(null,rows);
                return;
            }
            else
            {
                res(err,null);
                return;
            }    
        });
        
	});
}


