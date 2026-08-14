ALTER TABLE `team_members` ADD `lastActiveAt` timestamp DEFAULT (now()) NOT NULL;--> statement-breakpoint
ALTER TABLE `team_members` ADD `idleTimeoutMinutes` int DEFAULT 15 NOT NULL;