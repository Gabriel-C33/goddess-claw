use serde::{Deserialize, Serialize};
use std::path::Path;
use tokio_rusqlite::Connection;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StoredConversation {
    pub id: String,
    pub title: String,
    pub model: String,
    pub created_at: i64,
    pub updated_at: i64,
    pub messages_json: String,
}

pub struct ConversationDb {
    conn: Connection,
}

impl ConversationDb {
    pub async fn open(db_path: &Path) -> Result<Self, tokio_rusqlite::Error> {
        let conn = Connection::open(db_path).await?;
        // Create table if not exists
        conn.call(|c| {
            // Enable WAL mode for better concurrent read/write performance
            c.execute_batch("PRAGMA journal_mode=WAL;")?;
            c.execute_batch("PRAGMA synchronous=NORMAL;")?;
            c.execute_batch(
                "CREATE TABLE IF NOT EXISTS conversations (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    model TEXT NOT NULL DEFAULT '',
                    created_at INTEGER NOT NULL,
                    updated_at INTEGER NOT NULL,
                    messages_json TEXT NOT NULL DEFAULT '[]'
                );
                CREATE INDEX IF NOT EXISTS idx_conversations_updated
                    ON conversations(updated_at DESC);",
            )?;
            Ok(())
        })
        .await?;
        Ok(Self { conn })
    }

    pub async fn list(&self) -> Result<Vec<StoredConversation>, tokio_rusqlite::Error> {
        self.conn
            .call(|c| {
                let mut stmt = c.prepare(
                    "SELECT id, title, model, created_at, updated_at, messages_json
                     FROM conversations ORDER BY updated_at DESC LIMIT 200",
                )?;
                let rows = stmt
                    .query_map([], |row| {
                        Ok(StoredConversation {
                            id: row.get(0)?,
                            title: row.get(1)?,
                            model: row.get(2)?,
                            created_at: row.get(3)?,
                            updated_at: row.get(4)?,
                            messages_json: row.get(5)?,
                        })
                    })?
                    .filter_map(|r| r.ok())
                    .collect();
                Ok(rows)
            })
            .await
    }

    pub async fn save(&self, conv: StoredConversation) -> Result<(), tokio_rusqlite::Error> {
        self.conn
            .call(move |c| {
                c.execute(
                    "INSERT INTO conversations (id, title, model, created_at, updated_at, messages_json)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6)
                     ON CONFLICT(id) DO UPDATE SET
                       title = excluded.title,
                       model = excluded.model,
                       updated_at = excluded.updated_at,
                       messages_json = excluded.messages_json",
                    rusqlite::params![
                        conv.id,
                        conv.title,
                        conv.model,
                        conv.created_at,
                        conv.updated_at,
                        conv.messages_json,
                    ],
                )?;
                Ok(())
            })
            .await
    }

    pub async fn get(&self, id: String) -> Result<Option<StoredConversation>, tokio_rusqlite::Error> {
        self.conn
            .call(move |c| {
                let mut stmt = c.prepare(
                    "SELECT id, title, model, created_at, updated_at, messages_json
                     FROM conversations WHERE id = ?1",
                )?;
                let mut rows = stmt.query_map([&id], |row| {
                    Ok(StoredConversation {
                        id: row.get(0)?,
                        title: row.get(1)?,
                        model: row.get(2)?,
                        created_at: row.get(3)?,
                        updated_at: row.get(4)?,
                        messages_json: row.get(5)?,
                    })
                })?;
                Ok(rows.next().and_then(|r| r.ok()))
            })
            .await
    }

    pub async fn delete(&self, id: String) -> Result<(), tokio_rusqlite::Error> {
        self.conn
            .call(move |c| {
                c.execute("DELETE FROM conversations WHERE id = ?1", [&id])?;
                Ok(())
            })
            .await
    }
}
