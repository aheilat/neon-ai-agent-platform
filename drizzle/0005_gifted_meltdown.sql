CREATE TABLE `workspace_notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`memberId` int,
	`title` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`type` enum('escalation','assignment','lead','general') NOT NULL DEFAULT 'escalation',
	`isRead` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `workspace_notifications_id` PRIMARY KEY(`id`)
);
