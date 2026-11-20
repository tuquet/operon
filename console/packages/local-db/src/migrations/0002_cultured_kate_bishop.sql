ALTER TABLE `browser_profiles` ADD `tenant_id` text;--> statement-breakpoint
ALTER TABLE `browser_profiles` ADD `deleted_at` text;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_browser_profiles_tenant` ON `browser_profiles` (`tenant_id`);--> statement-breakpoint
ALTER TABLE `proxies` ADD `tenant_id` text;--> statement-breakpoint
ALTER TABLE `proxies` ADD `deleted_at` text;--> statement-breakpoint
ALTER TABLE `proxies` ADD `updated_at` text;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_proxies_tenant` ON `proxies` (`tenant_id`);--> statement-breakpoint
ALTER TABLE `workflows` ADD `tenant_id` text;--> statement-breakpoint
ALTER TABLE `workflows` ADD `deleted_at` text;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_workflows_tenant` ON `workflows` (`tenant_id`);
