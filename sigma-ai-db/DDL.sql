DROP SCHEMA IF EXISTS ${LC_DB_SCHEMA} CASCADE;
CREATE SCHEMA ${LC_DB_SCHEMA};

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE ${LC_DB_SCHEMA}.document_vector_store (
    id UUID PRIMARY KEY,
    content TEXT,
    metadata JSONB,
    embedding vector(1536)
);

CREATE TABLE ${LC_DB_SCHEMA}.memory_vector_store
(
    id        UUID PRIMARY KEY,
    content   TEXT,
    metadata  JSONB,
    embedding vector(1536)
);

CREATE TABLE ${LC_DB_SCHEMA}.user (
    id UUID PRIMARY KEY,
    email          VARCHAR(255),
    password       VARCHAR(255),
    username       VARCHAR(255),
    oauth_provider VARCHAR(50),
    oauth_id       VARCHAR(255),
    role           VARCHAR(50),
    picture        TEXT
);