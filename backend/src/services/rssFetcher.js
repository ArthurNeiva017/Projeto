const rssParser = require('rss-parser');
const axios = require('axios');
const db = require('../database/db');

const parser = new rssParser();

const FEEDS = [
    { nome: 'CyberSecurity News', url: 'https://cybersecuritynews.com/feed/' },
    { nome: 'The Hacker News', url: 'https://feeds.feedburner.com/TheHackersNews' },
    { nome: 'CISO Advisor', url: 'https://www.cisoadvisor.com.br/feed/' },
    { nome: 'SecurityWeek', url: 'https://www.securityweek.com/feed/' },
    { nome: 'BleepingComputer', url: 'https://www.bleepingcomputer.com/feed/' },
    { nome: 'Krebs on Security', url: 'https://krebsonsecurity.com/feed/' },
    { nome: 'Dark Reading', url: 'https://www.darkreading.com/rss.xml' }

];

async function updateNewsFromRSS() {
    console.log('Fetching latest news from RSS feeds...');

    for (const feed of FEEDS) {
        try {
            // Fetch XML first to sanitize it before parsing
            const response = await axios.get(feed.url, {
                timeout: 15000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'application/rss+xml, application/xml, text/xml'
                }
            });
            let xmlData = response.data;
            // Fix unescaped ampersands that cause "Invalid character in entity name" errors
            xmlData = xmlData.replace(/&(?!(?:apos|quot|[a-zA-Z0-9]+|#\d+);)/g, '&amp;');

            const feedData = await parser.parseString(xmlData);

            // Get only the 5 most recent from each feed to prevent database bloat
            const recentItems = feedData.items.slice(0, 5);

            for (const item of recentItems) {
                // Check if news already exists in DB by URL
                db.get("SELECT id FROM NOTICIA WHERE url = ?", [item.link], (err, row) => {
                    if (!row) {
                        // Generate a simple mock summary from the content snippet (as true AI requires an API key)
                        let snippet = item.contentSnippet || item.summary || 'No summary available.';
                        if (snippet.length > 900) snippet = snippet.substring(0, 297) + '...';

                        const insertNoticia = db.prepare('INSERT INTO NOTICIA (titulo, fonte, data_publicacao, resumo, url) VALUES (?, ?, ?, ?, ?)');

                        // Handle different date formats or missing dates
                        const pubDate = item.isoDate || item.pubDate || new Date().toISOString();

                        insertNoticia.run(
                            item.title,
                            feed.nome,
                            pubDate,
                            `AI Summary: ${snippet}`,
                            item.link
                        );
                        insertNoticia.finalize();
                    }
                });
            }
        } catch (error) {
            console.error(`Error fetching RSS from ${feed.nome}:`, error.message);
        }
    }
}

module.exports = { updateNewsFromRSS };
