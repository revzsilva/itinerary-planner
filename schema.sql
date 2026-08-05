-- ============================================================================
-- LAVINIA EXPLORER - DATABASE SETUP & SEED SCRIPT (schema.sql)
-- ============================================================================
-- Database Name : lavinia_explorer_db
-- Center Point  : Mount Lavinia, Sri Lanka (6.8398° N, 79.8656° E)
-- Boundary Rule : BSR-01 - Strict 25.00 km maximum radius from Mount Lavinia
-- Security Rule : NFR-SEC-02 - Used with PDO Prepared Statements & Bcrypt
-- ============================================================================

CREATE DATABASE IF NOT EXISTS `lavinia_explorer_db`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `lavinia_explorer_db`;

-- ----------------------------------------------------------------------------
-- 1. TABLE: admins
-- Stores administrator credentials with Bcrypt password hashes.
-- Default Login:
--   Username : admin
--   Password : Admin@123
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `admins`;
CREATE TABLE `admins` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(100) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `admins` (`username`, `password_hash`) VALUES
('admin', '$2y$12$/Mk05tJKl2p9tfqpFVxYReDl74hDU2xrfiFYmBuwzS/xDQyWMk5ka');

-- ----------------------------------------------------------------------------
-- 2. TABLE: places
-- Stores verified Points of Interest (POIs) within 25 km of Mount Lavinia.
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `places`;
CREATE TABLE `places` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(150) NOT NULL,
  `category` ENUM(
    'Nature & Wildlife',
    'Heritage & History',
    'Religious & Cultural',
    'Leisure & Dining',
    'Conservation'
  ) NOT NULL,
  `time_suitability` VARCHAR(100) NOT NULL COMMENT 'Comma-separated values: Morning, Afternoon, Evening/Night',
  `description` TEXT NOT NULL,
  `opening_hours` VARCHAR(150) NOT NULL,
  `travel_tips` TEXT NOT NULL,
  `distance_km` DECIMAL(5,2) NOT NULL COMMENT 'Haversine straight-line distance from Mount Lavinia (<= 25.00 km)',
  `latitude` DECIMAL(10,6) NOT NULL,
  `longitude` DECIMAL(10,6) NOT NULL,
  `image_url` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_category` (`category`),
  INDEX `idx_distance` (`distance_km`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 3. INITIAL SEED DATA (12 Curated Attractions within 25 km of Mount Lavinia)
-- ----------------------------------------------------------------------------
INSERT INTO `places` (
  `title`, `category`, `time_suitability`, `description`,
  `opening_hours`, `travel_tips`, `distance_km`, `latitude`, `longitude`, `image_url`
) VALUES
(
  'Mount Lavinia Golden Mile Beach',
  'Leisure & Dining',
  'Morning, Evening/Night',
  'Famous golden sandy shoreline stretching along Mount Lavinia, renowned for calm morning swims, vibrant beachside seafood restaurants, and panoramic Indian Ocean sunsets.',
  'Open 24 Hours (Lifeguards: 7:00 AM – 6:00 PM)',
  'Best visited for calm morning swims or iconic Indian Ocean sunsets followed by fresh seafood along the shore.',
  0.85, 6.833200, 79.861700, NULL
),
(
  'Governor''s Mansion (Mount Lavinia Hotel Heritage Wing)',
  'Heritage & History',
  'Morning, Afternoon, Evening/Night',
  'Constructed in 1806 as the coastal residence of British Governor Sir Thomas Maitland, famous for its neoclassical colonial architecture and historic romance with Lovina Aponsuwa.',
  'Daily: 9:00 AM – 10:00 PM',
  'Built in 1806 by Sir Thomas Maitland. Ask the concierge about the historic secret tunnel and Governor''s terrace.',
  0.91, 6.832800, 79.861300, NULL
),
(
  'Dehiwala National Zoological Gardens',
  'Nature & Wildlife',
  'Morning, Afternoon',
  'One of Asia''s oldest zoological gardens featuring landscaped botanical shaded pathways, a dedicated butterfly garden, nocturnal house, and diverse wildlife conservation exhibits.',
  'Daily: 8:30 AM – 6:00 PM',
  'Arrive before 9:30 AM to beat the midday heat. Wear comfortable walking shoes and carry refillable water bottles.',
  2.13, 6.856800, 79.874400, NULL
),
(
  'Bellanwila Rajamaha Viharaya',
  'Religious & Cultural',
  'Morning, Evening/Night',
  'Historic Buddhist temple housing one of the thirty-two sacred saplings (Detis Phala Ruka) of the Jaya Sri Maha Bodhi in Anuradhapura and intricate modern temple murals by Somabandu Vidyapathy.',
  'Daily: 6:00 AM – 9:00 PM',
  'Dress modestly in white or light-colored clothing covering shoulders and knees. Evening oil-lamp pooja is serene.',
  2.84, 6.846500, 79.890400, NULL
),
(
  'Attidiya Bird Sanctuary & Wetland Trail',
  'Conservation',
  'Morning, Afternoon',
  'Protected lowland marsh and freshwater mangrove sanctuary supporting over 150 species of resident and migratory waterbirds, endemic fish, and wetland flora.',
  'Daily: 6:00 AM – 6:00 PM',
  'Bring binoculars for spotting migratory kingfishers, purple herons, and endemic wetland flora between 6:30 AM and 9:00 AM.',
  2.22, 6.841900, 79.885600, NULL
),
(
  'Sri Lanka Air Force Museum (Ratmalana)',
  'Heritage & History',
  'Morning, Afternoon',
  'Premier aviation museum located at the historic Ratmalana Air Base, showcasing restored vintage aircraft, helicopters, radar equipment, and Sri Lankan aviation history.',
  'Tue – Sun: 8:30 AM – 4:30 PM (Closed Mondays)',
  'Bring valid photo ID (NIC or Passport) for entry at the airbase gate. Features restored vintage aircraft and hangars.',
  3.11, 6.820600, 79.886100, NULL
),
(
  'Mount Lavinia Sea Turtle Conservation Station',
  'Conservation',
  'Morning, Evening/Night',
  'Community-led coastal marine hatchery protecting endangered Green, Olive Ridley, and Leatherback sea turtle nests and rehabilitating injured turtles.',
  'Daily: 8:30 AM – 6:30 PM',
  'Learn about Olive Ridley and Green Turtle hatchery protection along the southern coast. Flash photography is prohibited.',
  1.42, 6.827500, 79.862200, NULL
),
(
  'Bellanwila-Attidiya Walking & Cycling Park',
  'Leisure & Dining',
  'Morning, Evening/Night',
  'Scenic 3-kilometer waterside recreation promenade bordered by lush wetlands, outdoor fitness stations, cycle rentals, and traditional Sri Lankan street food stalls.',
  'Daily: 5:00 AM – 9:00 PM',
  'Paved 3 km waterside loop with local herbal porridge (Kola Kanda) stalls in the morning and street food in the evening.',
  3.27, 6.848900, 79.893800, NULL
),
(
  'Bolgoda Lake Eco Mangrove Sanctuary (North Bank)',
  'Nature & Wildlife',
  'Morning, Afternoon',
  'Sri Lanka''s largest natural freshwater lake system spanning scenic estuaries, mangrove islands, water monitor habitats, and tranquil eco-kayaking routes.',
  'Daily: 6:30 AM – 6:00 PM',
  'Sri Lanka''s largest natural freshwater lake system. Book a morning kayak or eco-boat tour to explore mangrove channels.',
  7.23, 6.786500, 79.903200, NULL
),
(
  'Kotte Rajamaha Viharaya & Archaeological Ruins',
  'Religious & Cultural',
  'Morning, Afternoon, Evening/Night',
  'Ancient royal temple and archaeological complex from the 15th-century Kingdom of Sri Jayawardenepura Kotte, featuring historic laterite (Kabok) tunnels and sacred relics.',
  'Daily: 6:00 AM – 8:30 PM',
  'Dates back to the 15th-century Kingdom of Kotte. Inspect the ancient laterite (Kabok) tunnels and Dalada Maligawa ruins.',
  6.87, 6.888400, 79.904100, NULL
),
(
  'Beddagana Wetland Park (Biodiversity Zone)',
  'Conservation',
  'Morning, Afternoon',
  'RAMSAR-accredited urban wetland park adjacent to the Diyawanna Oya, offering elevated timber boardwalks, birdwatching towers, and urban fishing cat habitats.',
  'Daily: 6:00 AM – 6:00 PM',
  'Elevated wooden boardwalks over urban marshes. Ideal for butterfly watching, fishing cat conservation talks, and nature photography.',
  7.51, 6.891400, 79.909600, NULL
),
(
  'Colombo National Museum (Cinnamon Gardens)',
  'Heritage & History',
  'Morning, Afternoon',
  'Sri Lanka''s largest cultural and historical museum, founded in 1877 by Sir William Henry Gregory, housing the royal throne and regalia of the last King of Kandy.',
  'Tue – Sun: 9:00 AM – 5:00 PM (Closed Mondays)',
  'Established in 1877. Houses the regalia of the Kandyan Monarchs and ancient stone inscriptions. Allow at least 90 minutes.',
  7.89, 6.910600, 79.860900, NULL
);
