CREATE TABLE `car_finance` (
	`id` text PRIMARY KEY NOT NULL,
	`car_id` text NOT NULL,
	`is_active` integer DEFAULT 0 NOT NULL,
	`label` text,
	`list_price` real NOT NULL,
	`deposit` real DEFAULT 0 NOT NULL,
	`n_installments` integer,
	`monthly_installment` real,
	`residual_value` real,
	`duration_months` integer,
	`total_financed` real,
	`total_repayable` real,
	`tan_pct` real,
	`taeg_pct` real,
	`annual_km_limit` integer,
	`instruction_fees` real,
	`monthly_fees` real,
	`raw_text` text,
	`created_at` text DEFAULT '(strftime(''%Y-%m-%dT%H:%M:%SZ'',''now''))' NOT NULL,
	FOREIGN KEY (`car_id`) REFERENCES `cars`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `car_specs` (
	`car_id` text PRIMARY KEY NOT NULL,
	`engine_power_cv` real,
	`engine_power_kw` real,
	`engine_power_cv_ice` real,
	`engine_power_kw_electric` real,
	`torque_nm` real,
	`transmission` text,
	`hybrid_architecture` text,
	`primary_fuel` text,
	`secondary_fuel` text,
	`fuel_consumption_urban` real,
	`fuel_consumption_suburban` real,
	`fuel_consumption_combined` real,
	`lpg_consumption_combined` real,
	`cng_consumption_combined` real,
	`ev_consumption_combined` real,
	`ev_range_km` real,
	`battery_capacity_kwh` real,
	`battery_capacity_usable_kwh` real,
	`charge_time_ac_h` real,
	`charge_time_10_80_min` integer,
	`max_charge_power_kw` real,
	`co2_gkm` real,
	`co2_gkm_weighted` real,
	`emission_class` text,
	`nox_gkm` real,
	`weight_kg` real,
	`service_cost_per_year` real,
	`raw_extras` text,
	FOREIGN KEY (`car_id`) REFERENCES `cars`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `cars` (
	`id` text PRIMARY KEY NOT NULL,
	`make` text NOT NULL,
	`model` text NOT NULL,
	`trim` text,
	`year` integer,
	`fuel_type` text NOT NULL,
	`notes` text,
	`created_at` text DEFAULT '(strftime(''%Y-%m-%dT%H:%M:%SZ'',''now''))' NOT NULL,
	`updated_at` text DEFAULT '(strftime(''%Y-%m-%dT%H:%M:%SZ'',''now''))' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `import_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`car_id` text,
	`kind` text NOT NULL,
	`raw_text` text NOT NULL,
	`parsed_json` text,
	`fields_applied` text,
	`created_at` text DEFAULT '(strftime(''%Y-%m-%dT%H:%M:%SZ'',''now''))' NOT NULL,
	FOREIGN KEY (`car_id`) REFERENCES `cars`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `usage_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`is_default` integer DEFAULT 0 NOT NULL,
	`km_per_year` integer DEFAULT 15000 NOT NULL,
	`urban_pct` real DEFAULT 30 NOT NULL,
	`suburban_pct` real DEFAULT 50 NOT NULL,
	`freeway_pct` real DEFAULT 20 NOT NULL,
	`fuel_price_eur_per_liter` real DEFAULT 1.85 NOT NULL,
	`lpg_price_eur_per_liter` real DEFAULT 0.75 NOT NULL,
	`cng_price_eur_per_kg` real DEFAULT 1.1 NOT NULL,
	`home_kwh_price` real DEFAULT 0.25 NOT NULL,
	`public_kwh_price` real DEFAULT 0.55 NOT NULL,
	`home_charge_pct` real DEFAULT 80 NOT NULL,
	`solar_kwh_per_day` real DEFAULT 0 NOT NULL,
	`ownership_years` integer DEFAULT 4 NOT NULL,
	`created_at` text DEFAULT '(strftime(''%Y-%m-%dT%H:%M:%SZ'',''now''))' NOT NULL
);
