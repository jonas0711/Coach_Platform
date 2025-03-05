CREATE TABLE `traening_oevelse_spiller_positioner` (
	`traening_oevelse_id` integer NOT NULL,
	`spiller_id` integer NOT NULL,
	`position` text NOT NULL,
	`er_offensiv` integer DEFAULT true NOT NULL,
	`variation_id` integer,
	`tilfojet_dato` integer NOT NULL,
	PRIMARY KEY(`traening_oevelse_id`, `spiller_id`, `position`, `variation_id`),
	FOREIGN KEY (`traening_oevelse_id`) REFERENCES `traening_oevelser`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`spiller_id`) REFERENCES `spillere`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`variation_id`) REFERENCES `oevelse_variationer`(`id`) ON UPDATE no action ON DELETE cascade
);
