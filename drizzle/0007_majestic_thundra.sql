CREATE TABLE `notification_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`userId` int NOT NULL,
	`escalationPush` int NOT NULL DEFAULT 1,
	`assignmentPush` int NOT NULL DEFAULT 1,
	`leadPush` int NOT NULL DEFAULT 1,
	`generalPush` int NOT NULL DEFAULT 1,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notification_preferences_id` PRIMARY KEY(`id`)
);
