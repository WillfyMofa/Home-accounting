create table role(
    roleId serial primary key,
    roleName varchar(15) not null unique
);

INSERT INTO Role (roleName) VALUES 
    ('user'),
    ('admin');

ALTER TABLE "User" 
ADD COLUMN roleID INT NOT NULL DEFAULT 1 
REFERENCES Role(roleID) ON DELETE RESTRICT;

CREATE ROLE app_user WITH
    NOLOGIN
    NOSUPERUSER
    NOCREATEDB
    NOCREATEROLE
    NOINHERIT
    NOREPLICATION
    CONNECTION LIMIT -1;

CREATE ROLE app_admin WITH
    NOLOGIN
    NOSUPERUSER
    NOCREATEDB
    NOCREATEROLE
    NOINHERIT
    NOREPLICATION
    CONNECTION LIMIT -1;

GRANT CONNECT ON DATABASE "Accounting" TO app_user, app_admin;

GRANT SELECT, INSERT, UPDATE, DELETE ON 
    Category,
    "User", 
    Target, 
    StoryRecord
TO app_user;

GRANT ALL PRIVILEGES ON 
    Category,
    "User",
    AccountLogs,
    Target,
    StoryRecord,
    Role
TO app_admin;
