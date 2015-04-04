

DROP SCHEMA IF EXISTS related_geo_test CASCADE;
CREATE SCHEMA related_geo_test;

CREATE TABLE related_geo_test.venue (
      id                serial NOT NULL
    , name              varchar(100)
    , "lat"             decimal(10,2) NOT NULL
    , "lng"             decimal(10,2) NOT NULL
    , CONSTRAINT "pk_venue" PRIMARY KEY (id)
);


CREATE TABLE related_geo_test.event (
      id                serial NOT NULL
    , id_venue          int
    , name              varchar(100)
    , CONSTRAINT "pk_event" PRIMARY KEY (id)
    , CONSTRAINT "fk_venue" FOREIGN KEY (id_venue) REFERENCES "related_geo_test".venue ON UPDATE CASCADE ON DELETE CASCADE
);
