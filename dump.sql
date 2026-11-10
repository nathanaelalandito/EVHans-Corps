-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Nov 04, 2026 at 08:29 AM
-- Server version: 8.4.3
-- PHP Version: 8.5.6

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `evcharge`
--

-- --------------------------------------------------------

--
-- Table structure for table `cache`
--

CREATE TABLE `cache` (
  `key` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiration` bigint NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `cache_locks`
--

CREATE TABLE `cache_locks` (
  `key` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `owner` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiration` bigint NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `charger`
--

CREATE TABLE `charger` (
  `id_charger` bigint UNSIGNED NOT NULL,
  `id_location` bigint UNSIGNED NOT NULL,
  `kode_perangkat` char(6) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipe_konektor` enum('type_2','ccs2','chademo','gbt') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `daya_kwh` int NOT NULL,
  `tipe_charging` enum('AC','DC') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('tersedia','sedang digunakan','maintenance','rusak','offline') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'tersedia',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `charger`
--

INSERT INTO `charger` (`id_charger`, `id_location`, `kode_perangkat`, `tipe_konektor`, `daya_kwh`, `tipe_charging`, `status`, `created_at`, `updated_at`) VALUES
(47, 1, 'CHG001', 'ccs2', 50, 'DC', 'tersedia', '2026-10-08 21:20:38', '2026-10-08 21:20:38'),
(48, 1, 'CHG002', 'ccs2', 50, 'DC', 'sedang digunakan', '2026-10-08 21:20:38', '2026-10-08 21:20:38'),
(49, 1, 'CHG003', 'ccs2', 50, 'DC', 'tersedia', '2026-10-08 21:20:38', '2026-10-08 21:20:38'),
(50, 1, 'CHG004', 'type_2', 22, 'AC', 'sedang digunakan', '2026-10-08 21:20:38', '2026-10-08 21:20:38'),
(51, 1, 'CHG005', 'type_2', 22, 'AC', 'tersedia', '2026-10-08 21:20:38', '2026-10-08 21:20:38'),
(52, 1, 'CHG006', 'type_2', 22, 'AC', 'sedang digunakan', '2026-10-08 21:20:38', '2026-10-08 21:20:38'),
(53, 2, 'CHG007', 'ccs2', 22, 'DC', 'sedang digunakan', '2026-10-08 21:20:38', '2026-10-08 21:20:38'),
(54, 2, 'CHG008', 'ccs2', 22, 'DC', 'sedang digunakan', '2026-10-08 21:20:38', '2026-10-08 21:20:38'),
(55, 2, 'CHG009', 'ccs2', 22, 'DC', 'sedang digunakan', '2026-10-08 21:20:38', '2026-10-08 21:20:38'),
(56, 2, 'CHG010', 'ccs2', 22, 'DC', 'sedang digunakan', '2026-10-08 21:20:38', '2026-10-08 21:20:38'),
(57, 3, 'CHG011', 'chademo', 60, 'DC', 'tersedia', '2026-10-08 21:20:38', '2026-10-08 21:20:38'),
(58, 3, 'CHG012', 'chademo', 60, 'DC', 'maintenance', '2026-10-08 21:20:38', '2026-10-08 21:20:38'),
(59, 3, 'CHG013', 'type_2', 22, 'AC', 'tersedia', '2026-10-08 21:20:38', '2026-10-08 21:20:38'),
(60, 3, 'CHG014', 'type_2', 22, 'AC', 'rusak', '2026-10-08 21:20:38', '2026-10-08 21:20:38'),
(61, 3, 'CHG015', 'type_2', 22, 'AC', 'offline', '2026-10-08 21:20:38', '2026-10-08 21:20:38'),
(62, 4, 'CHG016', 'ccs2', 60, 'DC', 'tersedia', '2026-10-08 21:20:38', '2026-10-08 21:20:38'),
(63, 4, 'CHG017', 'ccs2', 60, 'DC', 'tersedia', '2026-10-08 21:20:38', '2026-10-08 21:20:38'),
(64, 4, 'CHG018', 'type_2', 22, 'AC', 'tersedia', '2026-10-08 21:20:38', '2026-11-04 06:54:01'),
(65, 4, 'CHG019', 'type_2', 22, 'AC', 'sedang digunakan', '2026-10-08 21:20:38', '2026-10-08 21:20:38'),
(66, 5, 'CHG020', 'ccs2', 50, 'DC', 'sedang digunakan', '2026-10-08 21:20:38', '2026-10-08 21:20:38'),
(67, 5, 'CHG021', 'ccs2', 50, 'DC', 'tersedia', '2026-10-08 21:20:38', '2026-10-08 21:20:38'),
(68, 5, 'CHG022', 'type_2', 7, 'AC', 'tersedia', '2026-10-08 21:20:38', '2026-10-08 21:20:38'),
(69, 5, 'CHG023', 'type_2', 7, 'AC', 'tersedia', '2026-10-08 21:20:38', '2026-10-08 21:20:38'),
(70, 5, 'CHG024', 'type_2', 7, 'AC', 'sedang digunakan', '2026-10-08 21:20:38', '2026-10-08 21:20:38'),
(71, 6, 'CHG025', 'ccs2', 120, 'DC', 'tersedia', '2026-10-08 21:20:38', '2026-10-08 21:20:38'),
(72, 6, 'CHG026', 'ccs2', 120, 'DC', 'sedang digunakan', '2026-10-08 21:20:38', '2026-10-08 21:20:38'),
(73, 6, 'CHG027', 'gbt', 60, 'DC', 'tersedia', '2026-10-08 21:20:38', '2026-10-08 21:20:38'),
(74, 6, 'CHG028', 'type_2', 22, 'AC', 'tersedia', '2026-10-08 21:20:38', '2026-10-08 21:20:38'),
(75, 7, 'CHG029', 'type_2', 22, 'AC', 'tersedia', '2026-10-08 21:20:38', '2026-10-08 21:20:38'),
(76, 7, 'CHG030', 'type_2', 22, 'AC', 'tersedia', '2026-10-08 21:20:38', '2026-10-08 21:20:38'),
(77, 7, 'CHG031', 'type_2', 7, 'AC', 'sedang digunakan', '2026-10-08 21:20:38', '2026-10-08 21:20:38'),
(78, 8, 'CHG032', 'ccs2', 150, 'DC', 'tersedia', '2026-10-08 21:20:38', '2026-10-08 21:20:38'),
(79, 8, 'CHG033', 'ccs2', 150, 'DC', 'tersedia', '2026-10-08 21:20:38', '2026-10-08 21:20:38'),
(80, 8, 'CHG034', 'chademo', 50, 'DC', 'tersedia', '2026-10-08 21:20:38', '2026-10-08 21:20:38'),
(81, 8, 'CHG035', 'gbt', 60, 'DC', 'offline', '2026-10-08 21:20:38', '2026-10-08 21:20:38'),
(82, 8, 'CHG036', 'type_2', 22, 'AC', 'tersedia', '2026-10-08 21:20:38', '2026-10-08 21:20:38'),
(83, 8, 'CHG037', 'type_2', 22, 'AC', 'sedang digunakan', '2026-10-08 21:20:38', '2026-10-08 21:20:38'),
(84, 9, 'CHG038', 'type_2', 22, 'AC', 'offline', '2026-10-08 21:20:38', '2026-10-08 21:20:38'),
(85, 9, 'CHG039', 'type_2', 22, 'AC', 'offline', '2026-10-08 21:20:38', '2026-10-08 21:20:38'),
(86, 10, 'CHG040', 'ccs2', 150, 'DC', 'sedang digunakan', '2026-10-08 21:20:38', '2026-10-08 21:20:38'),
(87, 10, 'CHG041', 'ccs2', 150, 'DC', 'tersedia', '2026-10-08 21:20:38', '2026-10-08 21:20:38'),
(88, 10, 'CHG042', 'ccs2', 60, 'DC', 'tersedia', '2026-10-08 21:20:38', '2026-10-08 21:20:38'),
(89, 10, 'CHG043', 'type_2', 22, 'AC', 'tersedia', '2026-10-08 21:20:38', '2026-10-08 21:20:38'),
(90, 10, 'CHG044', 'type_2', 22, 'AC', 'tersedia', '2026-10-08 21:20:38', '2026-10-08 21:20:38'),
(91, 10, 'CHG045', 'type_2', 22, 'AC', 'sedang digunakan', '2026-10-08 21:20:38', '2026-10-08 21:20:38'),
(92, 10, 'CHG046', 'gbt', 60, 'DC', 'tersedia', '2026-10-08 21:20:38', '2026-10-08 21:20:38');

-- --------------------------------------------------------

--
-- Table structure for table `charging_session`
--

CREATE TABLE `charging_session` (
  `id_session` bigint UNSIGNED NOT NULL,
  `id_user` char(13) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `id_charger` bigint UNSIGNED NOT NULL,
  `id_tarif` bigint UNSIGNED NOT NULL,
  `id_vehicle` bigint UNSIGNED NOT NULL,
  `waktu_mulai` datetime NOT NULL,
  `waktu_selesai` datetime DEFAULT NULL,
  `total_energi_kwh` decimal(8,2) NOT NULL,
  `status` enum('pending','berlangsung','selesai','dibatalkan') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `soc_awal` tinyint UNSIGNED NOT NULL,
  `soc_akhir` tinyint UNSIGNED DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `target_energi_kwh` decimal(8,2) DEFAULT NULL,
  `estimasi_biaya_charging` int DEFAULT NULL,
  `estimasi_biaya_parkir` int DEFAULT NULL,
  `saldo_hold` int NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `charging_session`
--

INSERT INTO `charging_session` (`id_session`, `id_user`, `id_charger`, `id_tarif`, `id_vehicle`, `waktu_mulai`, `waktu_selesai`, `total_energi_kwh`, `status`, `soc_awal`, `soc_akhir`, `created_at`, `updated_at`, `target_energi_kwh`, `estimasi_biaya_charging`, `estimasi_biaya_parkir`, `saldo_hold`) VALUES
(1, 'DRV0000000001', 64, 14, 1, '2026-10-09 11:58:33', '2026-10-09 12:00:47', 42.00, 'selesai', 16, 100, '2026-10-09 04:58:33', '2026-10-09 05:00:47', 42.00, 109200, 8000, 117200),
(2, 'DRV0000000001', 64, 14, 1, '2026-10-09 12:32:54', '2026-10-09 12:38:58', 33.50, 'selesai', 33, 100, '2026-10-09 05:32:54', '2026-10-09 05:38:58', 33.50, 87100, 8000, 95100),
(3, 'DRV0000000001', 64, 14, 1, '2026-10-14 07:47:34', '2026-10-14 07:49:38', 42.50, 'selesai', 15, 100, '2026-10-14 00:47:34', '2026-10-14 00:49:38', 42.50, 110500, 8000, 118500),
(4, 'DRV0000000001', 64, 14, 1, '2026-10-28 14:38:36', '2026-10-28 14:38:45', 3.38, 'selesai', 26, 33, '2026-10-28 07:38:36', '2026-10-28 07:38:45', 19.50, 50700, 4000, 54700),
(5, 'DRV0000000001', 64, 14, 1, '2026-11-02 20:52:58', '2026-11-02 20:53:58', 19.50, 'selesai', 61, 100, '2026-11-02 13:52:58', '2026-11-02 13:53:58', 19.50, 50700, 4000, 54700),
(6, 'DRV0000000001', 64, 14, 1, '2026-11-02 21:06:29', '2026-11-02 21:07:24', 18.50, 'selesai', 63, 100, '2026-11-02 14:06:29', '2026-11-02 14:07:24', 18.50, 48100, 4000, 52100),
(7, 'DRV0000000001', 64, 14, 1, '2026-11-02 21:21:31', '2026-11-02 21:22:17', 15.50, 'selesai', 69, 100, '2026-11-02 14:21:31', '2026-11-02 14:22:17', 15.50, 40300, 4000, 44300),
(8, 'DRV0000000001', 64, 14, 1, '2026-11-02 21:23:28', '2026-11-02 21:25:30', 44.50, 'selesai', 11, 100, '2026-11-02 14:23:28', '2026-11-02 14:25:30', 44.50, 115700, 12000, 127700),
(9, 'DRV0000000001', 64, 14, 1, '2026-11-02 21:46:42', '2026-11-02 21:48:08', 30.00, 'selesai', 40, 100, '2026-11-02 14:46:42', '2026-11-02 14:48:08', 30.00, 78000, 8000, 86000),
(10, 'DRV0000000001', 64, 14, 1, '2026-11-02 21:52:20', '2026-11-02 21:54:27', 45.00, 'selesai', 10, 100, '2026-11-02 14:52:20', '2026-11-02 14:54:27', 45.00, 117000, 12000, 129000),
(11, 'DRV0000000001', 64, 14, 1, '2026-11-02 22:05:16', '2026-11-02 22:06:37', 28.50, 'selesai', 43, 100, '2026-11-02 15:05:16', '2026-11-02 15:06:37', 28.50, 74100, 8000, 82100),
(12, 'DRV0000000001', 64, 14, 1, '2026-11-02 22:11:29', '2026-11-02 22:12:29', 18.50, 'selesai', 63, 100, '2026-11-02 15:11:29', '2026-11-02 15:12:29', 18.50, 48100, 4000, 52100),
(13, 'DRV0000000001', 64, 14, 1, '2026-11-02 22:23:35', '2026-11-02 22:24:35', 20.00, 'selesai', 60, 100, '2026-11-02 15:23:35', '2026-11-02 15:24:35', 20.00, 52000, 4000, 56000),
(14, 'DRV0000000001', 64, 14, 1, '2026-11-02 22:35:56', '2026-11-02 22:36:49', 18.00, 'selesai', 64, 100, '2026-11-02 15:35:56', '2026-11-02 15:36:49', 18.00, 46800, 4000, 50800),
(15, 'DRV0000000001', 64, 14, 1, '2026-11-03 11:14:45', '2026-11-03 11:16:42', 27.00, 'selesai', 46, 100, '2026-11-03 04:14:45', '2026-11-03 04:16:42', 27.00, 70200, 8000, 78200),
(16, 'DRV0000000001', 64, 14, 1, '2026-11-03 11:38:51', '2026-11-03 11:39:27', 11.50, 'selesai', 77, 100, '2026-11-03 04:38:51', '2026-11-03 04:39:27', 11.50, 29900, 4000, 33900),
(17, 'DRV0000000001', 64, 14, 1, '2026-11-03 11:50:54', '2026-11-03 11:52:16', 28.50, 'selesai', 43, 100, '2026-11-03 04:50:54', '2026-11-03 04:52:16', 28.50, 74100, 8000, 82100),
(18, 'DRV0000000001', 64, 14, 1, '2026-11-03 18:46:06', '2026-11-03 18:47:27', 29.00, 'selesai', 42, 100, '2026-11-03 11:46:06', '2026-11-03 11:47:27', 29.00, 75400, 8000, 83400),
(19, 'DRV0000000001', 64, 14, 1, '2026-11-04 13:52:53', '2026-11-04 13:54:01', 24.50, 'selesai', 51, 100, '2026-11-04 06:52:53', '2026-11-04 06:54:01', 24.50, 63700, 8000, 71700);

-- --------------------------------------------------------

--
-- Table structure for table `dompet`
--

CREATE TABLE `dompet` (
  `id_wallet` bigint UNSIGNED NOT NULL,
  `id_user` char(13) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `saldo` int NOT NULL DEFAULT '0',
  `pin_transaksi` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `percobaan_pin_gagal` tinyint UNSIGNED NOT NULL DEFAULT '0',
  `locked_until` timestamp NULL DEFAULT NULL,
  `status_dompet` enum('aktif','nonaktif') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'aktif',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `saldo_hold` int NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `dompet`
--

INSERT INTO `dompet` (`id_wallet`, `id_user`, `saldo`, `pin_transaksi`, `percobaan_pin_gagal`, `locked_until`, `status_dompet`, `created_at`, `updated_at`, `saldo_hold`) VALUES
(1, 'DRV0000000001', 588300, '$2y$12$EttJSKMAVk5g2VpOI2lTAedvxuh3EnZqUPCed2wQ8E0WL65WcB1se', 0, NULL, 'aktif', '2026-10-08 21:22:36', '2026-11-04 06:54:01', 0),
(2, 'OPS0000000005', 0, NULL, 0, NULL, 'aktif', '2026-11-01 19:12:30', '2026-11-01 19:12:30', 0),
(3, 'ADM0000000004', 0, NULL, 0, NULL, 'aktif', '2026-11-01 19:13:13', '2026-11-01 19:13:13', 0);

-- --------------------------------------------------------

--
-- Table structure for table `error_log`
--

CREATE TABLE `error_log` (
  `id_log` bigint UNSIGNED NOT NULL,
  `id_charger` bigint UNSIGNED NOT NULL,
  `id_session` bigint UNSIGNED NOT NULL,
  `id_user` char(13) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `jenis_error` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `desk_mslh` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `waktu_terjadi` datetime NOT NULL,
  `status_tanganan` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `failed_jobs`
--

CREATE TABLE `failed_jobs` (
  `id` bigint UNSIGNED NOT NULL,
  `uuid` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `connection` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `queue` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `exception` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `jobs`
--

CREATE TABLE `jobs` (
  `id` bigint UNSIGNED NOT NULL,
  `queue` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `attempts` smallint UNSIGNED NOT NULL,
  `reserved_at` int UNSIGNED DEFAULT NULL,
  `available_at` int UNSIGNED NOT NULL,
  `created_at` int UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `job_batches`
--

CREATE TABLE `job_batches` (
  `id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `total_jobs` int NOT NULL,
  `pending_jobs` int NOT NULL,
  `failed_jobs` int NOT NULL,
  `failed_job_ids` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `options` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `cancelled_at` int DEFAULT NULL,
  `created_at` int NOT NULL,
  `finished_at` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `location`
--

CREATE TABLE `location` (
  `id_location` bigint UNSIGNED NOT NULL,
  `nama_lokasi` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `alamat` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `latitude` decimal(10,7) NOT NULL,
  `longitude` decimal(10,7) NOT NULL,
  `jam_buka` time NOT NULL,
  `jam_tutup` time NOT NULL,
  `status` enum('aktif','nonaktif','maintenance') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'aktif',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `location`
--

INSERT INTO `location` (`id_location`, `nama_lokasi`, `alamat`, `latitude`, `longitude`, `jam_buka`, `jam_tutup`, `status`, `created_at`, `updated_at`) VALUES
(1, 'EVCharge Hub - Malioboro Mall', 'Jl. Malioboro No. 52, Yogyakarta', -7.7930000, 110.3655000, '08:00:00', '22:00:00', 'aktif', '2026-10-08 21:20:38', '2026-10-08 21:20:38'),
(2, 'EVCharge Hub - Ambarrukmo Plaza', 'Jl. Laksda Adisucipto, Yogyakarta', -7.7825000, 110.3945000, '00:00:00', '23:59:00', 'aktif', '2026-10-08 21:20:38', '2026-10-08 21:20:38'),
(3, 'EVCharge Hub - UGM Boulevard', 'Jl. Boulevard UGM, Yogyakarta', -7.7686000, 110.3746000, '06:00:00', '21:00:00', 'maintenance', '2026-10-08 21:20:38', '2026-10-08 21:20:38'),
(4, 'EVCharge Hub - Stasiun Tugu', 'Jl. Pangeran Mangkubumi, Gowongan, Yogyakarta', -7.7857671, 110.3782949, '05:00:00', '23:00:00', 'aktif', '2026-10-08 21:20:38', '2026-10-08 21:20:38'),
(5, 'EVCharge Hub - Jogja City Mall', 'Jl. Magelang Km 6, Sleman', -7.7538000, 110.3606000, '10:00:00', '22:00:00', 'aktif', '2026-10-08 21:20:38', '2026-10-08 21:20:38'),
(6, 'EVCharge Hub - Hartono Mall', 'Jl. Ring Road Utara, Condongcatur, Sleman', -7.7516000, 110.4092000, '10:00:00', '22:00:00', 'aktif', '2026-10-08 21:20:38', '2026-10-08 21:20:38'),
(7, 'EVCharge Point - Alun-Alun Selatan', 'Jl. Alun-Alun Selatan, Patehan, Yogyakarta', -7.8130000, 110.3640000, '07:00:00', '21:00:00', 'aktif', '2026-10-08 21:20:38', '2026-10-08 21:20:38'),
(8, 'EVCharge Hub - Terminal Giwangan', 'Jl. Imogiri Timur, Giwangan, Yogyakarta', -7.8283000, 110.3908000, '00:00:00', '23:59:00', 'aktif', '2026-10-08 21:20:38', '2026-10-08 21:20:38'),
(9, 'EVCharge Point - Candi Prambanan', 'Jl. Raya Solo - Yogyakarta Km 16, Sleman', -7.7520000, 110.4915000, '06:00:00', '18:00:00', 'nonaktif', '2026-10-08 21:20:38', '2026-10-08 21:20:38'),
(10, 'EVCharge Hub - Bandara YIA', 'Jl. Bandara YIA, Temon, Kulon Progo', -7.9007000, 110.0568000, '00:00:00', '23:59:00', 'aktif', '2026-10-08 21:20:38', '2026-10-08 21:20:38');

-- --------------------------------------------------------

--
-- Table structure for table `metode_pembayaran`
--

CREATE TABLE `metode_pembayaran` (
  `id_metode` bigint UNSIGNED NOT NULL,
  `nama_metode` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `biaya_layanan` int NOT NULL DEFAULT '0',
  `status_metode` enum('aktif','nonaktif') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'aktif',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `metode_pembayaran`
--

INSERT INTO `metode_pembayaran` (`id_metode`, `nama_metode`, `biaya_layanan`, `status_metode`, `created_at`, `updated_at`) VALUES
(1, 'GoPay', 0, 'aktif', '2026-10-08 21:23:25', '2026-10-08 21:23:25'),
(2, 'DANA', 0, 'aktif', '2026-10-08 21:23:25', '2026-10-08 21:23:25'),
(3, 'VA BRI', 0, 'aktif', '2026-10-08 21:23:25', '2026-10-08 21:23:25'),
(4, 'SeaBank', 0, 'aktif', '2026-10-08 21:23:25', '2026-10-08 21:23:25'),
(5, 'Saldo Dompet', 0, 'aktif', '2026-10-09 05:38:58', '2026-10-09 05:38:58');

-- --------------------------------------------------------

--
-- Table structure for table `migrations`
--

CREATE TABLE `migrations` (
  `id` int UNSIGNED NOT NULL,
  `migration` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `batch` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `migrations`
--

INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES
(1, '0001_01_01_000000_create_users_table', 1),
(2, '0001_01_01_000001_create_cache_table', 1),
(3, '0001_01_01_000002_create_jobs_table', 1),
(4, '2026_09_20_122322_create_personal_access_tokens_table', 1),
(5, '2026_09_22_044618_create_user_profile_table', 1),
(6, '2026_09_22_044949_create_vehicle_table', 1),
(7, '2026_09_22_051852_create_dompet_table', 1),
(8, '2026_09_22_052232_create_metode_pembayaran_table', 1),
(9, '2026_09_22_052710_create_location_table', 1),
(10, '2026_09_22_053036_create_tarif_table', 1),
(11, '2026_09_22_053525_create_charger_table', 1),
(12, '2026_09_22_055539_create_charging_session_table', 1),
(13, '2026_09_22_055540_create_payment_table', 1),
(14, '2026_09_23_075340_create_refund_table', 1),
(15, '2026_09_23_075725_create_topup_table', 1),
(16, '2026_09_23_080759_create_error_log_table', 1),
(17, '2026_09_25_090000_add_pin_security_columns_to_dompet_table', 1),
(18, '2026_09_30_134107_fix_tokenable_id_in_personal_access_tokens_table', 1),
(19, '2026_10_04_000001_add_hold_columns_for_charging', 1),
(20, '2026_10_04_000002_add_battery_capacity_to_vehicle_table', 1);

-- --------------------------------------------------------

--
-- Table structure for table `password_reset_tokens`
--

CREATE TABLE `password_reset_tokens` (
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `payment`
--

CREATE TABLE `payment` (
  `id_payment` bigint UNSIGNED NOT NULL,
  `id_session` bigint UNSIGNED NOT NULL,
  `id_metode` bigint UNSIGNED NOT NULL,
  `total_bayar` int NOT NULL,
  `status_pembayaran` enum('pending','sukses','gagal') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `waktu_pembayaran` datetime NOT NULL,
  `referensi_gateway` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `payment`
--

INSERT INTO `payment` (`id_payment`, `id_session`, `id_metode`, `total_bayar`, `status_pembayaran`, `waktu_pembayaran`, `referensi_gateway`, `created_at`, `updated_at`) VALUES
(1, 2, 5, 95100, 'sukses', '2026-10-09 12:38:58', NULL, '2026-10-09 05:38:58', '2026-10-09 05:38:58'),
(2, 3, 5, 118500, 'sukses', '2026-10-14 07:49:38', NULL, '2026-10-14 00:49:38', '2026-10-14 00:49:38'),
(3, 4, 5, 14000, 'sukses', '2026-10-28 14:38:45', NULL, '2026-10-28 07:38:45', '2026-10-28 07:38:45'),
(4, 5, 5, 54700, 'sukses', '2026-11-02 20:53:58', NULL, '2026-11-02 13:53:58', '2026-11-02 13:53:58'),
(5, 6, 5, 52100, 'sukses', '2026-11-02 21:07:24', NULL, '2026-11-02 14:07:24', '2026-11-02 14:07:24'),
(6, 7, 5, 44300, 'sukses', '2026-11-02 21:22:17', NULL, '2026-11-02 14:22:17', '2026-11-02 14:22:17'),
(7, 8, 5, 127700, 'sukses', '2026-11-02 21:25:31', NULL, '2026-11-02 14:25:31', '2026-11-02 14:25:31'),
(8, 9, 5, 86000, 'sukses', '2026-11-02 21:48:08', NULL, '2026-11-02 14:48:08', '2026-11-02 14:48:08'),
(9, 10, 5, 129000, 'sukses', '2026-11-02 21:54:27', NULL, '2026-11-02 14:54:27', '2026-11-02 14:54:27'),
(10, 11, 5, 82100, 'sukses', '2026-11-02 22:06:37', NULL, '2026-11-02 15:06:37', '2026-11-02 15:06:37'),
(11, 12, 5, 52100, 'sukses', '2026-11-02 22:12:29', NULL, '2026-11-02 15:12:29', '2026-11-02 15:12:29'),
(12, 13, 5, 56000, 'sukses', '2026-11-02 22:24:35', NULL, '2026-11-02 15:24:35', '2026-11-02 15:24:35'),
(13, 14, 5, 50800, 'sukses', '2026-11-02 22:36:49', NULL, '2026-11-02 15:36:49', '2026-11-02 15:36:49'),
(14, 15, 5, 78200, 'sukses', '2026-11-03 11:16:42', NULL, '2026-11-03 04:16:42', '2026-11-03 04:16:42'),
(15, 16, 5, 33900, 'sukses', '2026-11-03 11:39:27', NULL, '2026-11-03 04:39:27', '2026-11-03 04:39:27'),
(16, 17, 5, 82100, 'sukses', '2026-11-03 11:52:16', NULL, '2026-11-03 04:52:16', '2026-11-03 04:52:16'),
(17, 18, 5, 83400, 'sukses', '2026-11-03 18:47:27', NULL, '2026-11-03 11:47:27', '2026-11-03 11:47:27'),
(18, 19, 5, 71700, 'sukses', '2026-11-04 13:54:01', NULL, '2026-11-04 06:54:01', '2026-11-04 06:54:01');

-- --------------------------------------------------------

--
-- Table structure for table `personal_access_tokens`
--

CREATE TABLE `personal_access_tokens` (
  `id` bigint UNSIGNED NOT NULL,
  `tokenable_type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tokenable_id` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `abilities` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `last_used_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `personal_access_tokens`
--

INSERT INTO `personal_access_tokens` (`id`, `tokenable_type`, `tokenable_id`, `name`, `token`, `abilities`, `last_used_at`, `expires_at`, `created_at`, `updated_at`) VALUES
(20, 'App\\Models\\User', 'DRV0000000001', 'web', 'b66b7fb2d3e950c64e67e8c2a5bd990ca7bd9a63a77f0493158c0a4652334dcc', '[\"*\"]', '2026-11-04 07:00:09', NULL, '2026-11-04 06:42:38', '2026-11-04 07:00:09');

-- --------------------------------------------------------

--
-- Table structure for table `refund`
--

CREATE TABLE `refund` (
  `id_refund` bigint UNSIGNED NOT NULL,
  `id_payment` bigint UNSIGNED NOT NULL,
  `nominal` int NOT NULL,
  `waktu_execute` datetime NOT NULL,
  `status_refund` enum('pending','sukses','gagal') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sessions`
--

CREATE TABLE `sessions` (
  `id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` bigint UNSIGNED DEFAULT NULL,
  `ip_address` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_activity` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tarif`
--

CREATE TABLE `tarif` (
  `id_tarif` bigint UNSIGNED NOT NULL,
  `id_location` bigint UNSIGNED NOT NULL,
  `harga_per_kwh` int NOT NULL,
  `biaya_minimum` int NOT NULL,
  `biaya_parkir_pjam` int NOT NULL,
  `periode_mulai` datetime NOT NULL,
  `periode_berakhir` datetime NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `tarif`
--

INSERT INTO `tarif` (`id_tarif`, `id_location`, `harga_per_kwh`, `biaya_minimum`, `biaya_parkir_pjam`, `periode_mulai`, `periode_berakhir`, `created_at`, `updated_at`) VALUES
(11, 1, 2500, 10000, 3000, '2026-01-01 00:00:00', '2030-12-31 23:59:59', '2026-10-08 21:20:38', '2026-10-08 21:20:38'),
(12, 2, 2200, 8000, 3000, '2026-01-01 00:00:00', '2030-12-31 23:59:59', '2026-10-08 21:20:38', '2026-10-08 21:20:38'),
(13, 3, 2700, 10000, 2000, '2026-01-01 00:00:00', '2030-12-31 23:59:59', '2026-10-08 21:20:38', '2026-10-08 21:20:38'),
(14, 4, 2600, 10000, 4000, '2026-01-01 00:00:00', '2030-12-31 23:59:59', '2026-10-08 21:20:38', '2026-10-08 21:20:38'),
(15, 5, 2400, 8000, 3000, '2026-01-01 00:00:00', '2030-12-31 23:59:59', '2026-10-08 21:20:38', '2026-10-08 21:20:38'),
(16, 6, 2400, 8000, 3000, '2026-01-01 00:00:00', '2030-12-31 23:59:59', '2026-10-08 21:20:38', '2026-10-08 21:20:38'),
(17, 7, 2300, 5000, 2000, '2026-01-01 00:00:00', '2030-12-31 23:59:59', '2026-10-08 21:20:38', '2026-10-08 21:20:38'),
(18, 8, 2100, 8000, 2000, '2026-01-01 00:00:00', '2030-12-31 23:59:59', '2026-10-08 21:20:38', '2026-10-08 21:20:38'),
(19, 9, 2300, 5000, 5000, '2026-01-01 00:00:00', '2030-12-31 23:59:59', '2026-10-08 21:20:38', '2026-10-08 21:20:38'),
(20, 10, 3000, 15000, 5000, '2026-01-01 00:00:00', '2030-12-31 23:59:59', '2026-10-08 21:20:38', '2026-10-08 21:20:38');

-- --------------------------------------------------------

--
-- Table structure for table `topup`
--

CREATE TABLE `topup` (
  `id_topup` bigint UNSIGNED NOT NULL,
  `id_wallet` bigint UNSIGNED NOT NULL,
  `id_metode` bigint UNSIGNED NOT NULL,
  `referensi` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `kode_pembayaran` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `nominal` int NOT NULL,
  `biaya_layanan` int NOT NULL DEFAULT '0',
  `status_topup` enum('pending','sukses','gagal') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `waktu_topup` datetime NOT NULL,
  `kedaluwarsa_pada` datetime NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `topup`
--

INSERT INTO `topup` (`id_topup`, `id_wallet`, `id_metode`, `referensi`, `kode_pembayaran`, `nominal`, `biaya_layanan`, `status_topup`, `waktu_topup`, `kedaluwarsa_pada`, `created_at`, `updated_at`) VALUES
(1, 1, 1, 'EVT20261009-UDKNLU', '081234567890', 50000, 0, 'sukses', '2026-10-09 04:24:41', '2026-10-10 04:24:39', '2026-10-08 21:24:39', '2026-10-08 21:24:41'),
(2, 1, 1, 'EVT20261009-NQ49KA', '081234567890', 100000, 0, 'sukses', '2026-10-09 11:57:09', '2026-10-10 11:57:08', '2026-10-09 04:57:08', '2026-10-09 04:57:09'),
(3, 1, 3, 'EVT20261009-FJUAL4', '7777781234567890', 50000, 0, 'sukses', '2026-10-09 11:58:05', '2026-10-10 11:58:03', '2026-10-09 04:58:03', '2026-10-09 04:58:05'),
(4, 1, 1, 'EVT20261009-KDEO46', '081234567890', 100000, 0, 'sukses', '2026-10-09 12:16:01', '2026-10-10 12:16:00', '2026-10-09 05:16:00', '2026-10-09 05:16:01'),
(5, 1, 2, 'EVT20261102-DLTL6B', '081234567890', 500000, 0, 'sukses', '2026-11-02 21:04:52', '2026-11-03 21:04:50', '2026-11-02 14:04:50', '2026-11-02 14:04:52'),
(6, 1, 1, 'EVT20261102-TBKZ3F', '081234567890', 100000, 0, 'sukses', '2026-11-02 22:04:26', '2026-11-03 22:04:24', '2026-11-02 15:04:24', '2026-11-02 15:04:26'),
(7, 1, 3, 'EVT20261102-GWNIAG', '7777781234567890', 500000, 0, 'sukses', '2026-11-02 22:04:34', '2026-11-03 22:04:33', '2026-11-02 15:04:33', '2026-11-02 15:04:34'),
(8, 1, 5, 'EVT20261104-NK4FFL', '081234567890', 500000, 0, 'pending', '2026-11-04 13:43:57', '2026-11-05 13:43:57', '2026-11-04 06:43:57', '2026-11-04 06:43:57'),
(9, 1, 4, 'EVT20261104-90NV4A', '081234567890', 500000, 0, 'sukses', '2026-11-04 13:52:17', '2026-11-05 13:52:15', '2026-11-04 06:52:15', '2026-11-04 06:52:17');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id_user` char(13) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `remember_token` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `peran` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status_akun` enum('aktif','nonaktif','suspend','banned') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'aktif',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id_user`, `email`, `email_verified_at`, `password`, `remember_token`, `peran`, `status_akun`, `created_at`, `updated_at`) VALUES
('ADM0000000004', 'admin.utama@admin.ac.id', '2026-10-08 21:18:32', '$2y$12$gEXrWZBbuCmB/MexmwtpbuR1Zo1sR9H2o7Awp2IPi6/isO3JW7xKO', NULL, 'admin', 'aktif', '2026-10-08 21:18:33', '2026-10-08 21:18:33'),
('DRV0000000001', 'yavin.driver@ac.id', '2026-10-08 21:24:00', '$2y$12$h5veRvu/axH1cZBkteF.tukzWoH6R/R1p2UtJt0O6jYaT6dExHJaq', NULL, 'driver', 'aktif', '2026-10-08 21:18:32', '2026-10-08 21:24:00'),
('DRV0000000002', 'siti.driver@ac.id', '2026-10-08 21:18:32', '$2y$12$4vyOe5eobWfjZb4YfYo.yeUjqH/mEmk2ethYq/fU3ySxJaRdw0q.C', NULL, 'driver', 'aktif', '2026-10-08 21:18:32', '2026-10-08 21:18:32'),
('DRV0000000003', 'agus.driver@ac.id', '2026-10-08 21:18:32', '$2y$12$PkJr3jfsN5hlKXDmVAdHpeHSv.NAmZUg5Kr1NrLYmwwuTGGDKloj2', NULL, 'driver', 'nonaktif', '2026-10-08 21:18:32', '2026-10-08 21:18:32'),
('DRV0000000006', 'joko.driver@ac.id', '2026-10-08 21:18:33', '$2y$12$hYSRI1B4eOOKnHnVypteb.y1yVQAnE.nUKkfrFJEW.21D7KxjF.4.', NULL, 'driver', 'suspend', '2026-10-08 21:18:33', '2026-10-08 21:18:33'),
('DRV0000000007', 'rina.driver@ac.id', '2026-10-08 21:18:33', '$2y$12$F6KZrxHk6tyiD5HepouXN.IiHFn1vSdQIT924ioRc7DZSMWR6d0om', NULL, 'driver', 'banned', '2026-10-08 21:18:33', '2026-10-08 21:18:33'),
('OPS0000000005', 'ops.lapangan@ops.ac.id', '2026-10-08 21:18:33', '$2y$12$uUW...VZYuTO/3x1I8lT9ettsitzzO8IkrmQfkL/Q5KVq5tLqNgyO', NULL, 'operator', 'aktif', '2026-10-08 21:18:33', '2026-10-08 21:18:33');

-- --------------------------------------------------------

--
-- Table structure for table `user_profile`
--

CREATE TABLE `user_profile` (
  `id_user_profile` bigint UNSIGNED NOT NULL,
  `id_user` char(13) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `nama_lengkap` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `nomor_telepon` char(13) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `alamat` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `tanggal_lahir` date NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `user_profile`
--

INSERT INTO `user_profile` (`id_user_profile`, `id_user`, `nama_lengkap`, `nomor_telepon`, `alamat`, `tanggal_lahir`, `created_at`, `updated_at`) VALUES
(1, 'DRV0000000001', 'Efraim Yavin', '081234567890', 'Jl. Merdeka No. 10, Purwokerto', '1995-03-12', '2026-10-08 21:18:32', '2026-10-08 21:24:00'),
(2, 'DRV0000000002', 'Siti Rahmawati', '081298765432', 'Jl. Sudirman No. 25, Purwokerto', '1998-07-20', '2026-10-08 21:18:32', '2026-10-08 21:18:32'),
(3, 'DRV0000000003', 'Agus Setiawan', '081356789012', 'Jl. Gatot Subroto No. 5, Purwokerto', '1990-11-02', '2026-10-08 21:18:32', '2026-10-08 21:18:32'),
(4, 'ADM0000000004', 'Ahmad Fauzi', '081411223344', 'Jl. Ahmad Yani No. 1, Purwokerto', '1988-01-15', '2026-10-08 21:18:33', '2026-10-08 21:18:33'),
(5, 'OPS0000000005', 'Dewi Lestari', '081533445566', 'Jl. Dr. Angka No. 8, Purwokerto', '1993-09-30', '2026-10-08 21:18:33', '2026-10-08 21:18:33'),
(6, 'DRV0000000006', 'Joko Prasetyo', '081699887766', NULL, '2000-05-18', '2026-10-08 21:18:33', '2026-10-08 21:18:33'),
(7, 'DRV0000000007', 'Rina Amelia', '081777889900', 'Jl. Veteran No. 12, Purwokerto', '1996-12-25', '2026-10-08 21:18:33', '2026-10-08 21:18:33');

-- --------------------------------------------------------

--
-- Table structure for table `vehicle`
--

CREATE TABLE `vehicle` (
  `id_vehicle` bigint UNSIGNED NOT NULL,
  `id_user` char(13) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `merek` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `model` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `nomor_polisi` char(9) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipe_konektor` enum('type_2','ccs2','chademo','gbt') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `kapasitas_baterai_kwh` decimal(5,1) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `vehicle`
--

INSERT INTO `vehicle` (`id_vehicle`, `id_user`, `merek`, `model`, `nomor_polisi`, `tipe_konektor`, `created_at`, `updated_at`, `kapasitas_baterai_kwh`) VALUES
(1, 'DRV0000000001', 'Hyundai', 'Ioniq 5', 'B1218EV', 'type_2', '2026-10-08 21:53:52', '2026-10-08 21:53:52', NULL);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `cache`
--
ALTER TABLE `cache`
  ADD PRIMARY KEY (`key`),
  ADD KEY `cache_expiration_index` (`expiration`);

--
-- Indexes for table `cache_locks`
--
ALTER TABLE `cache_locks`
  ADD PRIMARY KEY (`key`),
  ADD KEY `cache_locks_expiration_index` (`expiration`);

--
-- Indexes for table `charger`
--
ALTER TABLE `charger`
  ADD PRIMARY KEY (`id_charger`),
  ADD KEY `charger_id_location_foreign` (`id_location`);

--
-- Indexes for table `charging_session`
--
ALTER TABLE `charging_session`
  ADD PRIMARY KEY (`id_session`),
  ADD KEY `charging_session_id_user_foreign` (`id_user`),
  ADD KEY `charging_session_id_charger_foreign` (`id_charger`),
  ADD KEY `charging_session_id_tarif_foreign` (`id_tarif`),
  ADD KEY `charging_session_id_vehicle_foreign` (`id_vehicle`);

--
-- Indexes for table `dompet`
--
ALTER TABLE `dompet`
  ADD PRIMARY KEY (`id_wallet`),
  ADD UNIQUE KEY `dompet_id_user_unique` (`id_user`);

--
-- Indexes for table `error_log`
--
ALTER TABLE `error_log`
  ADD PRIMARY KEY (`id_log`),
  ADD KEY `error_log_id_charger_foreign` (`id_charger`),
  ADD KEY `error_log_id_session_foreign` (`id_session`),
  ADD KEY `error_log_id_user_foreign` (`id_user`);

--
-- Indexes for table `failed_jobs`
--
ALTER TABLE `failed_jobs`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`),
  ADD KEY `failed_jobs_connection_queue_failed_at_index` (`connection`,`queue`,`failed_at`);

--
-- Indexes for table `jobs`
--
ALTER TABLE `jobs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `jobs_queue_index` (`queue`);

--
-- Indexes for table `job_batches`
--
ALTER TABLE `job_batches`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `location`
--
ALTER TABLE `location`
  ADD PRIMARY KEY (`id_location`);

--
-- Indexes for table `metode_pembayaran`
--
ALTER TABLE `metode_pembayaran`
  ADD PRIMARY KEY (`id_metode`);

--
-- Indexes for table `migrations`
--
ALTER TABLE `migrations`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `password_reset_tokens`
--
ALTER TABLE `password_reset_tokens`
  ADD PRIMARY KEY (`email`);

--
-- Indexes for table `payment`
--
ALTER TABLE `payment`
  ADD PRIMARY KEY (`id_payment`),
  ADD KEY `payment_id_session_foreign` (`id_session`),
  ADD KEY `payment_id_metode_foreign` (`id_metode`);

--
-- Indexes for table `personal_access_tokens`
--
ALTER TABLE `personal_access_tokens`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `personal_access_tokens_token_unique` (`token`),
  ADD KEY `personal_access_tokens_tokenable_type_tokenable_id_index` (`tokenable_type`,`tokenable_id`),
  ADD KEY `personal_access_tokens_expires_at_index` (`expires_at`);

--
-- Indexes for table `refund`
--
ALTER TABLE `refund`
  ADD PRIMARY KEY (`id_refund`),
  ADD KEY `refund_id_payment_foreign` (`id_payment`);

--
-- Indexes for table `sessions`
--
ALTER TABLE `sessions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `sessions_user_id_index` (`user_id`),
  ADD KEY `sessions_last_activity_index` (`last_activity`);

--
-- Indexes for table `tarif`
--
ALTER TABLE `tarif`
  ADD PRIMARY KEY (`id_tarif`),
  ADD KEY `tarif_id_location_foreign` (`id_location`);

--
-- Indexes for table `topup`
--
ALTER TABLE `topup`
  ADD PRIMARY KEY (`id_topup`),
  ADD UNIQUE KEY `topup_referensi_unique` (`referensi`),
  ADD KEY `topup_id_wallet_foreign` (`id_wallet`),
  ADD KEY `topup_id_metode_foreign` (`id_metode`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id_user`),
  ADD UNIQUE KEY `users_email_unique` (`email`);

--
-- Indexes for table `user_profile`
--
ALTER TABLE `user_profile`
  ADD PRIMARY KEY (`id_user_profile`),
  ADD UNIQUE KEY `user_profile_id_user_unique` (`id_user`);

--
-- Indexes for table `vehicle`
--
ALTER TABLE `vehicle`
  ADD PRIMARY KEY (`id_vehicle`),
  ADD KEY `vehicle_id_user_foreign` (`id_user`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `charger`
--
ALTER TABLE `charger`
  MODIFY `id_charger` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=93;

--
-- AUTO_INCREMENT for table `charging_session`
--
ALTER TABLE `charging_session`
  MODIFY `id_session` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- AUTO_INCREMENT for table `dompet`
--
ALTER TABLE `dompet`
  MODIFY `id_wallet` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `error_log`
--
ALTER TABLE `error_log`
  MODIFY `id_log` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `failed_jobs`
--
ALTER TABLE `failed_jobs`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `jobs`
--
ALTER TABLE `jobs`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `location`
--
ALTER TABLE `location`
  MODIFY `id_location` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `metode_pembayaran`
--
ALTER TABLE `metode_pembayaran`
  MODIFY `id_metode` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `migrations`
--
ALTER TABLE `migrations`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT for table `payment`
--
ALTER TABLE `payment`
  MODIFY `id_payment` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT for table `personal_access_tokens`
--
ALTER TABLE `personal_access_tokens`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT for table `refund`
--
ALTER TABLE `refund`
  MODIFY `id_refund` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tarif`
--
ALTER TABLE `tarif`
  MODIFY `id_tarif` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT for table `topup`
--
ALTER TABLE `topup`
  MODIFY `id_topup` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `user_profile`
--
ALTER TABLE `user_profile`
  MODIFY `id_user_profile` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `vehicle`
--
ALTER TABLE `vehicle`
  MODIFY `id_vehicle` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `charger`
--
ALTER TABLE `charger`
  ADD CONSTRAINT `charger_id_location_foreign` FOREIGN KEY (`id_location`) REFERENCES `location` (`id_location`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `charging_session`
--
ALTER TABLE `charging_session`
  ADD CONSTRAINT `charging_session_id_charger_foreign` FOREIGN KEY (`id_charger`) REFERENCES `charger` (`id_charger`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `charging_session_id_tarif_foreign` FOREIGN KEY (`id_tarif`) REFERENCES `tarif` (`id_tarif`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `charging_session_id_user_foreign` FOREIGN KEY (`id_user`) REFERENCES `users` (`id_user`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `charging_session_id_vehicle_foreign` FOREIGN KEY (`id_vehicle`) REFERENCES `vehicle` (`id_vehicle`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `dompet`
--
ALTER TABLE `dompet`
  ADD CONSTRAINT `dompet_id_user_foreign` FOREIGN KEY (`id_user`) REFERENCES `users` (`id_user`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `error_log`
--
ALTER TABLE `error_log`
  ADD CONSTRAINT `error_log_id_charger_foreign` FOREIGN KEY (`id_charger`) REFERENCES `charger` (`id_charger`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `error_log_id_session_foreign` FOREIGN KEY (`id_session`) REFERENCES `charging_session` (`id_session`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `error_log_id_user_foreign` FOREIGN KEY (`id_user`) REFERENCES `users` (`id_user`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `payment`
--
ALTER TABLE `payment`
  ADD CONSTRAINT `payment_id_metode_foreign` FOREIGN KEY (`id_metode`) REFERENCES `metode_pembayaran` (`id_metode`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `payment_id_session_foreign` FOREIGN KEY (`id_session`) REFERENCES `charging_session` (`id_session`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `refund`
--
ALTER TABLE `refund`
  ADD CONSTRAINT `refund_id_payment_foreign` FOREIGN KEY (`id_payment`) REFERENCES `payment` (`id_payment`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `tarif`
--
ALTER TABLE `tarif`
  ADD CONSTRAINT `tarif_id_location_foreign` FOREIGN KEY (`id_location`) REFERENCES `location` (`id_location`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `topup`
--
ALTER TABLE `topup`
  ADD CONSTRAINT `topup_id_metode_foreign` FOREIGN KEY (`id_metode`) REFERENCES `metode_pembayaran` (`id_metode`) ON DELETE RESTRICT,
  ADD CONSTRAINT `topup_id_wallet_foreign` FOREIGN KEY (`id_wallet`) REFERENCES `dompet` (`id_wallet`) ON DELETE CASCADE;

--
-- Constraints for table `user_profile`
--
ALTER TABLE `user_profile`
  ADD CONSTRAINT `user_profile_id_user_foreign` FOREIGN KEY (`id_user`) REFERENCES `users` (`id_user`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `vehicle`
--
ALTER TABLE `vehicle`
  ADD CONSTRAINT `vehicle_id_user_foreign` FOREIGN KEY (`id_user`) REFERENCES `users` (`id_user`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
