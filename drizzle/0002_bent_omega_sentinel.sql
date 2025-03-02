CREATE TABLE `traening_deltager` (
	`traening_id` integer NOT NULL,
	`spiller_id` integer NOT NULL,
	`tilstede` integer DEFAULT true NOT NULL,
	`registreret_dato` integer NOT NULL,
	PRIMARY KEY(`traening_id`, `spiller_id`),
	FOREIGN KEY (`traening_id`) REFERENCES `traeninger`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`spiller_id`) REFERENCES `spillere`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `traening_hold` (
	`traening_id` integer NOT NULL,
	`hold_id` integer NOT NULL,
	`tilmeldt_dato` integer NOT NULL,
	PRIMARY KEY(`traening_id`, `hold_id`),
	FOREIGN KEY (`traening_id`) REFERENCES `traeninger`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`hold_id`) REFERENCES `hold`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_traeninger` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`hold_id` integer,
	`navn` text NOT NULL,
	`beskrivelse` text,
	`dato` integer NOT NULL,
	`oprettet_dato` integer NOT NULL,
	`flere_tilmeldte` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`hold_id`) REFERENCES `hold`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_traeninger`("id", "hold_id", "navn", "beskrivelse", "dato", "oprettet_dato", "flere_tilmeldte") SELECT "id", "hold_id", "navn", "beskrivelse", "dato", "oprettet_dato", "flere_tilmeldte" FROM `traeninger`;--> statement-breakpoint
DROP TABLE `traeninger`;--> statement-breakpoint
ALTER TABLE `__new_traeninger` RENAME TO `traeninger`;--> statement-breakpoint
PRAGMA foreign_keys=ON;