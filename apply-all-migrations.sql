-- Migration 0008: Criar tabela role_permissions
CREATE TABLE IF NOT EXISTS `role_permissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`role` enum('super_admin','barber_admin','barber_owner','barber_staff','client') NOT NULL DEFAULT 'client',
	`permission` enum('view_dashboard','manage_appointments','manage_services','manage_team','manage_clients','view_analytics','manage_payments','manage_settings','manage_users','manage_barbershops','view_reports','manage_social_media') NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `role_permissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `role_permission_unique_idx` UNIQUE(`role`,`permission`)
);

CREATE INDEX IF NOT EXISTS `role_permissions_role_idx` ON `role_permissions` (`role`);
CREATE INDEX IF NOT EXISTS `role_permissions_permission_idx` ON `role_permissions` (`permission`);

-- Inserir super admin Riquelmy
INSERT INTO users (name, email, passwordHash, role, status, loginMethod, createdAt, updatedAt)
VALUES (
  'Riquelmy',
  'riquelmymiyasawaborges@gmail.com',
  'd987bde2b92aca292d66997e723f344f64452f17ba244ae3f9163d8f17601755',
  'super_admin',
  'active',
  'email',
  NOW(),
  NOW()
) ON DUPLICATE KEY UPDATE updatedAt = NOW();

-- Seed de permissões padrão para super_admin (todas as permissões)
INSERT INTO role_permissions (role, permission, description) VALUES
('super_admin', 'view_dashboard', 'Visualizar dashboard'),
('super_admin', 'manage_appointments', 'Gerenciar agendamentos'),
('super_admin', 'manage_services', 'Gerenciar serviços'),
('super_admin', 'manage_team', 'Gerenciar equipa'),
('super_admin', 'manage_clients', 'Gerenciar clientes'),
('super_admin', 'view_analytics', 'Visualizar analytics'),
('super_admin', 'manage_payments', 'Gerenciar pagamentos'),
('super_admin', 'manage_settings', 'Gerenciar configurações'),
('super_admin', 'manage_users', 'Gerenciar utilizadores'),
('super_admin', 'manage_barbershops', 'Gerenciar barbearias'),
('super_admin', 'view_reports', 'Visualizar relatórios'),
('super_admin', 'manage_social_media', 'Gerenciar redes sociais')
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- Seed de permissões padrão para barber_admin
INSERT INTO role_permissions (role, permission, description) VALUES
('barber_admin', 'view_dashboard', 'Visualizar dashboard'),
('barber_admin', 'manage_appointments', 'Gerenciar agendamentos'),
('barber_admin', 'manage_services', 'Gerenciar serviços'),
('barber_admin', 'manage_team', 'Gerenciar equipa'),
('barber_admin', 'manage_clients', 'Gerenciar clientes'),
('barber_admin', 'view_analytics', 'Visualizar analytics'),
('barber_admin', 'manage_payments', 'Gerenciar pagamentos'),
('barber_admin', 'manage_settings', 'Gerenciar configurações'),
('barber_admin', 'manage_social_media', 'Gerenciar redes sociais')
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- Seed de permissões padrão para barber_owner
INSERT INTO role_permissions (role, permission, description) VALUES
('barber_owner', 'view_dashboard', 'Visualizar dashboard'),
('barber_owner', 'manage_appointments', 'Gerenciar agendamentos'),
('barber_owner', 'manage_services', 'Gerenciar serviços'),
('barber_owner', 'manage_team', 'Gerenciar equipa'),
('barber_owner', 'view_analytics', 'Visualizar analytics'),
('barber_owner', 'manage_settings', 'Gerenciar configurações'),
('barber_owner', 'manage_social_media', 'Gerenciar redes sociais')
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- Seed de permissões padrão para barber_staff
INSERT INTO role_permissions (role, permission, description) VALUES
('barber_staff', 'view_dashboard', 'Visualizar dashboard'),
('barber_staff', 'manage_appointments', 'Gerenciar agendamentos'),
('barber_staff', 'manage_clients', 'Gerenciar clientes')
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- Seed de permissões padrão para client
INSERT INTO role_permissions (role, permission, description) VALUES
('client', 'view_dashboard', 'Visualizar dashboard')
ON DUPLICATE KEY UPDATE description = VALUES(description);
