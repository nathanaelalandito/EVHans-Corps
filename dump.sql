-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: project_rpl
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `cache`
--

DROP TABLE IF EXISTS `cache`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `cache` (
  `key` varchar(255) NOT NULL,
  `value` mediumtext NOT NULL,
  `expiration` bigint(20) NOT NULL,
  PRIMARY KEY (`key`),
  KEY `cache_expiration_index` (`expiration`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cache`
--

LOCK TABLES `cache` WRITE;
/*!40000 ALTER TABLE `cache` DISABLE KEYS */;
/*!40000 ALTER TABLE `cache` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cache_locks`
--

DROP TABLE IF EXISTS `cache_locks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `cache_locks` (
  `key` varchar(255) NOT NULL,
  `owner` varchar(255) NOT NULL,
  `expiration` bigint(20) NOT NULL,
  PRIMARY KEY (`key`),
  KEY `cache_locks_expiration_index` (`expiration`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cache_locks`
--

LOCK TABLES `cache_locks` WRITE;
/*!40000 ALTER TABLE `cache_locks` DISABLE KEYS */;
/*!40000 ALTER TABLE `cache_locks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `charger`
--

DROP TABLE IF EXISTS `charger`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `charger` (
  `id_charger` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `id_location` bigint(20) unsigned NOT NULL,
  `kode_perangkat` char(12) NOT NULL,
  `merek_model` varchar(255) NOT NULL,
  `kap_tot_kw` int(11) NOT NULL,
  `status_mesin` enum('Active','Maintenance','Offline') NOT NULL DEFAULT 'Active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id_charger`),
  KEY `charger_id_location_foreign` (`id_location`),
  CONSTRAINT `charger_id_location_foreign` FOREIGN KEY (`id_location`) REFERENCES `location` (`id_location`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `charger`
--

LOCK TABLES `charger` WRITE;
/*!40000 ALTER TABLE `charger` DISABLE KEYS */;
INSERT INTO `charger` VALUES (1,1,'CHG-01','ABB Terra 54',50,'Active','2026-11-03 07:14:42','2026-11-03 07:14:42'),(2,1,'CHG-02','Schneider EVlink',22,'Active','2026-11-03 07:14:42','2026-11-03 07:14:42'),(3,1,'CHG-03','ABB Terra 54',50,'Active','2026-11-03 07:14:42','2026-11-03 07:14:42'),(4,1,'CHG-04','Schneider EVlink',22,'Active','2026-11-03 07:14:42','2026-11-03 07:14:42'),(5,2,'CHG-01','ABB Terra 54',22,'Active','2026-11-03 07:14:42','2026-11-03 07:14:42'),(6,2,'CHG-02','ABB Terra 54',22,'Active','2026-11-03 07:14:42','2026-11-03 07:14:42'),(7,3,'CHG-01','Schneider EVlink',22,'Maintenance','2026-11-03 07:14:42','2026-11-03 07:14:42'),(8,3,'CHG-02','Siemens Sicharge',60,'Offline','2026-11-03 07:14:42','2026-11-03 07:14:42');
/*!40000 ALTER TABLE `charger` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `charging_session`
--

DROP TABLE IF EXISTS `charging_session`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `charging_session` (
  `id_session` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `id_user` char(13) NOT NULL,
  `id_charger` bigint(20) unsigned NOT NULL,
  `id_port` bigint(20) unsigned DEFAULT NULL,
  `id_tarif` bigint(20) unsigned NOT NULL,
  `id_vehicle` bigint(20) unsigned NOT NULL,
  `waktu_mulai` datetime NOT NULL,
  `waktu_selesai` datetime DEFAULT NULL,
  `total_energi_kwh` decimal(8,2) NOT NULL,
  `status` enum('Pending','Berlangsung','Selesai','Dibatalkan','Gagal') DEFAULT 'Pending',
  `soc_awal` tinyint(3) unsigned NOT NULL,
  `soc_akhir` tinyint(3) unsigned DEFAULT NULL,
  `kegagalan_kategori` varchar(50) DEFAULT NULL,
  `kegagalan_sumber` varchar(20) DEFAULT NULL,
  `kegagalan_catatan` text DEFAULT NULL,
  `deteksi_otomatis` tinyint(1) NOT NULL DEFAULT 0,
  `heartbeat_terakhir` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `target_energi_kwh` decimal(8,2) DEFAULT NULL,
  `estimasi_biaya_charging` int(11) DEFAULT NULL,
  `estimasi_biaya_parkir` int(11) DEFAULT NULL,
  `saldo_hold` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id_session`),
  KEY `charging_session_id_user_foreign` (`id_user`),
  KEY `charging_session_id_charger_foreign` (`id_charger`),
  KEY `charging_session_id_tarif_foreign` (`id_tarif`),
  KEY `charging_session_id_vehicle_foreign` (`id_vehicle`),
  KEY `charging_session_id_port_foreign` (`id_port`),
  KEY `charging_session_status_index` (`status`),
  CONSTRAINT `charging_session_id_charger_foreign` FOREIGN KEY (`id_charger`) REFERENCES `charger` (`id_charger`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `charging_session_id_port_foreign` FOREIGN KEY (`id_port`) REFERENCES `ports` (`id_port`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `charging_session_id_tarif_foreign` FOREIGN KEY (`id_tarif`) REFERENCES `tarif` (`id_tarif`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `charging_session_id_user_foreign` FOREIGN KEY (`id_user`) REFERENCES `users` (`id_user`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `charging_session_id_vehicle_foreign` FOREIGN KEY (`id_vehicle`) REFERENCES `vehicle` (`id_vehicle`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `charging_session`
--

LOCK TABLES `charging_session` WRITE;
/*!40000 ALTER TABLE `charging_session` DISABLE KEYS */;
INSERT INTO `charging_session` VALUES (1,'DRV0000000001',1,1,1,1,'2026-11-03 14:58:05','2026-11-03 14:58:05',0.00,'Gagal',30,30,'perangkat','sistem','Simulasi gangguan mendadak di EVCharge Hub - Malioboro Mall saat pengisian berlangsung.',1,'2026-11-03 14:58:05','2026-11-03 07:58:05','2026-11-03 07:58:05',20.00,50000,5000,55000),(2,'DRV0000000001',3,3,1,1,'2026-11-03 15:00:44','2026-11-03 15:03:44',20.00,'Gagal',30,58,'perangkat','sistem','Simulasi gangguan mendadak di EVCharge Hub - Malioboro Mall saat pengisian berlangsung.',1,'2026-11-03 15:03:44','2026-11-03 08:03:44','2026-11-03 08:03:44',20.00,50000,5000,55000),(3,'DRV0000000001',1,1,1,1,'2026-11-03 15:05:52','2026-11-03 15:06:55',20.00,'Gagal',30,58,'perangkat','sistem','Simulasi gangguan mendadak saat pengisian berlangsung.',1,'2026-11-03 15:06:52','2026-11-03 08:06:52','2026-11-03 08:06:55',20.00,50000,5000,55000),(4,'DRV0000000001',3,3,1,1,'2026-11-03 15:08:10','2026-11-03 15:09:07',37.00,'Selesai',28,80,NULL,NULL,NULL,0,'2026-11-03 15:09:05','2026-11-03 08:08:10','2026-11-03 08:09:07',37.00,92500,5000,97500),(5,'DRV0000000001',1,1,1,1,'2026-11-03 15:29:38','2026-11-03 15:32:38',8.00,'Gagal',30,58,'listrik','sistem','Simulasi gangguan mendadak di EVCharge Hub - Malioboro Mall saat pengisian berlangsung.',1,'2026-11-03 15:32:38','2026-11-03 08:32:38','2026-11-03 08:32:38',20.00,50000,5000,55000),(6,'DRV0000000001',3,3,1,1,'2026-11-03 15:34:17','2026-11-03 15:36:39',1.97,'Gagal',36,39,'perangkat','sistem','Simulasi gangguan mendadak di EVCharge Hub - Malioboro Mall saat pengisian berlangsung.',1,'2026-11-03 15:36:00','2026-11-03 08:34:17','2026-11-03 08:36:39',5.50,13750,5000,18750),(7,'DRV0000000001',1,1,1,1,'2026-11-03 15:39:02','2026-11-03 15:39:07',0.07,'Gagal',30,30,'perangkat','sistem','Gangguan mendadak saat pengisian berlangsung.',1,'2026-11-03 15:39:02','2026-11-03 08:39:02','2026-11-03 08:39:07',20.00,50000,5000,55000),(8,'DRV0000000001',2,2,1,2,'2026-11-03 15:58:05','2026-11-03 15:58:10',0.03,'Gagal',40,40,'perangkat','sistem','Charging terhenti mendadak karena kendala perangkat.',1,'2026-11-03 15:58:05','2026-11-03 08:58:05','2026-11-03 08:58:10',15.00,37500,5000,42500),(9,'DRV0000000001',2,2,1,2,'2026-11-03 15:58:19','2026-11-03 15:58:27',2.93,'Gagal',40,44,'perangkat','sistem','Charging terhenti mendadak karena kendala perangkat.',1,'2026-11-03 15:58:19','2026-11-03 08:58:19','2026-11-03 08:58:27',15.00,37500,5000,42500),(10,'DRV0000000001',2,2,1,1,'2026-11-03 16:16:47','2026-11-03 16:17:13',6.00,'Selesai',76,84,NULL,NULL,NULL,0,'2026-11-03 16:17:11','2026-11-03 09:16:47','2026-11-03 09:17:13',6.00,15000,5000,20000),(11,'DRV0000000001',2,2,1,1,'2026-11-03 16:23:40','2026-11-03 16:27:25',35.50,'Selesai',50,100,NULL,NULL,NULL,0,'2026-11-03 16:27:22','2026-11-03 09:23:40','2026-11-03 09:27:25',35.50,88750,10000,98750),(12,'DRV0000000001',2,2,1,1,'2026-11-03 16:29:55','2026-11-03 16:30:30',12.83,'Gagal',17,35,'perangkat','driver','Pengisian terhenti mendadak setelah mencapai setengah target.',0,'2026-11-03 16:30:29','2026-11-03 09:29:55','2026-11-03 09:30:30',23.50,58750,10000,68750),(13,'DRV0000000001',2,2,1,1,'2026-11-03 16:33:50','2026-11-03 16:34:01',4.00,'Gagal',39,45,'perangkat','driver','Pengisian terhenti mendadak setelah mencapai setengah target.',0,'2026-11-03 16:34:00','2026-11-03 09:33:50','2026-11-03 09:34:01',4.00,10000,5000,15000),(14,'DRV0000000001',2,2,1,1,'2026-11-03 16:41:03','2026-11-03 16:42:09',24.20,'Gagal',16,50,'perangkat','driver','Pengisian terhenti mendadak (otomatis).',0,'2026-11-03 16:42:08','2026-11-03 09:41:03','2026-11-03 09:42:09',45.50,113750,15000,128750),(15,'DRV0000000001',2,2,1,1,'2026-11-03 16:46:34','2026-11-03 16:47:22',17.60,'Gagal',51,76,'perangkat','driver','Pengisian terhenti mendadak (otomatis).',0,'2026-11-03 16:47:21','2026-11-03 09:46:34','2026-11-03 09:47:22',33.00,82500,10000,92500),(16,'DRV0000000001',2,2,1,1,'2026-11-04 06:49:51','2026-11-04 06:50:08',6.23,'Gagal',65,74,'perangkat','driver','Pengisian terhenti mendadak (otomatis).',0,'2026-11-04 06:50:07','2026-11-03 23:49:51','2026-11-03 23:50:08',10.50,26250,5000,31250),(17,'DRV0000000001',2,2,1,1,'2026-11-04 06:57:36','2026-11-04 06:58:16',14.67,'Gagal',60,81,'perangkat','driver','Pengisian terhenti mendadak (otomatis).',0,'2026-11-04 06:58:15','2026-11-03 23:57:36','2026-11-03 23:58:16',28.50,71250,10000,81250),(18,'DRV0000000001',2,2,1,1,'2026-11-04 07:11:05','2026-11-04 07:11:31',9.53,'Gagal',13,26,'perangkat','driver','Pengisian terhenti mendadak (otomatis).',0,'2026-11-04 07:11:29','2026-11-04 00:11:05','2026-11-04 00:11:31',15.50,38750,5000,43750);
/*!40000 ALTER TABLE `charging_session` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `dompet`
--

DROP TABLE IF EXISTS `dompet`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `dompet` (
  `id_wallet` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `id_user` char(13) NOT NULL,
  `saldo` int(11) NOT NULL DEFAULT 0,
  `pin_transaksi` varchar(255) DEFAULT NULL,
  `percobaan_pin_gagal` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `locked_until` timestamp NULL DEFAULT NULL,
  `status_dompet` enum('Aktif','Nonaktif') NOT NULL DEFAULT 'Aktif',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `saldo_hold` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id_wallet`),
  UNIQUE KEY `dompet_id_user_unique` (`id_user`),
  CONSTRAINT `dompet_id_user_foreign` FOREIGN KEY (`id_user`) REFERENCES `users` (`id_user`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `dompet`
--

LOCK TABLES `dompet` WRITE;
/*!40000 ALTER TABLE `dompet` DISABLE KEYS */;
INSERT INTO `dompet` VALUES (1,'DRV0000000001',789425,'$2y$12$OpmLPba6/Pnr0lsnuIXYT.eSBLobSJ0SXF64PW/9tLk.WYoVqxKvG',0,NULL,'Aktif','2026-11-03 07:17:14','2026-11-04 00:11:31',0);
/*!40000 ALTER TABLE `dompet` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `error_log`
--

DROP TABLE IF EXISTS `error_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `error_log` (
  `id_log` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `id_charger` bigint(20) unsigned NOT NULL,
  `id_session` bigint(20) unsigned NOT NULL,
  `id_port` bigint(20) unsigned DEFAULT NULL,
  `id_user` char(13) NOT NULL,
  `jenis_error` varchar(255) NOT NULL,
  `kategori` varchar(50) DEFAULT NULL,
  `sumber` varchar(20) NOT NULL DEFAULT 'sistem',
  `tingkat` varchar(20) NOT NULL DEFAULT 'Tinggi',
  `desk_mslh` text DEFAULT NULL,
  `waktu_terjadi` datetime NOT NULL,
  `status_tanganan` varchar(255) NOT NULL,
  `ditangani_oleh` char(13) DEFAULT NULL,
  `waktu_selesai_tangani` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id_log`),
  KEY `error_log_id_charger_foreign` (`id_charger`),
  KEY `error_log_id_session_foreign` (`id_session`),
  KEY `error_log_id_user_foreign` (`id_user`),
  KEY `error_log_id_port_foreign` (`id_port`),
  KEY `error_log_ditangani_oleh_foreign` (`ditangani_oleh`),
  CONSTRAINT `error_log_ditangani_oleh_foreign` FOREIGN KEY (`ditangani_oleh`) REFERENCES `users` (`id_user`) ON DELETE SET NULL,
  CONSTRAINT `error_log_id_charger_foreign` FOREIGN KEY (`id_charger`) REFERENCES `charger` (`id_charger`) ON UPDATE CASCADE,
  CONSTRAINT `error_log_id_port_foreign` FOREIGN KEY (`id_port`) REFERENCES `ports` (`id_port`) ON DELETE SET NULL,
  CONSTRAINT `error_log_id_session_foreign` FOREIGN KEY (`id_session`) REFERENCES `charging_session` (`id_session`) ON UPDATE CASCADE,
  CONSTRAINT `error_log_id_user_foreign` FOREIGN KEY (`id_user`) REFERENCES `users` (`id_user`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `error_log`
--

LOCK TABLES `error_log` WRITE;
/*!40000 ALTER TABLE `error_log` DISABLE KEYS */;
INSERT INTO `error_log` VALUES (1,1,1,1,'DRV0000000001','Simulasi gangguan: Kerusakan perangkat','perangkat','sistem','Tinggi','Simulasi gangguan mendadak di EVCharge Hub - Malioboro Mall saat pengisian berlangsung.','2026-11-03 14:58:05','Menunggu',NULL,NULL,'2026-11-03 07:58:05','2026-11-03 07:58:05'),(2,3,2,3,'DRV0000000001','Simulasi gangguan: Kerusakan perangkat','perangkat','sistem','Tinggi','Simulasi gangguan mendadak di EVCharge Hub - Malioboro Mall saat pengisian berlangsung.','2026-11-03 15:03:44','Menunggu',NULL,NULL,'2026-11-03 08:03:44','2026-11-03 08:03:44'),(3,1,3,1,'DRV0000000001','Simulasi gangguan: Kerusakan perangkat','perangkat','sistem','Tinggi','Simulasi gangguan mendadak saat pengisian berlangsung.','2026-11-03 15:06:55','Menunggu',NULL,NULL,'2026-11-03 08:06:55','2026-11-03 08:06:55'),(4,1,5,1,'DRV0000000001','Simulasi gangguan: Listrik padam','listrik','sistem','Kritis','Simulasi gangguan mendadak di EVCharge Hub - Malioboro Mall saat pengisian berlangsung.','2026-11-03 15:32:38','Menunggu',NULL,NULL,'2026-11-03 08:32:38','2026-11-03 08:32:38'),(5,3,6,3,'DRV0000000001','Simulasi gangguan: Kerusakan perangkat','perangkat','sistem','Tinggi','Simulasi gangguan mendadak di EVCharge Hub - Malioboro Mall saat pengisian berlangsung.','2026-11-03 15:36:39','Menunggu',NULL,NULL,'2026-11-03 08:36:39','2026-11-03 08:36:39'),(6,1,7,1,'DRV0000000001','Simulasi gangguan: Kerusakan perangkat','perangkat','sistem','Tinggi','Gangguan mendadak saat pengisian berlangsung.','2026-11-03 15:39:07','Menunggu',NULL,NULL,'2026-11-03 08:39:07','2026-11-03 08:39:07'),(7,2,8,2,'DRV0000000001','Simulasi gangguan: Kerusakan perangkat','perangkat','sistem','Tinggi','Charging terhenti mendadak karena kendala perangkat.','2026-11-03 15:58:10','Menunggu',NULL,NULL,'2026-11-03 08:58:10','2026-11-03 08:58:10'),(8,2,9,2,'DRV0000000001','Simulasi gangguan: Kerusakan perangkat','perangkat','sistem','Tinggi','Charging terhenti mendadak karena kendala perangkat.','2026-11-03 15:58:27','Menunggu',NULL,NULL,'2026-11-03 08:58:27','2026-11-03 08:58:27'),(9,2,12,2,'DRV0000000001','Gangguan: Kerusakan perangkat','perangkat','driver','Tinggi','Pengisian terhenti mendadak setelah mencapai setengah target.','2026-11-03 16:30:30','Menunggu',NULL,NULL,'2026-11-03 09:30:30','2026-11-03 09:30:30'),(10,2,12,2,'DRV0000000001','Laporan keluhan driver: Masalah konektor','konektor','driver','Tinggi','gatau','2026-11-03 16:31:13','Menunggu',NULL,NULL,'2026-11-03 09:31:13','2026-11-03 09:31:13'),(11,2,13,2,'DRV0000000001','Gangguan: Kerusakan perangkat','perangkat','driver','Tinggi','Pengisian terhenti mendadak setelah mencapai setengah target.','2026-11-03 16:34:01','Menunggu',NULL,NULL,'2026-11-03 09:34:01','2026-11-03 09:34:01'),(12,2,13,2,'DRV0000000001','Laporan keluhan driver: Kerusakan perangkat','perangkat','driver','Tinggi','Keluhan tambahan dari driver setelah pengisian terhenti.','2026-11-03 16:34:13','Menunggu',NULL,NULL,'2026-11-03 09:34:13','2026-11-03 09:34:13'),(13,2,14,2,'DRV0000000001','Gangguan: Kerusakan perangkat','perangkat','driver','Tinggi','Pengisian terhenti mendadak (otomatis).','2026-11-03 16:42:09','Menunggu',NULL,NULL,'2026-11-03 09:42:09','2026-11-03 09:42:09'),(14,2,14,2,'DRV0000000001','Laporan keluhan driver: Kerusakan perangkat','perangkat','driver','Tinggi','Keluhan tambahan dari driver setelah pengisian terhenti.','2026-11-03 16:43:54','Menunggu',NULL,NULL,'2026-11-03 09:43:54','2026-11-03 09:43:54'),(15,2,15,2,'DRV0000000001','Gangguan: Kerusakan perangkat','perangkat','driver','Tinggi','Pengisian terhenti mendadak (otomatis).','2026-11-03 16:47:22','Menunggu',NULL,NULL,'2026-11-03 09:47:22','2026-11-03 09:47:22'),(16,2,15,2,'DRV0000000001','Laporan keluhan driver: Kerusakan perangkat','perangkat','driver','Tinggi','uuu','2026-11-03 16:47:44','Menunggu',NULL,NULL,'2026-11-03 09:47:44','2026-11-03 09:47:44'),(17,2,16,2,'DRV0000000001','Gangguan: Kerusakan perangkat','perangkat','driver','Tinggi','Pengisian terhenti mendadak (otomatis).','2026-11-04 06:50:08','Menunggu',NULL,NULL,'2026-11-03 23:50:08','2026-11-03 23:50:08'),(18,2,16,2,'DRV0000000001','Laporan keluhan driver: Kerusakan perangkat','perangkat','driver','Tinggi','bgywygdygdwygydw','2026-11-04 06:52:08','Menunggu',NULL,NULL,'2026-11-03 23:52:08','2026-11-03 23:52:08'),(19,2,17,2,'DRV0000000001','Gangguan: Kerusakan perangkat','perangkat','driver','Tinggi','Pengisian terhenti mendadak (otomatis).','2026-11-04 06:58:16','Menunggu',NULL,NULL,'2026-11-03 23:58:16','2026-11-03 23:58:16'),(20,2,17,2,'DRV0000000001','Laporan keluhan driver: Kerusakan perangkat','perangkat','driver','Tinggi','ydbwywygwd','2026-11-04 06:58:42','Menunggu',NULL,NULL,'2026-11-03 23:58:42','2026-11-03 23:58:42'),(21,2,18,2,'DRV0000000001','Gangguan: Kerusakan perangkat','perangkat','driver','Tinggi','Pengisian terhenti mendadak (otomatis).','2026-11-04 07:11:31','Menunggu',NULL,NULL,'2026-11-04 00:11:31','2026-11-04 00:11:31'),(22,2,18,2,'DRV0000000001','Laporan keluhan driver: Kerusakan perangkat','perangkat','driver','Tinggi','Keluhan tambahan dari driver setelah pengisian terhenti.','2026-11-04 07:11:43','Menunggu',NULL,NULL,'2026-11-04 00:11:43','2026-11-04 00:11:43');
/*!40000 ALTER TABLE `error_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `failed_jobs`
--

DROP TABLE IF EXISTS `failed_jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `failed_jobs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(255) NOT NULL,
  `connection` varchar(255) NOT NULL,
  `queue` varchar(255) NOT NULL,
  `payload` longtext NOT NULL,
  `exception` longtext NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`),
  KEY `failed_jobs_connection_queue_failed_at_index` (`connection`,`queue`,`failed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `failed_jobs`
--

LOCK TABLES `failed_jobs` WRITE;
/*!40000 ALTER TABLE `failed_jobs` DISABLE KEYS */;
/*!40000 ALTER TABLE `failed_jobs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `job_batches`
--

DROP TABLE IF EXISTS `job_batches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `job_batches` (
  `id` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `total_jobs` int(11) NOT NULL,
  `pending_jobs` int(11) NOT NULL,
  `failed_jobs` int(11) NOT NULL,
  `failed_job_ids` longtext NOT NULL,
  `options` mediumtext DEFAULT NULL,
  `cancelled_at` int(11) DEFAULT NULL,
  `created_at` int(11) NOT NULL,
  `finished_at` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `job_batches`
--

LOCK TABLES `job_batches` WRITE;
/*!40000 ALTER TABLE `job_batches` DISABLE KEYS */;
/*!40000 ALTER TABLE `job_batches` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `jobs`
--

DROP TABLE IF EXISTS `jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `jobs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `queue` varchar(255) NOT NULL,
  `payload` longtext NOT NULL,
  `attempts` smallint(5) unsigned NOT NULL,
  `reserved_at` int(10) unsigned DEFAULT NULL,
  `available_at` int(10) unsigned NOT NULL,
  `created_at` int(10) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `jobs_queue_index` (`queue`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `jobs`
--

LOCK TABLES `jobs` WRITE;
/*!40000 ALTER TABLE `jobs` DISABLE KEYS */;
/*!40000 ALTER TABLE `jobs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `location`
--

DROP TABLE IF EXISTS `location`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `location` (
  `id_location` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `nama_lokasi` varchar(255) NOT NULL,
  `alamat` text NOT NULL,
  `latitude` decimal(10,7) NOT NULL,
  `longitude` decimal(10,7) NOT NULL,
  `jam_buka` time NOT NULL,
  `jam_tutup` time NOT NULL,
  `status_loc` enum('Aktif','Nonaktif','Maintenance') NOT NULL DEFAULT 'Aktif',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id_location`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `location`
--

LOCK TABLES `location` WRITE;
/*!40000 ALTER TABLE `location` DISABLE KEYS */;
INSERT INTO `location` VALUES (1,'EVCharge Hub - Malioboro Mall','Jl. Malioboro No. 52, Yogyakarta',-7.7930000,110.3655000,'00:00:00','23:59:00','Aktif','2026-11-03 07:14:42','2026-11-03 07:14:42'),(2,'EVCharge Hub - Ambarrukmo Plaza','Jl. Laksda Adisucipto, Yogyakarta',-7.7825000,110.3945000,'09:00:00','21:00:00','Aktif','2026-11-03 07:14:42','2026-11-03 07:14:42'),(3,'EVCharge Hub - UGM Boulevard','Jl. Boulevard UGM, Yogyakarta',-7.7686000,110.3746000,'07:00:00','23:00:00','Maintenance','2026-11-03 07:14:42','2026-11-03 07:14:42');
/*!40000 ALTER TABLE `location` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `metode_pembayaran`
--

DROP TABLE IF EXISTS `metode_pembayaran`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `metode_pembayaran` (
  `id_metode` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `nama_metode` varchar(255) NOT NULL,
  `biaya_layanan` int(11) NOT NULL DEFAULT 0,
  `status_metode` enum('Aktif','Nonaktif') NOT NULL DEFAULT 'Aktif',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id_metode`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `metode_pembayaran`
--

LOCK TABLES `metode_pembayaran` WRITE;
/*!40000 ALTER TABLE `metode_pembayaran` DISABLE KEYS */;
INSERT INTO `metode_pembayaran` VALUES (1,'Dompet Digital',0,'Aktif','2026-11-03 07:14:41','2026-11-03 07:14:41'),(2,'Mandiri',0,'Aktif','2026-11-03 07:14:41','2026-11-03 07:14:41'),(3,'OVO',0,'Aktif','2026-11-03 07:14:41','2026-11-03 07:14:41'),(4,'BCA',0,'Aktif','2026-11-03 07:14:42','2026-11-03 07:14:42'),(5,'BRI',0,'Aktif','2026-11-03 07:14:42','2026-11-03 07:14:42'),(6,'BNI',0,'Aktif','2026-11-03 07:14:42','2026-11-03 07:14:42'),(7,'GoPay',0,'Aktif','2026-11-03 07:14:42','2026-11-03 07:14:42'),(8,'DANA',0,'Aktif','2026-11-03 07:14:42','2026-11-03 07:14:42'),(9,'VA BRI',0,'Aktif','2026-11-03 07:14:42','2026-11-03 07:14:42'),(10,'SeaBank',0,'Aktif','2026-11-03 07:14:42','2026-11-03 07:14:42');
/*!40000 ALTER TABLE `metode_pembayaran` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `migrations`
--

DROP TABLE IF EXISTS `migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `migrations` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `migration` varchar(255) NOT NULL,
  `batch` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `migrations`
--

LOCK TABLES `migrations` WRITE;
/*!40000 ALTER TABLE `migrations` DISABLE KEYS */;
INSERT INTO `migrations` VALUES (1,'0001_01_01_000000_create_users_table',1),(2,'0001_01_01_000001_create_cache_table',1),(3,'0001_01_01_000002_create_jobs_table',1),(4,'2026_09_20_122322_create_personal_access_tokens_table',1),(5,'2026_09_22_044618_create_user_profile_table',1),(6,'2026_09_22_044949_create_vehicle_table',1),(7,'2026_09_22_051852_create_dompet_table',1),(8,'2026_09_22_052232_create_metode_pembayaran_table',1),(9,'2026_09_22_052710_create_location_table',1),(10,'2026_09_22_053036_create_tarif_table',1),(11,'2026_09_22_053525_create_charger_table',1),(12,'2026_09_22_055539_create_charging_session_table',1),(13,'2026_09_22_055540_create_payment_table',1),(14,'2026_09_23_075340_create_refund_table',1),(15,'2026_09_23_075725_create_topup_table',1),(16,'2026_09_23_080759_create_error_log_table',1),(17,'2026_09_25_090000_add_pin_security_columns_to_dompet_table',1),(18,'2026_09_30_134107_fix_tokenable_id_in_personal_access_tokens_table',1),(19,'2026_10_04_000001_add_hold_columns_for_charging',1),(20,'2026_10_04_000002_add_battery_capacity_to_vehicle_table',1),(21,'2026_10_04_101229_add_hold_columns_to_dompet_and_charging_session_tables',1),(22,'2026_10_04_120000_refine_payment_transactions_table',1),(23,'2026_10_04_130000_add_failed_status_to_charging_session_table',1),(24,'2026_10_05_163938_create_station_operators_table',1),(25,'2026_10_06_014510_create_ports_table',1),(26,'2026_10_10_163446_add_battery_capacity_to_vehicles_table',1),(27,'2026_10_12_230000_add_checkout_fields_to_topup_table',1),(28,'2026_11_02_000001_add_id_port_to_charging_session_table',1),(29,'2026_11_02_000002_add_metode_and_nullable_payment_to_topup_table',1),(30,'2026_11_03_143439_add_incident_fields_to_charging_session_and_error_log',2);
/*!40000 ALTER TABLE `migrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `password_reset_tokens`
--

DROP TABLE IF EXISTS `password_reset_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `password_reset_tokens` (
  `email` varchar(255) NOT NULL,
  `token` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `password_reset_tokens`
--

LOCK TABLES `password_reset_tokens` WRITE;
/*!40000 ALTER TABLE `password_reset_tokens` DISABLE KEYS */;
/*!40000 ALTER TABLE `password_reset_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payment`
--

DROP TABLE IF EXISTS `payment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `payment` (
  `id_payment` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `id_session` bigint(20) unsigned DEFAULT NULL,
  `id_metode` bigint(20) unsigned NOT NULL,
  `jenis_pembayaran` varchar(24) NOT NULL DEFAULT 'charging',
  `total_bayar` int(11) NOT NULL,
  `status_pembayaran` enum('Pending','Sukses','Gagal') NOT NULL DEFAULT 'Pending',
  `waktu_pembayaran` datetime NOT NULL,
  `referensi_gateway` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id_payment`),
  KEY `payment_id_metode_foreign` (`id_metode`),
  KEY `payment_id_session_foreign` (`id_session`),
  CONSTRAINT `payment_id_metode_foreign` FOREIGN KEY (`id_metode`) REFERENCES `metode_pembayaran` (`id_metode`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `payment_id_session_foreign` FOREIGN KEY (`id_session`) REFERENCES `charging_session` (`id_session`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payment`
--

LOCK TABLES `payment` WRITE;
/*!40000 ALTER TABLE `payment` DISABLE KEYS */;
INSERT INTO `payment` VALUES (1,1,1,'charging',0,'Gagal','2026-11-03 14:58:05','HOLD-20261103145805-1','2026-11-03 07:58:05','2026-11-03 07:58:05'),(2,2,1,'charging',55000,'Sukses','2026-11-03 15:03:44','HOLD-20261103150344-2','2026-11-03 08:03:44','2026-11-03 08:03:44'),(3,3,1,'charging',55000,'Sukses','2026-11-03 15:06:55','HOLD-20261103150652-3','2026-11-03 08:06:52','2026-11-03 08:06:55'),(4,4,1,'charging',97500,'Sukses','2026-11-03 15:09:07','HOLD-20261103150810-4','2026-11-03 08:08:10','2026-11-03 08:09:07'),(5,5,1,'charging',25000,'Sukses','2026-11-03 15:32:38','HOLD-20261103153238-5','2026-11-03 08:32:38','2026-11-03 08:32:38'),(6,6,1,'charging',15000,'Sukses','2026-11-03 15:36:39','HOLD-20261103153417-6','2026-11-03 08:34:17','2026-11-03 08:36:39'),(7,7,1,'charging',15000,'Sukses','2026-11-03 15:39:07','HOLD-20261103153902-7','2026-11-03 08:39:02','2026-11-03 08:39:07'),(8,8,1,'charging',15000,'Sukses','2026-11-03 15:58:10','HOLD-20261103155805-8','2026-11-03 08:58:05','2026-11-03 08:58:10'),(9,9,1,'charging',15000,'Sukses','2026-11-03 15:58:27','HOLD-20261103155819-9','2026-11-03 08:58:19','2026-11-03 08:58:27'),(10,10,1,'charging',20000,'Sukses','2026-11-03 16:17:13','HOLD-20261103161647-10','2026-11-03 09:16:47','2026-11-03 09:17:13'),(11,11,1,'charging',98750,'Sukses','2026-11-03 16:27:25','HOLD-20261103162340-11','2026-11-03 09:23:40','2026-11-03 09:27:25'),(12,12,1,'charging',37075,'Sukses','2026-11-03 16:30:30','HOLD-20261103162955-12','2026-11-03 09:29:55','2026-11-03 09:30:30'),(13,13,1,'charging',15000,'Sukses','2026-11-03 16:34:01','HOLD-20261103163350-13','2026-11-03 09:33:50','2026-11-03 09:34:01'),(14,14,1,'charging',70500,'Sukses','2026-11-03 16:42:09','HOLD-20261103164103-14','2026-11-03 09:41:03','2026-11-03 09:42:09'),(15,15,1,'charging',49000,'Sukses','2026-11-03 16:47:22','HOLD-20261103164634-15','2026-11-03 09:46:34','2026-11-03 09:47:22'),(16,16,1,'charging',20575,'Sukses','2026-11-04 06:50:08','HOLD-20261104064951-16','2026-11-03 23:49:51','2026-11-03 23:50:08'),(17,17,1,'charging',41675,'Sukses','2026-11-04 06:58:16','HOLD-20261104065736-17','2026-11-03 23:57:36','2026-11-03 23:58:16'),(18,18,1,'charging',28825,'Sukses','2026-11-04 07:11:31','HOLD-20261104071105-18','2026-11-04 00:11:05','2026-11-04 00:11:31');
/*!40000 ALTER TABLE `payment` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `personal_access_tokens`
--

DROP TABLE IF EXISTS `personal_access_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `personal_access_tokens` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tokenable_type` varchar(255) NOT NULL,
  `tokenable_id` varchar(20) NOT NULL,
  `name` text NOT NULL,
  `token` varchar(64) NOT NULL,
  `abilities` text DEFAULT NULL,
  `last_used_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `personal_access_tokens_token_unique` (`token`),
  KEY `personal_access_tokens_tokenable_type_tokenable_id_index` (`tokenable_type`,`tokenable_id`),
  KEY `personal_access_tokens_expires_at_index` (`expires_at`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `personal_access_tokens`
--

LOCK TABLES `personal_access_tokens` WRITE;
/*!40000 ALTER TABLE `personal_access_tokens` DISABLE KEYS */;
INSERT INTO `personal_access_tokens` VALUES (2,'App\\Models\\User','DRV0000000001','web','a05336741e44721e78e091b987e07142204faa0012703d951c1cae227fabe925','[\"*\"]','2026-11-04 01:48:32',NULL,'2026-11-04 00:08:19','2026-11-04 01:48:32');
/*!40000 ALTER TABLE `personal_access_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ports`
--

DROP TABLE IF EXISTS `ports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ports` (
  `id_port` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `id_charger` bigint(20) unsigned NOT NULL,
  `nomor_port` varchar(255) NOT NULL,
  `tipe_konektor` varchar(255) NOT NULL,
  `tipe_charging` enum('DC','AC') NOT NULL,
  `daya_maks_kw` decimal(8,2) NOT NULL,
  `status_port` enum('Available','Charging','Reserved','Out of Order','Maintenance') NOT NULL DEFAULT 'Available',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id_port`),
  KEY `ports_id_charger_foreign` (`id_charger`),
  CONSTRAINT `ports_id_charger_foreign` FOREIGN KEY (`id_charger`) REFERENCES `charger` (`id_charger`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ports`
--

LOCK TABLES `ports` WRITE;
/*!40000 ALTER TABLE `ports` DISABLE KEYS */;
INSERT INTO `ports` VALUES (1,1,'Port 1','ccs2','DC',50.00,'Out of Order','2026-11-03 07:14:42','2026-11-03 08:39:07'),(2,2,'Port 1','ccs2','AC',22.00,'Available','2026-11-03 07:14:42','2026-11-04 00:11:31'),(3,3,'Port 1','ccs2','DC',50.00,'Out of Order','2026-11-03 07:14:42','2026-11-03 08:36:39'),(4,4,'Port 1','type_2','AC',22.00,'Available','2026-11-03 07:14:42','2026-11-03 07:14:42'),(5,5,'Port 1','ccs2','DC',22.00,'Charging','2026-11-03 07:14:42','2026-11-03 07:14:42'),(6,6,'Port 1','ccs2','DC',22.00,'Charging','2026-11-03 07:14:42','2026-11-03 07:14:42'),(7,7,'Port 1','type_2','AC',22.00,'Out of Order','2026-11-03 07:14:42','2026-11-03 07:14:42'),(8,8,'Port 1','chademo','DC',60.00,'Out of Order','2026-11-03 07:14:42','2026-11-03 07:14:42');
/*!40000 ALTER TABLE `ports` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `refund`
--

DROP TABLE IF EXISTS `refund`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `refund` (
  `id_refund` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `id_payment` bigint(20) unsigned NOT NULL,
  `nominal` int(11) NOT NULL,
  `waktu_execute` datetime NOT NULL,
  `status_refund` enum('Pending','Sukses','Gagal') NOT NULL DEFAULT 'Pending',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id_refund`),
  KEY `refund_id_payment_foreign` (`id_payment`),
  CONSTRAINT `refund_id_payment_foreign` FOREIGN KEY (`id_payment`) REFERENCES `payment` (`id_payment`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `refund`
--

LOCK TABLES `refund` WRITE;
/*!40000 ALTER TABLE `refund` DISABLE KEYS */;
INSERT INTO `refund` VALUES (1,1,55000,'2026-11-03 14:58:05','Sukses','2026-11-03 07:58:05','2026-11-03 07:58:05'),(2,5,30000,'2026-11-03 15:32:38','Sukses','2026-11-03 08:32:38','2026-11-03 08:32:38'),(3,6,3750,'2026-11-03 15:36:39','Sukses','2026-11-03 08:36:39','2026-11-03 08:36:39'),(4,7,40000,'2026-11-03 15:39:07','Sukses','2026-11-03 08:39:07','2026-11-03 08:39:07'),(5,8,27500,'2026-11-03 15:58:10','Sukses','2026-11-03 08:58:10','2026-11-03 08:58:10'),(6,9,27500,'2026-11-03 15:58:27','Sukses','2026-11-03 08:58:27','2026-11-03 08:58:27'),(7,12,31675,'2026-11-03 16:30:30','Sukses','2026-11-03 09:30:30','2026-11-03 09:30:30'),(8,14,58250,'2026-11-03 16:42:09','Sukses','2026-11-03 09:42:09','2026-11-03 09:42:09'),(9,15,43500,'2026-11-03 16:47:22','Sukses','2026-11-03 09:47:22','2026-11-03 09:47:22'),(10,16,10675,'2026-11-04 06:50:08','Sukses','2026-11-03 23:50:08','2026-11-03 23:50:08'),(11,17,39575,'2026-11-04 06:58:16','Sukses','2026-11-03 23:58:16','2026-11-03 23:58:16'),(12,18,14925,'2026-11-04 07:11:31','Sukses','2026-11-04 00:11:31','2026-11-04 00:11:31');
/*!40000 ALTER TABLE `refund` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sessions`
--

DROP TABLE IF EXISTS `sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `sessions` (
  `id` varchar(255) NOT NULL,
  `user_id` bigint(20) unsigned DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `payload` longtext NOT NULL,
  `last_activity` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `sessions_user_id_index` (`user_id`),
  KEY `sessions_last_activity_index` (`last_activity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sessions`
--

LOCK TABLES `sessions` WRITE;
/*!40000 ALTER TABLE `sessions` DISABLE KEYS */;
/*!40000 ALTER TABLE `sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `station_operators`
--

DROP TABLE IF EXISTS `station_operators`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `station_operators` (
  `id_station_operator` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `id_user` char(13) NOT NULL,
  `id_location` bigint(20) unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id_station_operator`),
  KEY `station_operators_id_user_foreign` (`id_user`),
  KEY `station_operators_id_location_foreign` (`id_location`),
  CONSTRAINT `station_operators_id_location_foreign` FOREIGN KEY (`id_location`) REFERENCES `location` (`id_location`) ON DELETE CASCADE,
  CONSTRAINT `station_operators_id_user_foreign` FOREIGN KEY (`id_user`) REFERENCES `users` (`id_user`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `station_operators`
--

LOCK TABLES `station_operators` WRITE;
/*!40000 ALTER TABLE `station_operators` DISABLE KEYS */;
INSERT INTO `station_operators` VALUES (1,'OPS0000000005',2,'2026-11-03 07:14:42','2026-11-03 07:14:42');
/*!40000 ALTER TABLE `station_operators` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tarif`
--

DROP TABLE IF EXISTS `tarif`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tarif` (
  `id_tarif` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `id_location` bigint(20) unsigned NOT NULL,
  `harga_per_kwh` int(11) NOT NULL,
  `biaya_minimum` int(11) NOT NULL,
  `biaya_parkir_pjam` int(11) NOT NULL,
  `periode_mulai` datetime NOT NULL,
  `periode_berakhir` datetime NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id_tarif`),
  KEY `tarif_id_location_foreign` (`id_location`),
  CONSTRAINT `tarif_id_location_foreign` FOREIGN KEY (`id_location`) REFERENCES `location` (`id_location`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tarif`
--

LOCK TABLES `tarif` WRITE;
/*!40000 ALTER TABLE `tarif` DISABLE KEYS */;
INSERT INTO `tarif` VALUES (1,1,2500,10000,5000,'2026-10-03 14:14:42','2027-11-03 14:14:42','2026-11-03 07:14:42','2026-11-03 07:14:42'),(2,2,2466,15000,5000,'2026-01-01 00:00:00','2026-12-31 23:59:59','2026-11-03 07:14:42','2026-11-03 07:14:42'),(3,3,2700,12000,6000,'2026-10-03 14:14:42','2027-11-03 14:14:42','2026-11-03 07:14:42','2026-11-03 07:14:42');
/*!40000 ALTER TABLE `tarif` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `topup`
--

DROP TABLE IF EXISTS `topup`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `topup` (
  `id_topup` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `id_wallet` bigint(20) unsigned NOT NULL,
  `id_payment` bigint(20) unsigned DEFAULT NULL,
  `id_metode` bigint(20) unsigned DEFAULT NULL,
  `referensi` varchar(64) DEFAULT NULL,
  `kode_pembayaran` varchar(100) DEFAULT NULL,
  `nominal` int(11) NOT NULL,
  `biaya_layanan` int(11) NOT NULL DEFAULT 0,
  `status_topup` enum('Pending','Sukses','Gagal') NOT NULL DEFAULT 'Pending',
  `waktu_topup` datetime NOT NULL,
  `kedaluwarsa_pada` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id_topup`),
  UNIQUE KEY `topup_referensi_unique` (`referensi`),
  KEY `topup_id_wallet_foreign` (`id_wallet`),
  KEY `topup_id_payment_foreign` (`id_payment`),
  KEY `topup_id_metode_foreign` (`id_metode`),
  CONSTRAINT `topup_id_metode_foreign` FOREIGN KEY (`id_metode`) REFERENCES `metode_pembayaran` (`id_metode`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `topup_id_payment_foreign` FOREIGN KEY (`id_payment`) REFERENCES `payment` (`id_payment`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `topup_id_wallet_foreign` FOREIGN KEY (`id_wallet`) REFERENCES `dompet` (`id_wallet`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `topup`
--

LOCK TABLES `topup` WRITE;
/*!40000 ALTER TABLE `topup` DISABLE KEYS */;
/*!40000 ALTER TABLE `topup` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_profile`
--

DROP TABLE IF EXISTS `user_profile`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user_profile` (
  `id_user_profile` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `id_user` char(13) NOT NULL,
  `nama_lengkap` varchar(255) NOT NULL,
  `nomor_telepon` char(13) NOT NULL,
  `alamat` text DEFAULT NULL,
  `tanggal_lahir` date NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id_user_profile`),
  UNIQUE KEY `user_profile_id_user_unique` (`id_user`),
  CONSTRAINT `user_profile_id_user_foreign` FOREIGN KEY (`id_user`) REFERENCES `users` (`id_user`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_profile`
--

LOCK TABLES `user_profile` WRITE;
/*!40000 ALTER TABLE `user_profile` DISABLE KEYS */;
INSERT INTO `user_profile` VALUES (1,'DRV0000000001','Budi Santoso','081234567890','Jl. Merdeka No. 10, Purwokerto','1995-03-12','2026-11-03 07:14:38','2026-11-03 07:14:38'),(2,'DRV0000000002','Siti Rahmawati','081298765432','Jl. Sudirman No. 25, Purwokerto','1998-07-20','2026-11-03 07:14:39','2026-11-03 07:14:39'),(3,'DRV0000000003','Agus Setiawan','081356789012','Jl. Gatot Subroto No. 5, Purwokerto','1990-11-02','2026-11-03 07:14:39','2026-11-03 07:14:39'),(4,'ADM0000000004','Ahmad Fauzi','081411223344','Jl. Ahmad Yani No. 1, Purwokerto','1988-01-15','2026-11-03 07:14:40','2026-11-03 07:14:40'),(5,'OPS0000000005','Dewi Lestari','081533445566','Jl. Dr. Angka No. 8, Purwokerto','1993-09-30','2026-11-03 07:14:40','2026-11-03 07:14:40'),(6,'DRV0000000006','Joko Prasetyo','081699887766',NULL,'2000-05-18','2026-11-03 07:14:41','2026-11-03 07:14:41'),(7,'DRV0000000007','Rina Amelia','081777889900','Jl. Veteran No. 12, Purwokerto','1996-12-25','2026-11-03 07:14:41','2026-11-03 07:14:41');
/*!40000 ALTER TABLE `user_profile` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `id_user` char(13) NOT NULL,
  `email` varchar(255) NOT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `remember_token` varchar(100) DEFAULT NULL,
  `peran` varchar(255) NOT NULL,
  `status_akun` enum('Aktif','Nonaktif','Suspend','Banned') NOT NULL DEFAULT 'Aktif',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id_user`),
  UNIQUE KEY `users_email_unique` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES ('ADM0000000004','admin.utama@admin.ac.id','2026-11-03 07:14:39','$2y$12$tI5rEX0t89o6g/o0My5LcexwS.z45RbKh4Ma6UL/MlTVdsbcGiHb6',NULL,'admin','Aktif','2026-11-03 07:14:40','2026-11-03 07:14:40'),('DRV0000000001','budi.driver@ac.id','2026-11-03 07:14:38','$2y$12$4pkDGqsqcoUDihEEb1UzzOMm4qfMq0PtXDyKUIogJxnyQ9PHAaCie',NULL,'driver','Aktif','2026-11-03 07:14:38','2026-11-03 07:14:38'),('DRV0000000002','siti.driver@ac.id','2026-11-03 07:14:38','$2y$12$wX6S0nyjjGopxnuEq.5m4efm0lKGB1Mh91pwFJLO8OIw8hFVweHEG',NULL,'driver','Aktif','2026-11-03 07:14:39','2026-11-03 07:14:39'),('DRV0000000003','agus.driver@ac.id','2026-11-03 07:14:39','$2y$12$MN9o.NA/jXhlHU.e8douseyYy2Lgntxk6bexSbFONgcgVk6Xm48bS',NULL,'driver','Nonaktif','2026-11-03 07:14:39','2026-11-03 07:14:39'),('DRV0000000006','joko.driver@ac.id','2026-11-03 07:14:40','$2y$12$tSuAYxC8wGWNQW14cWjjK.mWD22M2KtW5Men/hLb.eRQ2L1GN72ii',NULL,'driver','Suspend','2026-11-03 07:14:41','2026-11-03 07:14:41'),('DRV0000000007','rina.driver@ac.id','2026-11-03 07:14:41','$2y$12$vOPrCf.RfReSJPZdx79aqeJnz2wgPzM6P4dJwopGmQBaBlDBl2nSO',NULL,'driver','Banned','2026-11-03 07:14:41','2026-11-03 07:14:41'),('OPS0000000005','ops.lapangan@ops.ac.id','2026-11-03 07:14:40','$2y$12$s24fm6HtyVMMWWIR5jBWGOpln7lsPYo1egR40jDdLG4KuiNHhohF6',NULL,'operator','Aktif','2026-11-03 07:14:40','2026-11-03 07:14:40');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vehicle`
--

DROP TABLE IF EXISTS `vehicle`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `vehicle` (
  `id_vehicle` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `id_user` char(13) NOT NULL,
  `merek` varchar(255) NOT NULL,
  `model` varchar(255) NOT NULL,
  `nomor_polisi` char(9) NOT NULL,
  `tipe_konektor` enum('type_2','ccs2','chademo','gbt') NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `kapasitas_baterai_kwh` decimal(5,1) DEFAULT NULL,
  PRIMARY KEY (`id_vehicle`),
  KEY `vehicle_id_user_foreign` (`id_user`),
  CONSTRAINT `vehicle_id_user_foreign` FOREIGN KEY (`id_user`) REFERENCES `users` (`id_user`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vehicle`
--

LOCK TABLES `vehicle` WRITE;
/*!40000 ALTER TABLE `vehicle` DISABLE KEYS */;
INSERT INTO `vehicle` VALUES (1,'DRV0000000001','Toyota','bZ4X','R 1234 AB','ccs2','2026-11-03 07:19:31','2026-11-03 07:19:31',71.4),(2,'DRV0000000001','Hyundai','Ioniq 5','R 5678 CD','type_2','2026-11-03 08:57:57','2026-11-03 08:57:57',72.6);
/*!40000 ALTER TABLE `vehicle` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-11-04 15:51:10
