CREATE TABLE `oevelse_variationer` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`oevelse_id` integer NOT NULL,
	`navn` text NOT NULL,
	`beskrivelse` text,
	`oprettet_dato` integer NOT NULL,
	FOREIGN KEY (`oevelse_id`) REFERENCES `oevelser`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `traening_oevelse_detaljer` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`traening_oevelse_id` integer NOT NULL,
	`navn` text,
	`beskrivelse` text,
	`kategori_navn` text,
	`sidst_opdateret` integer NOT NULL,
	FOREIGN KEY (`traening_oevelse_id`) REFERENCES `traening_oevelser`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `traening_oevelse_fokuspunkter` (
	`traening_oevelse_id` integer NOT NULL,
	`fokuspunkt_id` integer NOT NULL,
	PRIMARY KEY(`traening_oevelse_id`, `fokuspunkt_id`),
	FOREIGN KEY (`traening_oevelse_id`) REFERENCES `traening_oevelser`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`fokuspunkt_id`) REFERENCES `fokuspunkter`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `traening_oevelser` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`traening_id` integer NOT NULL,
	`oevelse_id` integer NOT NULL,
	`position` integer NOT NULL,
	`tilfojet_dato` integer NOT NULL,
	FOREIGN KEY (`traening_id`) REFERENCES `traeninger`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`oevelse_id`) REFERENCES `oevelser`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_oevelse_positioner` (
	`oevelse_id` integer NOT NULL,
	`variation_id` integer,
	`position` text NOT NULL,
	`antal_kraevet` integer DEFAULT 0 NOT NULL,
	`er_offensiv` integer DEFAULT true NOT NULL,
	PRIMARY KEY(`oevelse_id`, `variation_id`, `position`),
	FOREIGN KEY (`oevelse_id`) REFERENCES `oevelser`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`variation_id`) REFERENCES `oevelse_variationer`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_oevelse_positioner`("oevelse_id", "variation_id", "position", "antal_kraevet", "er_offensiv") SELECT "oevelse_id", "variation_id", "position", "antal_kraevet", "er_offensiv" FROM `oevelse_positioner`;--> statement-breakpoint
DROP TABLE `oevelse_positioner`;--> statement-breakpoint
ALTER TABLE `__new_oevelse_positioner` RENAME TO `oevelse_positioner`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
ALTER TABLE `oevelser` ADD `original_positioner_navn` text;--> statement-breakpoint
ALTER TABLE `spillere` ADD `offensiv_rating` integer;--> statement-breakpoint
ALTER TABLE `spillere` ADD `defensiv_rating` integer;