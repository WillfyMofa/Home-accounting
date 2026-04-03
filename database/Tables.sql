create table Category (
	categoryID serial primary key,
	categoryName varchar(30) not null unique
);

create table "User" (
    userID serial primary key,
    login varchar(50) not null unique,
    passwordHash varchar(255) not null,
    firstName varchar(50),
    lastName varchar(50)
);

create table AccountLogs (
	logId serial primary key, 
	logName varchar(50) not null,

	userLog int not null,

	FOREIGN KEY (userLog) REFERENCES "User"(userid)
);

create table Target (
	targetID serial primary key,
	targetName varchar(100) not null,
	isCompleted boolean default false,
	targetAmount decimal(10, 2) not null check (targetAmount > 0),
    currentAmount decimal(10, 2) default 0.00,
	
	UserTarget INT not null,
	
	FOREIGN KEY (UserTarget) REFERENCES "User"(UserID) on delete cascade
);

create table StoryRecord (
	storyRecordID serial primary key,
	isIncome boolean not null,
	amount decimal(10, 2) not null check (amount > 0),
	operationDate date not null,
	
	category INT,
	userStory INT not null,
	
	FOREIGN KEY (userStory) REFERENCES "User"(UserID)
	FOREIGN KEY (Category) REFERENCES Category(categoryID)
);