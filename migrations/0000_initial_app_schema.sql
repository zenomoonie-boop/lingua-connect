CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS "users" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "username" text NOT NULL UNIQUE,
  "email" text NOT NULL UNIQUE,
  "password_hash" text NOT NULL,
  "display_name" text NOT NULL,
  "avatar_uri" text,
  "avatar_color" varchar(32),
  "bio" text,
  "gender" varchar(24),
  "age" integer,
  "country_code" varchar(8),
  "country_name" text,
  "flag" text,
  "native_language" text,
  "learning_languages" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "followers" integer NOT NULL DEFAULT 0,
  "following" integer NOT NULL DEFAULT 0,
  "following_user_ids" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "moments" integer NOT NULL DEFAULT 0,
  "latitude" text,
  "longitude" text,
  "location_name" text,
  "is_active" boolean NOT NULL DEFAULT true,
  "last_seen_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "profiles" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" varchar NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
  "avatar_url" text,
  "avatar_color" varchar(32),
  "country_code" varchar(8),
  "country_name" text,
  "flag" text,
  "native_language" text,
  "learning_languages" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "age" integer,
  "gender" varchar(24),
  "bio" text,
  "latitude" text,
  "longitude" text,
  "location_name" text,
  "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "auth_sessions" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "token" text NOT NULL UNIQUE,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "follows" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "follower_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "following_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "moments" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "text" text NOT NULL,
  "lang" text NOT NULL,
  "lang_color" varchar(32) NOT NULL,
  "likes" integer NOT NULL DEFAULT 0,
  "comments" integer NOT NULL DEFAULT 0,
  "correction" jsonb,
  "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "conversations" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" text,
  "type" varchar(24) NOT NULL DEFAULT 'direct',
  "created_by_id" varchar REFERENCES "users"("id") ON DELETE SET NULL,
  "last_message_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "conversation_participants" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "conversation_id" varchar NOT NULL REFERENCES "conversations"("id") ON DELETE CASCADE,
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "role" varchar(24) NOT NULL DEFAULT 'member',
  "last_read_at" timestamp,
  "unread_count" integer NOT NULL DEFAULT 0,
  "is_archived" boolean NOT NULL DEFAULT false,
  "is_muted" boolean NOT NULL DEFAULT false,
  "joined_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "messages" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "conversation_id" varchar NOT NULL REFERENCES "conversations"("id") ON DELETE CASCADE,
  "sender_id" varchar REFERENCES "users"("id") ON DELETE SET NULL,
  "role" varchar(24) NOT NULL DEFAULT 'user',
  "content" text NOT NULL,
  "message_type" varchar(24) NOT NULL DEFAULT 'text',
  "metadata" jsonb,
  "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "voice_rooms" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "host_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "topic" text NOT NULL,
  "language" text NOT NULL,
  "language_code" varchar(16) NOT NULL,
  "description" text,
  "level" varchar(32) NOT NULL DEFAULT 'All Levels',
  "theme" varchar(32) NOT NULL DEFAULT 'chat',
  "background" varchar(32) NOT NULL DEFAULT 'galaxy',
  "tags" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "is_active" boolean NOT NULL DEFAULT true,
  "started_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_heartbeat_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "voice_participants" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "room_id" varchar NOT NULL REFERENCES "voice_rooms"("id") ON DELETE CASCADE,
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "role" varchar(24) NOT NULL DEFAULT 'listener',
  "status" varchar(24) NOT NULL DEFAULT 'active',
  "joined_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_seen_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "left_at" timestamp
);

CREATE TABLE IF NOT EXISTS "lesson_progress" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "lesson_id" text NOT NULL,
  "language_code" varchar(16) NOT NULL,
  "completed" boolean NOT NULL DEFAULT false,
  "score" integer,
  "completed_at" timestamp,
  "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "quiz_results" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "quiz_id" text NOT NULL,
  "lesson_id" text,
  "language_code" varchar(16) NOT NULL,
  "score" integer NOT NULL,
  "total_questions" integer,
  "passed" boolean NOT NULL DEFAULT false,
  "answers" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "user_progress" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" varchar NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
  "streak" integer NOT NULL DEFAULT 0,
  "total_xp" integer NOT NULL DEFAULT 0,
  "selected_languages" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "streaks" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" varchar NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
  "current_streak" integer NOT NULL DEFAULT 0,
  "longest_streak" integer NOT NULL DEFAULT 0,
  "last_activity_date" timestamp,
  "freeze_count" integer NOT NULL DEFAULT 0,
  "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "follows_follower_following_unique"
  ON "follows" ("follower_id", "following_id");
CREATE INDEX IF NOT EXISTS "follows_follower_id_idx"
  ON "follows" ("follower_id");
CREATE INDEX IF NOT EXISTS "follows_following_id_idx"
  ON "follows" ("following_id");

CREATE INDEX IF NOT EXISTS "auth_sessions_user_id_idx"
  ON "auth_sessions" ("user_id");

CREATE INDEX IF NOT EXISTS "moments_user_id_idx"
  ON "moments" ("user_id");
CREATE INDEX IF NOT EXISTS "moments_created_at_idx"
  ON "moments" ("created_at");

CREATE INDEX IF NOT EXISTS "conversations_created_by_id_idx"
  ON "conversations" ("created_by_id");
CREATE INDEX IF NOT EXISTS "conversations_last_message_at_idx"
  ON "conversations" ("last_message_at");

CREATE UNIQUE INDEX IF NOT EXISTS "conversation_participants_unique"
  ON "conversation_participants" ("conversation_id", "user_id");
CREATE INDEX IF NOT EXISTS "conversation_participants_user_id_idx"
  ON "conversation_participants" ("user_id");

CREATE INDEX IF NOT EXISTS "messages_conversation_id_idx"
  ON "messages" ("conversation_id");
CREATE INDEX IF NOT EXISTS "messages_sender_id_idx"
  ON "messages" ("sender_id");
CREATE INDEX IF NOT EXISTS "messages_created_at_idx"
  ON "messages" ("created_at");

CREATE INDEX IF NOT EXISTS "voice_rooms_host_id_idx"
  ON "voice_rooms" ("host_id");
CREATE INDEX IF NOT EXISTS "voice_rooms_language_code_idx"
  ON "voice_rooms" ("language_code");
CREATE INDEX IF NOT EXISTS "voice_rooms_is_active_idx"
  ON "voice_rooms" ("is_active");

CREATE UNIQUE INDEX IF NOT EXISTS "voice_participants_room_user_unique"
  ON "voice_participants" ("room_id", "user_id");
CREATE INDEX IF NOT EXISTS "voice_participants_user_id_idx"
  ON "voice_participants" ("user_id");
CREATE INDEX IF NOT EXISTS "voice_participants_status_idx"
  ON "voice_participants" ("status");

CREATE UNIQUE INDEX IF NOT EXISTS "lesson_progress_user_lesson_unique"
  ON "lesson_progress" ("user_id", "lesson_id");
CREATE INDEX IF NOT EXISTS "lesson_progress_language_code_idx"
  ON "lesson_progress" ("language_code");

CREATE INDEX IF NOT EXISTS "quiz_results_user_id_idx"
  ON "quiz_results" ("user_id");
CREATE INDEX IF NOT EXISTS "quiz_results_quiz_id_idx"
  ON "quiz_results" ("quiz_id");

CREATE UNIQUE INDEX IF NOT EXISTS "streaks_user_id_unique"
  ON "streaks" ("user_id");
