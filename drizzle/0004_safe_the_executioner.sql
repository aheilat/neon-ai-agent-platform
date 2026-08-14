CREATE TABLE `team_member_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`memberId` int NOT NULL,
	`targetType` enum('agent','channel') NOT NULL,
	`targetId` varchar(100) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `team_member_assignments_id` PRIMARY KEY(`id`)
);
