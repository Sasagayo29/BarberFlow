CREATE TABLE `analytics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`barbershopId` int NOT NULL,
	`date` varchar(10) NOT NULL,
	`totalAppointments` int NOT NULL DEFAULT 0,
	`completedAppointments` int NOT NULL DEFAULT 0,
	`cancelledAppointments` int NOT NULL DEFAULT 0,
	`noShowAppointments` int NOT NULL DEFAULT 0,
	`totalRevenue` decimal(10,2) NOT NULL DEFAULT '0',
	`averageTicket` decimal(10,2) NOT NULL DEFAULT '0',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `analytics_id` PRIMARY KEY(`id`),
	CONSTRAINT `analytics_barbershop_date_unique_idx` UNIQUE(`barbershopId`,`date`)
);
--> statement-breakpoint
CREATE INDEX `analytics_barbershop_idx` ON `analytics` (`barbershopId`);--> statement-breakpoint
CREATE INDEX `analytics_date_idx` ON `analytics` (`date`);