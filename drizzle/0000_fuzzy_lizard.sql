CREATE TABLE `defensive_positioner` (
	`spiller_id` integer NOT NULL,
	`position` text NOT NULL,
	`er_primaer` integer DEFAULT false NOT NULL,
	PRIMARY KEY(`spiller_id`, `position`),
	FOREIGN KEY (`spiller_id`) REFERENCES `spillere`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `hold` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`navn` text NOT NULL,
	`oprettet_dato` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `offensive_positioner` (
	`spiller_id` integer NOT NULL,
	`position` text NOT NULL,
	`er_primaer` integer DEFAULT false NOT NULL,
	PRIMARY KEY(`spiller_id`, `position`),
	FOREIGN KEY (`spiller_id`) REFERENCES `spillere`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `spillere` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`hold_id` integer NOT NULL,
	`navn` text NOT NULL,
	`nummer` integer,
	`er_mv` integer DEFAULT false NOT NULL,
	`oprettet_dato` integer NOT NULL,
	FOREIGN KEY (`hold_id`) REFERENCES `hold`(`id`) ON UPDATE no action ON DELETE cascade
);
