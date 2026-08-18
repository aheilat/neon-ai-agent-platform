CREATE TABLE `whatsapp_embedded_credentials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`channelIntegrationId` int NOT NULL,
	`whatsappBusinessAccountId` varchar(100) NOT NULL,
	`phoneNumberId` varchar(100) NOT NULL,
	`businessPortfolioId` varchar(100),
	`encryptedBusinessToken` longtext NOT NULL,
	`tokenVersion` varchar(20) NOT NULL DEFAULT 'v1',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `whatsapp_embedded_credentials_id` PRIMARY KEY(`id`)
);
