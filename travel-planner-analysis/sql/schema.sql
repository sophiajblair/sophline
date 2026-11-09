-- Travel & Holiday Planner database (SQLite, 3NF)
PRAGMA foreign_keys = ON;

CREATE TABLE destination (
  dest_id        INTEGER PRIMARY KEY,
  city           TEXT NOT NULL UNIQUE,
  country        TEXT NOT NULL,
  region         TEXT NOT NULL,
  climate_zone   TEXT NOT NULL CHECK (climate_zone IN ('Mediterranean','Temperate','Tropical','Continental')),
  cost_index     REAL NOT NULL CHECK (cost_index > 0),   -- 1.0 = EU average cost of living
  distance_km    REAL NOT NULL CHECK (distance_km > 0)   -- from home airport (Dublin)
);

CREATE TABLE host (
  host_id        INTEGER PRIMARY KEY,
  host_since     DATE NOT NULL,
  is_superhost   INTEGER NOT NULL CHECK (is_superhost IN (0,1))
);

CREATE TABLE listing (                      -- Airbnb-style (Inside Airbnb fields)
  listing_id     INTEGER PRIMARY KEY,
  dest_id        INTEGER NOT NULL REFERENCES destination(dest_id),
  host_id        INTEGER NOT NULL REFERENCES host(host_id),
  room_type      TEXT NOT NULL CHECK (room_type IN ('Entire home/apt','Private room','Shared room','Hotel room')),
  bedrooms       INTEGER NOT NULL CHECK (bedrooms >= 0),
  max_guests     INTEGER NOT NULL CHECK (max_guests > 0),
  price_night    REAL CHECK (price_night > 0),            -- EUR, nullable = missing
  rating         REAL CHECK (rating BETWEEN 1 AND 5),     -- nullable = no reviews
  n_reviews      INTEGER NOT NULL DEFAULT 0,
  amenities_cnt  INTEGER NOT NULL DEFAULT 0,
  dist_centre_km REAL NOT NULL,
  instant_book   INTEGER NOT NULL CHECK (instant_book IN (0,1)),
  min_nights     INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE airline (
  airline_id     INTEGER PRIMARY KEY,
  name           TEXT NOT NULL UNIQUE,
  carrier_type   TEXT NOT NULL CHECK (carrier_type IN ('Low-cost','Full-service'))
);

CREATE TABLE flight_quote (                 -- Skyscanner-style quote fields
  quote_id       INTEGER PRIMARY KEY,
  dest_id        INTEGER NOT NULL REFERENCES destination(dest_id),
  airline_id     INTEGER NOT NULL REFERENCES airline(airline_id),
  depart_date    DATE NOT NULL,
  days_before    INTEGER NOT NULL CHECK (days_before >= 0),   -- booking window
  price_eur      REAL NOT NULL CHECK (price_eur > 0),   -- return fare per person, EUR
  stops          INTEGER NOT NULL CHECK (stops >= 0),
  duration_h     REAL NOT NULL
);

CREATE TABLE monthly_climate (
  dest_id        INTEGER NOT NULL REFERENCES destination(dest_id),
  month          INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  avg_temp_c     REAL NOT NULL,
  rainfall_mm    REAL NOT NULL,
  occupancy_pct  REAL NOT NULL CHECK (occupancy_pct BETWEEN 0 AND 100),
  price_index    REAL NOT NULL,   -- seasonal nightly-price multiplier (calendar.csv analogue; 1.0 = annual avg)
  PRIMARY KEY (dest_id, month)
);

CREATE TABLE review (
  review_id      INTEGER PRIMARY KEY,
  listing_id     INTEGER NOT NULL REFERENCES listing(listing_id),
  review_date    DATE NOT NULL,
  stars          INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment        TEXT NOT NULL
);

CREATE INDEX ix_listing_dest ON listing(dest_id);
CREATE INDEX ix_flight_dest  ON flight_quote(dest_id);
CREATE INDEX ix_review_list  ON review(listing_id);

-- Analytical view: cost of a 5-night holiday per destination and month
CREATE VIEW v_trip_cost AS
SELECT d.dest_id, d.city, d.country, mc.month,
       ROUND(AVG(f.price_eur),2)                      AS avg_flight,
       ROUND(AVG(l.price_night)*mc.price_index,2)      AS avg_night,
       ROUND(AVG(f.price_eur) + 5*AVG(l.price_night)*mc.price_index,2) AS trip_cost_5n,
       mc.avg_temp_c, mc.rainfall_mm, mc.occupancy_pct
FROM destination d
JOIN monthly_climate mc ON mc.dest_id = d.dest_id
JOIN listing l          ON l.dest_id = d.dest_id AND l.room_type='Entire home/apt'
JOIN flight_quote f     ON f.dest_id = d.dest_id AND CAST(strftime('%m',f.depart_date) AS INT)=mc.month
GROUP BY d.dest_id, mc.month;
