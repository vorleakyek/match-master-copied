insert into "users" ("username", "hashedPassword")
values ('vorleak',	'$argon2id$v=19$m=4096,t=3,p=1$givEfd140GJeJl5ETxTCxw$2Dqq9E3FC02jL5375FcpbZdKqCUTZqAgh+FNQSibNPE'),
('star',	'$argon2id$v=19$m=4096,t=3,p=1$u+3XDPP81Wbn9zYxcpSfDw$9gVtOVgxQcyT1cHUqv6QNGQeg7mRZ9wYucv3NMScxN4'),
('player1',	'$argon2id$v=19$m=4096,t=3,p=1$Eecy1nKyKfm/v1mvAbv7qw$dcUT/bl6nPcwwnEgCxKSH64mB3+B2PMA59JEYC/+7U0');

INSERT INTO "UserGameProgress" ( "userId", "level", "cardTheme", "star", "score", "completedTime", "totalClicked", "sound", "createdAt")
VALUES
(1, 1, 'pokeball', 4, 78.33208333333333, 12.003, 10, true, '2024-03-30 03:26:40.076619+00'),
(1, 2, 'pokeball', 4, 75.41375, 22.014, 24, true, '2024-03-30 03:27:07.748284+00'),
(1, 3, 'pokeball', 3, 69.99861111111112, 48.01, 42, true, '2024-03-30 03:27:58.934508+00'),
(2, 1, 'island', 4, 77.91458333333333, 13.005, 10, true, '2024-03-30 03:29:58.40073+00'),
(2, 2, 'AshAndPika', 4, 79.58104166666666, 18.011, 20, true, '2024-03-30 03:30:28.225839+00'),
(2, 3, 'pokeball', 4, 75.69375, 39.005, 34, true, '2024-03-30 03:31:21.733581+00'),
(3, 1, 'AshAndPika', 4, 79.57958333333333, 9.009, 10, true, '2024-03-30 03:32:29.054515+00'),
(3, 2, 'AshAndPika', 4, 75.624375, 21.003, 24, true, '2024-03-30 03:32:54.414748+00'),
(3, 3, 'island', 4, 74.44333333333333, 40.008, 36, true, '2024-03-30 03:33:46.080251+00');
