ALTER TABLE `tenant_data_policies` ADD `sectorProfile` varchar(32) DEFAULT 'general' NOT NULL;--> statement-breakpoint
ALTER TABLE `tenant_data_policies` ADD `minimizeSensitiveData` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `tenant_data_policies` ADD `requireSensitiveHumanReview` int DEFAULT 0 NOT NULL;