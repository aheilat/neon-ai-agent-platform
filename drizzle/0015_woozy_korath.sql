CREATE TABLE `payment_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`subscriptionId` int,
	`checkoutId` varchar(255) NOT NULL,
	`paymentId` varchar(255),
	`amount` int NOT NULL,
	`currency` varchar(10) NOT NULL DEFAULT 'SAR',
	`status` enum('pending','success','failed','refunded') NOT NULL DEFAULT 'pending',
	`responseCode` varchar(50),
	`responseMessage` text,
	`gatewayResponseJson` longtext,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `payment_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`planName` varchar(50) NOT NULL DEFAULT 'starter',
	`status` enum('active','trialing','past_due','canceled','incomplete') NOT NULL DEFAULT 'incomplete',
	`amount` int NOT NULL,
	`currency` varchar(10) NOT NULL DEFAULT 'SAR',
	`hyperPayCheckoutId` varchar(255),
	`currentPeriodStart` timestamp,
	`currentPeriodEnd` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscriptions_id` PRIMARY KEY(`id`)
);
