CREATE DATABASE IF NOT EXISTS auth_service_db;
USE auth_service_db;

CREATE TABLE IF NOT EXISTS `blacklist` (
  `ID` int(11) NOT NULL AUTO_INCREMENT,
  `jws` varchar(16000) NOT NULL,
  PRIMARY KEY (`ID`),
  UNIQUE KEY `blacklist_unique` (`jws`) USING HASH
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `utilizator` (
  `ID` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `parola` varchar(128) NOT NULL,
  `rol` enum('admin','profesor','student') NOT NULL,
  PRIMARY KEY (`ID`),
  UNIQUE KEY `utilizator_unique` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

INSERT INTO `utilizator` (`email`, `parola`, `rol`) VALUES
    ('admin@gmail.com', '21232f297a57a5a743894a0e4a801fc3', 'admin'),
    ('prof@gmail.com', 'd450c5dbcc10db0749277efc32f15f9f', 'profesor'),
    ('student@gmail.com', '8287458823facb8ff918dbfabcd22ccb', 'student'),
    ('mihai.vasilescu@email.com', '8287458823facb8ff918dbfabcd22ccb', 'student'),
    ('maria.ionescu@email.com', '8287458823facb8ff918dbfabcd22ccb', 'student'),
    ('adrian.popa@email.com', '8287458823facb8ff918dbfabcd22ccb', 'student'),
    ('elena.petrescu@email.com', '8287458823facb8ff918dbfabcd22ccb', 'student'),
    ('andrei.radu@email.com', '8287458823facb8ff918dbfabcd22ccb', 'student'),
    ('ioana.dumitru@email.com', '8287458823facb8ff918dbfabcd22ccb', 'student'),
    ('bogdan.stan@email.com', '8287458823facb8ff918dbfabcd22ccb', 'student'),
    ('alina.nistor@email.com', '8287458823facb8ff918dbfabcd22ccb', 'student'),
    ('tiberiu.cristea@email.com', '8287458823facb8ff918dbfabcd22ccb', 'student'),
    ('alexandru.neagu@email.com', '8287458823facb8ff918dbfabcd22ccb', 'student'),
    ('larisa.pavel@email.com', '8287458823facb8ff918dbfabcd22ccb', 'student'),
    ('oana.mihaila@email.com', '8287458823facb8ff918dbfabcd22ccb', 'student'),
    ('stefan.vlad@email.com', '8287458823facb8ff918dbfabcd22ccb', 'student'),
    ('simona.ion@email.com', '8287458823facb8ff918dbfabcd22ccb', 'student'),
    ('vlad.stoica@email.com', '8287458823facb8ff918dbfabcd22ccb', 'student'),
    ('roxana.roman@email.com', '8287458823facb8ff918dbfabcd22ccb', 'student'),
    ('gabriel.enache@email.com', '8287458823facb8ff918dbfabcd22ccb', 'student'),
    ('claudia.anghel@email.com', '8287458823facb8ff918dbfabcd22ccb', 'student'),
    ('florin.marinescu@email.com', '8287458823facb8ff918dbfabcd22ccb', 'student'),
    ('cosmin.lupu@email.com', '8287458823facb8ff918dbfabcd22ccb', 'student'),
    ('anca.gheorghe@email.com', '8287458823facb8ff918dbfabcd22ccb', 'student'),
    ('ioan.cojocaru@email.com', '8287458823facb8ff918dbfabcd22ccb', 'student'),
    ('radu.dima@email.com', '8287458823facb8ff918dbfabcd22ccb', 'student'),
    ('denisa.munteanu@email.com', '8287458823facb8ff918dbfabcd22ccb', 'student'),
    ('viorica.popescu@email.com', '8287458823facb8ff918dbfabcd22ccb', 'student'),
    ('mihail.sima@email.com', '8287458823facb8ff918dbfabcd22ccb', 'student'),
    ('mihnea.jipa@email.com', '8287458823facb8ff918dbfabcd22ccb', 'student'),
    ('alexandra.grigore@email.com', '8287458823facb8ff918dbfabcd22ccb', 'student'),
    ('ion.negru@email.com', '8287458823facb8ff918dbfabcd22ccb', 'student'),
    ('lavinia.tataru@email.com', '8287458823facb8ff918dbfabcd22ccb', 'student'),
    ('ilie.savu@email.com', '8287458823facb8ff918dbfabcd22ccb', 'student'),
    ('lucian.costache@email.com', '8287458823facb8ff918dbfabcd22ccb', 'student'),
    ('laura.serban@email.com', '8287458823facb8ff918dbfabcd22ccb', 'student'),
    ('ionut.vasilache@email.com', '8287458823facb8ff918dbfabcd22ccb', 'student'),
    ('adela.balan@email.com', '8287458823facb8ff918dbfabcd22ccb', 'student'),
    ('florin.lungu@email.com', '8287458823facb8ff918dbfabcd22ccb', 'student'),
    ('lia.sora@email.com', '8287458823facb8ff918dbfabcd22ccb', 'student'),
    ('andreea.dima@email.com', '8287458823facb8ff918dbfabcd22ccb', 'student'),
    ('gabriela.vasilescu@email.com', '8287458823facb8ff918dbfabcd22ccb', 'student'),
    ('catalin.stanca@email.com', '8287458823facb8ff918dbfabcd22ccb', 'student'),
    ('mircea.baciu@email.com', '8287458823facb8ff918dbfabcd22ccb', 'student'),
    ('cristina.mocanu@email.com', '8287458823facb8ff918dbfabcd22ccb', 'student'),
    ('radu.iordache@email.com', '8287458823facb8ff918dbfabcd22ccb', 'student'),
    ('sorin.rotaru@email.com', '8287458823facb8ff918dbfabcd22ccb', 'student'),
    ('ovidiu.lungu@email.com', '8287458823facb8ff918dbfabcd22ccb', 'student'),
    ('aurelia.sorescu@email.com', '8287458823facb8ff918dbfabcd22ccb', 'student'),
    ('emilia.barbu@email.com', '8287458823facb8ff918dbfabcd22ccb', 'student'),

    ('ion.popescu@email.com', 'd450c5dbcc10db0749277efc32f15f9f', 'profesor'),
    ('maria.ionescu2@email.com', 'd450c5dbcc10db0749277efc32f15f9f', 'profesor'),
    ('gheorghe.vasilescu@email.com', 'd450c5dbcc10db0749277efc32f15f9f', 'profesor'),
    ('lavinia.mihaila@email.com', 'd450c5dbcc10db0749277efc32f15f9f', 'profesor'),
    ('tiberiu.radu@email.com', 'd450c5dbcc10db0749277efc32f15f9f', 'profesor'),
    ('adrian.stoica@email.com', 'd450c5dbcc10db0749277efc32f15f9f', 'profesor'),
    ('alexandru.dumitru@email.com', 'd450c5dbcc10db0749277efc32f15f9f', 'profesor'),
    ('ioana.neagu@email.com', 'd450c5dbcc10db0749277efc32f15f9f', 'profesor'),
    ('violeta.constantinescu@email.com', 'd450c5dbcc10db0749277efc32f15f9f', 'profesor'),
    ('florin.cristea@email.com', 'd450c5dbcc10db0749277efc32f15f9f', 'profesor'),
    ('gabriel.roman@email.com', 'd450c5dbcc10db0749277efc32f15f9f', 'profesor'),
    ('mihail.balan@email.com', 'd450c5dbcc10db0749277efc32f15f9f', 'profesor'),
    ('denisa.lupu@email.com', 'd450c5dbcc10db0749277efc32f15f9f', 'profesor'),
    ('radu.sora@email.com', 'd450c5dbcc10db0749277efc32f15f9f', 'profesor'),
    ('florentina.tataru@email.com', 'd450c5dbcc10db0749277efc32f15f9f', 'profesor'),
    ('anca.grigore@email.com', 'd450c5dbcc10db0749277efc32f15f9f', 'profesor'),
    ('marian.savu@email.com', 'd450c5dbcc10db0749277efc32f15f9f', 'profesor'),
    ('lucian.anghel@email.com', 'd450c5dbcc10db0749277efc32f15f9f', 'profesor'),
    ('ioana.munteanu@email.com', 'd450c5dbcc10db0749277efc32f15f9f', 'profesor'),
    ('oana.iordache@email.com', 'd450c5dbcc10db0749277efc32f15f9f', 'profesor'),
    ('roxana.serban@email.com', 'd450c5dbcc10db0749277efc32f15f9f', 'profesor'),
    ('cristian.pavel@email.com', 'd450c5dbcc10db0749277efc32f15f9f', 'profesor'),
    ('carmen.vlad@email.com', 'd450c5dbcc10db0749277efc32f15f9f', 'profesor'),
    ('florin.mocanu@email.com', 'd450c5dbcc10db0749277efc32f15f9f', 'profesor'),
    ('elena.popa@email.com', 'd450c5dbcc10db0749277efc32f15f9f', 'profesor');

CREATE USER IF NOT EXISTS 'authAdmin'@'%' IDENTIFIED BY 'passwdauth';
GRANT ALL PRIVILEGES ON auth_service_db.* TO 'authAdmin'@'%';
FLUSH PRIVILEGES;