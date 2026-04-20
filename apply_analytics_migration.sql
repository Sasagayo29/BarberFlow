-- Criar tabela analytics se não existir
CREATE TABLE IF NOT EXISTS `analytics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`barbershopId` int NOT NULL,
	`date` varchar(10) NOT NULL,
	`totalAppointments` int NOT NULL DEFAULT 0,
	`completedAppointments` int NOT NULL DEFAULT 0,
	`cancelledAppointments` int NOT NULL DEFAULT 0,
	`noShowAppointments` int NOT NULL DEFAULT 0,
	`totalRevenue` decimal(10,2) NOT NULL DEFAULT '0',
	`averageTicket` decimal(10,2) NOT NULL DEFAULT '0',
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `analytics_id` PRIMARY KEY(`id`),
	CONSTRAINT `analytics_barbershop_date_unique_idx` UNIQUE(`barbershopId`,`date`)
);

-- Criar índices se não existirem
CREATE INDEX IF NOT EXISTS `analytics_barbershop_idx` ON `analytics` (`barbershopId`);
CREATE INDEX IF NOT EXISTS `analytics_date_idx` ON `analytics` (`date`);
