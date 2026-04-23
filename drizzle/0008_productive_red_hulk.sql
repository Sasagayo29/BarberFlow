CREATE TABLE `role_permissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`role` enum('super_admin','barber_admin','barber_owner','barber_staff','client') NOT NULL DEFAULT 'client',
	`permission` enum('view_dashboard','manage_appointments','manage_services','manage_team','manage_clients','view_analytics','manage_payments','manage_settings','manage_users','manage_barbershops','view_reports','manage_social_media') NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `role_permissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `role_permission_unique_idx` UNIQUE(`role`,`permission`)
);
--> statement-breakpoint
CREATE INDEX `role_permissions_role_idx` ON `role_permissions` (`role`);--> statement-breakpoint
CREATE INDEX `role_permissions_permission_idx` ON `role_permissions` (`permission`);