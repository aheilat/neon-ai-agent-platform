CREATE TABLE `tenant_data_policies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`retentionDays` int NOT NULL DEFAULT 90,
	`requireConsent` int NOT NULL DEFAULT 1,
	`allowModelTraining` int NOT NULL DEFAULT 0,
	`deletionContactEmail` varchar(320),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tenant_data_policies_id` PRIMARY KEY(`id`),
	CONSTRAINT `tenant_data_policies_tenantId_unique` UNIQUE(`tenantId`)
);
