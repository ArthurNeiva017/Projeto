const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');

        db.serialize(() => {
            // Create NOTICIA table
            db.run(`CREATE TABLE IF NOT EXISTS NOTICIA (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                titulo TEXT NOT NULL,
                fonte TEXT,
                data_publicacao DATETIME,
                resumo TEXT,
                url TEXT
            )`);

            // Create AMEACA table
            // db.run(`DROP TABLE IF EXISTS AMEACA`); // removed to keep email state
            db.run(`CREATE TABLE IF NOT EXISTS AMEACA (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                grupo TEXT,
                vitima TEXT,
                data_incidente DATETIME,
                pais TEXT,
                fonte TEXT,
                url TEXT,
                email_sent BOOLEAN DEFAULT 0,
                reportText TEXT
            )`, () => {
                // Safely add reportText column if the table already existed without it
                db.run(`ALTER TABLE AMEACA ADD COLUMN reportText TEXT`, (err) => {
                    // Ignore errors if the column already exists
                });
            });

            // Create METRICA table
            db.run(`CREATE TABLE IF NOT EXISTS METRICA (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tipo_entidade TEXT,
                quantidade INTEGER,
                data_referencia DATETIME
            )`);

            // Create CVE table
            db.run(`CREATE TABLE IF NOT EXISTS CVE (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                cve_id TEXT NOT NULL,
                data_publicacao DATETIME,
                cvss REAL,
                resumo TEXT,
                url TEXT
            )`);

            // Insert dummy initial data if empty for METRICA only
            db.get("SELECT COUNT(*) as count FROM METRICA", (err, row) => {
                if (row && row.count === 0) {
                    const insertMetrica = db.prepare('INSERT INTO METRICA (tipo_entidade, quantidade, data_referencia) VALUES (?, ?, ?)');
                    const now = new Date().toISOString();
                    insertMetrica.run('threats', 1420, now);
                    insertMetrica.run('campaigns', 85, now);
                    insertMetrica.run('actors', 230, now);
                    insertMetrica.run('vulnerabilities', 4105, now);
                    insertMetrica.run('malwares', 893, now);
                    insertMetrica.finalize();
                }
            });
        });
    }
});

module.exports = db;
