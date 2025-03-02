CREATE TABLE `fokuspunkter` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tekst` text NOT NULL,
	`oprettet_dato` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fokuspunkter_tekst_unique` ON `fokuspunkter` (`tekst`);--> statement-breakpoint
CREATE TABLE `kategorier` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`navn` text NOT NULL,
	`oprettet_dato` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `kategorier_navn_unique` ON `kategorier` (`navn`);--> statement-breakpoint
CREATE TABLE `oevelse_fokuspunkter` (
	`oevelse_id` integer NOT NULL,
	`fokuspunkt_id` integer NOT NULL,
	PRIMARY KEY(`oevelse_id`, `fokuspunkt_id`),
	FOREIGN KEY (`oevelse_id`) REFERENCES `oevelser`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`fokuspunkt_id`) REFERENCES `fokuspunkter`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `oevelse_positioner` (
	`oevelse_id` integer NOT NULL,
	`position` text NOT NULL,
	`antal_kraevet` integer DEFAULT 0 NOT NULL,
	`er_offensiv` integer DEFAULT true NOT NULL,
	PRIMARY KEY(`oevelse_id`, `position`),
	FOREIGN KEY (`oevelse_id`) REFERENCES `oevelser`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `oevelser` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`navn` text NOT NULL,
	`beskrivelse` text,
	`billede_sti` text,
	`bruger_positioner` integer DEFAULT false NOT NULL,
	`minimum_deltagere` integer,
	`kategori_id` integer,
	`oprettet_dato` integer NOT NULL,
	FOREIGN KEY (`kategori_id`) REFERENCES `kategorier`(`id`) ON UPDATE no action ON DELETE no action
);
