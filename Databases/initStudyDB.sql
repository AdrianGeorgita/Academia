CREATE DATABASE IF NOT EXISTS study_service_db;
USE study_service_db;

CREATE TABLE `student` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nume` varchar(100) NOT NULL,
  `prenume` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `ciclu_studii` enum('licenta','master') NOT NULL,
  `an_studiu` int(11) NOT NULL,
  `grupa` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `student_unique` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE `profesor` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nume` varchar(100) NOT NULL,
  `prenume` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `grad_didactic` enum('asist','sef lucr','conf','prof') DEFAULT NULL,
  `tip_asociere` enum('titular','asociat','extern') NOT NULL,
  `afiliere` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `profesor_unique` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE `disciplina` (
  `cod` varchar(10) NOT NULL,
  `id_titular` int(11) DEFAULT NULL,
  `nume_disciplina` varchar(100) NOT NULL,
  `an_studiu` int(11) NOT NULL,
  `tip_disciplina` enum('impusa','optionala','liber_aleasa') NOT NULL,
  `categorie_disciplina` enum('domeniu','specialitate','adiacenta') NOT NULL,
  `tip_examinare` enum('examen','colocviu') NOT NULL,
  PRIMARY KEY (`cod`),
  KEY `disciplina_profesor_FK` (`id_titular`),
  CONSTRAINT `disciplina_profesor_FK` FOREIGN KEY (`id_titular`) REFERENCES `profesor` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE `join_ds` (
  `DisciplinaID` varchar(10) NOT NULL,
  `StudentID` int(11) NOT NULL,
  PRIMARY KEY (`DisciplinaID`,`StudentID`),
  KEY `join_ds_student_FK` (`StudentID`),
  CONSTRAINT `join_ds_disciplina_FK` FOREIGN KEY (`DisciplinaID`) REFERENCES `disciplina` (`cod`),
  CONSTRAINT `join_ds_student_FK` FOREIGN KEY (`StudentID`) REFERENCES `student` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

INSERT INTO `student` (`id`, `nume`, `prenume`, `email`, `ciclu_studii`, `an_studiu`, `grupa`) VALUES
  (1, 'Popescu', 'Ion', 'IonPopescu@gmail.com', 'licenta', 4, 1409),
  (2, 'Popescu', 'Andrei', 'AndreiPopescu@gmail.com', 'master', 2, 1201),
  (3, 'Nume3', 'Prenume8', 'prenumeNume4@email.com', 'licenta', 1, 1);

INSERT INTO `profesor` (`id`, `nume`, `prenume`, `email`, `grad_didactic`, `tip_asociere`, `afiliere`) VALUES
  (1, 'Nume1', 'Prenume1', 'email1@gmail.com', 'conf', 'titular', NULL),
  (2, 'Nume2', 'Prenume2', 'email2@gmail.com', 'asist', 'asociat', NULL),
  (3, 'testName', 'testLastName', 'test@email.com', 'conf', 'titular', 'None'),
  (4, 'testName2', 'testLastName2', 'test3@email.com', 'conf', 'asociat', NULL);

INSERT INTO `disciplina` (`cod`, `id_titular`, `nume_disciplina`, `an_studiu`, `tip_disciplina`, `categorie_disciplina`, `tip_examinare`) VALUES
  ('TI.DI.400', 3, 'Nume Disciplina', 4, 'impusa', 'domeniu', 'colocviu'),
  ('TI.DI.405', 2, 'Programare Orientata pe Servicii', 4, 'impusa', 'domeniu', 'examen'),
  ('TI.DI.406', 2, 'Programare Orientata pe Obiecte', 3, 'impusa', 'domeniu', 'examen'),
  ('TI.DS.415', 1, 'Programare Dispozitivelor Mobile', 4, 'impusa', 'specialitate', 'examen');

INSERT INTO `join_ds` (`DisciplinaID`, `StudentID`) VALUES
  ('TI.DI.405', 1),
  ('TI.DI.405', 2),
  ('TI.DS.415', 2);

CREATE USER 'posadmin'@'%' IDENTIFIED BY 'passwdpos';
GRANT ALL PRIVILEGES ON study_service_db.* TO 'posadmin'@'%';
FLUSH PRIVILEGES;