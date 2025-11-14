DROP SCHEMA IF EXISTS ${SA_DB_SCHEMA} CASCADE;
CREATE SCHEMA ${SA_DB_SCHEMA};

CREATE EXTENSION IF NOT EXISTS vector;


/* Global Context */

CREATE TABLE ${SA_DB_SCHEMA}.document_vector_store (
    id UUID PRIMARY KEY,
    content TEXT,
    metadata JSONB,
    embedding vector(1536)
);

CREATE TABLE ${SA_DB_SCHEMA}.s3_folders (
    id UUID PRIMARY KEY,
    name VARCHAR(255),
    parent_id UUID,
    CONSTRAINT fk_parent FOREIGN KEY (parent_id) REFERENCES ${SA_DB_SCHEMA}.folders (id)
);

CREATE TABLE ${SA_DB_SCHEMA}.s3_documents (
    id UUID PRIMARY KEY,
    url TEXT,
    name VARCHAR(255),
    content_type VARCHAR(255),
    folder_id UUID,
    CONSTRAINT fk_folder FOREIGN KEY (folder_id) REFERENCES ${SA_DB_SCHEMA}.folders (id)
);


/* User Context */

CREATE TABLE ${SA_DB_SCHEMA}.user_document_vector_store
(
    id        UUID PRIMARY KEY,
    content   TEXT,
    metadata  JSONB,
    embedding vector(1536)
);

CREATE TABLE ${SA_DB_SCHEMA}.users (
    id UUID PRIMARY KEY,
    email          VARCHAR(255),
    password       VARCHAR(255),
    username       VARCHAR(255),
    oauth_provider VARCHAR(50),
    oauth_id       VARCHAR(255),
    role           VARCHAR(50),
    picture        TEXT
);

CREATE TABLE ${SA_DB_SCHEMA}.user_s3_folders (
    id UUID PRIMARY KEY,
    name VARCHAR(255),
    parent_id UUID,
    CONSTRAINT fk_parent FOREIGN KEY (parent_id) REFERENCES ${SA_DB_SCHEMA}.folders (id)
);

CREATE TABLE ${SA_DB_SCHEMA}.user_s3_documents (
    id UUID PRIMARY KEY,
    url TEXT,
    name VARCHAR(255),
    content_type VARCHAR(255),
    folder_id UUID,
    CONSTRAINT fk_folder FOREIGN KEY (folder_id) REFERENCES ${SA_DB_SCHEMA}.folders (id)
);



/* Chat Memory */

CREATE TABLE ${SA_DB_SCHEMA}.spring_ai_chat_memory (
    conversation_id VARCHAR(36) NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('USER', 'ASSISTANT', 'SYSTEM', 'TOOL')),
    "timestamp" TIMESTAMP NOT NULL
);

CREATE INDEX idx_spring_ai_chat_memory_conversation_id_timestamp ON ${SA_DB_SCHEMA}.spring_ai_chat_memory(conversation_id, "timestamp");

CREATE TABLE ${SA_DB_SCHEMA}.chat_memory_metadata (
    conversation_id UUID PRIMARY KEY,
    user_id UUID,
    description VARCHAR(256)
);

CREATE INDEX idx_chat_memory_metadata_user_id ON ${SA_DB_SCHEMA}.chat_memory_metadata(user_id);

