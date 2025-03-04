-- # Opret tabel for øvelsesvariationer
CREATE TABLE `oevelse_variationer` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `oevelse_id` integer NOT NULL,
  `navn` text NOT NULL,
  `beskrivelse` text,
  `oprettet_dato` integer NOT NULL,
  FOREIGN KEY (`oevelse_id`) REFERENCES `oevelser`(`id`) ON UPDATE no action ON DELETE cascade
);

-- # Tilføj variations_id til oevelse_positioner og opdater primærnøgle
-- # Først dropper vi den eksisterende tabel
DROP TABLE `oevelse_positioner`;

-- # Så opretter vi den nye tabel med variations_id
CREATE TABLE `oevelse_positioner` (
  `oevelse_id` integer NOT NULL,
  `variation_id` integer,
  `position` text NOT NULL,
  `antal_kraevet` integer DEFAULT 0 NOT NULL,
  `er_offensiv` integer DEFAULT true NOT NULL,
  PRIMARY KEY(`oevelse_id`, `variation_id`, `position`),
  FOREIGN KEY (`oevelse_id`) REFERENCES `oevelser`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`variation_id`) REFERENCES `oevelse_variationer`(`id`) ON UPDATE no action ON DELETE cascade
); 