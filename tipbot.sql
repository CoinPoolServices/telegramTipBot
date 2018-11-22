

SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
--  Table structure for `tipbot_addresses`
-- ----------------------------
DROP TABLE IF EXISTS `tipbot_addresses`;
CREATE TABLE `tipbot_addresses` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `telegramuser` varchar(60) COLLATE utf8_unicode_ci DEFAULT NULL,
  `wallet_id` int(11) DEFAULT NULL,
  `address` varchar(120) COLLATE utf8_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `telegramuser` (`telegramuser`),
  KEY `wallet_id` (`wallet_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- ----------------------------
--  Table structure for `tipbot_balances`
-- ----------------------------
DROP TABLE IF EXISTS `tipbot_balances`;
CREATE TABLE `tipbot_balances` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `telegramuser` varchar(60) COLLATE utf8_unicode_ci DEFAULT NULL,
  `wallet_id` int(11) unsigned DEFAULT NULL,
  `balance` decimal(30,8) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `telegramuser_2` (`telegramuser`,`wallet_id`),
  KEY `telegramuser` (`telegramuser`),
  KEY `wallet_id` (`wallet_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- ----------------------------
--  Table structure for `tipbot_deposits`
-- ----------------------------
DROP TABLE IF EXISTS `tipbot_deposits`;
CREATE TABLE `tipbot_deposits` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `telegramuser` varchar(60) COLLATE utf8_unicode_ci DEFAULT NULL,
  `wallet_id` int(11) unsigned DEFAULT NULL,
  `address_id` int(11) DEFAULT NULL,
  `address` varchar(120) COLLATE utf8_unicode_ci DEFAULT NULL,
  `amount` decimal(30,8) DEFAULT NULL,
  `confirmations` int(11) DEFAULT '0',
  `transaction_id` varchar(120) COLLATE utf8_unicode_ci DEFAULT NULL,
  `posted` tinyint(1) DEFAULT '0',
  `posted_date` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `wallet_id` (`wallet_id`),
  KEY `address_id` (`address_id`),
  KEY `telegramuser` (`telegramuser`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- ----------------------------
--  Table structure for `tipbot_tips`
-- ----------------------------
DROP TABLE IF EXISTS `tipbot_tips`;
CREATE TABLE `tipbot_tips` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `from_telegramuser` varchar(60) COLLATE utf8_unicode_ci DEFAULT NULL,
  `to_telegramuser` varchar(60) COLLATE utf8_unicode_ci DEFAULT NULL,
  `wallet_id` int(11) DEFAULT NULL,
  `amount` decimal(30,10) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `from_telegramuser` (`from_telegramuser`),
  KEY `to_telegramuser` (`to_telegramuser`),
  KEY `walletid` (`wallet_id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- ----------------------------
--  Table structure for `tipbot_wallets`
-- ----------------------------
DROP TABLE IF EXISTS `tipbot_wallets`;
CREATE TABLE `tipbot_wallets` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `coinname` varchar(40) COLLATE utf8_unicode_ci DEFAULT NULL,
  `coincode` varchar(10) COLLATE utf8_unicode_ci DEFAULT NULL,
  `notes` varchar(40) COLLATE utf8_unicode_ci DEFAULT NULL,
  `type` enum('Tip') COLLATE utf8_unicode_ci DEFAULT 'Tip',
  `limit_confirmations` int(11) DEFAULT '3',
  `min_withdrawal` decimal(20,8) unsigned DEFAULT '1.00000000',
  `connector` varchar(80) COLLATE utf8_unicode_ci DEFAULT NULL,
  `property_id` int(11) unsigned DEFAULT '0',
  `connector_version` varchar(20) COLLATE utf8_unicode_ci DEFAULT NULL,
  `connector_extra` varchar(200) COLLATE utf8_unicode_ci DEFAULT NULL,
  `hasmethods` varchar(80) COLLATE utf8_unicode_ci DEFAULT NULL,
  `depositaccount` varchar(20) COLLATE utf8_unicode_ci DEFAULT NULL,
  `nosendcomment` tinyint(1) DEFAULT '0',
  `hostname` varchar(20) COLLATE utf8_unicode_ci DEFAULT NULL,
  `host` varchar(40) COLLATE utf8_unicode_ci DEFAULT NULL,
  `port` int(11) DEFAULT NULL,
  `backup_daemon` varchar(40) COLLATE utf8_unicode_ci DEFAULT NULL,
  `runas_user` varchar(40) COLLATE utf8_unicode_ci DEFAULT NULL,
  `masteraddress` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `username` varchar(40) COLLATE utf8_unicode_ci DEFAULT NULL,
  `password` varchar(40) COLLATE utf8_unicode_ci DEFAULT NULL,
  `blockheight` int(11) DEFAULT NULL,
  `lastblock` datetime DEFAULT NULL,
  `connections` int(11) unsigned DEFAULT NULL,
  `subversion` varchar(30) COLLATE utf8_unicode_ci DEFAULT NULL,
  `version` varchar(30) COLLATE utf8_unicode_ci DEFAULT NULL,
  `alerts` text COLLATE utf8_unicode_ci,
  `balance` decimal(30,8) unsigned DEFAULT '0.00000000',
  `balance_confirmed` decimal(30,8) unsigned DEFAULT '0.00000000',
  `active` tinyint(1) unsigned DEFAULT '0',
  `peerdata` text COLLATE utf8_unicode_ci,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `coincode` (`coincode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- ----------------------------
--  Table structure for `tipbot_withdraws`
-- ----------------------------
DROP TABLE IF EXISTS `tipbot_withdraws`;
CREATE TABLE `tipbot_withdraws` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `telegramuser` varchar(60) COLLATE utf8_unicode_ci DEFAULT NULL,
  `wallet_id` int(11) DEFAULT NULL,
  `to_address` varchar(120) COLLATE utf8_unicode_ci DEFAULT NULL,
  `amount` decimal(30,8) DEFAULT NULL,
  `processed` tinyint(1) DEFAULT '0',
  `transaction_id` varchar(120) COLLATE utf8_unicode_ci DEFAULT NULL,
  `processed_date` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `telegramuser` (`telegramuser`),
  KEY `wallet_id` (`wallet_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

INSERT INTO `tipbot_wallets` VALUES ('1', 'iDealCash', 'DEAL', null, 'Tip', '3', '1.00000000', 'bitcoin-core', '0', '0.10.0', null, 'getinfo,getbestblockhash', null, '0', 'tips', '127.0.0.1', '9999', 'idealcashd', 'idealcash', 'DE3Bk8eekGce4iTH71JH2Zu5Z8P2TKwFn3', '*someusername*', '*somepassword*', '0', null, '0', '', '', null, '0', '0', '0', '', NOW(), NOW());

