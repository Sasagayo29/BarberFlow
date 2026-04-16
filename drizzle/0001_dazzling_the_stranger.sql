CREATE TABLE `appointments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`publicCode` varchar(20) NOT NULL,
	`clientUserId` int NOT NULL,
	`barberUserId` int NOT NULL,
	`serviceId` int NOT NULL,
	`status` enum('pending','confirmed','completed','cancelled','no_show') NOT NULL DEFAULT 'pending',
	`startsAt` bigint NOT NULL,
	`endsAt` bigint NOT NULL,
	`totalPrice` decimal(10,2) NOT NULL,
	`notes` text,
	`cancelledByUserId` int,
	`cancelledAt` timestamp,
	`cancellationReason` varchar(255),
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `appointments_id` PRIMARY KEY(`id`),
	CONSTRAINT `appointments_public_code_unique_idx` UNIQUE(`publicCode`)
);
--> statement-breakpoint
CREATE TABLE `barberAvailabilityOverrides` (
	`id` int AUTO_INCREMENT NOT NULL,
	`barberUserId` int NOT NULL,
	`type` enum('available','unavailable') NOT NULL,
	`startAt` bigint NOT NULL,
	`endAt` bigint NOT NULL,
	`reason` varchar(255),
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `barberAvailabilityOverrides_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `barberProfiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`displayName` varchar(120) NOT NULL,
	`specialty` varchar(160),
	`bio` text,
	`colorHex` varchar(20) NOT NULL DEFAULT '#8B5E3C',
	`acceptsAppointments` tinyint NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `barberProfiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `barber_profiles_user_unique_idx` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `barberServices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`barberUserId` int NOT NULL,
	`serviceId` int NOT NULL,
	`customPrice` decimal(10,2),
	`customDurationMinutes` int,
	`isActive` tinyint NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `barberServices_id` PRIMARY KEY(`id`),
	CONSTRAINT `barber_services_unique_idx` UNIQUE(`barberUserId`,`serviceId`)
);
--> statement-breakpoint
CREATE TABLE `businessHours` (
	`id` int AUTO_INCREMENT NOT NULL,
	`weekday` int NOT NULL,
	`startTime` varchar(5) NOT NULL,
	`endTime` varchar(5) NOT NULL,
	`isOpen` tinyint NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `businessHours_id` PRIMARY KEY(`id`),
	CONSTRAINT `business_hours_weekday_unique_idx` UNIQUE(`weekday`)
);
--> statement-breakpoint
CREATE TABLE `passwordResetTokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`token` varchar(128) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`usedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `passwordResetTokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `password_reset_token_unique_idx` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `services` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(140) NOT NULL,
	`description` text,
	`price` decimal(10,2) NOT NULL,
	`durationMinutes` int NOT NULL,
	`isActive` tinyint NOT NULL DEFAULT 1,
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `services_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `openId` varchar(64);--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `name` varchar(180);--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('super_admin','barber_owner','barber_staff','client') NOT NULL DEFAULT 'client';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `lastSignedIn` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(32);--> statement-breakpoint
ALTER TABLE `users` ADD `passwordHash` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `status` enum('active','inactive','blocked') DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `avatarUrl` text;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_email_unique_idx` UNIQUE(`email`);--> statement-breakpoint
CREATE INDEX `appointments_barber_time_idx` ON `appointments` (`barberUserId`,`startsAt`);--> statement-breakpoint
CREATE INDEX `appointments_client_time_idx` ON `appointments` (`clientUserId`,`startsAt`);--> statement-breakpoint
CREATE INDEX `appointments_status_idx` ON `appointments` (`status`);--> statement-breakpoint
CREATE INDEX `barber_availability_barber_start_idx` ON `barberAvailabilityOverrides` (`barberUserId`,`startAt`);--> statement-breakpoint
CREATE INDEX `barber_services_barber_idx` ON `barberServices` (`barberUserId`);--> statement-breakpoint
CREATE INDEX `barber_services_service_idx` ON `barberServices` (`serviceId`);--> statement-breakpoint
CREATE INDEX `password_reset_user_idx` ON `passwordResetTokens` (`userId`);--> statement-breakpoint
CREATE INDEX `services_active_idx` ON `services` (`isActive`);--> statement-breakpoint
CREATE INDEX `services_name_idx` ON `services` (`name`);--> statement-breakpoint
CREATE INDEX `users_role_idx` ON `users` (`role`);--> statement-breakpoint
CREATE INDEX `users_status_idx` ON `users` (`status`);