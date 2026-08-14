CREATE TABLE `website_snapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`agentId` int NOT NULL,
	`websiteUrl` text NOT NULL,
	`analysisJson` longtext NOT NULL,
	`changesDetected` int NOT NULL DEFAULT 0,
	`changesSummary` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `website_snapshots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `agents` ADD `syncCronTaskUid` varchar(65);--> statement-breakpoint
ALTER TABLE `agents` ADD `syncIntervalHours` int DEFAULT 24 NOT NULL;