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
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

INSERT INTO `utilizator` (`ID`, `email`, `parola`, `rol`) VALUES
  (1, 'email@gmail.com', '8287458823facb8ff918dbfabcd22ccb', 'student'),
  (2, 'admin@gmail.com', '21232f297a57a5a743894a0e4a801fc3', 'admin'),
  (3, 'prof@gmail.com', 'd450c5dbcc10db0749277efc32f15f9f', 'profesor');

CREATE USER 'authAdmin'@'%' IDENTIFIED BY 'passwdauth';
GRANT ALL PRIVILEGES ON auth_service_db.* TO 'authAdmin'@'%';
FLUSH PRIVILEGES;