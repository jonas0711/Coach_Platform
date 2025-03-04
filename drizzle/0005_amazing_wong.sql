CREATE TABLE `traening_oevelse_deltagere` (
	`traening_oevelse_id` integer NOT NULL,
	`spiller_id` integer NOT NULL,
	`tilfojet_dato` integer NOT NULL,
	PRIMARY KEY(`traening_oevelse_id`, `spiller_id`),
	FOREIGN KEY (`traening_oevelse_id`) REFERENCES `traening_oevelser`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`spiller_id`) REFERENCES `spillere`(`id`) ON UPDATE no action ON DELETE cascade
);
