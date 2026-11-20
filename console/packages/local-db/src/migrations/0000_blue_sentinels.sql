CREATE TABLE IF NOT EXISTS `assets` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text,
	`profile_id` text,
	`file_type` text DEFAULT 'screenshot' NOT NULL,
	`storage_path` text NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`profile_id`) REFERENCES `browser_profiles`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_assets_job_id` ON `assets` (`job_id`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `browser_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`release_id` text,
	`template_id` text,
	`proxy_id` text,
	`user_agent` text,
	`timezone` text,
	`browser_type` text DEFAULT 'Chromium' NOT NULL,
	`fingerprint` text DEFAULT '{}' NOT NULL,
	`cookies` text DEFAULT '[]' NOT NULL,
	`storage_state` text DEFAULT '{}' NOT NULL,
	`is_locked` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`proxy_id`) REFERENCES `proxies`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_browser_profiles_proxy` ON `browser_profiles` (`proxy_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_browser_profiles_locked` ON `browser_profiles` (`is_locked`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `devices` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`ip_address` text,
	`status` text DEFAULT 'offline' NOT NULL,
	`specs` text DEFAULT '{}' NOT NULL,
	`last_heartbeat_at` text,
	`enrolled_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_devices_status` ON `devices` (`status`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `execution_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`job_id` text NOT NULL,
	`level` text DEFAULT 'info' NOT NULL,
	`message` text NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_execution_logs_job_id` ON `execution_logs` (`job_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_execution_logs_level` ON `execution_logs` (`level`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`workflow_id` text,
	`profile_id` text,
	`device_id` text,
	`name` text NOT NULL,
	`data` text DEFAULT '{}' NOT NULL,
	`options` text DEFAULT '{}' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`result` text DEFAULT '{}' NOT NULL,
	`started_at` text,
	`finished_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`workflow_id`) REFERENCES `workflows`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`profile_id`) REFERENCES `browser_profiles`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`device_id`) REFERENCES `devices`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_jobs_workflow` ON `jobs` (`workflow_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_jobs_profile` ON `jobs` (`profile_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_jobs_status` ON `jobs` (`status`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `proxies` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`protocol` text DEFAULT 'socks5' NOT NULL,
	`host` text NOT NULL,
	`port` integer NOT NULL,
	`username` text,
	`password` text,
	`country_code` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_proxies_is_active` ON `proxies` (`is_active`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `system_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `workflows` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`version` text DEFAULT '1.0.0' NOT NULL,
	`nodes` text DEFAULT '[]' NOT NULL,
	`edges` text DEFAULT '[]' NOT NULL,
	`settings` text DEFAULT '{}' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_workflows_is_active` ON `workflows` (`is_active`);
