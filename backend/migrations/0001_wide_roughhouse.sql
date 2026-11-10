CREATE TABLE `bookings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`meeting_type_id` integer NOT NULL,
	`start_at` text NOT NULL,
	`end_at` text NOT NULL,
	`guest_name` text NOT NULL,
	`guest_email` text NOT NULL,
	`created_at` text DEFAULT '(datetime(''now''))' NOT NULL,
	FOREIGN KEY (`meeting_type_id`) REFERENCES `meeting_types`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `meeting_type_start_idx` ON `bookings` (`meeting_type_id`,`start_at`);