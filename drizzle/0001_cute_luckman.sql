CREATE TABLE `traeninger` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`hold_id` integer NOT NULL,
	`navn` text NOT NULL,
	`beskrivelse` text,
	`dato` integer NOT NULL,
	`oprettet_dato` integer NOT NULL,
	FOREIGN KEY (`hold_id`) REFERENCES `hold`(`id`) ON UPDATE no action ON DELETE cascade
);
