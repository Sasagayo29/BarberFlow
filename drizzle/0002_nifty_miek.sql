CREATE TABLE `barbershops` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(180) NOT NULL,
	`description` text,
	`barbershop_status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`ownerUserId` int NOT NULL,
	`phone` varchar(32),
	`email` varchar(320),
	`address` text,
	`logoUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `barbershops_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`barbershopId` int,
	`key` varchar(100) NOT NULL,
	`value` text NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `businessHours` DROP INDEX `business_hours_weekday_unique_idx`;--> statement-breakpoint
ALTER TABLE `appointments` ADD `barbershopId` int;--> statement-breakpoint
ALTER TABLE `barberAvailabilityOverrides` ADD `barbershopId` int;--> statement-breakpoint
ALTER TABLE `barberProfiles` ADD `barbershopId` int;--> statement-breakpoint
ALTER TABLE `barberServices` ADD `barbershopId` int;--> statement-breakpoint
ALTER TABLE `businessHours` ADD `barbershopId` int;--> statement-breakpoint
ALTER TABLE `services` ADD `barbershopId` int;--> statement-breakpoint
ALTER TABLE `users` ADD `barbershopId` int;--> statement-breakpoint
ALTER TABLE `businessHours` ADD CONSTRAINT `business_hours_weekday_barbershop_unique_idx` UNIQUE(`barbershopId`,`weekday`);--> statement-breakpoint
CREATE INDEX `barbershops_status_idx` ON `barbershops` (`barbershop_status`);--> statement-breakpoint
CREATE INDEX `barbershops_owner_idx` ON `barbershops` (`ownerUserId`);--> statement-breakpoint
CREATE INDEX `settings_key_idx` ON `settings` (`key`);--> statement-breakpoint
CREATE INDEX `settings_barbershop_idx` ON `settings` (`barbershopId`);--> statement-breakpoint
CREATE INDEX `appointments_barbershop_idx` ON `appointments` (`barbershopId`);--> statement-breakpoint
CREATE INDEX `barber_availability_barbershop_idx` ON `barberAvailabilityOverrides` (`barbershopId`);--> statement-breakpoint
CREATE INDEX `barber_profiles_barbershop_idx` ON `barberProfiles` (`barbershopId`);--> statement-breakpoint
CREATE INDEX `barber_services_barbershop_idx` ON `barberServices` (`barbershopId`);--> statement-breakpoint
CREATE INDEX `business_hours_barbershop_idx` ON `businessHours` (`barbershopId`);--> statement-breakpoint
CREATE INDEX `services_barbershop_idx` ON `services` (`barbershopId`);--> statement-breakpoint
CREATE INDEX `users_barbershop_idx` ON `users` (`barbershopId`);