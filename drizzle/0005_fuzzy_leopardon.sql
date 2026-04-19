CREATE TABLE `payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`barbershopId` int NOT NULL,
	`appointmentId` int NOT NULL,
	`userId` int NOT NULL,
	`stripePaymentIntentId` varchar(255) NOT NULL,
	`stripeCustomerId` varchar(255),
	`amount` decimal(10,2) NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'BRL',
	`payment_status` enum('pending','completed','failed','refunded') NOT NULL DEFAULT 'pending',
	`description` text,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payments_id` PRIMARY KEY(`id`),
	CONSTRAINT `payments_stripePaymentIntentId_unique` UNIQUE(`stripePaymentIntentId`)
);
--> statement-breakpoint
CREATE INDEX `payments_barbershop_idx` ON `payments` (`barbershopId`);--> statement-breakpoint
CREATE INDEX `payments_appointment_idx` ON `payments` (`appointmentId`);--> statement-breakpoint
CREATE INDEX `payments_user_idx` ON `payments` (`userId`);--> statement-breakpoint
CREATE INDEX `payments_status_idx` ON `payments` (`payment_status`);--> statement-breakpoint
CREATE INDEX `payments_stripe_payment_intent_idx` ON `payments` (`stripePaymentIntentId`);