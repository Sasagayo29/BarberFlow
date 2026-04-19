CREATE TABLE `social_media_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`barbershopId` int NOT NULL,
	`whatsappNumber` varchar(32),
	`whatsappMessages` text,
	`instagramUrl` varchar(500),
	`instagramEnabled` tinyint NOT NULL DEFAULT 0,
	`tiktokUrl` varchar(500),
	`tiktokEnabled` tinyint NOT NULL DEFAULT 0,
	`whatsappEnabled` tinyint NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `social_media_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `social_media_settings_barbershop_unique_idx` UNIQUE(`barbershopId`)
);
--> statement-breakpoint
CREATE INDEX `social_media_settings_barbershop_idx` ON `social_media_settings` (`barbershopId`);